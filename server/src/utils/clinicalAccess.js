const mongoose = require('mongoose');
const { ChildCase } = require('../models/ChildCase');
const { assertUserCaseAccess } = require('./caseAccess');

/**
 * Timeline + clinical case state: parent (own case), clinician, therapist, admin (read-only).
 */
async function assertClinicalIntelligenceAccess(req, caseId) {
  if (!mongoose.Types.ObjectId.isValid(caseId)) {
    return { ok: false, status: 400, message: 'Invalid caseId' };
  }

  const role = String(req.user?.role ?? req.jwtRole ?? '').trim().toLowerCase();
  if (role === 'admin') {
    const caseDoc = await ChildCase.findById(caseId).lean();
    if (!caseDoc) return { ok: false, status: 404, message: 'Case not found' };
    return { ok: true, caseDoc, role };
  }

  return assertUserCaseAccess(req, caseId);
}

module.exports = { assertClinicalIntelligenceAccess };
