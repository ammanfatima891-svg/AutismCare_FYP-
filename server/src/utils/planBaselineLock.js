const mongoose = require('mongoose');
const SessionLog = require('../models/SessionLog');
const TherapyPlan = require('../models/TherapyPlan');

/**
 * After the first session log for this therapist+case, lock plan goal baselines (clinical record integrity).
 */
async function maybeLockPlanBaselineAfterSession(caseId, therapistId) {
  if (!mongoose.Types.ObjectId.isValid(String(caseId)) || !mongoose.Types.ObjectId.isValid(String(therapistId))) {
    return;
  }
  const oid = new mongoose.Types.ObjectId(String(caseId));
  const tid = new mongoose.Types.ObjectId(String(therapistId));
  const n = await SessionLog.countDocuments({ caseId: oid, therapistId: tid });
  if (n >= 1) {
    await TherapyPlan.updateOne({ caseId: oid, therapistId: tid }, { $set: { baselineLocked: true } });
  }
}

/**
 * When baselineLocked, preserve each goal's baseline from the persisted plan if the client sends new baselines.
 * @param {import('mongoose').Document} planDoc — TherapyPlan mongoose doc
 * @param {object[]} incomingNormalized — output of normalizeShortTermGoals
 */
function mergeShortTermGoalsPreservingLockedBaselines(planDoc, incomingNormalized) {
  if (!planDoc.baselineLocked || !Array.isArray(incomingNormalized)) {
    return incomingNormalized;
  }
  const prev = Array.isArray(planDoc.shortTermGoals) ? planDoc.shortTermGoals : [];
  const findPrev = (g) => {
    const gk = String(g.goalKey || '').trim();
    const gid = String(g.goalId || '').trim();
    const id = g._id ? String(g._id) : '';
    return prev.find((p) => {
      if (gk && String(p.goalKey || '').trim() === gk) return true;
      if (gid && String(p.goalId || '').trim() === gid) return true;
      if (id && p._id && String(p._id) === id) return true;
      if (String(p.title || '').trim() === String(g.title || '').trim()) return true;
      return false;
    });
  };
  return incomingNormalized.map((g) => {
    const p = findPrev(g);
    if (!p || !p.baseline) return g;
    return {
      ...g,
      baseline: {
        value: p.baseline.value != null ? p.baseline.value : g.baseline?.value ?? null,
        date: p.baseline.date != null ? p.baseline.date : g.baseline?.date ?? null,
        notes: String(p.baseline.notes || g.baseline?.notes || '').trim(),
      },
    };
  });
}

module.exports = {
  maybeLockPlanBaselineAfterSession,
  mergeShortTermGoalsPreservingLockedBaselines,
};
