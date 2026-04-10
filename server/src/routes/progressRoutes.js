const express = require('express');
const router = express.Router();
const {
  getProgressOverview,
  getDomainProgress,
  getSessionInsights,
} = require('../controllers/progressController');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect);
router.use(restrictTo('clinician'));

router.get('/:caseId/overview', getProgressOverview);
router.get('/:caseId/domain/:domain', getDomainProgress);
router.get('/:caseId/sessions', getSessionInsights);

module.exports = router;
