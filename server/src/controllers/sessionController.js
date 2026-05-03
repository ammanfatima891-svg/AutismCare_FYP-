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
  buildActivityUsageRows,
  findSessionContextPlan,
} = require('../utils/sessionPlanValidation');
const { getActiveEpisodeForCase, ensureActiveEpisodeForPlan } = require('../services/therapyEpisodeService');
const { completeMatchingSessionSlot, validateSessionSlotForNewLog } = require('../utils/sessionSlotLink');
const { invalidateProgressEngineCache, computeProgressEngineForCase } = require('../services/progressEngine');
const { buildPostSessionProgressFeedback } = require('../utils/postSessionProgressFeedback');
const { maybeLockPlanBaselineAfterSession } = require('../utils/planBaselineLock');
const { collectGoalDataLinkageWarnings } = require('../utils/sessionGoalDataValidation');
const TherapyCase = require('../models/TherapyCase');
const { THERAPY_STATUS } = require('../constants/workflowEnums');
const { scheduleEmitClinicalEvent, actorFromReq, slimProgressSnapshot } = require('../services/clinicalEventService');
const { buildCrossDomainInsights, getLabContextForCase } = require('../services/clinicalCorrelationService');

function childNameFromCase(caseDoc, parentById) {
  if (!caseDoc) return 'Child';
  const parent = parentById.get(String(caseDoc.parentId));
  if (!parent || !Array.isArray(parent.children)) return 'Child';
  const found = parent.children.find((c) => c && c._id && c._id.toString() === caseDoc.childId.toString());
  if (!found) return 'Child';
  return `${found.firstName || ''} ${found.lastName || ''}`.trim() || 'Child';
}

/** Same plan document session APIs validate against (caseId + this therapist). */
async function loadTherapyPlanForSession(caseId, therapistId) {
  const planLean = await findSessionContextPlan(caseId, therapistId);
  if (planLean) return { ok: true, planLean };
  const anyPlan = await TherapyPlan.findOne({ caseId }).sort({ updatedAt: -1 }).select('therapistId').lean();
  let message = 'A therapy plan is required before logging sessions for this case';
  if (anyPlan && String(anyPlan.therapistId) !== String(therapistId)) {
    message =
      'A therapy plan exists for this case under a different therapist account. Log in as the assigned therapist and open Therapy Plans for this case, or duplicate the plan to your account so session logs match the plan your care team uses.';
  }
  return { ok: false, message };
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

    const planLoad = await loadTherapyPlanForSession(caseId, therapistId);
    if (!planLoad.ok) {
      return res.status(400).json({
        success: false,
        message: planLoad.message,
        errorCode: 'THERAPY_PLAN_REQUIRED',
      });
    }
    const { planLean } = planLoad;

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

    let activeEpisode = await getActiveEpisodeForCase(caseId);
    if (!activeEpisode || String(activeEpisode.therapistId) !== String(therapistId) || !activeEpisode.isActive) {
      try {
        await ensureActiveEpisodeForPlan(planLean);
      } catch (e) {
        console.error('[POST /api/sessions] ensureActiveEpisodeForPlan:', e?.message || e);
      }
      activeEpisode = await getActiveEpisodeForCase(caseId);
    }
    if (!activeEpisode || String(activeEpisode.therapistId) !== String(therapistId)) {
      return res.status(400).json({
        success: false,
        message: 'No active therapy episode found for this case. Complete plan approval and episode setup before logging sessions.',
        errorCode: 'NO_ACTIVE_EPISODE',
      });
    }
    if (!activeEpisode.isActive) {
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

    let progressFeedback = null;
    try {
      progressFeedback = await buildPostSessionProgressFeedback(caseId, therapistId);
    } catch (_) {
      /* non-blocking */
    }

    const planForWarnings = await TherapyPlan.findOne({ caseId, therapistId })
      .select('shortTermGoals goals')
      .lean();
    const warnings = collectGoalDataLinkageWarnings(planForWarnings, Array.isArray(p.goalData) ? p.goalData : []);

    try {
      const act = actorFromReq(req);
      let peSnap = null;
      let cross = [];
      if (progressFeedback) {
        peSnap = {
          overallScore: progressFeedback.overallScore,
          overallTrend: progressFeedback.overallTrend,
          clinicalRecommendation: progressFeedback.clinicalRecommendation,
          overallClinicalStatus: progressFeedback.overallClinicalStatus,
        };
        try {
          const full = await computeProgressEngineForCase(caseId, { therapistId, useCache: false });
          if (full.success && full.data) {
            peSnap = slimProgressSnapshot(full.data);
            const labCtx = await getLabContextForCase(caseId);
            cross = buildCrossDomainInsights(full.data, labCtx);
          }
        } catch (_) {
          /* keep peSnap from progressFeedback */
        }
      }
      scheduleEmitClinicalEvent({
        eventType: 'PROGRESS_UPDATED',
        caseId,
        actorRole: act.actorRole,
        actorId: act.actorId,
        linkedModules: ['therapy', 'progress'],
        payload: { sessionId: String(created._id), trigger: 'session_created' },
        progressEngineSnapshot: peSnap || undefined,
        crossDomainInsight: cross.length ? cross : undefined,
      });
    } catch (evErr) {
      console.error('clinical event session create:', evErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Session saved successfully',
      data: created,
      ...(warnings.length ? { warnings } : {}),
      ...(progressFeedback ? { progressFeedback } : {}),
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

    const planLoad = await loadTherapyPlanForSession(session.caseId, therapistId);
    if (!planLoad.ok) {
      return res.status(400).json({
        success: false,
        message: planLoad.message,
        errorCode: 'THERAPY_PLAN_REQUIRED',
      });
    }
    const { planLean } = planLoad;

    const planCheck = await validateSessionGoalsAndActivities(
      session.caseId,
      therapistId,
      v.payload.goalsTargeted,
      v.payload.activitiesUsed,
      { plan: planLean }
    );
    if (!planCheck.ok) {
      return res.status(400).json({ success: false, message: planCheck.message });
    }

    const goalDataCheck = await validateSessionGoalData(session.caseId, therapistId, v.payload.goalData || [], {
      plan: planLean,
    });
    if (!goalDataCheck.ok) {
      return res.status(400).json({ success: false, message: goalDataCheck.message });
    }

    let activeEpisode = await getActiveEpisodeForCase(session.caseId);
    if (!activeEpisode || String(activeEpisode.therapistId) !== String(therapistId) || !activeEpisode.isActive) {
      try {
        await ensureActiveEpisodeForPlan(planLean);
      } catch (e) {
        console.error('[PATCH /api/sessions] ensureActiveEpisodeForPlan:', e?.message || e);
      }
      activeEpisode = await getActiveEpisodeForCase(session.caseId);
    }
    if (!activeEpisode || String(activeEpisode.therapistId) !== String(therapistId) || !activeEpisode.isActive) {
      return res.status(400).json({
        success: false,
        message: 'No active therapy episode found for this case.',
        errorCode: 'NO_ACTIVE_EPISODE',
      });
    }

    const p = v.payload;
    const activityUsage = buildActivityUsageRows(p.activitiesUsed, planLean);
    const activitiesUsedDeduped = activityUsage.map((row) => row.displayName);
    session.sessionDate = p.sessionDate;
    session.duration = p.duration;
    session.goalsTargeted = p.goalsTargeted;
    session.activitiesUsed = activitiesUsedDeduped;
    session.activityUsage = activityUsage;
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
    try {
      const act = actorFromReq(req);
      let peSnap = null;
      let cross = [];
      try {
        const full = await computeProgressEngineForCase(session.caseId, { therapistId, useCache: false });
        if (full.success && full.data) {
          peSnap = slimProgressSnapshot(full.data);
          const labCtx = await getLabContextForCase(session.caseId);
          cross = buildCrossDomainInsights(full.data, labCtx);
        }
      } catch (_) {}
      scheduleEmitClinicalEvent({
        eventType: 'PROGRESS_UPDATED',
        caseId: session.caseId,
        actorRole: act.actorRole,
        actorId: act.actorId,
        linkedModules: ['therapy', 'progress'],
        payload: { sessionId: String(session._id), trigger: 'session_updated' },
        progressEngineSnapshot: peSnap || undefined,
        crossDomainInsight: cross.length ? cross : undefined,
      });
    } catch (evErr) {
      console.error('clinical event session update:', evErr);
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

    try {
      const act = actorFromReq(req);
      scheduleEmitClinicalEvent({
        eventType: 'SESSION_COMPLETED',
        caseId: session.caseId,
        actorRole: act.actorRole,
        actorId: act.actorId,
        linkedModules: ['therapy'],
        payload: { sessionId: String(session._id), signedAt: session.signedAt },
      });
    } catch (evErr) {
      console.error('clinical event session sign:', evErr);
    }

    return res.status(200).json({ success: true, data: session.toObject() });
  } catch (error) {
    console.error('signSession:', error);
    return res.status(500).json({ success: false, message: 'Failed to sign session' });
  }
};
