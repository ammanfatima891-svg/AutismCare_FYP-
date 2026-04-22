const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
/**
 * Case-centric integration layer: parent session/assignment views, shared progress, aggregated summary.
 * All data paths filter by caseId (single source of truth).
 */

const mongoose = require('mongoose');
const SessionLog = require('../models/SessionLog');
const TherapyPlan = require('../models/TherapyPlan');
const ProgressSnapshot = require('../models/ProgressSnapshot');
const { HomeAssignment } = require('../models/HomeAssignment');
const { ChildCase } = require('../models/ChildCase');
const { User } = require('../models/User');
const { assertUserCaseAccess } = require('../utils/caseAccess');
const { getLabRequestsForCase } = require('../utils/labCaseIntegration');
const { computeCaseProgressOverview } = require('./progressController');
const { enrichAssignments } = require('./homeAssignment.controller');

const ASSIGN_POPULATE = [
  { path: 'activityId', select: 'name instructions objective procedure materials domain frequency difficulty' },
  { path: 'sourceActivityId', select: 'name materials instructions' },
];

async function assertParentOwnsCase(parentId, caseId) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) return null;
  return ChildCase.findOne({ _id: caseId, parentId })
    .select('_id childId status riskLevel parentId clinicianId')
    .lean();
}

async function buildChildInfo(caseDoc) {
  if (!caseDoc) return null;
  const parent = await User.findById(caseDoc.parentId).select('children').lean();
  const child = (parent?.children || []).find((c) => c && String(c._id) === String(caseDoc.childId));
  const firstName = child?.firstName || '';
  const lastName = child?.lastName || '';
  return {
    caseId: caseDoc._id,
    childId: caseDoc.childId,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim() || 'Child',
    status: caseDoc.status,
    riskLevel: caseDoc.riskLevel,
  };
}

/** GET /api/parent/cases — cases for dashboard (caseId per child). */
exports.getParentCases = async (req, res) => {
  try {
    const parentId = req.user._id;
    const parent = await User.findById(parentId).select('children').lean();
    const childIds = (parent?.children || []).map((c) => String(c._id));

    if (childIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const cases = await ChildCase.find({ parentId })
      .select('_id childId status riskLevel screeningProgress createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const filtered = cases.filter((c) => childIds.includes(String(c.childId)));
    const data = filtered.map((c) => {
      const child = (parent?.children || []).find((x) => String(x._id) === String(c.childId));
      const firstName = child?.firstName || '';
      const lastName = child?.lastName || '';
      return {
        caseId: c._id,
        childId: c.childId,
        status: c.status,
        riskLevel: c.riskLevel,
        screeningProgress: c.screeningProgress || { mchatCompleted: false, asqCompleted: false, skippedMchat: false },
        childName: `${firstName} ${lastName}`.trim() || 'Child',
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getParentCases:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch cases' });
  }
};

/**
 * GET /api/parent/case/:caseId/sessions
 * Parent-facing session summaries + therapist parentInstructions.
 */
exports.getParentCaseSessions = async (req, res) => {
  try {
    const parentId = req.user._id;
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const c = await assertParentOwnsCase(parentId, caseId);
    if (!c) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const sessions = await SessionLog.find({ caseId })
      .sort({ sessionDate: -1 })
      .select('_id sessionDate duration childResponse parentInstructions status')
      .lean();

    const data = sessions.map((s) => ({
      _id: s._id,
      date: s.sessionDate,
      duration: s.duration ?? 0,
      childResponse: s.childResponse || '',
      parentInstructions: s.parentInstructions != null ? String(s.parentInstructions) : '',
      status: s.status,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getParentCaseSessions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};

/**
 * GET /api/parent/case/:caseId/assignments
 * Home assignments for this case (activity title, due date, status).
 */
/**
 * GET /api/parent/case/:caseId/lab-requests
 * Lab orders for this case (released files only; pending/uploaded shown without files).
 */
exports.getParentCaseLabRequests = async (req, res) => {
  try {
    const parentId = req.user._id;
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const c = await assertParentOwnsCase(parentId, caseId);
    if (!c) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const labRequests = await getLabRequestsForCase(c, 'parent');
    return res.status(200).json({ success: true, data: labRequests });
  } catch (error) {
    console.error('getParentCaseLabRequests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch lab requests' });
  }
};

exports.getParentCaseAssignments = async (req, res) => {
  try {
    const parentId = req.user._id;
    const { caseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const c = await assertParentOwnsCase(parentId, caseId);
    if (!c) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const list = await HomeAssignment.find({ caseId })
      .populate(ASSIGN_POPULATE)
      .sort({ dueDate: 1 })
      .lean();

    const data = enrichAssignments(
      list.map((a) => ({
        ...a,
        isLate: !!(a.dueDate && new Date(a.dueDate) < getCurrentTime() && a.status === 'pending'),
      }))
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getParentCaseAssignments:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
};

/**
 * GET /api/case/:caseId/progress
 * Goal completion %, trends (same analytics as clinician overview) + optional ProgressSnapshot docs.
 */
exports.getCaseProgress = async (req, res) => {
  try {
    const { caseId } = req.params;
    const access = await assertUserCaseAccess(req, caseId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const [overview, snapshots] = await Promise.all([
      computeCaseProgressOverview(caseId),
      ProgressSnapshot.find({ caseId }).sort({ domain: 1 }).lean(),
    ]);

    if (!overview.success) {
      return res.status(400).json({ success: false, message: 'Invalid case id' });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...overview.data,
        snapshots,
      },
      ...(overview.message ? { message: overview.message } : {}),
    });
  } catch (error) {
    console.error('getCaseProgress:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch progress' });
  }
};

/**
 * GET /api/case/:caseId/summary
 * Aggregated child + therapy plan + sessions + assignments + progress.
 */
exports.getCaseSummary = async (req, res) => {
  try {
    const { caseId } = req.params;
    const access = await assertUserCaseAccess(req, caseId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { caseDoc } = access;
    const role = String(req.user.role || '').toLowerCase();
    const labRole = role === 'clinician' ? 'clinician' : role === 'therapist' ? 'therapist' : 'parent';

    const [childInfo, therapyPlan, sessionDocs, assignmentDocs, overview, labRequests] = await Promise.all([
      buildChildInfo(caseDoc),
      TherapyPlan.findOne({ caseId }).lean(),
      SessionLog.find({ caseId }).sort({ sessionDate: -1 }).lean(),
      HomeAssignment.find({ caseId }).populate(ASSIGN_POPULATE).sort({ dueDate: 1 }).lean(),
      computeCaseProgressOverview(caseId),
      getLabRequestsForCase(caseDoc, labRole),
    ]);

    const sessions = sessionDocs.map((s) => ({
      _id: s._id,
      sessionDate: s.sessionDate,
      duration: s.duration ?? 0,
      childResponse: s.childResponse || '',
      parentInstructions: s.parentInstructions != null ? String(s.parentInstructions) : '',
      status: s.status,
    }));

    const assignments = assignmentDocs.map((a) => ({
      _id: a._id,
      activityName: a.title || (a.activityId && a.activityId.name) || 'Activity',
      title: a.title,
      dueDate: a.dueDate,
      status: a.status,
      instructions: a.instructions || '',
    }));

    const progress = overview.success ? { ...overview.data, message: overview.message } : null;

    return res.status(200).json({
      success: true,
      data: {
        childInfo,
        therapyPlan,
        sessions,
        assignments,
        progress,
        labRequests,
      },
    });
  } catch (error) {
    console.error('getCaseSummary:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch case summary' });
  }
};
