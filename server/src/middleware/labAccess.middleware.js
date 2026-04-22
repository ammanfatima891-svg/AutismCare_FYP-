const LabApproval = require('../models/LabApproval');

function forbidden(res, message = 'Permission denied', errorCode = 'RBAC_FORBIDDEN') {
  return res.status(403).json({ success: false, message, errorCode });
}

function ensureLab(req, res, next) {
  const role = String(req.user?.role ?? req.jwtRole ?? '').trim().toLowerCase();
  if (role !== 'lab') return forbidden(res, 'Only lab users can perform this action');
  return next();
}

function ensureClinician(req, res, next) {
  const role = String(req.user?.role ?? req.jwtRole ?? '').trim().toLowerCase();
  if (role !== 'clinician') return forbidden(res, 'Only clinicians can perform this action');
  return next();
}

async function ensureApprovedLab(req, res, next) {
  const role = String(req.user?.role ?? req.jwtRole ?? '').trim().toLowerCase();
  if (role !== 'lab') return forbidden(res, 'Only lab users can perform this action');

  try {
    const approval = await LabApproval.findOne({ labUserId: req.user?._id }).select('status').lean();
    const approvalStatus = String(approval?.status || '').trim().toLowerCase();
    if (approvalStatus !== 'active') {
      return forbidden(res, 'Lab account must be approved before managing tests', 'LAB_NOT_APPROVED');
    }
    return next();
  } catch (error) {
    console.error('ensureApprovedLab:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify lab approval status' });
  }
}

module.exports = {
  ensureLab,
  ensureClinician,
  ensureApprovedLab,
};
