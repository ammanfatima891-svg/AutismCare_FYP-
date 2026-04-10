const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const TherapyPlan = require('../models/TherapyPlan');
const TherapyCase = require('../models/TherapyCase');
const { HomeAssignment } = require('../models/HomeAssignment');
const {
  normalizeActivityInput,
  applyDomainFilter,
  applySearchFilter,
  hasActivityBodyContent,
  activityAccessFilter,
  ACTIVITY_DOMAIN_OPTIONS,
  DIFFICULTY_OPTIONS,
} = require('../utils/activityShared');

function applyActivityFields(doc, n) {
  doc.name = n.name;
  doc.objective = n.objective;
  doc.procedure = n.procedure;
  doc.notes = n.notes;
  doc.instructions = n.instructions;
  doc.materials = n.materials;
  doc.frequency = n.frequency;
  doc.difficulty = n.difficulty;
  doc.parentInvolvement = n.parentInvolvement;
  doc.domain = n.domain;
  doc.isTemplate = n.isTemplate;
}

/** Combined text for therapy plan embedded activity */
function buildPlanDescription(activity) {
  const parts = [activity.objective, activity.instructions, activity.procedure, activity.notes]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  let d = parts.join('\n\n');
  if (activity.materials) {
    d += (d ? '\n\n' : '') + `Materials: ${String(activity.materials).trim()}`;
  }
  if (activity.frequency) {
    d += (d ? '\n\n' : '') + `Frequency: ${String(activity.frequency).trim()}`;
  }
  return d;
}

/** Parent-facing instructions (materials stored separately on HomeAssignment) */
function buildHomeInstructions(activity) {
  const parts = [activity.objective, activity.instructions, activity.procedure, activity.notes]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  return parts.join('\n\n');
}

/**
 * POST /api/activities
 */
exports.createActivity = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const n = normalizeActivityInput(req.body);
    if (!n.name) {
      return res.status(400).json({ success: false, message: 'Activity name is required' });
    }
    if (!n.domain) {
      return res.status(400).json({ success: false, message: 'Valid domain is required' });
    }
    if (!hasActivityBodyContent(n)) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one of: instructions, objective, or procedure',
      });
    }

    const dup = await Activity.findOne({ createdBy: therapistId, name: n.name }).lean();
    if (dup) {
      return res.status(409).json({ success: false, message: 'An activity with this name already exists' });
    }

    const created = await Activity.create({
      ...n,
      createdBy: therapistId,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'An activity with this name already exists' });
    }
    console.error('createActivity:', error);
    return res.status(500).json({ success: false, message: 'Failed to create activity' });
  }
};

/**
 * GET /api/activities?domain=Speech&search=foo
 */
exports.listActivities = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { domain, search } = req.query || {};
    const q = { createdBy: therapistId };
    applyDomainFilter(q, domain);
    applySearchFilter(q, search);

    const list = await Activity.find(q).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      data: list,
      meta: { domainOptions: ACTIVITY_DOMAIN_OPTIONS, difficultyOptions: DIFFICULTY_OPTIONS },
    });
  } catch (error) {
    console.error('listActivities:', error);
    return res.status(500).json({ success: false, message: 'Failed to list activities' });
  }
};

/**
 * PATCH /api/activities/:id
 */
exports.updateActivity = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid activity id' });
    }

    const doc = await Activity.findOne({ _id: id, createdBy: therapistId });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    const n = normalizeActivityInput({ ...doc.toObject(), ...req.body });
    if (!n.name) {
      return res.status(400).json({ success: false, message: 'Activity name is required' });
    }
    if (!n.domain) {
      return res.status(400).json({ success: false, message: 'Valid domain is required' });
    }
    if (!hasActivityBodyContent(n)) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one of: instructions, objective, or procedure',
      });
    }

    if (n.name !== doc.name) {
      const dup = await Activity.findOne({ createdBy: therapistId, name: n.name, _id: { $ne: id } }).lean();
      if (dup) {
        return res.status(409).json({ success: false, message: 'An activity with this name already exists' });
      }
    }

    applyActivityFields(doc, n);
    await doc.save();

    return res.status(200).json({ success: true, data: doc.toObject() });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'An activity with this name already exists' });
    }
    console.error('updateActivity:', error);
    return res.status(500).json({ success: false, message: 'Failed to update activity' });
  }
};

/**
 * POST /api/activities/:id/clone
 */
exports.cloneActivity = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid activity id' });
    }

    const src = await Activity.findOne({ _id: id, ...activityAccessFilter(therapistId) }).lean();
    if (!src) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    let baseName = `${src.name} (copy)`;
    let suffix = 2;
    while (await Activity.findOne({ createdBy: therapistId, name: baseName }).lean()) {
      baseName = `${src.name} (copy ${suffix})`;
      suffix += 1;
    }

    const created = await Activity.create({
      name: baseName,
      objective: src.objective || '',
      procedure: src.procedure || '',
      notes: src.notes || '',
      instructions: src.instructions || '',
      materials: src.materials || '',
      frequency: src.frequency || '',
      difficulty: src.difficulty || 'Medium',
      parentInvolvement: Boolean(src.parentInvolvement),
      domain: src.domain,
      isTemplate: src.isTemplate !== undefined ? Boolean(src.isTemplate) : true,
      createdBy: therapistId,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('cloneActivity:', error);
    return res.status(500).json({ success: false, message: 'Failed to clone activity' });
  }
};

/**
 * POST /api/activities/:id/assign
 * Body: { caseId, assignTo: "plan" | "home", dueDate? (ISO, for home only) }
 */
exports.assignActivity = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const { id } = req.params;
    const { caseId, assignTo, dueDate } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid activity id' });
    }
    if (!caseId || !mongoose.Types.ObjectId.isValid(String(caseId))) {
      return res.status(400).json({ success: false, message: 'Valid caseId is required' });
    }
    if (assignTo !== 'plan' && assignTo !== 'home') {
      return res.status(400).json({ success: false, message: 'assignTo must be "plan" or "home"' });
    }

    const activeTherapyCase = await TherapyCase.findOne({ caseId, therapistId, status: 'active' }).lean();
    if (!activeTherapyCase) {
      return res.status(400).json({
        success: false,
        message: 'Start therapy for this case before assigning activities',
      });
    }

    const activity = await Activity.findOne({ _id: id, ...activityAccessFilter(therapistId) }).lean();
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    if (assignTo === 'home') {
      let due = dueDate ? new Date(dueDate) : new Date();
      if (dueDate && Number.isNaN(due.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid dueDate' });
      }
      if (!dueDate) {
        due = new Date();
        due.setDate(due.getDate() + 7);
      }

      const title = activity.name;
      const instructions = buildHomeInstructions(activity);
      const materials = String(activity.materials || '').trim();

      const created = await HomeAssignment.create({
        caseId,
        therapistId,
        title,
        instructions,
        materials,
        dueDate: due,
        status: 'pending',
        activityId: activity._id,
        sourceActivityId: activity._id,
      });

      return res.status(201).json({
        success: true,
        message: 'Assignment created',
        data: created,
        assignTo: 'home',
      });
    }

    const plan = await TherapyPlan.findOne({ caseId, therapistId });
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Create a therapy plan for this case before assigning activities to the plan',
      });
    }

    const libId = String(activity._id);
    const already = (plan.activities || []).some(
      (a) => a.libraryActivityId && String(a.libraryActivityId) === libId
    );
    if (already) {
      return res.status(409).json({
        success: false,
        message: 'This activity is already linked to the therapy plan',
      });
    }

    const description = buildPlanDescription(activity);
    plan.activities = plan.activities || [];
    plan.activities.push({
      title: activity.name,
      description,
      linkedGoal: '',
      libraryActivityId: activity._id,
    });
    await plan.save();

    return res.status(200).json({
      success: true,
      message: 'Activity added to therapy plan',
      data: plan.toObject(),
      assignTo: 'plan',
    });
  } catch (error) {
    console.error('assignActivity:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign activity' });
  }
};
