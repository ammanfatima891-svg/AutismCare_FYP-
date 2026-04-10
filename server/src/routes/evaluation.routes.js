const express = require('express');
const router = express.Router();
const {
  createEvaluation,
  getEvaluationsByCase,
  getEvaluationById,
  versionEvaluation,
} = require('../controllers/evaluationController');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect);
router.use(restrictTo('clinician'));

router.post('/', createEvaluation);
router.get('/single/:id', getEvaluationById);
router.get('/:caseId', getEvaluationsByCase);
router.patch('/:id', versionEvaluation);

module.exports = router;
