const mongoose = require('mongoose');
const { ChildCase } = require('../models/ChildCase');

/**
 * Factory middleware to validate ChildCase.status before performing an action.
 *
 * Options:
 * - childCaseId: function(req) -> caseId OR string key path in req (e.g. 'body.caseId', 'params.caseId')
 * - requiredStatuses: string[] OR function(req) -> string[]
 * - actionName: string (for messages/logging)
 * - message: override error message
 */
function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function validateCaseState({ childCaseId, requiredStatuses, actionName, message }) {
  return async (req, res, next) => {
    try {
      const action = String(actionName || 'ACTION').trim();
      const statuses =
        typeof requiredStatuses === 'function'
          ? requiredStatuses(req)
          : Array.isArray(requiredStatuses)
            ? requiredStatuses
            : [];

      const caseId =
        typeof childCaseId === 'function'
          ? childCaseId(req)
          : typeof childCaseId === 'string'
            ? getByPath(req, childCaseId)
            : undefined;

      if (!caseId || !mongoose.Types.ObjectId.isValid(String(caseId))) {
        return res.status(400).json({
          success: false,
          message: 'childCaseId is required for this action',
          errorCode: 'CASE_ID_REQUIRED',
        });
      }

      const doc = await ChildCase.findById(caseId).select('_id status parentId childId clinicianId therapistId').lean();
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Case not found', errorCode: 'CASE_NOT_FOUND' });
      }

      const st = String(doc.status || '').trim().toUpperCase();
      const allowed = (statuses || []).map((s) => String(s).trim().toUpperCase());
      if (!allowed.includes(st)) {
        return res.status(403).json({
          success: false,
          message: message || 'Action not allowed in current case state',
          errorCode: 'CASE_STATE_FORBIDDEN',
          meta: {
            action,
            currentStatus: st,
            requiredStatuses: allowed,
            caseId: String(doc._id),
          },
        });
      }

      req.childCase = doc;
      return next();
    } catch (err) {
      console.error('[validateCaseState] error:', err);
      return res.status(500).json({ success: false, message: 'Failed to validate case state' });
    }
  };
}

module.exports = { validateCaseState };

