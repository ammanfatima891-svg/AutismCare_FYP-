const mongoose = require('mongoose');
const { ClinicalEvaluation } = require('../models/ClinicalEvaluation');
const { EVALUATION_STATUS } = require('../constants/workflowEnums');
const { normalizeEvaluationStatus } = require('../utils/normalizeWorkflowStatus');
const { ChildCase } = require('../models/ChildCase');
const Submission = require('../models/Submission');
const { evaluateDecision } = require('../utils/decisionEngine');
const { recordAuditEvent } = require('../utils/auditLog');
const { transitionCase, CASE_EVENTS } = require('../services/caseLifecycleService');

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeMixed(value, fallback) {
  if (value === undefined) return fallback;
  // Legacy string accepted, new object accepted, other types ignored.
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') return value;
  return fallback;
}

function sanitizeConditions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function hasMeaningfulValue(v) {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

function hasAtLeastOneField(payload) {
  return (
    hasMeaningfulValue(payload.observations) ||
    hasMeaningfulValue(payload.developmentalSummary) ||
    hasMeaningfulValue(payload.diagnosis) ||
    hasMeaningfulValue(payload.recommendations) ||
    (Array.isArray(payload.comorbidConditions) && payload.comorbidConditions.length > 0)
  );
}

async function assertCaseOwnership(caseId, clinicianId) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) return null;
  return ChildCase.findOne({ _id: caseId, clinicianId }).select('_id clinicianId').lean();
}

function summarizeDomainStatuses(domainStatuses) {
  const src = domainStatuses && typeof domainStatuses === 'object' ? domainStatuses : {};
  const entries = Object.entries(src);
  if (!entries.length) return {};

  const out = {};
  for (const [domain, status] of entries) {
    const value = String(status || '').toLowerCase();
    if (!value) continue;
    if (value.includes('normal')) out[domain] = { label: 'Normal', flag: 'ok' };
    else if (value.includes('monitor')) out[domain] = { label: 'Need monitoring', flag: 'warn' };
    else if (value.includes('referral') || value.includes('evaluate')) out[domain] = { label: 'At risk', flag: 'warn' };
    else out[domain] = { label: String(status), flag: 'info' };
  }
  return out;
}

/**
 * GET /api/evaluations/:caseId/development-summary
 * Returns latest ASQ-3 + M-CHAT-R structured summary for this case's child.
 */
exports.getDevelopmentSummaryByCase = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { caseId } = req.params;

    const ownedCase = await assertCaseOwnership(caseId, clinicianId);
    if (!ownedCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const caseDoc = await ChildCase.findById(caseId).select('childId').lean();
    const childId = caseDoc?.childId;
    if (!childId) {
      return res.status(200).json({ success: true, data: { childId: null, asq3: null, mchat: null } });
    }

    const [asq3, mchat] = await Promise.all([
      Submission.findOne({ childId, questionnaireType: 'ASQ-3' }).sort({ createdAt: -1 }).lean(),
      Submission.findOne({ childId, questionnaireType: 'MCHAT-R' }).sort({ createdAt: -1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        childId,
        asq3: asq3
          ? {
              id: asq3._id,
              createdAt: asq3.createdAt,
              intervalMonths: asq3.intervalMonths ?? null,
              domainStatuses: summarizeDomainStatuses(asq3?.scores?.domainStatuses),
              riskLevel: asq3.riskLevel || 'unknown',
            }
          : null,
        mchat: mchat
          ? {
              id: mchat._id,
              createdAt: mchat.createdAt,
              totalScore: mchat?.scores?.totalScore ?? null,
              result: mchat.result || null,
              riskLevel: mchat.riskLevel || 'unknown',
            }
          : null,
      },
    });
  } catch (error) {
    console.error('getDevelopmentSummaryByCase:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch developmental summary' });
  }
};

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
      finalDisposition,
    } = req.body || {};

    if (!caseId) {
      return res.status(400).json({ success: false, message: 'caseId is required' });
    }

    const ownedCase = await assertCaseOwnership(caseId, clinicianId);
    if (!ownedCase) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const normStatus = normalizeEvaluationStatus(status) || status;
    if (!normStatus || !Object.values(EVALUATION_STATUS).includes(normStatus)) {
      return res.status(400).json({ success: false, message: 'status must be DRAFT or FINALIZED' });
    }

    const disposition = String(finalDisposition || '').trim().toUpperCase();
    if (normStatus === EVALUATION_STATUS.FINALIZED) {
      if (!disposition) {
        return res.status(400).json({
          success: false,
          message: 'finalDisposition is required when finalizing (MONITORING or REFER_THERAPY)',
        });
      }
      if (!['MONITORING', 'REFER_THERAPY'].includes(disposition)) {
        return res.status(400).json({
          success: false,
          message: 'finalDisposition must be MONITORING or REFER_THERAPY',
        });
      }
    }

    const payload = {
      observations: sanitizeMixed(observations, ''),
      developmentalSummary: sanitizeMixed(developmentalSummary, ''),
      diagnosis: sanitizeMixed(diagnosis, ''),
      recommendations: sanitizeMixed(recommendations, ''),
      comorbidConditions: sanitizeConditions(comorbidConditions),
    };

    if (!hasAtLeastOneField(payload)) {
      return res.status(400).json({
        success: false,
        message: 'At least one evaluation field must be filled',
      });
    }

    const decision = normStatus === EVALUATION_STATUS.FINALIZED ? evaluateDecision(payload) : undefined;

    const created = await ClinicalEvaluation.create({
      caseId,
      clinicianId,
      ...payload,
      ...(decision ? { decision } : {}),
      status: normStatus,
      sourceEvaluationId: null,
      ...(normStatus === EVALUATION_STATUS.FINALIZED ? { finalDisposition: disposition } : {}),
    });

    let childCaseSyncWarning = null;
    if (normStatus === EVALUATION_STATUS.FINALIZED) {
      try {
        await transitionCase({
          caseId,
          eventType: CASE_EVENTS.CLINICIAN_FINAL_EVALUATION_DECIDED,
          payload: { disposition },
          triggeredBy: clinicianId,
        });
      } catch (e) {
        console.error('case lifecycle sync (final evaluation):', e);
        childCaseSyncWarning = 'Evaluation finalized, but case lifecycle status did not update.';
      }
    }

    try {
      await recordAuditEvent({
        req,
        actorId: clinicianId,
        action: 'evaluation_created',
        entityType: 'ClinicalEvaluation',
        entityId: created._id,
        caseId,
        summary: `status=${normStatus}`,
        after: { caseId, clinicianId, status: normStatus },
      });
    } catch (e) {
      console.error('audit evaluation_created:', e);
    }

    return res.status(201).json({
      success: true,
      message: 'Evaluation created successfully',
      childCaseSyncWarning,
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
      .exec();

    const hasFinalEvaluation = evaluations.some((item) => item.status === EVALUATION_STATUS.FINALIZED);

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

    const evaluation = await ClinicalEvaluation.findById(id).exec();
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
      finalDisposition,
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid evaluation id' });
    }
    const normStatus = normalizeEvaluationStatus(status) || status;
    if (!normStatus || !Object.values(EVALUATION_STATUS).includes(normStatus)) {
      return res.status(400).json({ success: false, message: 'status must be DRAFT or FINALIZED' });
    }

    const disposition = String(finalDisposition || '').trim().toUpperCase();
    if (normStatus === EVALUATION_STATUS.FINALIZED) {
      if (!disposition) {
        return res.status(400).json({
          success: false,
          message: 'finalDisposition is required when finalizing (MONITORING or REFER_THERAPY)',
        });
      }
      if (!['MONITORING', 'REFER_THERAPY'].includes(disposition)) {
        return res.status(400).json({
          success: false,
          message: 'finalDisposition must be MONITORING or REFER_THERAPY',
        });
      }
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
        observations !== undefined ? sanitizeMixed(observations, current.observations) : current.observations,
      developmentalSummary:
        developmentalSummary !== undefined
          ? sanitizeMixed(developmentalSummary, current.developmentalSummary)
          : current.developmentalSummary,
      diagnosis: diagnosis !== undefined ? sanitizeMixed(diagnosis, current.diagnosis) : current.diagnosis,
      recommendations:
        recommendations !== undefined
          ? sanitizeMixed(recommendations, current.recommendations)
          : current.recommendations,
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

    const decision = normStatus === EVALUATION_STATUS.FINALIZED ? evaluateDecision(nextPayload) : undefined;

    const versioned = await ClinicalEvaluation.create({
      caseId: current.caseId,
      clinicianId,
      ...nextPayload,
      ...(decision ? { decision } : {}),
      status: normStatus,
      sourceEvaluationId: current._id,
      ...(normStatus === EVALUATION_STATUS.FINALIZED ? { finalDisposition: disposition } : {}),
    });

    let childCaseSyncWarning = null;
    if (normStatus === EVALUATION_STATUS.FINALIZED) {
      try {
        await transitionCase({
          caseId: current.caseId,
          eventType: CASE_EVENTS.CLINICIAN_FINAL_EVALUATION_DECIDED,
          payload: { disposition },
          triggeredBy: clinicianId,
        });
      } catch (e) {
        console.error('case lifecycle sync (final evaluation version):', e);
        childCaseSyncWarning = 'Evaluation finalized, but case lifecycle status did not update.';
      }
    }

    try {
      await recordAuditEvent({
        req,
        actorId: clinicianId,
        action: 'evaluation_updated',
        entityType: 'ClinicalEvaluation',
        entityId: versioned._id,
        caseId: current.caseId,
        summary: `status=${normStatus} source=${String(current._id)}`,
        before: { id: String(current._id), status: current.status },
        after: { id: String(versioned._id), status: normStatus },
      });
    } catch (e) {
      console.error('audit evaluation_updated:', e);
    }

    return res.status(201).json({
      success: true,
      message:
        current.status === EVALUATION_STATUS.FINALIZED
          ? 'Final evaluation locked. New version created.'
          : 'Evaluation updated as a new version.',
      childCaseSyncWarning,
      data: versioned,
    });
  } catch (error) {
    console.error('versionEvaluation:', error);
    return res.status(500).json({ success: false, message: 'Failed to update evaluation' });
  }
};
