const express = require('express');
const router = express.Router();
const {
  getTherapyPlan,
  getSessionLogs,
  getTherapyGoals,
  getClinicianNotes,
  addClinicianNote,
} = require('../controllers/therapyController');
const { protect, restrictTo, requireOwnership } = require('../middleware/auth.middleware');
const { validateCaseState } = require('../middleware/validateCaseState');

router.use(protect);
router.use(restrictTo('clinician'));

router.get('/:caseId/plan', requireOwnership({ caseIdParam: 'caseId' }), getTherapyPlan);
router.get('/:caseId/sessions', requireOwnership({ caseIdParam: 'caseId' }), getSessionLogs);
router.get('/:caseId/goals', requireOwnership({ caseIdParam: 'caseId' }), getTherapyGoals);
router.get('/:caseId/notes', requireOwnership({ caseIdParam: 'caseId' }), getClinicianNotes);
router.post(
  '/:caseId/notes',
  requireOwnership({ caseIdParam: 'caseId' }),
  validateCaseState({
    childCaseId: 'params.caseId',
    requiredStatuses: ['REVIEW', 'DIAGNOSIS', 'DIAGNOSIS_READY'],
    actionName: 'ADD_CLINICIAN_NOTE',
    message: 'Clinician notes are only available during REVIEW/DIAGNOSIS stages.',
  }),
  addClinicianNote
);

module.exports = router;
