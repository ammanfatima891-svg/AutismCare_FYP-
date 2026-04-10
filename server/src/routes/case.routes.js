const express = require('express');
const router = express.Router();
const {
  getCases,
  getCaseById,
  updateCaseStatus,
  createCase,
  createFromAppointment,
} = require('../controllers/caseController');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect);
router.use(restrictTo('clinician'));

router.get('/', getCases);
router.post('/create', createCase);
router.post('/from-appointment', createFromAppointment);
router.patch('/:id/status', updateCaseStatus);
router.get('/:id', getCaseById);

module.exports = router;
