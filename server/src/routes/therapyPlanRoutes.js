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
  submitTherapyPlanForApproval,
  approveTherapyPlanByClinician,
} = require('../controllers/therapyPlanController');
const { protect, restrictTo, requireOwnership } = require('../middleware/auth.middleware');
const { validateCaseState } = require('../middleware/validateCaseState');

router.use(protect);
/** Clinician validator — must register before therapist-only middleware. */
router.post('/:id/approve', restrictTo('clinician'), approveTherapyPlanByClinician);

router.use(restrictTo('therapist'));

/** Register specific paths before /:caseId */
router.get('/', listTherapyPlansForTherapist);
router.post('/', createTherapyPlan);
router.post('/duplicate', duplicateTherapyPlanPost);
router.post(
  '/assign',
  validateCaseState({
    childCaseId: 'body.caseId',
    requiredStatuses: ['THERAPY', 'THERAPY_ACTIVE'],
    actionName: 'ASSIGN_THERAPY_PLAN',
    message: 'Therapy plans can only be assigned during THERAPY or THERAPY_ACTIVE.',
  }),
  assignTherapyPlan
);
router.post('/submit-for-approval/:planId', submitTherapyPlanForApproval);
router.get('/case/:caseId/assign-context', getAssignContext);
router.post('/:id/duplicate', duplicateTherapyPlan);
router.get('/:caseId', requireOwnership({ caseIdParam: 'caseId' }), getTherapyPlanByCase);
router.patch('/:id', updateTherapyPlan);

module.exports = router;
