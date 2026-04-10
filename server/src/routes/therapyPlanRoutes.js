const express = require('express');
const router = express.Router();
const {
  listTherapyPlansForTherapist,
  createTherapyPlan,
  duplicateTherapyPlanPost,
  duplicateTherapyPlan,
  getTherapyPlanByCase,
  getAssignContext,
  assignTherapyPlan,
  updateTherapyPlan,
} = require('../controllers/therapyPlanController');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect);
router.use(restrictTo('therapist'));

/** Register specific paths before /:caseId */
router.get('/', listTherapyPlansForTherapist);
router.post('/', createTherapyPlan);
router.post('/duplicate', duplicateTherapyPlanPost);
router.post('/assign', assignTherapyPlan);
router.get('/case/:caseId/assign-context', getAssignContext);
router.post('/:id/duplicate', duplicateTherapyPlan);
router.get('/:caseId', getTherapyPlanByCase);
router.patch('/:id', updateTherapyPlan);

module.exports = router;
