const mongoose = require('mongoose');
const { ChildCase, CASE_STATUS } = require('../models/ChildCase');
const Submission = require('../models/Submission');
const { User } = require('../models/User');
const { Appointment } = require('../models/Appointment');
const { createNotificationIfNotExists } = require('../utils/notification');
const { NOTIFICATION_TYPES } = require('../models/Notification');

function inferRiskFromSubmission(sub) {
  if (!sub) return 'unknown';
  if (sub.riskLevel && ['low', 'medium', 'high'].includes(String(sub.riskLevel).toLowerCase())) {
    return String(sub.riskLevel).toLowerCase();
  }
  const r = sub.result;
  if (r === 'Pass') return 'low';
  if (r === 'Monitor') return 'medium';
  if (r === 'Fail') return 'high';
  return 'unknown';
}

/**
 * Build screening summary from Submission collection for a child subdocument id.
 */
async function buildScreeningSummaryForChild(childId) {
  const subs = await Submission.find({ childId })
    .sort({ createdAt: -1 })
    .lean();

  if (!subs.length) {
    return {
      hasScreening: false,
      message: 'No screening data on file for this child.',
      submissions: [],
      latest: null,
    };
  }

  const submissions = subs.map((s) => ({
    submissionId: s._id,
    questionnaireType: s.questionnaireType,
    result: s.result,
    riskLevel: inferRiskFromSubmission(s),
    completedAt: s.createdAt,
    totalScore: s.scores?.totalScore,
  }));

  const latest = subs[0];
  return {
    hasScreening: true,
    message: null,
    submissions,
    latest: {
      questionnaireType: latest.questionnaireType,
      result: latest.result,
      riskLevel: inferRiskFromSubmission(latest),
      resultDescription: latest.resultDescription,
      totalScore: latest.scores?.totalScore,
    },
  };
}

function riskFromSummary(screeningSummary) {
  if (!screeningSummary || !screeningSummary.hasScreening || !screeningSummary.latest) {
    return 'unknown';
  }
  const r = screeningSummary.latest.riskLevel;
  return ['low', 'medium', 'high'].includes(r) ? r : 'unknown';
}

/**
 * After a clinician approves an appointment: create a case if none exists (idempotent).
 */
async function ensureCaseFromApprovedAppointment(appointmentDoc) {
  if (!appointmentDoc || String(appointmentDoc.professionalRole) !== 'clinician') {
    return null;
  }

  const childId = appointmentDoc.child;
  const parentId = appointmentDoc.parent;
  const clinicianId = appointmentDoc.professional;

  if (!childId || !parentId || !clinicianId) {
    console.warn('ensureCaseFromApprovedAppointment: missing ids');
    return null;
  }

  const screeningSummary = await buildScreeningSummaryForChild(childId);
  const riskLevel = riskFromSummary(screeningSummary);

  // Keep an existing case in sync with latest screening state so risk filters remain accurate.
  const existing = await ChildCase.findOne({ clinicianId, childId });
  if (existing) {
    existing.parentId = parentId || existing.parentId;
    existing.appointmentId = appointmentDoc._id || existing.appointmentId;
    existing.screeningSummary = screeningSummary;
    existing.riskLevel = riskLevel;
    if (!existing.status) {
      existing.status = CASE_STATUS.UNDER_EVALUATION;
    }
    await existing.save();
    return existing;
  }

  // We prefer validating parent-child linkage, but we don't block creation if legacy data is incomplete.
  const parent = await User.findById(parentId).select('children').lean();
  const linkedChildExists =
    !!parent &&
    Array.isArray(parent.children) &&
    parent.children.some((c) => c && c._id && c._id.toString() === childId.toString());
  if (!linkedChildExists) {
    console.warn('ensureCaseFromApprovedAppointment: parent/child linkage missing; creating case with fallback data');
  }

  const doc = await ChildCase.create({
    childId,
    parentId,
    clinicianId,
    appointmentId: appointmentDoc._id,
    screeningSummary,
    riskLevel,
    status: CASE_STATUS.UNDER_EVALUATION,
  });

  await createNotificationIfNotExists({
    recipientId: clinicianId,
    type: NOTIFICATION_TYPES.CASE_CREATED,
    title: 'New Case Created',
    message: 'New child case assigned to you',
    relatedResourceType: 'ChildCase',
    relatedResourceId: doc._id,
  });

  return doc;
}

/**
 * Manual create: validate parent owns child, duplicate check, optional appointment link.
 */
async function createCaseForClinician({ clinicianId, parentId, childId, appointmentId }) {
  if (!mongoose.Types.ObjectId.isValid(parentId) || !mongoose.Types.ObjectId.isValid(childId)) {
    throw new Error('Invalid parent or child id');
  }

  const dup = await ChildCase.findOne({ clinicianId, childId });
  if (dup) {
    const err = new Error('A case already exists for this child under your caseload.');
    err.code = 'DUPLICATE_CASE';
    throw err;
  }

  const parent = await User.findById(parentId).select('children role');
  if (!parent || parent.role !== 'parent') {
    throw new Error('Parent not found');
  }
  const childSub = parent.children.id(childId);
  if (!childSub) {
    throw new Error('Child does not belong to this parent');
  }

  let appointmentRef = null;
  if (appointmentId) {
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      throw new Error('Invalid appointment id');
    }
    const appt = await Appointment.findById(appointmentId);
    if (
      !appt ||
      appt.professional.toString() !== clinicianId.toString() ||
      appt.parent.toString() !== parentId.toString() ||
      appt.child.toString() !== childId.toString()
    ) {
      throw new Error('Appointment does not match parent, child, or clinician');
    }
    appointmentRef = appt._id;
  }

  const screeningSummary = await buildScreeningSummaryForChild(childId);
  const riskLevel = riskFromSummary(screeningSummary);

  const created = await ChildCase.create({
    childId,
    parentId,
    clinicianId,
    appointmentId: appointmentRef,
    screeningSummary,
    riskLevel,
    status: CASE_STATUS.ACTIVE,
  });

  await createNotificationIfNotExists({
    recipientId: clinicianId,
    type: NOTIFICATION_TYPES.CASE_CREATED,
    title: 'New Case Created',
    message: 'New child case assigned to you',
    relatedResourceType: 'ChildCase',
    relatedResourceId: created._id,
  });

  return created;
}

/**
 * Backfill/sync cases from already approved clinician appointments.
 * This heals missing cases when historical approvals happened before case sync logic.
 */
async function syncCasesForClinicianFromApprovedAppointments(clinicianId) {
  if (!clinicianId) return { scanned: 0, synced: 0 };

  const approved = await Appointment.find({
    professional: clinicianId,
    professionalRole: 'clinician',
    status: 'APPROVED',
  }).lean();

  let synced = 0;
  for (const appt of approved) {
    try {
      const result = await ensureCaseFromApprovedAppointment(appt);
      if (result) synced += 1;
    } catch (err) {
      console.error('syncCasesForClinicianFromApprovedAppointments failed:', err);
    }
  }

  return { scanned: approved.length, synced };
}

module.exports = {
  buildScreeningSummaryForChild,
  inferRiskFromSubmission,
  riskFromSummary,
  ensureCaseFromApprovedAppointment,
  createCaseForClinician,
  syncCasesForClinicianFromApprovedAppointments,
};
