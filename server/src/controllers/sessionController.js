const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const mongoose = require('mongoose');
const SessionLog = require('../models/SessionLog');
const { ChildCase } = require('../models/ChildCase');
const TherapyPlan = require('../models/TherapyPlan');
const { assertTherapistCaseAccess } = require('../utils/therapistCaseAccess');
const { User } = require('../models/User');
const { validateSessionBody } = require('../utils/sessionLogShared');
const {
  validateSessionGoalsAndActivities,
  validateSessionGoalData,
} = require('../utils/sessionPlanValidation');
const { completeMatchingSessionSlot, validateSessionSlotForNewLog } = require('../utils/sessionSlotLink');
const { invalidateProgressEngineCache } = require('../services/progressEngine');
const { maybeLockPlanBaselineAfterSession } = require('../utils/planBaselineLock');
const { collectGoalDataLinkageWarnings } = require('../utils/sessionGoalDataValidation');
const TherapyCase = require('../models/TherapyCase');
const { THERAPY_STATUS } = require('../constants/workflowEnums');

function childNameFromCase(caseDoc, parentById) {
  if (!caseDoc) return 'Child';
  const parent = parentById.get(String(caseDoc.parentId));
  if (!parent || !Array.isArray(parent.children)) return 'Child';
  const found = parent.children.find((c) => c && c._id && c._id.toString() === caseDoc.childId.toString());
  if (!found) return 'Child';
  return `${found.firstName || ''} ${found.lastName || ''}`.trim() || 'Child';
}

/**
 * GET /api/sessions
 * All session logs for the logged-in therapist, with child name + optional therapy domain label.
 */
exports.listAllSessionsForTherapist = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const sessions = await SessionLog.find({ therapistId }).sort({ sessionDate: -1 }).lean();

    if (sessions.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const caseIds = [...new Set(sessions.map((s) => String(s.caseId)))];
    const cases = await ChildCase.find({ _id: { $in: caseIds } }).select('_id childId parentId').lean();
    const caseMap = new Map(cases.map((c) => [String(c._id), c]));

    const parentIds = [...new Set(cases.map((c) => String(c.parentId)))];
    const parents = await User.find({ _id: { $in: parentIds } }).select('children').lean();
    const parentById = new Map(parents.map((p) => [String(p._id), p]));

    const plans = await TherapyPlan.find({ caseId: { $in: caseIds }, therapistId }).select('caseId domains').lean();
    const domainByCase = new Map(
      plans.map((p) => {
        const d = Array.isArray(p.domains) && p.domains.length ? String(p.domains[0]) : '';
        return [String(p.caseId), d];
      })
    );

    const data = sessions.map((s) => {
      const c = caseMap.get(String(s.caseId));
      return {
        ...s,
        childName: childNameFromCase(c, parentById),
        therapyDomain: domainByCase.get(String(s.caseId)) || '',
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('listAllSessionsForTherapist:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};

/**
 * POST /api/sessions
 * Body: { caseId, sessionDate, duration, goalsTargeted, activitiesUsed, childResponse, notes, parentInstructions, status }
 */
exports.createSession = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { caseId, sessionSlotId } = req.body || {};

    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/sessions] therapistId=', String(therapistId), 'caseId=', caseId);
    }

    if (!caseId || !mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Valid caseId is required' });
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

    const planCheck = await validateSessionGoalsAndActivities(caseId, therapistId, v.payload.goalsTargeted, v.payload.activitiesUsed);
    if (!planCheck.ok) {
      return res.status(400).json({ success: false, message: planCheck.message });
    }

    const goalDataCheck = await validateSessionGoalData(caseId, therapistId, v.payload.goalData || []);
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

    const planStamp = await TherapyPlan.findOne({ caseId, therapistId }).select('_id planVersion').lean();
    const planForWarnings = await TherapyPlan.findOne({ caseId, therapistId })
      .select('shortTermGoals goals')
      .lean();

    const created = await SessionLog.create({
      caseId,
      therapistId,
      sessionDate: p.sessionDate,
      duration: p.duration,
      goalsTargeted: p.goalsTargeted,
      activitiesUsed: p.activitiesUsed,
      childResponse: p.childResponse,
      notes: p.notes,
      parentInstructions: p.parentInstructions,
      status: p.status,
      goalData: Array.isArray(p.goalData) ? p.goalData : [],
      planId: planStamp?._id,
      planVersionNumber: planStamp?.planVersion != null ? Number(planStamp.planVersion) : 1,
      noteState: p.noteState || 'draft',
      lateEntry: Boolean(p.lateEntry),
      lateEntryReason: p.lateEntryReason || '',
      ...(slotRef ? { sessionSlotId: slotRef } : {}),
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[POST /api/sessions] saved session _id=', String(created._id));
    }

    try {
      await completeMatchingSessionSlot({
        caseId,
        sessionDate: p.sessionDate,
        sessionSlotId,
      });
    } catch (linkErr) {
      console.error('completeMatchingSessionSlot:', linkErr);
    }

    try {
      await maybeLockPlanBaselineAfterSession(caseId, therapistId);
    } catch (lockErr) {
      console.error('maybeLockPlanBaselineAfterSession:', lockErr);
    }

    try {
      invalidateProgressEngineCache(caseId);
    } catch (_) {
      /* ignore cache bust errors */
    }

    const warnings = collectGoalDataLinkageWarnings(planForWarnings, Array.isArray(p.goalData) ? p.goalData : []);

    return res.status(201).json({
      success: true,
      message: 'Session saved successfully',
      data: created,
      ...(warnings.length ? { warnings } : {}),
    });
  } catch (error) {
    console.error('createSession:', error);
    return res.status(500).json({ success: false, message: 'Failed to create session' });
  }
};

/**
 * GET /api/sessions/case/:caseId
 * GET /api/sessions/:caseId (same behavior; caseId must be a valid ObjectId)
 */
exports.getSessionsByCase = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const access = await assertTherapistCaseAccess(req, caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const sessions = await SessionLog.find({ caseId, therapistId }).sort({ sessionDate: -1 }).lean();
    return res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('getSessionsByCase:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};

/**
 * PATCH /api/sessions/:id
 */
exports.updateSession = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const session = await SessionLog.findOne({ _id: id, therapistId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (String(session.noteState || '') === 'locked') {
      return res.status(403).json({ success: false, message: 'Session note is locked and cannot be edited' });
    }

    const access = await assertTherapistCaseAccess(req, session.caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const merged = {
      sessionDate: req.body.sessionDate != null ? req.body.sessionDate : session.sessionDate,
      duration: req.body.duration != null ? req.body.duration : session.duration,
      goalsTargeted:
        req.body.goalsTargeted != null ? req.body.goalsTargeted : [...(session.goalsTargeted || [])],
      activitiesUsed:
        req.body.activitiesUsed != null ? req.body.activitiesUsed : [...(session.activitiesUsed || [])],
      childResponse: req.body.childResponse != null ? req.body.childResponse : session.childResponse,
      notes: req.body.notes != null ? req.body.notes : session.notes,
      parentInstructions:
        req.body.parentInstructions != null ? req.body.parentInstructions : session.parentInstructions,
      status: req.body.status != null ? req.body.status : session.status,
      goalData: req.body.goalData != null ? req.body.goalData : [...(session.goalData || [])],
      noteState: req.body.noteState != null ? req.body.noteState : session.noteState,
      lateEntry: req.body.lateEntry != null ? req.body.lateEntry : session.lateEntry,
      lateEntryReason: req.body.lateEntryReason != null ? req.body.lateEntryReason : session.lateEntryReason,
    };

    const v = validateSessionBody(merged, { requireGoalsAndActivities: true, isUpdate: true });
    if (!v.ok) {
      return res.status(400).json({ success: false, message: v.message });
    }

    const planCheck = await validateSessionGoalsAndActivities(
      session.caseId,
      therapistId,
      v.payload.goalsTargeted,
      v.payload.activitiesUsed
    );
    if (!planCheck.ok) {
      return res.status(400).json({ success: false, message: planCheck.message });
    }

    const goalDataCheck = await validateSessionGoalData(session.caseId, therapistId, v.payload.goalData || []);
    if (!goalDataCheck.ok) {
      return res.status(400).json({ success: false, message: goalDataCheck.message });
    }

    const p = v.payload;
    session.sessionDate = p.sessionDate;
    session.duration = p.duration;
    session.goalsTargeted = p.goalsTargeted;
    session.activitiesUsed = p.activitiesUsed;
    session.childResponse = p.childResponse;
    session.notes = p.notes;
    session.parentInstructions = p.parentInstructions;
    session.status = p.status;
    session.goalData = Array.isArray(p.goalData) ? p.goalData : [];
    session.noteState = p.noteState || session.noteState;
    session.lateEntry = Boolean(p.lateEntry);
    session.lateEntryReason = p.lateEntryReason || '';

    await session.save();
    try {
      invalidateProgressEngineCache(session.caseId);
    } catch (_) {
      /* ignore */
    }
    const planForWarnings = await TherapyPlan.findOne({ caseId: session.caseId, therapistId })
      .select('shortTermGoals goals')
      .lean();
    const warnings = collectGoalDataLinkageWarnings(planForWarnings, Array.isArray(p.goalData) ? p.goalData : []);
    return res.status(200).json({
      success: true,
      data: session.toObject(),
      ...(warnings.length ? { warnings } : {}),
    });
  } catch (error) {
    console.error('updateSession:', error);
    return res.status(500).json({ success: false, message: 'Failed to update session' });
  }
};

/**
 * PATCH /api/sessions/:id/sign — therapist signs the session note (clinical workflow).
 */
exports.signSession = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const session = await SessionLog.findOne({ _id: id, therapistId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const access = await assertTherapistCaseAccess(req, session.caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    if (String(session.noteState || '') === 'locked') {
      return res.status(400).json({ success: false, message: 'Session is locked' });
    }

    session.noteState = 'signed';
    session.signedAt = getCurrentTime();
    session.signedBy = therapistId;
    await session.save();

    try {
      invalidateProgressEngineCache(session.caseId);
    } catch (_) {
      /* ignore */
    }

    return res.status(200).json({ success: true, data: session.toObject() });
  } catch (error) {
    console.error('signSession:', error);
    return res.status(500).json({ success: false, message: 'Failed to sign session' });
  }
};
