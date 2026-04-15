const mongoose = require('mongoose');
const { ChildCase } = require('../models/ChildCase');
const TherapyCase = require('../models/TherapyCase');
const { Referral } = require('../models/Referral');
const { resolveTherapistTypes } = require('../controllers/referralController');
const { REFERRAL_STATUS, THERAPY_STATUS } = require('../constants/workflowEnums');

/**
 * Same gate as GET /api/therapist/case/:caseId — ChildCase exists, and either an active
 * TherapyCase OR a matching referral (pending / accepted / in-progress).
 */
async function therapistHasCaseAccess(req, caseId, therapistId) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) return false;

  const caseDoc = await ChildCase.findById(caseId).lean();
  if (!caseDoc) return false;

  const active = await TherapyCase.findOne({ caseId, therapistId, status: THERAPY_STATUS.ACTIVE }).lean();
  if (active) return true;

  const therapistTypes = await resolveTherapistTypes(req);
  if (!therapistTypes.length) return false;

  const referral = await Referral.findOne({
    caseId,
    therapistType: { $in: therapistTypes },
    status: { $in: [REFERRAL_STATUS.CREATED, REFERRAL_STATUS.SENT, REFERRAL_STATUS.ACCEPTED] },
  })
    .sort({ updatedAt: -1 })
    .lean();

  return Boolean(referral);
}

async function assertTherapistCaseAccess(req, caseId, therapistId) {
  const ok = await therapistHasCaseAccess(req, caseId, therapistId);
  if (ok) return { ok: true };
  return {
    ok: false,
    status: 403,
    message: 'You do not have access to this case, or start therapy from the referral before logging sessions.',
  };
}

module.exports = {
  therapistHasCaseAccess,
  assertTherapistCaseAccess,
};
