const mongoose = require('mongoose');
const TherapyPlan = require('../models/TherapyPlan');
const SessionLog = require('../models/SessionLog');
const ClinicianNotes = require('../models/ClinicianNotes');
const { ChildCase } = require('../models/ChildCase');

async function assertClinicianCaseOwnership(caseId, clinicianId) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) return null;
  return ChildCase.findOne({ _id: caseId, clinicianId }).lean();
}

// GET /api/therapy/:caseId/plan
exports.getTherapyPlan = async (req, res) => {
  try {
    const { caseId } = req.params;
    const clinicianId = req.user._id;

    const owned = await assertClinicianCaseOwnership(caseId, clinicianId);
    if (!owned) return res.status(404).json({ success: false, message: 'Case not found' });

    const plan = await TherapyPlan.findOne({ caseId })
      .populate('therapistId', 'firstName lastName specialization')
      .lean();

    res.status(200).json({
      success: true,
      data: plan || null,
      message: plan ? undefined : 'No therapy started yet',
    });
  } catch (error) {
    console.error('getTherapyPlan:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch therapy plan' });
  }
};

// GET /api/therapy/:caseId/sessions
exports.getSessionLogs = async (req, res) => {
  try {
    const { caseId } = req.params;
    const clinicianId = req.user._id;

    const owned = await assertClinicianCaseOwnership(caseId, clinicianId);
    if (!owned) return res.status(404).json({ success: false, message: 'Case not found' });

    const sessions = await SessionLog.find({ caseId }).sort({ sessionDate: -1 }).lean();
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('getSessionLogs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};

// GET /api/therapy/:caseId/goals
exports.getTherapyGoals = async (req, res) => {
  try {
    const { caseId } = req.params;
    const clinicianId = req.user._id;

    const owned = await assertClinicianCaseOwnership(caseId, clinicianId);
    if (!owned) return res.status(404).json({ success: false, message: 'Case not found' });

    const plan = await TherapyPlan.findOne({ caseId }).lean();
    if (!plan) {
      return res.status(200).json({
        success: true,
        data: { longTermGoals: [], shortTermGoals: [], allGoals: [] },
        message: 'No therapy started yet',
      });
    }

    const legacy = Array.isArray(plan.goals) ? plan.goals : [];
    const structuredShort = Array.isArray(plan.shortTermGoals) ? plan.shortTermGoals : [];
    const longFromStructured = plan.longTermGoal?.title
      ? [
          {
            title: plan.longTermGoal.title,
            description: plan.longTermGoal.description || '',
            type: 'long-term',
            timeline: plan.longTermGoal.timeline || '',
          },
        ]
      : [];
    const longLegacy = legacy.filter((g) => g.type === 'long-term');
    const longTermGoals = [...longFromStructured, ...longLegacy];

    const shortLegacy = legacy.filter((g) => g.type !== 'long-term');
    const shortTermGoals = structuredShort.length > 0 ? structuredShort : shortLegacy;

    const allGoals = [...longTermGoals, ...shortTermGoals];

    res.status(200).json({
      success: true,
      data: { longTermGoals, shortTermGoals, allGoals },
    });
  } catch (error) {
    console.error('getTherapyGoals:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch therapy goals' });
  }
};

// GET /api/therapy/:caseId/notes
exports.getClinicianNotes = async (req, res) => {
  try {
    const { caseId } = req.params;
    const clinicianId = req.user._id;

    const owned = await assertClinicianCaseOwnership(caseId, clinicianId);
    if (!owned) return res.status(404).json({ success: false, message: 'Case not found' });

    const notes = await ClinicianNotes.find({ caseId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName')
      .lean();

    res.status(200).json({ success: true, data: notes });
  } catch (error) {
    console.error('getClinicianNotes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clinician notes' });
  }
};

// POST /api/therapy/:caseId/notes
exports.addClinicianNote = async (req, res) => {
  try {
    const { caseId } = req.params;
    const clinicianId = req.user._id;
    const note = String(req.body?.note || '').trim();

    const owned = await assertClinicianCaseOwnership(caseId, clinicianId);
    if (!owned) return res.status(404).json({ success: false, message: 'Case not found' });
    if (!note) {
      return res.status(400).json({ success: false, message: 'Note cannot be empty' });
    }

    const created = await ClinicianNotes.create({
      caseId,
      note,
      createdBy: clinicianId,
    });

    const hydrated = await ClinicianNotes.findById(created._id)
      .populate('createdBy', 'firstName lastName')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Recommendation added successfully',
      data: hydrated,
    });
  } catch (error) {
    console.error('addClinicianNote:', error);
    res.status(500).json({ success: false, message: 'Failed to add recommendation' });
  }
};
