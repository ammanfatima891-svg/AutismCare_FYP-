const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { getCaseAnalytics } = require('../controllers/analyticsController');

router.use(protect);
router.use(restrictTo('therapist'));

router.get('/:caseId', getCaseAnalytics);

module.exports = router;
