const mongoose = require('mongoose');
const path = require('path');
const { HomeAssignment } = require('../models/HomeAssignment');
const TherapyCase = require('../models/TherapyCase');
const { ChildCase } = require('../models/ChildCase');
const { User } = require('../models/User');
const Activity = require('../models/Activity');
const SessionLog = require('../models/SessionLog');
const { assertTherapistCaseAccess } = require('../utils/therapistCaseAccess');
const { createNotification } = require('../utils/notification');
const { NOTIFICATION_TYPES } = require('../models/Notification');
const { activityAccessFilter } = require('../utils/activityShared');

const ASSIGN_POPULATE = [
  { path: 'activityId', select: 'name instructions objective procedure materials domain frequency difficulty' },
  { path: 'sourceActivityId', select: 'name materials instructions' },
];

/** API shape: submissionUrl, activityName, normalized therapistFeedback for parent + therapist clients. */
function enrichAssignment(doc) {
  if (doc == null) return doc;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

  const activityFromPopulate =
    o.activityId && typeof o.activityId === 'object' && o.activityId.name ? String(o.activityId.name).trim() : '';
  const titleStr = o.title != null ? String(o.title).trim() : '';
  if (!o.activityName) o.activityName = titleStr || activityFromPopulate || '';

  if (o.parentSubmission && typeof o.parentSubmission === 'object') {
    const ps = { ...o.parentSubmission };
    if (ps.fileUrl && !ps.submissionUrl) ps.submissionUrl = ps.fileUrl;
    o.parentSubmission = ps;
    const url = ps.submissionUrl || ps.fileUrl;
    if (url) o.submissionUrl = url;
  }

  if (o.therapistFeedback && typeof o.therapistFeedback === 'object') {
    const tf = { ...o.therapistFeedback };
    const comment = tf.comment != null ? String(tf.comment).trim() : '';
    const rating =
      tf.rating != null && tf.rating !== '' && !Number.isNaN(Number(tf.rating)) ? Number(tf.rating) : null;
    const reviewedAt = tf.reviewedAt != null ? tf.reviewedAt : null;
    o.therapistFeedback = {
      comment: comment || null,
      feedback: comment || null,
      rating: rating != null && rating >= 1 && rating <= 5 ? rating : null,
      reviewedAt: reviewedAt || null,
    };
  }

  return o;
}

function enrichAssignments(list) {
  if (!Array.isArray(list)) return list;
  return list.map((x) => enrichAssignment(x));
}

exports.enrichAssignment = enrichAssignment;
exports.enrichAssignments = enrichAssignments;

function childNameFromCase(caseDoc, parentById) {
  if (!caseDoc) return 'Child';
  const parent = parentById.get(String(caseDoc.parentId));
  if (!parent || !Array.isArray(parent.children)) return 'Child';
  const found = parent.children.find((c) => c && c._id && c._id.toString() === caseDoc.childId.toString());
  if (!found) return 'Child';
  return `${found.firstName || ''} ${found.lastName || ''}`.trim() || 'Child';
}

function buildInstructionsFromActivity(activity) {
  const parts = [];
  if (activity.objective) parts.push(`Objective: ${activity.objective}`);
  if (activity.procedure) parts.push(`Procedure: ${activity.procedure}`);
  if (activity.instructions) parts.push(activity.instructions);
  return parts.join('\n\n').trim() || activity.instructions || '';
}

async function loadActivityForTherapist(activityId, therapistId) {
  if (!activityId || !mongoose.Types.ObjectId.isValid(String(activityId))) return null;
  return Activity.findOne({ _id: activityId, ...activityAccessFilter(therapistId) }).lean();
}

/**
 * Therapist: create assignment (shared by POST /therapist/cases/:caseId/assignments and POST /api/assignments)
 */
exports.createHomeAssignment = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { caseId } = req.params;
    const body = req.body || {};
    const {
      title,
      instructions,
      dueDate,
      materials,
      sourceActivityId,
      activityId: bodyActivityId,
    } = body;

    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const access = await assertTherapistCaseAccess(req, caseId, therapistId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const activityRef = bodyActivityId || sourceActivityId;
    let activityDoc = null;
    if (activityRef && mongoose.Types.ObjectId.isValid(String(activityRef))) {
      activityDoc = await loadActivityForTherapist(activityRef, therapistId);
      if (!activityDoc) {
        return res.status(404).json({ success: false, message: 'Activity not found in your library' });
      }
    }

    if (!dueDate) {
      return res.status(400).json({ success: false, message: 'dueDate is required' });
    }
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid dueDate' });
    }

    const resolvedTitle = activityDoc
      ? String(activityDoc.name).trim()
      : String(title || '').trim();
    if (!resolvedTitle) {
      return res.status(400).json({ success: false, message: 'title or activityId is required' });
    }

    const resolvedInstructions = String(instructions ?? '').trim()
      || (activityDoc ? buildInstructionsFromActivity(activityDoc) : '');
    const resolvedMaterials = String(materials ?? '').trim()
      || (activityDoc ? String(activityDoc.materials || '').trim() : '');

    const payload = {
      caseId,
      therapistId,
      title: resolvedTitle,
      instructions: resolvedInstructions,
      materials: resolvedMaterials,
      dueDate: due,
      status: 'pending',
    };

    if (activityDoc) {
      const aid = new mongoose.Types.ObjectId(String(activityRef));
      payload.activityId = aid;
      payload.sourceActivityId = aid;
    } else if (sourceActivityId && mongoose.Types.ObjectId.isValid(String(sourceActivityId))) {
      payload.sourceActivityId = new mongoose.Types.ObjectId(String(sourceActivityId));
    }

    const created = await HomeAssignment.create(payload);
    const populated = await HomeAssignment.findById(created._id).populate(ASSIGN_POPULATE).lean();

    return res.status(201).json({
      success: true,
      message: 'Assignment created',
      data: enrichAssignment(populated),
    });
  } catch (error) {
    console.error('createHomeAssignment:', error);
    return res.status(500).json({ success: false, message: 'Failed to create assignment' });
  }
};

/**
 * POST /api/assignments — body: { caseId, activityId?, title?, instructions?, materials?, dueDate }
 */
exports.createAssignmentPost = async (req, res) => {
  const { caseId, activityId, title, instructions, materials, dueDate, sourceActivityId } = req.body || {};
  if (!caseId || !mongoose.Types.ObjectId.isValid(String(caseId))) {
    return res.status(400).json({ success: false, message: 'Valid caseId is required in body' });
  }
  req.params.caseId = String(caseId);
  req.body = {
    title,
    instructions,
    materials,
    dueDate,
    activityId: activityId || sourceActivityId,
    sourceActivityId: sourceActivityId || activityId,
  };
  return exports.createHomeAssignment(req, res);
};

/**
 * GET /api/assignments/summary
 * Dashboard metrics: active (not completed), completed, new submissions (submitted), behind schedule (overdue pending/submitted).
 */
exports.getHomeAssignmentsSummaryForTherapist = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const base = { therapistId };

    const [activeAssignments, completed, newSubmissions, behindSchedule] = await Promise.all([
      HomeAssignment.countDocuments({
        ...base,
        status: { $in: ['pending', 'submitted', 'reviewed'] },
      }),
      HomeAssignment.countDocuments({ ...base, status: 'completed' }),
      HomeAssignment.countDocuments({ ...base, status: 'submitted' }),
      HomeAssignment.countDocuments({
        ...base,
        dueDate: { $lt: startOfToday },
        status: { $in: ['pending', 'submitted'] },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        activeAssignments,
        completed,
        newSubmissions,
        behindSchedule,
      },
    });
  } catch (error) {
    console.error('getHomeAssignmentsSummaryForTherapist:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignment summary' });
  }
};

/**
 * GET /api/assignments
 * All home assignments for the logged-in therapist (enriched with childName).
 */
exports.listAllAssignmentsForTherapist = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const list = await HomeAssignment.find({ therapistId })
      .populate(ASSIGN_POPULATE)
      .sort({ dueDate: -1 })
      .lean();

    if (list.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const caseIds = [
      ...new Set(
        list
          .map((a) => (a && a.caseId ? String(a.caseId) : ''))
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
      ),
    ];
    const cases =
      caseIds.length > 0
        ? await ChildCase.find({ _id: { $in: caseIds } }).select('_id childId parentId').lean()
        : [];
    const caseMap = new Map(cases.map((c) => [String(c._id), c]));

    const parentIds = [...new Set(cases.map((c) => String(c.parentId)))];
    const parents = await User.find({ _id: { $in: parentIds } }).select('children').lean();
    const parentById = new Map(parents.map((p) => [String(p._id), p]));

    const data = enrichAssignments(
      list.map((a) => {
        const c = caseMap.get(String(a.caseId));
        return {
          ...a,
          childName: childNameFromCase(c, parentById),
        };
      })
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('listAllAssignmentsForTherapist:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
};

exports.getAssignmentsByCaseForTherapist = async (req, res) => {
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

    const list = await HomeAssignment.find({ caseId, therapistId })
      .populate(ASSIGN_POPULATE)
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, data: enrichAssignments(list) });
  } catch (error) {
    console.error('getAssignmentsByCaseForTherapist:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
};

/**
 * GET /api/assignments/case/:caseId — alias
 */
exports.getAssignmentsByCaseAlias = exports.getAssignmentsByCaseForTherapist;

/**
 * PATCH /api/assignments/:id/review
 * body: { comment?, rating?, markComplete?: boolean }
 */
exports.reviewAssignment = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;
    const { comment, rating, markComplete, feedback } = req.body || {};
    const commentOrFeedback = comment !== undefined ? comment : feedback;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    }

    const doc = await HomeAssignment.findById(id).lean();
    if (!doc || String(doc.therapistId) !== String(therapistId)) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (doc.status === 'pending') {
      return res.status(400).json({ success: false, message: 'Nothing submitted to review yet' });
    }

    const set = {};
    let newStatus = doc.status;
    if (markComplete === true || markComplete === 'true') {
      newStatus = 'completed';
    } else if (doc.status === 'submitted') {
      newStatus = 'reviewed';
    }

    if (commentOrFeedback !== undefined) {
      set['therapistFeedback.comment'] = String(commentOrFeedback).trim();
    }
    if (rating !== undefined && rating !== null && rating !== '') {
      const r = Number(rating);
      if (!Number.isNaN(r) && r >= 1 && r <= 5) {
        set['therapistFeedback.rating'] = r;
      }
    }
    set['therapistFeedback.reviewedAt'] = new Date();
    set.status = newStatus;

    const updated = await HomeAssignment.findByIdAndUpdate(id, { $set: set }, { new: true })
      .populate(ASSIGN_POPULATE)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Assignment updated',
      data: enrichAssignment(updated),
    });
  } catch (error) {
    console.error('reviewAssignment:', error);
    return res.status(500).json({ success: false, message: 'Failed to review assignment' });
  }
};

async function assertParentOwnsCase(parentId, caseId) {
  const c = await ChildCase.findOne({ _id: caseId, parentId }).select('_id childId').lean();
  return c;
}

// Parent: GET /api/parent/home-assignments (all)
exports.getParentHomeAssignments = async (req, res) => {
  try {
    const parentId = req.user._id;
    const parent = await User.findById(parentId).select('children').lean();
    const childIds = (parent?.children || []).map((c) => String(c._id));

    if (childIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const cases = await ChildCase.find({ parentId }).select('_id childId').lean();
    const caseIds = cases.filter((c) => childIds.includes(String(c.childId))).map((c) => c._id);

    if (!caseIds.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const assignments = await HomeAssignment.find({ caseId: { $in: caseIds } })
      .populate(ASSIGN_POPULATE)
      .sort({ dueDate: 1 })
      .lean();

    const caseMap = new Map(cases.map((c) => [String(c._id), c]));
    const data = enrichAssignments(
      assignments.map((a) => {
        const c = caseMap.get(String(a.caseId));
        const child = (parent?.children || []).find((x) => c && String(x._id) === String(c.childId));
        const isLate = a.dueDate && new Date(a.dueDate) < new Date() && a.status === 'pending';
        return {
          ...a,
          childName: child ? `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Child' : 'Child',
          isLate: !!isLate,
        };
      })
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getParentHomeAssignments:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch home assignments' });
  }
};

/** GET /api/parent/assignments/:caseId */
exports.getParentAssignmentsByCase = async (req, res) => {
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
        isLate: a.dueDate && new Date(a.dueDate) < new Date() && a.status === 'pending',
      }))
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getParentAssignmentsByCase:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
};

/**
 * PATCH /api/parent/assignments/:id/submit
 * — multipart: field "file" (image/video), or
 * — JSON: { submissionUrl, fileType: "image"|"video" } (hosted evidence URL)
 */
exports.submitParentAssignment = async (req, res) => {
  try {
    const parentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    }

    const doc = await HomeAssignment.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const c = await assertParentOwnsCase(parentId, doc.caseId);
    if (!c) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (doc.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Submission not allowed for current status',
      });
    }

    let fileUrl = '';
    let fileType = '';

    if (req.file) {
      const mime = req.file.mimetype || '';
      if (mime.startsWith('image/')) fileType = 'image';
      else if (mime.startsWith('video/')) fileType = 'video';
      else {
        return res.status(400).json({ success: false, message: 'Only image or video uploads are allowed' });
      }
      fileUrl = `/uploads/home-assignments/${req.file.filename}`;
    } else {
      const body = req.body || {};
      const rawUrl = String(body.submissionUrl || body.fileUrl || '').trim();
      const ft = String(body.fileType || '').toLowerCase();
      if (!rawUrl) {
        return res.status(400).json({
          success: false,
          message: 'Upload a file (multipart) or send JSON with submissionUrl and fileType',
        });
      }
      if (ft !== 'image' && ft !== 'video') {
        return res.status(400).json({ success: false, message: 'fileType must be image or video' });
      }
      const isHttp = /^https?:\/\//i.test(rawUrl);
      const isRel = rawUrl.startsWith('/');
      if (!isHttp && !isRel) {
        return res.status(400).json({ success: false, message: 'submissionUrl must be a valid URL or path' });
      }
      fileUrl = rawUrl;
      fileType = ft;
    }

    const updated = await HomeAssignment.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'submitted',
          parentSubmission: {
            fileUrl,
            fileType,
            submittedAt: new Date(),
          },
        },
      },
      { new: true }
    )
      .populate(ASSIGN_POPULATE)
      .lean();

    if (updated && doc.therapistId) {
      try {
        const assignmentTitle = String(doc.title || updated.title || 'Home assignment').trim() || 'Home assignment';
        await createNotification({
          recipientId: doc.therapistId,
          type: NOTIFICATION_TYPES.THERAPIST_ASSIGNMENT_SUBMITTED,
          title: 'Home assignment submitted',
          message: `A parent submitted evidence for “${assignmentTitle}”. Open Home assignments or the case file to review.`,
          relatedResourceType: 'HomeAssignment',
          relatedResourceId: updated._id,
          relatedCaseId: doc.caseId,
        });
      } catch (notifyErr) {
        console.error('submitParentAssignment notification:', notifyErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Submission received',
      data: enrichAssignment(updated),
    });
  } catch (error) {
    console.error('submitParentAssignment:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to submit' });
  }
};

/** PATCH /api/parent/assignments/:id/complete — parent acknowledges after review */
exports.parentMarkComplete = async (req, res) => {
  try {
    const parentId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid assignment id' });
    }

    const doc = await HomeAssignment.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const c = await assertParentOwnsCase(parentId, doc.caseId);
    if (!c) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (doc.status !== 'reviewed') {
      return res.status(400).json({
        success: false,
        message: 'Complete step is only available after therapist feedback',
      });
    }

    const updated = await HomeAssignment.findByIdAndUpdate(
      id,
      { $set: { status: 'completed' } },
      { new: true }
    )
      .populate(ASSIGN_POPULATE)
      .lean();

    return res.status(200).json({ success: true, message: 'Marked complete', data: enrichAssignment(updated) });
  } catch (error) {
    console.error('parentMarkComplete:', error);
    return res.status(500).json({ success: false, message: 'Failed to update assignment' });
  }
};

/**
 * Parent: GET /api/parent/therapy-session-instructions?childId=
 */
exports.getParentTherapySessionInstructions = async (req, res) => {
  try {
    const parentId = req.user._id;
    const childId = req.query.childId ? String(req.query.childId) : null;

    const parent = await User.findById(parentId).select('children').lean();
    const childIds = (parent?.children || []).map((c) => String(c._id));

    const caseQuery = { parentId };
    const cases = await ChildCase.find(caseQuery).select('_id childId').lean();

    let filtered = cases.filter((c) => childIds.includes(String(c.childId)));
    if (childId) {
      filtered = filtered.filter((c) => String(c.childId) === childId);
    }

    const caseIds = filtered.map((c) => c._id);
    if (!caseIds.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const sessions = await SessionLog.find({
      caseId: { $in: caseIds },
      parentInstructions: { $nin: [null, ''], $exists: true },
    })
      .sort({ sessionDate: -1 })
      .limit(50)
      .lean();

    const caseMap = new Map(filtered.map((c) => [String(c._id), c]));
    const data = sessions.map((s) => {
      const c = caseMap.get(String(s.caseId));
      const child = (parent?.children || []).find((x) => c && String(x._id) === String(c.childId));
      return {
        _id: s._id,
        caseId: s.caseId,
        sessionDate: s.sessionDate,
        parentInstructions: s.parentInstructions,
        status: s.status,
        childName: child ? `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Child' : 'Child',
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getParentTherapySessionInstructions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch therapist instructions' });
  }
};
