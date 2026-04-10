const mongoose = require('mongoose');
const { ClinicalEvaluation, EVALUATION_STATUS } = require('../models/ClinicalEvaluation');
const { ChildCase } = require('../models/ChildCase');

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeConditions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function hasAtLeastOneField(payload) {
  return Boolean(
    payload.observations ||
      payload.developmentalSummary ||
      payload.diagnosis ||
      payload.recommendations ||
      (Array.isArray(payload.comorbidConditions) && payload.comorbidConditions.length > 0)
  );
}

async function assertCaseOwnership(caseId, clinicianId) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) return null;
  return ChildCase.findOne({ _id: caseId, clinicianId }).select('_id clinicianId').lean();
}

/**
 * POST /api/evaluations
 * Create a new clinical evaluation (draft/final).
 */
exports.createEvaluation = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const {
      caseId,
      observations,
      developmentalSummary,
      diagnosis,
      comorbidConditions,
      recommendations,
      status,
    } = req.body || {};

    if (!caseId) {
      return res.status(400).json({ success: false, message: 'caseId is required' });
    }

    const ownedCase = await assertCaseOwnership(caseId, clinicianId);
    if (!ownedCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (!status || !Object.values(EVALUATION_STATUS).includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be "draft" or "final"' });
    }

    const payload = {
      observations: sanitizeText(observations),
      developmentalSummary: sanitizeText(developmentalSummary),
      diagnosis: sanitizeText(diagnosis),
      recommendations: sanitizeText(recommendations),
      comorbidConditions: sanitizeConditions(comorbidConditions),
    };

    if (!hasAtLeastOneField(payload)) {
      return res.status(400).json({
        success: false,
        message: 'At least one evaluation field must be filled',
      });
    }

    const created = await ClinicalEvaluation.create({
      caseId,
      clinicianId,
      ...payload,
      status,
      sourceEvaluationId: null,
    });

    return res.status(201).json({
      success: true,
      message: 'Evaluation created successfully',
      data: created,
    });
  } catch (error) {
    console.error('createEvaluation:', error);
    return res.status(500).json({ success: false, message: 'Failed to create evaluation' });
  }
};

/**
 * GET /api/evaluations/:caseId
 * List evaluations for a case, newest first.
 */
exports.getEvaluationsByCase = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { caseId } = req.params;

    const ownedCase = await assertCaseOwnership(caseId, clinicianId);
    if (!ownedCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const evaluations = await ClinicalEvaluation.find({ caseId, clinicianId })
      .sort({ createdAt: -1 })
      .lean();

    const hasFinalEvaluation = evaluations.some((item) => item.status === EVALUATION_STATUS.FINAL);

    return res.status(200).json({
      success: true,
      data: evaluations,
      meta: {
        hasFinalEvaluation,
        total: evaluations.length,
      },
    });
  } catch (error) {
    console.error('getEvaluationsByCase:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch evaluations' });
  }
};

/**
 * GET /api/evaluations/single/:id
 */
exports.getEvaluationById = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid evaluation id' });
    }

    const evaluation = await ClinicalEvaluation.findById(id).lean();
    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluation not found' });
    }

    if (evaluation.clinicianId.toString() !== clinicianId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this evaluation' });
    }

    return res.status(200).json({ success: true, data: evaluation });
  } catch (error) {
    console.error('getEvaluationById:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch evaluation' });
  }
};

/**
 * PATCH /api/evaluations/:id
 * Edit evaluation by creating a NEW version document (no in-place overwrite).
 */
exports.versionEvaluation = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { id } = req.params;
    const {
      observations,
      developmentalSummary,
      diagnosis,
      comorbidConditions,
      recommendations,
      status,
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid evaluation id' });
    }
    if (!status || !Object.values(EVALUATION_STATUS).includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be "draft" or "final"' });
    }

    const current = await ClinicalEvaluation.findById(id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Evaluation not found' });
    }
    if (current.clinicianId.toString() !== clinicianId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this evaluation' });
    }

    const ownedCase = await assertCaseOwnership(current.caseId, clinicianId);
    if (!ownedCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    // Build next version from current + incoming fields.
    const nextPayload = {
      observations:
        observations !== undefined ? sanitizeText(observations) : sanitizeText(current.observations),
      developmentalSummary:
        developmentalSummary !== undefined
          ? sanitizeText(developmentalSummary)
          : sanitizeText(current.developmentalSummary),
      diagnosis: diagnosis !== undefined ? sanitizeText(diagnosis) : sanitizeText(current.diagnosis),
      recommendations:
        recommendations !== undefined
          ? sanitizeText(recommendations)
          : sanitizeText(current.recommendations),
      comorbidConditions:
        comorbidConditions !== undefined
          ? sanitizeConditions(comorbidConditions)
          : sanitizeConditions(current.comorbidConditions),
    };

    if (!hasAtLeastOneField(nextPayload)) {
      return res.status(400).json({
        success: false,
        message: 'At least one evaluation field must be filled',
      });
    }

    const versioned = await ClinicalEvaluation.create({
      caseId: current.caseId,
      clinicianId,
      ...nextPayload,
      status,
      sourceEvaluationId: current._id,
    });

    return res.status(201).json({
      success: true,
      message:
        current.status === EVALUATION_STATUS.FINAL
          ? 'Final evaluation locked. New version created.'
          : 'Evaluation updated as a new version.',
      data: versioned,
    });
  } catch (error) {
    console.error('versionEvaluation:', error);
    return res.status(500).json({ success: false, message: 'Failed to update evaluation' });
  }
};
