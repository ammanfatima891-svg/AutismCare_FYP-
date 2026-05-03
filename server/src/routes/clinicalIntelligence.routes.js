const express = require('express');
const { protect, restrictTo, requireRole } = require('../middleware/auth.middleware');
const { getCaseTimeline, getClinicalCaseState } = require('../controllers/caseTimeline.controller');
const { getGlobalClinicalSummary } = require('../controllers/globalClinicalAnalytics.controller');

const router = express.Router();

router.use(protect);

router.get(
  '/case-timeline/:caseId',
  requireRole('parent', 'clinician', 'therapist', 'admin'),
  getCaseTimeline
);

router.get(
  '/clinical-case-state/:caseId',
  requireRole('clinician', 'therapist', 'admin'),
  getClinicalCaseState
);

router.get('/global-clinical-analytics/summary', restrictTo('admin'), getGlobalClinicalSummary);

module.exports = router;
