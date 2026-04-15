const express = require('express');
const router = express.Router();
const { protect, restrictTo, requireOwnership } = require('../middleware/auth.middleware');
const { getCaseAnalytics } = require('../controllers/analyticsController');

router.use(protect);
router.use(restrictTo('therapist'));

router.get('/:caseId', requireOwnership({ caseIdParam: 'caseId' }), getCaseAnalytics);

module.exports = router;
