const express = require('express');
const router = express.Router();
const { getTherapistCaseFile, createSessionLog } = require('../controllers/therapistCaseController');
const scheduleController = require('../controllers/scheduleController');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect);
router.use(restrictTo('therapist'));

/**
 * Register specific `/case/:caseId/...` routes before `/case/:caseId` so Express never
 * treats `schedules` or `session-slots` as part of `:caseId`.
 */
router.get('/case/:caseId/schedule-bundle', scheduleController.getTherapistScheduleBundle);
router.get('/case/:caseId/schedules', scheduleController.getSchedulesByCase);
router.get('/case/:caseId/session-slots', scheduleController.getSessionSlotsByCase);
router.patch('/session-slots/:id', scheduleController.updateSessionSlot);

router.get('/case/:caseId', getTherapistCaseFile);
router.post('/cases/:caseId/sessions', createSessionLog);

module.exports = router;
