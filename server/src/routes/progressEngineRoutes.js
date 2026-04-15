const express = require('express');
const router = express.Router();
const { protect, requireRole, requireOwnership } = require('../middleware/auth.middleware');
const { getProgressEngine, getProgressEngineSummary } = require('../controllers/progressEngineController');

router.use(protect);
router.use(requireRole('parent', 'clinician', 'therapist', 'admin'));

router.get('/:caseId/summary', requireOwnership({ caseIdParam: 'caseId' }), getProgressEngineSummary);
router.get('/:caseId', requireOwnership({ caseIdParam: 'caseId' }), getProgressEngine);

module.exports = router;
