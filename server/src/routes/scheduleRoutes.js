const express = require('express');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const scheduleController = require('../controllers/scheduleController');

const scheduleRouter = express.Router();
scheduleRouter.use(protect);
scheduleRouter.use(restrictTo('therapist'));
scheduleRouter.post('/', scheduleController.createSchedule);
scheduleRouter.get('/:caseId', scheduleController.getSchedulesByCase);

const sessionSlotRouter = express.Router();
sessionSlotRouter.use(protect);
sessionSlotRouter.get('/:caseId', scheduleController.getSessionSlotsByCase);
sessionSlotRouter.patch('/:id', restrictTo('therapist'), scheduleController.updateSessionSlot);

module.exports = {
  scheduleRouter,
  sessionSlotRouter,
};
