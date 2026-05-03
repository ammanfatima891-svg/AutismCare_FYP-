/**
 * Ensures session goals/activities align with the therapy plan and activity library
 * (schema fields unchanged — still string[] on SessionLog).
 */

const TherapyPlan = require('../models/TherapyPlan');
const TherapyCase = require('../models/TherapyCase');
const Activity = require('../models/Activity');
const { THERAPY_STATUS } = require('../constants/workflowEnums');
const { templateBaseQuery } = require('./activityShared');
const { planAllowsSessions, activateTherapyPlanWhenTherapyStarts } = require('./therapyPlanLifecycle');

/** If therapy is already ACTIVE but plan stayed `final` after approval, flip plan → active (idempotent). */
async function healStuckApprovedPlan(caseId, therapistId, plan) {
  if (!plan || planAllowsSessions(plan) || String(plan.approval?.status || '') !== 'approved') return;
  const tc = await TherapyCase.findOne({
    caseId,
    therapistId,
    status: THERAPY_STATUS.ACTIVE,
  })
    .select('_id')
    .lean();
  if (!tc) return;
  await activateTherapyPlanWhenTherapyStarts(caseId, therapistId);
}

/**
 * Plan row used for session validation: prefer session-eligible / sign-off rows over a newer draft
 * that happens to have a later `updatedAt` (otherwise clinician-approved plans are ignored).
 */
async function findSessionContextPlan(caseId, therapistId) {
  const active = await TherapyPlan.findOne({ caseId, therapistId, planStatus: 'active' })
    .sort({ updatedAt: -1 })
    .lean();
  if (active) return active;
  const approved = await TherapyPlan.findOne({
    caseId,
    therapistId,
    'approval.status': 'approved',
    planStatus: { $nin: ['archived'] },
  })
    .sort({ updatedAt: -1 })
    .lean();
  if (approved) return approved;
  return TherapyPlan.findOne({ caseId, therapistId }).sort({ updatedAt: -1 }).lean();
}

async function loadAllowedGoals(caseId, therapistId, preloadedPlan = null) {
  const plan = preloadedPlan || (await findSessionContextPlan(caseId, therapistId));
  if (!plan) {
    return { allowedGoals: [], allowedGoalKeys: [], allowedGoalIds: [], plan: null };
  }
  const allowed = new Set();
  const allowedKeys = new Set();
  const allowedGoalIds = new Set();
  for (const g of plan.shortTermGoals || []) {
    if (g?.title) allowed.add(String(g.title).trim());
    if (g?._id) {
      const idStr = String(g._id).trim();
      allowed.add(idStr);
      // Session UI sends goalData.goalId as the subdocument _id; optional string goalId also counts.
      allowedGoalIds.add(idStr);
    }
    if (g?.goalKey) allowedKeys.add(String(g.goalKey).trim());
    if (g?.goalId) allowedGoalIds.add(String(g.goalId).trim());
  }
  for (const g of plan.goals || []) {
    if (g && g.type !== 'long-term' && g.title) allowed.add(String(g.title).trim());
  }
  if (plan.longTermGoal?.title) {
    allowed.add(String(plan.longTermGoal.title).trim());
  }
  return { allowedGoals: [...allowed], allowedGoalKeys: [...allowedKeys], allowedGoalIds: [...allowedGoalIds], plan };
}

async function loadAllowedActivityNames(therapistId) {
  const q = { ...templateBaseQuery(therapistId) };
  const list = await Activity.find(q).select('name').lean();
  return list.map((x) => String(x.name || '').trim()).filter(Boolean);
}

/**
 * @param {{ plan?: object|null }} [opts] — optional preloaded plan (avoids extra query)
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function validateSessionGoalsAndActivities(caseId, therapistId, goalsTargeted, activitiesUsed, opts = {}) {
  let { allowedGoals, plan } = await loadAllowedGoals(caseId, therapistId, opts.plan || null);
  if (plan && !planAllowsSessions(plan)) {
    await healStuckApprovedPlan(caseId, therapistId, plan);
    ({ allowedGoals, plan } = await loadAllowedGoals(caseId, therapistId, null));
  }

  if (!plan) {
    return { ok: false, message: 'A therapy plan is required before logging sessions for this case' };
  }

  if (!planAllowsSessions(plan)) {
    return {
      ok: false,
      message:
        'Session logging requires an active therapy plan. Submit the plan for clinician approval and start therapy before logging sessions.',
    };
  }

  if (allowedGoals.length === 0 && goalsTargeted.length > 0) {
    return {
      ok: false,
      message: 'Add short-term goals to the therapy plan before logging sessions',
    };
  }

  const short = Array.isArray(plan.shortTermGoals) ? plan.shortTermGoals : [];
  const keysOnPlan = short.map((g) => String(g.goalKey || '').trim()).filter(Boolean);
  const strictKeys = keysOnPlan.length > 0;

  for (const g of goalsTargeted) {
    const key = String(g).trim();
    if (!key) continue;
    if (strictKeys) {
      const byKey = keysOnPlan.includes(key);
      const byTitleOrId = short.some(
        (sg) =>
          String(sg.title || '').trim() === key ||
          (sg._id && String(sg._id) === key) ||
          (sg.goalId && String(sg.goalId).trim() === key)
      );
      if (!byKey && !byTitleOrId) {
        return {
          ok: false,
          message: `Goal "${g}" must match a goalKey (or legacy goal title/_id) on the active therapy plan`,
        };
      }
    } else if (!allowedGoals.includes(key)) {
      return { ok: false, message: `Goal must come from the therapy plan: "${g}"` };
    }
  }

  // Activities may be plan-linked, library, or custom (flagged server-side on SessionLog.activityUsage).
  void activitiesUsed;

  return { ok: true };
}

/**
 * Validates optional per-goal clinical rows against the active therapy plan.
 * @param {{ plan?: object|null }} [opts]
 */
async function validateSessionGoalData(caseId, therapistId, goalData, opts = {}) {
  if (!goalData || goalData.length === 0) return { ok: true };
  const preloadedPlan = opts && typeof opts === 'object' && opts.plan != null ? opts.plan : null;
  let { allowedGoals, allowedGoalKeys, allowedGoalIds, plan } = await loadAllowedGoals(
    caseId,
    therapistId,
    preloadedPlan
  );
  if (plan && !planAllowsSessions(plan)) {
    await healStuckApprovedPlan(caseId, therapistId, plan);
    ({ allowedGoals, allowedGoalKeys, allowedGoalIds, plan } = await loadAllowedGoals(caseId, therapistId, null));
  }
  if (!plan) {
    return { ok: false, message: 'A therapy plan is required before logging sessions for this case' };
  }
  if (!planAllowsSessions(plan)) {
    return {
      ok: false,
      message:
        'Session logging requires an active therapy plan. Submit for approval, have the clinician approve, and start therapy.',
    };
  }
  const keySet = new Set(allowedGoalKeys);
  const idSet = new Set(allowedGoalIds || []);
  const titleSet = new Set(allowedGoals);
  for (let i = 0; i < goalData.length; i += 1) {
    const row = goalData[i];
    const gid = String(row.goalId || '').trim();
    const gk = String(row.goalKey || '').trim();
    const gt = String(row.goalTitleMatch || '').trim();
    if (gid) {
      if (!idSet.has(gid)) {
        return { ok: false, message: `goalData[${i}]: goalId is not on the current therapy plan` };
      }
      continue;
    }
    if (gk) {
      if (!keySet.has(gk)) {
        return { ok: false, message: `goalData[${i}]: goalKey is not on the current therapy plan` };
      }
      continue;
    }
    if (gt) {
      if (!titleSet.has(gt)) {
        return { ok: false, message: `goalData[${i}]: goalTitleMatch must match a goal on the therapy plan` };
      }
      continue;
    }
    return { ok: false, message: `goalData[${i}]: goalId, goalKey, or goalTitleMatch is required` };
  }
  return { ok: true };
}

/**
 * Normalized, deduplicated activity usage rows (custom = not on plan by normalized title).
 * @param {string[]} activitiesUsed
 * @param {object|null} planLean
 * @returns {{ name: string, displayName: string, normalizedName: string, isCustomActivity: boolean }[]}
 */
function buildActivityUsageRows(activitiesUsed, planLean) {
  const planNorm = new Set(
    (Array.isArray(planLean?.activities) ? planLean.activities : [])
      .map((a) => String(a.title || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const byNorm = new Map();
  for (const raw of activitiesUsed || []) {
    const displayName = String(raw || '').trim();
    if (!displayName) continue;
    const normalizedName = displayName.toLowerCase();
    if (byNorm.has(normalizedName)) continue;
    const isCustomActivity = !planNorm.has(normalizedName);
    byNorm.set(normalizedName, {
      name: displayName,
      displayName,
      normalizedName,
      isCustomActivity,
    });
  }
  return [...byNorm.values()];
}

module.exports = {
  loadAllowedGoals,
  findSessionContextPlan,
  loadAllowedActivityNames,
  validateSessionGoalsAndActivities,
  validateSessionGoalData,
  buildActivityUsageRows,
};
