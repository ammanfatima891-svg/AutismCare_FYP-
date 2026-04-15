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

router.use(protect);
router.use(restrictTo('clinician'));

router.post('/', createEvaluation);
router.get('/single/:id', getEvaluationById);
router.get('/:caseId/development-summary', requireOwnership({ caseIdParam: 'caseId' }), getDevelopmentSummaryByCase);
// Use controller-owned ownership check so non-owners get 404 (no case existence leakage).
router.get('/:caseId', getEvaluationsByCase);
router.patch('/:id', versionEvaluation);

module.exports = router;
