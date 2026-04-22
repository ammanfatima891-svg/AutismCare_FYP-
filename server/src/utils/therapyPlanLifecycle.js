const mongoose = require('mongoose');
const TherapyPlan = require('../models/TherapyPlan');
const { getCurrentTime } = require('../utils/time.js');

const PLAN_STATUSES = ['draft', 'final', 'approved', 'active', 'archived'];

/**
 * Effective lifecycle state (supports legacy documents without `planStatus`).
 */
function effectivePlanStatus(plan) {
  if (!plan) return 'draft';
  const ps = String(plan.planStatus || '').trim();
  if (ps && PLAN_STATUSES.includes(ps)) return ps;
  const ap = String(plan.approval?.status || 'none');
  if (ap === 'pending') return 'final';
  if (ap === 'approved') return 'approved';
  if (plan.status === 'final' || plan.draft === false) return 'final';
  return 'draft';
}

/**
 * Whether this plan may be used for session logging (`planStatus` must be `active` after therapy starts).
 * @param {object} plan — TherapyPlan lean or doc
 */
function planAllowsSessions(plan) {
  return String(plan?.planStatus || '').trim() === 'active';
}

function syncLegacyFieldsFromPlanStatus(planDoc) {
  const st = String(planDoc.planStatus || 'draft');
  if (st === 'draft') {
    planDoc.status = 'draft';
    planDoc.draft = true;
  } else if (['final', 'approved', 'active', 'archived'].includes(st)) {
    planDoc.status = 'final';
    planDoc.draft = false;
  }
}

/**
 * After therapist starts therapy (TherapyCase ACTIVE), move approved plan → active.
 */
async function activateTherapyPlanWhenTherapyStarts(caseId, therapistId) {
  if (!mongoose.Types.ObjectId.isValid(String(caseId)) || !mongoose.Types.ObjectId.isValid(String(therapistId))) {
    return null;
  }
  const plan = await TherapyPlan.findOne({
    caseId,
    therapistId,
    'approval.status': 'approved',
  }).sort({ updatedAt: -1 });

  if (!plan) return null;

  const eff = effectivePlanStatus(plan);
  if (eff === 'active') return plan;

  if (eff === 'approved' || (!plan.planStatus && plan.approval?.status === 'approved')) {
    const cid = plan.caseId;
    await TherapyPlan.updateMany(
      { caseId: cid, planStatus: 'active' },
      { $set: { planStatus: 'archived' } }
    );
    plan.planStatus = 'active';
    if (!plan.approvedAt) plan.approvedAt = plan.approval?.approvedAt || null;
    if (!plan.approvedBy && plan.approval?.approvedBy) plan.approvedBy = plan.approval.approvedBy;
    syncLegacyFieldsFromPlanStatus(plan);
    plan.approval = plan.approval || {};
    plan.approval.status = 'approved';
    await plan.save();
    return plan;
  }

  return null;
}

/**
 * Normalize API output for older Mongo documents.
 */
function attachEffectivePlanStatus(lean) {
  if (!lean || typeof lean !== 'object') return lean;
  return {
    ...lean,
    planStatus: effectivePlanStatus(lean),
  };
}

module.exports = {
  PLAN_STATUSES,
  effectivePlanStatus,
  planAllowsSessions,
  syncLegacyFieldsFromPlanStatus,
  activateTherapyPlanWhenTherapyStarts,
  attachEffectivePlanStatus,
};
