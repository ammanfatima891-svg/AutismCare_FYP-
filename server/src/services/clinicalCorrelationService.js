const mongoose = require('mongoose');
const LabTestRequest = require('../models/LabTestRequest');

const NUTRITION_LAB_KEYWORDS = [
  'vitamin',
  'b12',
  'cobalamin',
  'folate',
  'iron',
  'ferritin',
  'zinc',
  'magnesium',
  'deficiency',
  'metabolic',
  'thyroid',
  'cbc',
  'hemoglobin',
];

/**
 * Load recent lab request labels for a case (best-effort correlation input).
 */
async function getLabContextForCase(caseId) {
  if (!caseId || !mongoose.Types.ObjectId.isValid(String(caseId))) {
    return { testTypes: [], hasNutritionPanel: false };
  }
  const rows = await LabTestRequest.find({ caseId })
    .sort({ updatedAt: -1 })
    .limit(12)
    .select('testType status')
    .lean();

  const testTypes = [];
  let hasNutritionPanel = false;
  for (const r of rows || []) {
    const t = String(r.testType || '').toLowerCase();
    if (t) testTypes.push(t);
    if (NUTRITION_LAB_KEYWORDS.some((k) => t.includes(k))) hasNutritionPanel = true;
  }
  return { testTypes, hasNutritionPanel };
}

/**
 * Heuristic cross-domain insights: declining therapy signals + relevant lab history.
 * @param {object} enginePayload — progressEngine `data` object (may be partial)
 * @param {{ testTypes: string[], hasNutritionPanel: boolean }} labContext
 * @returns {string[]}
 */
function buildCrossDomainInsights(enginePayload, labContext) {
  const insights = [];
  if (!enginePayload || typeof enginePayload !== 'object') return insights;

  const trend = String(enginePayload.overallTrend || '').toLowerCase();
  const shortTrend = String(enginePayload.shortTermTrend || '').toLowerCase();
  const declining = trend === 'declining' || shortTrend === 'declining';
  const status = String(enginePayload.overallClinicalStatus || '').toLowerCase();
  const stressed = declining || status === 'high_concern' || status === 'needs_attention';

  const { testTypes = [], hasNutritionPanel } = labContext || {};
  const labText = testTypes.join(' ').toLowerCase();

  if (stressed && hasNutritionPanel) {
    insights.push(
      'Nutrition or micronutrient-related labs are on file while therapy trajectory shows stress — review labs with the medical team for confounders.'
    );
  } else if (stressed && NUTRITION_LAB_KEYWORDS.some((k) => labText.includes(k))) {
    insights.push(
      'Recent lab vocabulary suggests metabolic or nutritional testing alongside a regression or plateau pattern in therapy metrics.'
    );
  }

  if (stressed && testTypes.some((t) => /thyroid|tsh|t3|t4/i.test(t))) {
    insights.push('Thyroid-related testing overlaps with behavioral change patterns — consider endocrine follow-up if clinically indicated.');
  }

  if (declining && !testTypes.length) {
    insights.push('Therapy regression signal without recent structured lab context — consider whether biomedical review is warranted for this case.');
  }

  return insights;
}

module.exports = {
  getLabContextForCase,
  buildCrossDomainInsights,
};
