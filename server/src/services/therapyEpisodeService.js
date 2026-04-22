const { getCurrentTime } = require('../utils/time.js');
const mongoose = require('mongoose');
const TherapyEpisode = require('../models/TherapyEpisode');

/**
 * Ends any active episode for this therapist+case and creates a new active episode.
 */
async function startNewEpisode({ caseId, therapistId, planId, planVersion }) {
  const now = getCurrentTime();
  const cid = new mongoose.Types.ObjectId(String(caseId));
  const tid = new mongoose.Types.ObjectId(String(therapistId));
  const pid = new mongoose.Types.ObjectId(String(planId));

  /** Single active episode per case — end any active row for this case (all therapists). */
  await TherapyEpisode.updateMany({ caseId: cid, isActive: true }, { $set: { isActive: false, endDate: now } });

  return TherapyEpisode.create({
    caseId: cid,
    therapistId: tid,
    planId: pid,
    planVersion: Number(planVersion) >= 1 ? Number(planVersion) : 1,
    startDate: now,
    endDate: null,
    isActive: true,
  });
}

async function getActiveEpisode(caseId, therapistId) {
  if (!mongoose.Types.ObjectId.isValid(String(caseId)) || !mongoose.Types.ObjectId.isValid(String(therapistId))) {
    return null;
  }
  return TherapyEpisode.findOne({
    caseId: new mongoose.Types.ObjectId(String(caseId)),
    therapistId: new mongoose.Types.ObjectId(String(therapistId)),
    isActive: true,
  }).lean();
}

/** At most one active episode per case — resolve without therapist filter, then caller may verify therapistId. */
async function getActiveEpisodeForCase(caseId) {
  if (!mongoose.Types.ObjectId.isValid(String(caseId))) return null;
  return TherapyEpisode.findOne({
    caseId: new mongoose.Types.ObjectId(String(caseId)),
    isActive: true,
  }).lean();
}

/**
 * If therapy is running with an active plan but no episode row (legacy DB), create one.
 */
async function ensureActiveEpisodeForPlan(planDoc) {
  if (!planDoc?._id || !planDoc.caseId || !planDoc.therapistId) return null;
  const existing = await getActiveEpisode(planDoc.caseId, planDoc.therapistId);
  if (existing) return existing;
  return startNewEpisode({
    caseId: planDoc.caseId,
    therapistId: planDoc.therapistId,
    planId: planDoc._id,
    planVersion: planDoc.planVersion || 1,
  }).then((d) => d.toObject());
}

module.exports = {
  startNewEpisode,
  getActiveEpisode,
  getActiveEpisodeForCase,
  ensureActiveEpisodeForPlan,
};
