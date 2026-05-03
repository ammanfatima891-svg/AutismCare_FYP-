const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
/**
 * Structured therapy report body (progress-engine aware).
 * Used by POST /api/reports/generate/:caseId — persisted as Report type `integrated`.
 */

function msDays(a, b) {
  if (!a || !b) return null;
  const t0 = new Date(a).getTime();
  const t1 = new Date(b).getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1)) return null;
  return Math.max(0, Math.round((t1 - t0) / (24 * 60 * 60 * 1000)));
}

function buildRecommendations(progressEngine) {
  const rec = [];
  for (const w of progressEngine.weakAreas || []) {
    rec.push(typeof w === 'string' ? w : w.reason || JSON.stringify(w));
  }
  for (const a of progressEngine.smartAlerts || []) {
    if (a.message) rec.push(a.message);
  }
  if (!rec.length) rec.push('Continue current plan; maintain session cadence and home practice.');
  return [...new Set(rec)];
}

/**
 * @param {{
 *   childInfo: object,
 *   caseDoc: object,
 *   plan: object|null,
 *   sessionsAsc: object[],
 *   assignments: object[],
 *   progressEngine: object,
 *   evaluation?: object|null,
 * }} ctx
 */
function buildIntegratedTherapyReport(ctx) {
  const { childInfo, caseDoc, plan, sessionsAsc, assignments, progressEngine, evaluation } = ctx;
  const completed = (sessionsAsc || []).filter((s) => String(s.status || 'completed') === 'completed');
  const first = completed[0]?.sessionDate || sessionsAsc[0]?.sessionDate;
  const last = completed[completed.length - 1]?.sessionDate || sessionsAsc[sessionsAsc.length - 1]?.sessionDate;
  const notes = (sessionsAsc || [])
    .map((s) => String(s.notes || '').trim())
    .filter(Boolean)
    .slice(-20);

  return {
    type: 'integrated',
    generatedAt: getCurrentTime().toISOString(),
    insufficientData: !plan && completed.length === 0 && (!assignments || assignments.length === 0),
    /** Full progress engine snapshot (single source of truth for clinical UI). */
    progressEngine,
    childInfo,
    case: {
      caseId: String(caseDoc._id),
      status: caseDoc.status,
      riskLevel: caseDoc.riskLevel,
    },
    therapyDuration: {
      firstSessionDate: first || null,
      lastSessionDate: last || null,
      spanDays: msDays(first, last),
      completedSessionCount: completed.length,
    },
    goalProgressTable: (progressEngine.goals || []).map((g) => ({
      goalId: g.goalId,
      goalName: g.goalName,
      baseline: g.baseline,
      current: g.current,
      target: g.target,
      trend: g.trend,
      masteryStatus: g.masteryStatus,
      domain: g.domain,
    })),
    domainPerformance: progressEngine.domains || [],
    trendGraphData: {
      weeklyTrend: (progressEngine.weeklyTrend || []).map((w) => ({ x: w.x, y: w.y, week: w.week })),
    },
    overallMetrics: {
      overallScore: progressEngine.overallScore,
      improvementRate: progressEngine.improvementRate,
      consistency: progressEngine.consistency,
      overallTrend: progressEngine.overallTrend,
      overallConfidence: progressEngine.overallConfidence,
      overallExplanation: progressEngine.overallExplanation,
      domainScores: progressEngine.domainScores,
    },
    therapistNotes: notes,
    recommendations: buildRecommendations(progressEngine),
    clinicalEvaluationSummary: evaluation
      ? {
          diagnosis: String(evaluation.diagnosis || '').trim() || undefined,
          recommendations: String(evaluation.recommendations || '').trim() || undefined,
        }
      : undefined,
    planMeta: plan
      ? {
          domains: plan.domains || [],
          planVersion: plan.planVersion,
          status: plan.status,
        }
      : null,
  };
}

module.exports = {
  buildIntegratedTherapyReport,
};
