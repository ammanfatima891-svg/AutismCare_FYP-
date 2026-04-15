const mongoose = require('mongoose');
const { assertUserCaseAccess } = require('../utils/caseAccess');
const { computeProgressEngineForCase } = require('../services/progressEngine');

function parentSummary(full) {
  if (!full) return null;
  const sessionsN = Number(full._meta?.sessionsCounted || 0);
  const homeRatingsN = Number(full._meta?.homeRatingsCounted || 0);
  const assignN = Number(full._meta?.totalAssignments ?? 0);
  /** No logged therapy signals and no home program activity — avoid generic "steady" copy. */
  if (sessionsN === 0 && homeRatingsN === 0 && assignN === 0) {
    return null;
  }
  const pct = full.overallScore != null ? Math.round((full.overallScore / 5) * 100) : null;
  const trendLabel =
    (full.improvementRate || 0) > 0.03 ? 'improving' : (full.improvementRate || 0) < -0.03 ? 'needs_attention' : 'steady';
  const consistency = full.consistency;
  return {
    progressPercent: pct,
    trendLabel,
    headline: trendLabel === 'improving' ? 'Great momentum' : trendLabel === 'needs_attention' ? 'Needs attention' : 'Steady progress',
    consistencyPercent: consistency != null ? Math.round(Number(consistency) * 100) : null,
    homeProgramOnTrack: consistency == null ? null : consistency >= 0.5,
    message: 'Your care team can share more detail in visits and written updates.',
  };
}

function buildSummaryPayload(data) {
  if (!data) return null;
  const doms = data.domains || [];
  let weakestDomain = null;
  let lowest = 999;
  for (const d of doms) {
    if (d.score < lowest) {
      lowest = d.score;
      weakestDomain = d.name;
    }
  }
  const trend =
    (data.improvementRate || 0) > 0.05 ? 'improving' : (data.improvementRate || 0) < -0.05 ? 'declining' : 'stable';
  return {
    overallScore: data.overallScore,
    improvementRate: data.improvementRate,
    weakestDomain,
    trend,
    alertCount: (data.smartAlerts || []).length,
  };
}

/**
 * GET /api/progress-engine/:caseId/summary
 * Lightweight snapshot for dashboards (therapist + clinician). Parents use GET /:caseId (summary payload).
 */
exports.getProgressEngineSummary = async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }
    const access = await assertUserCaseAccess(req, caseId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const role = String(req.user.role || req.jwtRole || '').toLowerCase();
    if (role === 'parent') {
      return res.status(403).json({ success: false, message: 'Use the parent summary on the main progress endpoint' });
    }
    const therapistId = role === 'therapist' ? req.user._id : undefined;
    const result = await computeProgressEngineForCase(caseId, { therapistId, useCache: true });
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message || 'Failed to compute summary' });
    }
    return res.status(200).json({
      success: true,
      data: buildSummaryPayload(result.data),
      meta: { role, cached: Boolean(result.cached) },
    });
  } catch (error) {
    console.error('getProgressEngineSummary:', error);
    return res.status(500).json({ success: false, message: 'Failed to load summary' });
  }
};

/**
 * GET /api/progress-engine/:caseId
 * Therapist: scoped to their plan/sessions/assignments.
 * Clinician: case-wide data with primary plan resolution inside engine.
 * Parent: limited summary only.
 */
exports.getProgressEngine = async (req, res) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) {
      return res.status(400).json({ success: false, message: 'Invalid caseId' });
    }

    const access = await assertUserCaseAccess(req, caseId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const role = String(req.user.role || req.jwtRole || '').toLowerCase();
    const therapistId = role === 'therapist' ? req.user._id : undefined;

    const result = await computeProgressEngineForCase(caseId, { therapistId, useCache: true });
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message || 'Failed to compute progress' });
    }

    let data = result.data;
    if (role === 'parent') {
      data = parentSummary(data);
    }

    return res.status(200).json({
      success: true,
      data,
      meta: { role, scope: role === 'parent' ? 'summary' : 'full', cached: Boolean(result.cached) },
    });
  } catch (error) {
    console.error('getProgressEngine:', error);
    return res.status(500).json({ success: false, message: 'Failed to load progress engine' });
  }
};
