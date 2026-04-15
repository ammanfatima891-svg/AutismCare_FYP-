const express = require('express');
const router = express.Router();
const { protect, requireRole, requireOwnership } = require('../middleware/auth.middleware');
const integrationController = require('../controllers/integrationController');

router.use(protect);
router.use(requireRole('parent', 'clinician', 'therapist', 'admin'));

router.get('/:caseId/progress', requireOwnership({ caseIdParam: 'caseId' }), integrationController.getCaseProgress);
router.get('/:caseId/summary', requireOwnership({ caseIdParam: 'caseId' }), integrationController.getCaseSummary);

module.exports = router;
