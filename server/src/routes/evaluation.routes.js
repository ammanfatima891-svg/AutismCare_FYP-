const express = require('express');
const router = express.Router();
const {
  createEvaluation,
  getEvaluationsByCase,
  getEvaluationById,
  versionEvaluation,
  getDevelopmentSummaryByCase,
} = require('../controllers/evaluationController');
const { protect, restrictTo, requireOwnership } = require('../middleware/auth.middleware');
const { validateCaseState } = require('../middleware/validateCaseState');
const { ClinicalEvaluation } = require('../models/ClinicalEvaluation');

router.use(protect);
router.use(restrictTo('clinician'));

router.post(
  '/',
  validateCaseState({
    childCaseId: 'body.caseId',
    requiredStatuses: ['REVIEW', 'DIAGNOSIS', 'DIAGNOSIS_READY'],
    actionName: 'CREATE_EVALUATION',
    message: 'Clinical evaluation is only allowed during REVIEW/DIAGNOSIS stages.',
  }),
  createEvaluation
);
router.get('/single/:id', getEvaluationById);
router.get('/:caseId/development-summary', requireOwnership({ caseIdParam: 'caseId' }), getDevelopmentSummaryByCase);
// Use controller-owned ownership check so non-owners get 404 (no case existence leakage).
router.get('/:caseId', getEvaluationsByCase);
router.patch(
  '/:id',
  // Resolve caseId from evaluation id, then validate case state
  async (req, res, next) => {
    try {
      const ev = await ClinicalEvaluation.findById(req.params.id).select('caseId').lean();
      req.body = req.body || {};
      if (ev?.caseId) req.body.caseId = String(ev.caseId);
      return next();
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to validate case state' });
    }
  },
  validateCaseState({
    childCaseId: 'body.caseId',
    requiredStatuses: ['REVIEW', 'DIAGNOSIS', 'DIAGNOSIS_READY'],
    actionName: 'UPDATE_EVALUATION',
    message: 'Clinical evaluation updates are only allowed during REVIEW/DIAGNOSIS stages.',
  }),
  versionEvaluation
);

module.exports = router;
