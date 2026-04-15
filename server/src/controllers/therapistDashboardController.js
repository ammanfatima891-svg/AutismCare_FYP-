const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
/**
 * Therapist dashboard: referrals, appointments, therapy plans, home assignments, session logs.
 * Referral matching uses therapist specialization → therapistType (unchanged).
 */
const { Referral } = require('../models/Referral');
const { ChildCase } = require('../models/ChildCase');
const { User } = require('../models/User');
const { Appointment, APPOINTMENT_TYPES, APPOINTMENT_STATUS } = require('../models/Appointment');
const TherapyPlan = require('../models/TherapyPlan');
const TherapyCase = require('../models/TherapyCase');
const { SessionSlot } = require('../models/SessionSlot');
const { HomeAssignment } = require('../models/HomeAssignment');
const SessionLog = require('../models/SessionLog');
const { REFERRAL_STATUS } = require('../constants/workflowEnums');

const UPCOMING_SESSION_LIMIT = 8;
/** Fetch enough rows from each source before merge/sort (cap is applied after merge). */
const UPCOMING_FETCH_CAP = 32;
const GOAL_REVIEW_STALE_DAYS = 28;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasAnyToken(haystack, tokens) {
  return tokens.some((token) => haystack.includes(token));
}

function therapistTypesFromSpecialization(specialization) {
  const value = normalizeText(specialization);
  if (!value) return [];

  const matches = [];
  if (value === normalizeText('Speech Therapist')) matches.push('Speech Therapist');
  if (value === normalizeText('Occupational Therapist')) matches.push('Occupational Therapist');
  if (value === normalizeText('Behavioral Therapist')) matches.push('Behavioral Therapist');
  if (value === normalizeText('AAC Specialist')) matches.push('AAC Specialist');
  if (value === normalizeText('PECS Specialist')) matches.push('PECS Specialist');

  if (hasAnyToken(value, ['speech', 'slp', 'language therapy', 'speech therapy'])) {
    matches.push('Speech Therapist');
  }
  if (hasAnyToken(value, ['occupational', 'occupational therapy', 'sensory integration', 'ot'])) {
    matches.push('Occupational Therapist');
  }
  if (hasAnyToken(value, ['behavioral', 'behavioural', 'behavior', 'behaviour', 'aba'])) {
    matches.push('Behavioral Therapist');
  }
  if (hasAnyToken(value, ['aac', 'augmentative', 'alternative communication'])) {
    matches.push('AAC Specialist');
  }
  if (hasAnyToken(value, ['pecs', 'picture exchange'])) {
    matches.push('PECS Specialist');
  }

  return [...new Set(matches)];
}

async function resolveTherapistTypes(req) {
  let specialization = req.user?.specialization;
  if (!specialization && req.user?._id) {
    const rawUser = await User.findById(req.user._id).select('specialization').lean();
    specialization = rawUser?.specialization;
  }
  return therapistTypesFromSpecialization(specialization);
}

function childNameFromParentChildren(parent, childId) {
  if (!parent || !Array.isArray(parent.children) || !childId) return 'Child';
  const found = parent.children.find((c) => c && c._id && c._id.toString() === childId.toString());
  if (!found) return 'Child';
  return `${found.firstName || ''} ${found.lastName || ''}`.trim() || 'Child';
}

function parseTimeToMinutes(timeStr) {
  const s = String(timeStr || '').trim();
  if (!s) return 0;
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    const ap = m12[3].toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return h * 60 + min;
  }
  return 0;
}

function compareUpcomingByDateTime(a, b) {
  const da = new Date(a.date);
  const db = new Date(b.date);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  const diff = da.getTime() - db.getTime();
  if (diff !== 0) return diff;
  return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
}

/**
 * Upcoming sessions for the therapist home card: parent-booked therapy appointments
 * plus scheduled slots from case therapy schedules (SessionSlot).
 */
async function buildUpcomingSessions(therapistId, startOfToday, limit) {
  const [appointments, therapyCaseRows] = await Promise.all([
    Appointment.find({
      professional: therapistId,
      professionalRole: 'therapist',
      appointmentType: APPOINTMENT_TYPES.THERAPY,
      status: { $in: [APPOINTMENT_STATUS.APPROVED] },
      $or: [
        { finalDate: { $gte: startOfToday } },
        { finalDate: null, preferredDate: { $gte: startOfToday } },
      ],
    })
      .select('parent child status finalDate finalTime preferredDate preferredTime')
      .sort({ finalDate: 1, preferredDate: 1 })
      .limit(UPCOMING_FETCH_CAP)
      .lean(),
    TherapyCase.find({ therapistId, status: 'ACTIVE' }).select('caseId').lean(),
  ]);

  const appointmentParentIds = [...new Set(appointments.map((a) => String(a.parent)))];
  const appointmentParents = await User.find({ _id: { $in: appointmentParentIds } })
    .select('children')
    .lean();
  const appointmentParentMap = new Map(appointmentParents.map((p) => [String(p._id), p]));

  const fromAppointments = appointments.map((a) => {
    const parent = appointmentParentMap.get(String(a.parent));
    return {
      id: a._id,
      date: a.finalDate || a.preferredDate,
      time: a.finalTime || a.preferredTime || '',
      childName: childNameFromParentChildren(parent, a.child),
      duration: 45,
      sessionStatus: 'Confirmed',
    };
  });

  const slotCaseIds = [...new Set(therapyCaseRows.map((r) => String(r.caseId)))];
  let fromSlots = [];

  if (slotCaseIds.length > 0) {
    const slots = await SessionSlot.find({
      caseId: { $in: slotCaseIds },
      date: { $gte: startOfToday },
      status: { $in: ['scheduled', 'rescheduled'] },
    })
      .select('caseId date time duration status')
      .sort({ date: 1, time: 1 })
      .limit(UPCOMING_FETCH_CAP)
      .lean();

    const slotCaseDocs = await ChildCase.find({ _id: { $in: slotCaseIds } })
      .select('_id childId parentId')
      .lean();
    const slotCaseMap = new Map(slotCaseDocs.map((c) => [String(c._id), c]));
    const slotParentIds = [...new Set(slotCaseDocs.map((c) => String(c.parentId)))];
    const slotParents = await User.find({ _id: { $in: slotParentIds } }).select('children').lean();
    const slotParentMap = new Map(slotParents.map((p) => [String(p._id), p]));

    fromSlots = slots.map((s) => {
      const c = slotCaseMap.get(String(s.caseId));
      const parent = c ? slotParentMap.get(String(c.parentId)) : null;
      const sessionStatus = s.status === 'rescheduled' ? 'Rescheduled' : 'Scheduled';
      return {
        id: s._id,
        date: s.date,
        time: s.time || '',
        childName: childNameFromParentChildren(parent, c ? c.childId : null),
        duration: s.duration,
        sessionStatus,
      };
    });
  }

  const merged = [...fromAppointments, ...fromSlots].sort(compareUpcomingByDateTime);
  return merged.slice(0, limit);
}

/**
 * Shared loader for dashboard + summary (single source of truth).
 */
async function loadTherapistDashboardData(req) {
  const therapistId = req.user._id;
  const therapistTypes = await resolveTherapistTypes(req);
  const today = getCurrentTime();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const reviewThreshold = new Date(today.getTime() - GOAL_REVIEW_STALE_DAYS * 24 * 60 * 60 * 1000);

  const referralFilter = { status: { $in: [REFERRAL_STATUS.CREATED, REFERRAL_STATUS.SENT, REFERRAL_STATUS.ACCEPTED] } };
  if (therapistTypes.length > 0) {
    referralFilter.therapistType = { $in: therapistTypes };
  } else {
    referralFilter.therapistType = '__none__';
  }

  const referrals = await Referral.find(referralFilter).sort({ createdAt: -1 }).lean();
  const caseIds = [...new Set(referrals.map((r) => String(r.caseId)))];

  const cases = await ChildCase.find({ _id: { $in: caseIds } })
    .select('_id childId parentId status riskLevel updatedAt')
    .lean();
  const caseMap = new Map(cases.map((c) => [String(c._id), c]));

  const parentIds = [...new Set(cases.map((c) => String(c.parentId)))];
  const parents = await User.find({ _id: { $in: parentIds } }).select('children').lean();
  const parentMap = new Map(parents.map((p) => [String(p._id), p]));

  const assignedCases = referrals
    .map((ref) => {
      const c = caseMap.get(String(ref.caseId));
      if (!c) return null;
      const parent = parentMap.get(String(c.parentId));
      return {
        referralId: ref._id,
        caseId: c._id,
        childId: c.childId,
        childName: childNameFromParentChildren(parent, c.childId),
        caseStatus: c.status,
        riskLevel: c.riskLevel,
        referralStatus: ref.status,
        therapistType: ref.therapistType,
        updatedAt: c.updatedAt,
      };
    })
    .filter(Boolean);

  // Canonical workflow: referrals do not have an "in-progress" state; therapy lifecycle is tracked on TherapyCase.
  const activeCases = await TherapyCase.countDocuments({ therapistId, status: 'ACTIVE' });

  const upcomingSessions = await buildUpcomingSessions(therapistId, startOfToday, UPCOMING_SESSION_LIMIT);

  const stalePlans = await TherapyPlan.find({
    therapistId,
    updatedAt: { $lte: reviewThreshold },
  })
    .select('caseId updatedAt')
    .lean();

  const staleCaseIds = [...new Set(stalePlans.map((p) => String(p.caseId)))];
  const staleCases = await ChildCase.find({ _id: { $in: staleCaseIds } })
    .select('_id childId parentId')
    .lean();
  const staleCaseMap = new Map(staleCases.map((c) => [String(c._id), c]));
  const staleParentIds = [...new Set(staleCases.map((c) => String(c.parentId)))];
  const staleParents = await User.find({ _id: { $in: staleParentIds } }).select('children').lean();
  const staleParentMap = new Map(staleParents.map((p) => [String(p._id), p]));

  const goalReviewAlerts = stalePlans.map((plan) => {
    const c = staleCaseMap.get(String(plan.caseId));
    const parent = c ? staleParentMap.get(String(c.parentId)) : null;
    return {
      caseId: plan.caseId,
      childName: c ? childNameFromParentChildren(parent, c.childId) : 'Child',
      message: 'Goal review required',
      lastReviewedAt: plan.updatedAt,
    };
  });

  const pendingReviews = stalePlans.length;

  const overdueAssignments = await HomeAssignment.find({
    therapistId,
    status: 'pending',
    dueDate: { $lt: today },
  })
    .select('caseId title dueDate')
    .sort({ dueDate: 1 })
    .lean();

  const assignmentCaseIds = [...new Set(overdueAssignments.map((a) => String(a.caseId)))];
  const assignmentCases = await ChildCase.find({ _id: { $in: assignmentCaseIds } })
    .select('_id childId parentId')
    .lean();
  const assignmentCaseMap = new Map(assignmentCases.map((c) => [String(c._id), c]));
  const assignmentParentIds = [...new Set(assignmentCases.map((c) => String(c.parentId)))];
  const assignmentParents = await User.find({ _id: { $in: assignmentParentIds } }).select('children').lean();
  const assignmentParentMap = new Map(assignmentParents.map((p) => [String(p._id), p]));

  const activityComplianceAlerts = overdueAssignments.map((item) => {
    const c = assignmentCaseMap.get(String(item.caseId));
    const parent = c ? assignmentParentMap.get(String(c.parentId)) : null;
    return {
      assignmentId: item._id,
      caseId: item.caseId,
      childName: c ? childNameFromParentChildren(parent, c.childId) : 'Child',
      title: item.title,
      dueDate: item.dueDate,
      message: 'Parent has not completed assigned activity',
    };
  });

  const todaySessions = await SessionLog.countDocuments({
    therapistId,
    sessionDate: { $gte: startOfToday, $lt: endOfToday },
  });

  const allPlans = await TherapyPlan.find({ therapistId }).select('shortTermGoals goals').lean();
  let totalGoals = 0;
  let achievedGoals = 0;
  for (const plan of allPlans) {
    const st = Array.isArray(plan.shortTermGoals) ? plan.shortTermGoals : [];
    for (const g of st) {
      totalGoals += 1;
      if (String(g.status) === 'Achieved') achievedGoals += 1;
    }
    const legacy = Array.isArray(plan.goals) ? plan.goals : [];
    for (const g of legacy) {
      totalGoals += 1;
      const s = String(g.status || '').toLowerCase();
      if (s.includes('achiev') || s === 'completed' || s === 'done') achievedGoals += 1;
    }
  }
  const overallProgress =
    totalGoals === 0 ? 0 : Math.min(100, Math.round((achievedGoals / totalGoals) * 100));

  return {
    assignedCases,
    upcomingSessions,
    goalReviewAlerts,
    activityComplianceAlerts,
    activeCases,
    todaySessions,
    pendingReviews,
    overallProgress,
  };
}

exports.getTherapistDashboard = async (req, res) => {
  try {
    const data = await loadTherapistDashboardData(req);
    return res.status(200).json({
      success: true,
      data: {
        assignedCases: data.assignedCases,
        upcomingSessions: data.upcomingSessions,
        goalReviewAlerts: data.goalReviewAlerts,
        activityComplianceAlerts: data.activityComplianceAlerts,
      },
    });
  } catch (error) {
    console.error('getTherapistDashboard:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch therapist dashboard' });
  }
};

/**
 * GET /therapist/dashboard-summary
 * Metrics + list payloads for production dashboard (includes assignedCases for referral actions).
 */
exports.getTherapistDashboardSummary = async (req, res) => {
  try {
    const data = await loadTherapistDashboardData(req);
    return res.status(200).json({
      success: true,
      data: {
        activeCases: data.activeCases,
        todaySessions: data.todaySessions,
        pendingReviews: data.pendingReviews,
        overallProgress: data.overallProgress,
        upcomingSessions: data.upcomingSessions,
        goalReviewAlerts: data.goalReviewAlerts,
        activityComplianceAlerts: data.activityComplianceAlerts,
        assignedCases: data.assignedCases,
      },
    });
  } catch (error) {
    console.error('getTherapistDashboardSummary:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch therapist dashboard summary' });
  }
};
