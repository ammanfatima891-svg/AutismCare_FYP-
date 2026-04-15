const mongoose = require('mongoose');
const { assertUserCaseAccess } = require('../utils/caseAccess');

function structured(res, status, message, errorCode) {
  return res.status(status).json({
    success: false,
    message,
    errorCode: errorCode || 'FORBIDDEN',
  });
}

/**
 * requireRole('parent', 'clinician', ...)
 * Canonical role gate with structured errors.
 */
function requireRole(...roles) {
  const allowed = roles.map((r) => String(r).trim().toLowerCase());
  return (req, res, next) => {
    const userRole = String(req.user?.role ?? req.jwtRole ?? '').trim().toLowerCase();
    if (!allowed.includes(userRole)) {
      return structured(res, 403, 'Permission denied', 'RBAC_FORBIDDEN');
    }
    return next();
  };
}

/**
 * requireOwnership({ caseIdParam?: 'caseId' })
 * Ensures the current user can access the ChildCase.
 *
 * - Parent: must own the case
 * - Clinician: must be the assigned clinician
 * - Therapist: must have therapist case access (active TherapyCase or matching referral)
 */
function requireOwnership(options = {}) {
  const caseIdParam = options.caseIdParam || 'caseId';
  return async (req, res, next) => {
    try {
      const caseId = req.params?.[caseIdParam] || req.body?.caseId;
      if (!caseId || !mongoose.Types.ObjectId.isValid(String(caseId))) {
        return structured(res, 400, 'Invalid caseId', 'INVALID_CASE_ID');
      }

      const access = await assertUserCaseAccess(req, String(caseId));
      if (!access.ok) {
        return structured(res, access.status || 403, access.message || 'Access denied', 'OWNERSHIP_REQUIRED');
      }

      // Attach for controllers to reuse without refetch.
      req.caseDoc = access.caseDoc;
      return next();
    } catch (err) {
      // Do not leak internal errors
      console.error('requireOwnership:', err);
      return structured(res, 500, 'Authorization check failed', 'AUTHZ_CHECK_FAILED');
    }
  };
}

module.exports = {
  requireRole,
  requireOwnership,
};

