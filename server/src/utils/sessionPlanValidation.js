/**
 * Ensures session goals/activities align with the therapy plan and activity library
 * (schema fields unchanged — still string[] on SessionLog).
 */

const TherapyPlan = require('../models/TherapyPlan');
const Activity = require('../models/Activity');
const { templateBaseQuery } = require('./activityShared');

async function loadAllowedGoals(caseId, therapistId) {
  const plan = await TherapyPlan.findOne({ caseId, therapistId }).lean();
  if (!plan) {
    return { allowedGoals: [], plan: null };
  }
  const allowed = new Set();
  for (const g of plan.shortTermGoals || []) {
    if (g?.title) allowed.add(String(g.title).trim());
    if (g?._id) allowed.add(String(g._id));
  }
  for (const g of plan.goals || []) {
    if (g && g.type !== 'long-term' && g.title) allowed.add(String(g.title).trim());
  }
  if (plan.longTermGoal?.title) {
    allowed.add(String(plan.longTermGoal.title).trim());
  }
  return { allowedGoals: [...allowed], plan };
}

async function loadAllowedActivityNames(therapistId) {
  const q = { ...templateBaseQuery(therapistId) };
  const list = await Activity.find(q).select('name').lean();
  return list.map((x) => String(x.name || '').trim()).filter(Boolean);
}

/**
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function validateSessionGoalsAndActivities(caseId, therapistId, goalsTargeted, activitiesUsed) {
  const { allowedGoals, plan } = await loadAllowedGoals(caseId, therapistId);

  if (!plan) {
    return { ok: false, message: 'A therapy plan is required before logging sessions for this case' };
  }

  if (allowedGoals.length === 0 && goalsTargeted.length > 0) {
    return {
      ok: false,
      message: 'Add short-term goals to the therapy plan before logging sessions',
    };
  }

  for (const g of goalsTargeted) {
    const key = String(g).trim();
    if (!allowedGoals.includes(key)) {
      return { ok: false, message: `Goal must come from the therapy plan: "${g}"` };
    }
  }

  const planActivityTitles = [];
  for (const a of plan.activities || []) {
    if (a?.title) planActivityTitles.push(String(a.title).trim());
  }
  const libraryNames = await loadAllowedActivityNames(therapistId);
  const allowedActivities = [...new Set([...libraryNames, ...planActivityTitles])];

  if (allowedActivities.length === 0) {
    return { ok: true };
  }

  for (const a of activitiesUsed) {
    const key = String(a).trim();
    if (!allowedActivities.includes(key)) {
      return {
        ok: false,
        message: `Activity "${a}" must match a name in your activity library or therapy plan`,
      };
    }
  }

  return { ok: true };
}

module.exports = {
  loadAllowedGoals,
  loadAllowedActivityNames,
  validateSessionGoalsAndActivities,
};
