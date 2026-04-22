const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const mongoose = require('mongoose');
const { ChildCase } = require('../models/ChildCase');
const { getLabRequestsForCase } = require('../utils/labCaseIntegration');
const { Referral } = require('../models/Referral');
const { User } = require('../models/User');
const TherapyCase = require('../models/TherapyCase');
const TherapyPlan = require('../models/TherapyPlan');
const SessionLog = require('../models/SessionLog');
const { enrichAssignments } = require('./homeAssignment.controller');
const { assertTherapistCaseAccess } = require('../utils/therapistCaseAccess');
const { validateSessionBody } = require('../utils/sessionLogShared');
const {
  validateSessionGoalsAndActivities,
  validateSessionGoalData,
  buildActivityUsageRows,
} = require('../utils/sessionPlanValidation');
const { getActiveEpisodeForCase } = require('../services/therapyEpisodeService');
const { collectGoalDataLinkageWarnings } = require('../utils/sessionGoalDataValidation');
const { completeMatchingSessionSlot, validateSessionSlotForNewLog } = require('../utils/sessionSlotLink');
const { invalidateProgressEngineCache } = require('../services/progressEngine');
const { maybeLockPlanBaselineAfterSession } = require('../utils/planBaselineLock');
const { HomeAssignment } = require('../models/HomeAssignment');
const { resolveTherapistTypes } = require('./referralController');
const { THERAPY_STATUS } = require('../constants/workflowEnums');

function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const diff = getCurrentTimeMs() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

/**
 * Normalize therapy plan domain strings to display tags (Speech, OT, Behavioral, Sensory, AAC, PECS).
 */
function domainTagsFromPlan(domains) {
  const list = Array.isArray(domains) ? domains : [];
  const tags = new Set();
  const push = (label) => {
    if (label) tags.add(label);
  };

  for (const raw of list) {
    const s = String(raw || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (!s) continue;
    if (/(speech|slp|language)/.test(s)) push('Speech');
    else if (/(occupational|^ot\b|sensory integration)/.test(s)) push('OT');
    else if (/(behavior|aba|behaviour)/.test(s)) push('Behavioral');
    else if (/(sensory)/.test(s) && !/occupational/.test(s)) push('Sensory');
    else if (/(aac|augmentative)/.test(s)) push('AAC');
    else if (/(pecs|picture exchange)/.test(s)) push('PECS');
    else push(raw);
  }

  const preferred = ['Speech', 'OT', 'Behavioral', 'Sensory', 'AAC', 'PECS'];
  const ordered = [];
  preferred.forEach((p) => {
    if (tags.has(p)) ordered.push(p);
  });
  tags.forEach((t) => {
    if (!ordered.includes(t)) ordered.push(t);
  });
  return ordered;
}

async function loadChildAndParent(caseDoc) {
  const parent = await User.findById(caseDoc.parentId).select('firstName lastName email phoneNumber children').lean();

  let child = null;
  if (parent && Array.isArray(parent.children)) {
    const found = parent.children.find(
      (c) => c && c._id && c._id.toString() === caseDoc.childId.toString()
    );
    if (found) {
      child = {
        id: found._id,
        firstName: found.firstName || '',
        lastName: found.lastName || '',
        dateOfBirth: found.dateOfBirth || null,
        gender: found.gender || null,
        age: ageFromDob(found.dateOfBirth),
      };
    }
  }

  return {
    child,
    parent: parent
      ? {
          id: parent._id,
          firstName: parent.firstName || '',
          lastName: parent.lastName || '',
          email: parent.email || '',
          contact: parent.phoneNumber || parent.email || '',
        }
      : null,
  };
}

/**
 * GET /api/therapist/case/:caseId
 * Aggregated therapy case file for the logged-in therapist.
 */
exports.getTherapistCaseFile = async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const caseDoc = await ChildCase.findById(caseId).lean();
    if (!caseDoc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    if (!['THERAPY', 'THERAPY_ACTIVE'].includes(String(caseDoc.status))) {
      return res.status(403).json({ success: false, message: 'Case is not currently in a therapist-actionable state' });
    }

    const therapistId = req.user._id;
    const therapistTypes = await resolveTherapistTypes(req);

    const therapyCaseActive = await TherapyCase.findOne({ caseId, therapistId, status: 'ACTIVE' }).lean();
    const therapyCaseRow = await TherapyCase.findOne({ caseId, therapistId }).select('status').lean();

    let referral = null;
    if (therapistTypes.length > 0) {
      referral = await Referral.findOne({
        caseId,
        therapistType: { $in: therapistTypes },
        status: { $in: ['CREATED', 'SENT', 'ACCEPTED'] },
      })
        .sort({ updatedAt: -1 })
        .lean();
    }

    if (!therapyCaseActive && !referral) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { child, parent } = await loadChildAndParent(caseDoc);

    const [therapyPlan, sessions, assignments, labRequests] = await Promise.all([
      TherapyPlan.findOne({ caseId, therapistId }).lean(),
      SessionLog.find({ caseId, therapistId }).sort({ sessionDate: -1 }).lean(),
      HomeAssignment.find({ caseId, therapistId })
        .populate([
          { path: 'activityId', select: 'name instructions objective procedure materials domain' },
          { path: 'sourceActivityId', select: 'name materials instructions' },
        ])
        .sort({ dueDate: -1 })
        .lean(),
      getLabRequestsForCase(caseDoc, 'therapist'),
    ]);

    const domainTags = domainTagsFromPlan(therapyPlan?.domains || []);

    const referralPayload = referral
      ? {
          therapistType: referral.therapistType,
          priority: referral.priority,
          notes: referral.notes || '',
          status: referral.status,
          reasonForReferral: referral.therapistType,
        }
      : null;

    const stGoals = Array.isArray(therapyPlan?.shortTermGoals) ? therapyPlan.shortTermGoals : [];
    const legacyGoals = Array.isArray(therapyPlan?.goals) ? therapyPlan.goals : [];
    const goalsTotal =
      stGoals.length > 0 ? stGoals.length : legacyGoals.filter((g) => g.type !== 'long-term').length;
    const domainsCount =
      Array.isArray(therapyPlan?.domains) && therapyPlan.domains.length > 0
        ? therapyPlan.domains.length
        : domainTags.length;
    const lastSession = sessions[0] || null;
    const progressSummary = {
      sessionsCount: sessions.length,
      lastSessionDate: lastSession?.sessionDate || null,
      goalsTotal,
      domainsCount,
    };

    return res.status(200).json({
      success: true,
      data: {
        case: {
          _id: caseDoc._id,
          status: caseDoc.status,
          riskLevel: caseDoc.riskLevel,
          updatedAt: caseDoc.updatedAt,
        },
        child: child || {
          firstName: '—',
          lastName: '',
          age: null,
          gender: null,
        },
        parent: parent || { firstName: '—', lastName: '', email: '', contact: '' },
        referral: referralPayload,
        therapyPlan: therapyPlan || null,
        sessions,
        assignments: enrichAssignments(assignments),
        domainTags,
        progressSummary,
        labRequests,
        therapyCase: therapyCaseRow ? { status: therapyCaseRow.status } : null,
      },
    });
  } catch (error) {
    console.error('getTherapistCaseFile:', error);
    return res.status(500).json({ success: false, message: 'Failed to load therapy case file' });
  }
};

/**
 * POST /api/therapist/cases/:caseId/sessions
 * Creates a session log (activitiesUsed remains string[] for clinician analytics).
 */
exports.createSessionLog = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { caseId } = req.params;
    const { sessionSlotId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const v = validateSessionBody(req.body, { requireGoalsAndActivities: true, isUpdate: false });
    if (!v.ok) {
      return res.status(400).json({ success: false, message: v.message });
    }

    const access = await assertTherapistCaseAccess(req, caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    // Strict workflow dependency: session logging only allowed for ACTIVE therapy.
    const activeTherapy = await TherapyCase.findOne({ caseId, therapistId, status: THERAPY_STATUS.ACTIVE })
      .select('_id')
      .lean();
    if (!activeTherapy) {
      return res.status(400).json({
        success: false,
        message: 'Session logging is only allowed for ACTIVE therapy. Start therapy first.',
        errorCode: 'THERAPY_NOT_ACTIVE',
      });
    }

    const planLean = await TherapyPlan.findOne({ caseId, therapistId }).sort({ updatedAt: -1 }).lean();
    if (!planLean) {
      return res.status(400).json({
        success: false,
        message: 'A therapy plan is required before logging sessions for this case',
      });
    }

    const planCheck = await validateSessionGoalsAndActivities(caseId, therapistId, v.payload.goalsTargeted, v.payload.activitiesUsed, {
      plan: planLean,
    });
    if (!planCheck.ok) {
      return res.status(400).json({ success: false, message: planCheck.message });
    }

    const goalDataCheck = await validateSessionGoalData(caseId, therapistId, v.payload.goalData || [], {
      plan: planLean,
    });
    if (!goalDataCheck.ok) {
      return res.status(400).json({ success: false, message: goalDataCheck.message });
    }

    const slotCheck = await validateSessionSlotForNewLog({ caseId, sessionSlotId });
    if (!slotCheck.ok) {
      return res.status(slotCheck.status).json({ success: false, message: slotCheck.message });
    }

    const p = v.payload;
    const slotRef =
      sessionSlotId && mongoose.Types.ObjectId.isValid(String(sessionSlotId))
        ? new mongoose.Types.ObjectId(String(sessionSlotId))
        : undefined;

    const activityUsage = buildActivityUsageRows(p.activitiesUsed, planLean);
    const activitiesUsedDeduped = activityUsage.map((row) => row.displayName);

    const activeEpisode = await getActiveEpisodeForCase(caseId);
    if (!activeEpisode || String(activeEpisode.therapistId) !== String(therapistId) || !activeEpisode.isActive) {
      return res.status(400).json({
        success: false,
        message: 'No active therapy episode found for this case.',
        errorCode: 'NO_ACTIVE_EPISODE',
      });
    }
    const episodeId = activeEpisode._id;

    const created = await SessionLog.create({
      caseId,
      therapistId,
      sessionDate: p.sessionDate,
      duration: p.duration,
      goalsTargeted: p.goalsTargeted,
      activitiesUsed: activitiesUsedDeduped,
      activityUsage,
      childResponse: p.childResponse,
      notes: p.notes,
      parentInstructions: p.parentInstructions,
      status: p.status,
      goalData: Array.isArray(p.goalData) ? p.goalData : [],
      planId: planLean?._id,
      planVersionNumber: planLean?.planVersion != null ? Number(planLean.planVersion) : 1,
      noteState: p.noteState || 'draft',
      lateEntry: Boolean(p.lateEntry),
      lateEntryReason: p.lateEntryReason || '',
      ...(episodeId ? { episodeId } : {}),
      ...(slotRef ? { sessionSlotId: slotRef } : {}),
    });

    try {
      await completeMatchingSessionSlot({
        caseId,
        sessionDate: p.sessionDate,
        sessionSlotId,
      });
    } catch (linkErr) {
      console.error('completeMatchingSessionSlot (therapist case):', linkErr);
    }

    try {
      await maybeLockPlanBaselineAfterSession(caseId, therapistId);
    } catch (lockErr) {
      console.error('maybeLockPlanBaselineAfterSession (therapist case):', lockErr);
    }

    try {
      invalidateProgressEngineCache(caseId);
    } catch (_) {
      /* ignore */
    }

    const planForWarnings = await TherapyPlan.findOne({ caseId, therapistId })
      .select('shortTermGoals goals')
      .lean();
    const warnings = collectGoalDataLinkageWarnings(planForWarnings, Array.isArray(p.goalData) ? p.goalData : []);

    return res.status(201).json({
      success: true,
      data: created,
      ...(warnings.length ? { warnings } : {}),
    });
  } catch (error) {
    console.error('createSessionLog:', error);
    return res.status(500).json({ success: false, message: 'Failed to create session log' });
  }
};
