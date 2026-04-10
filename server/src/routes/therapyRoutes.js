const express = require('express');
const router = express.Router();
const {
  getTherapyPlan,
  getSessionLogs,
  getTherapyGoals,
  getClinicianNotes,
  addClinicianNote,
} = require('../controllers/therapyController');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect);
router.use(restrictTo('clinician'));

router.get('/:caseId/plan', getTherapyPlan);
router.get('/:caseId/sessions', getSessionLogs);
router.get('/:caseId/goals', getTherapyGoals);
router.get('/:caseId/notes', getClinicianNotes);
router.post('/:caseId/notes', addClinicianNote);

module.exports = router;
