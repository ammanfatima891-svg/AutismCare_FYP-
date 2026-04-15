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

router.use(protect);
router.use(restrictTo('clinician'));

router.get('/:caseId/plan', requireOwnership({ caseIdParam: 'caseId' }), getTherapyPlan);
router.get('/:caseId/sessions', requireOwnership({ caseIdParam: 'caseId' }), getSessionLogs);
router.get('/:caseId/goals', requireOwnership({ caseIdParam: 'caseId' }), getTherapyGoals);
router.get('/:caseId/notes', requireOwnership({ caseIdParam: 'caseId' }), getClinicianNotes);
router.post('/:caseId/notes', requireOwnership({ caseIdParam: 'caseId' }), addClinicianNote);

module.exports = router;
