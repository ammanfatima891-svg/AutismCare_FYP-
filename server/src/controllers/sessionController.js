const mongoose = require('mongoose');
const SessionLog = require('../models/SessionLog');
const { ChildCase } = require('../models/ChildCase');
const TherapyPlan = require('../models/TherapyPlan');
const { assertTherapistCaseAccess } = require('../utils/therapistCaseAccess');
const { User } = require('../models/User');
const { validateSessionBody } = require('../utils/sessionLogShared');
const { validateSessionGoalsAndActivities } = require('../utils/sessionPlanValidation');
const { completeMatchingSessionSlot, validateSessionSlotForNewLog } = require('../utils/sessionSlotLink');

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

    const planCheck = await validateSessionGoalsAndActivities(caseId, therapistId, v.payload.goalsTargeted, v.payload.activitiesUsed);
    if (!planCheck.ok) {
      return res.status(400).json({ success: false, message: planCheck.message });
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

    return res.status(201).json({
      success: true,
      message: 'Session saved successfully',
      data: created,
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

    const p = v.payload;
    session.sessionDate = p.sessionDate;
    session.duration = p.duration;
    session.goalsTargeted = p.goalsTargeted;
    session.activitiesUsed = p.activitiesUsed;
    session.childResponse = p.childResponse;
    session.notes = p.notes;
    session.parentInstructions = p.parentInstructions;
    session.status = p.status;

    await session.save();
    return res.status(200).json({ success: true, data: session.toObject() });
  } catch (error) {
    console.error('updateSession:', error);
    return res.status(500).json({ success: false, message: 'Failed to update session' });
  }
};
