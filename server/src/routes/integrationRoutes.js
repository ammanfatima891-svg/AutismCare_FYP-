const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const integrationController = require('../controllers/integrationController');

router.use(protect);

router.get('/:caseId/progress', integrationController.getCaseProgress);
router.get('/:caseId/summary', integrationController.getCaseSummary);

module.exports = router;
