const mongoose = require('mongoose');
const { ChildCase } = require('../models/ChildCase');
const { assertTherapistCaseAccess } = require('./therapistCaseAccess');

/**
 * Parent (owns case), assigned clinician, or therapist with TherapyCase / referral access.
 */
async function assertUserCaseAccess(req, caseId) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) {
    return { ok: false, status: 400, message: 'Invalid caseId' };
  }

  const caseDoc = await ChildCase.findById(caseId).lean();
  if (!caseDoc) {
    return { ok: false, status: 404, message: 'Case not found' };
  }

  const uid = req.user._id;
  const role = String(req.user.role || req.jwtRole || '').toLowerCase();

  if (role === 'parent' && String(caseDoc.parentId) === String(uid)) {
    return { ok: true, caseDoc };
  }
  if (role === 'clinician' && String(caseDoc.clinicianId) === String(uid)) {
    return { ok: true, caseDoc };
  }
  if (role === 'therapist') {
    const access = await assertTherapistCaseAccess(req, caseId, uid);
    if (access.ok) return { ok: true, caseDoc };
    return { ok: false, status: access.status, message: access.message };
  }

  return { ok: false, status: 403, message: 'Access denied' };
}

module.exports = { assertUserCaseAccess };
