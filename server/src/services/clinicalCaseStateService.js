const mongoose = require('mongoose');
const { ChildCase } = require('../models/ChildCase');
const TherapyPlan = require('../models/TherapyPlan');
const TherapyCase = require('../models/TherapyCase');
const LabTestRequest = require('../models/LabTestRequest');
const { THERAPY_STATUS } = require('../constants/workflowEnums');
const { computeProgressEngineForCase } = require('./progressEngine');
const { slimProgressSnapshot } = require('./clinicalEventService');

function latestLabStatus(requests) {
  if (!Array.isArray(requests) || !requests.length) return { summary: 'none', latestStatus: null, count: 0 };
  const sorted = [...requests].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  const top = sorted[0];
  return {
    summary: `${sorted.length} request(s)`,
    latestStatus: top.status || null,
    latestTestType: top.testType || null,
    count: sorted.length,
  };
}

function therapyStatusSummary(episodes, plans) {
  const ep = Array.isArray(episodes) && episodes.length ? episodes[0] : null;
  const plan = Array.isArray(plans) && plans.length ? plans[0] : null;
  const rawEpStatus = ep?.status != null ? String(ep.status).toUpperCase() : '';
  return {
    episodeStatus: ep?.status || null,
    episodeActive: rawEpStatus === THERAPY_STATUS.ACTIVE,
    planApproval: plan?.approval?.status || plan?.planStatus || null,
    planVersion: plan?.planVersion ?? null,
    domains: Array.isArray(plan?.domains) ? plan.domains : [],
  };
}

/**
 * Aggregated clinical operating picture for cockpit UIs.
 */
async function buildClinicalCaseState(caseId) {
  if (!mongoose.Types.ObjectId.isValid(String(caseId))) {
    return { success: false, message: 'Invalid caseId' };
  }

  const [caseDoc, labRequests, plans, episodes] = await Promise.all([
    ChildCase.findById(caseId).lean(),
    LabTestRequest.find({ caseId }).sort({ updatedAt: -1 }).limit(20).lean(),
    TherapyPlan.find({ caseId }).sort({ updatedAt: -1 }).limit(3).lean(),
    TherapyCase.find({ caseId }).sort({ updatedAt: -1 }).limit(3).lean(),
  ]);

  if (!caseDoc) {
    return { success: false, message: 'Case not found' };
  }

  let progressEngine = null;
  try {
    const r = await computeProgressEngineForCase(caseId, { useCache: true });
    if (r.success && r.data) progressEngine = slimProgressSnapshot(r.data);
  } catch (_) {
    progressEngine = null;
  }

  const alerts = [];
  try {
    const full = await computeProgressEngineForCase(caseId, { useCache: true });
    if (full.success && full.data && Array.isArray(full.data.smartAlerts)) {
      for (const a of full.data.smartAlerts.slice(0, 12)) {
        alerts.push({
          severity: a.severity,
          message: a.message ? String(a.message).slice(0, 280) : '',
          code: a.code,
        });
      }
    }
  } catch (_) {
    /* ignore */
  }

  return {
    success: true,
    data: {
      caseId: String(caseId),
      caseStatus: caseDoc.status,
      riskLevel: caseDoc.riskLevel,
      progressEngine,
      lab: latestLabStatus(labRequests),
      therapy: therapyStatusSummary(episodes, plans),
      activeAlerts: alerts,
      lastRecommendation: caseDoc.progressEngineRecommendationSnapshot || null,
      lastRecommendationAt: caseDoc.progressEngineRecommendationAt || null,
    },
  };
}

module.exports = { buildClinicalCaseState };
