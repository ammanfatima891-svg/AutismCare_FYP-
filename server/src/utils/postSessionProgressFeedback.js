const { computeProgressEngineForCase } = require('../services/progressEngine');

/**
 * Snapshot for API responses after session create/update (instant therapist feedback).
 */
async function buildPostSessionProgressFeedback(caseId, therapistId) {
  if (!caseId || !therapistId) return null;
  const r = await computeProgressEngineForCase(caseId, { therapistId, useCache: false });
  if (!r.success || !r.data) return null;
  const engine = r.data;
  const goals = Array.isArray(engine.goals) ? engine.goals : [];
  const improvingGoals = goals
    .filter((g) => g && g.trend === 'improving')
    .map((g) => ({ goalId: g.goalId, goalName: g.goalName }));
  const stagnantGoals = goals
    .filter((g) => g && g.trend === 'stagnant' && Number(g.dataPoints || 0) >= 2)
    .map((g) => ({ goalId: g.goalId, goalName: g.goalName }));
  const improving = improvingGoals.length;
  const attention = goals.filter(
    (g) => g && (g.trend === 'declining' || (g.current != null && Number(g.current) < 2))
  ).length;
  const stagnant = stagnantGoals.length;
  return {
    overallScore: engine.overallScore,
    confidence: engine.confidence,
    overallTrend: engine.overallTrend,
    summary: {
      improving,
      attention,
      stagnant,
      goalsTracked: goals.length,
    },
    improvingGoals,
    stagnantGoals,
    alerts: (engine.smartAlerts || []).slice(0, 8),
    goals: goals.map((g) => ({
      goalId: g.goalId,
      goalName: g.goalName,
      trend: g.trend,
      current: g.current,
      confidenceLabel: g.confidenceLabel,
      confidenceScore: g.confidenceScore,
      clinicalRecommendation: g.clinicalRecommendation,
    })),
    clinicalRecommendation: engine.clinicalRecommendation,
    clinicalReasoning: engine.clinicalReasoning,
    overallClinicalStatus: engine.overallClinicalStatus,
  };
}

module.exports = { buildPostSessionProgressFeedback };
