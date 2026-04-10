const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const activityController = require('../controllers/activityController');
const activityTemplateController = require('../controllers/activityTemplateController');

router.use(protect);
router.use(restrictTo('therapist'));

// Template routes (register before /:id to avoid collisions)
router.get('/templates', activityTemplateController.listTemplates);
router.post('/templates', activityTemplateController.createTemplate);
router.patch('/templates/:id', activityTemplateController.updateTemplate);
router.post('/templates/:id/clone', activityTemplateController.cloneTemplate);

router.post('/:id/assign', activityController.assignActivity);

// Legacy / generic activity CRUD
router.post('/', activityController.createActivity);
router.get('/', activityController.listActivities);
router.patch('/:id', activityController.updateActivity);
router.post('/:id/clone', activityController.cloneActivity);

module.exports = router;
