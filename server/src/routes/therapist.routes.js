const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  addTherapistRecommendation,
} = require('../controllers/therapist.controller');
const {
  getTherapistDashboard,
  getTherapistDashboardSummary,
} = require('../controllers/therapistDashboardController');
const { startReferral } = require('../controllers/referralController');
const {
  createHomeAssignment,
  getAssignmentsByCaseForTherapist,
} = require('../controllers/homeAssignment.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { validateCaseState } = require('../middleware/validateCaseState');

// All therapist routes require authentication and therapist role
router.use(protect);
router.use(restrictTo('therapist'));

// Dashboard stats for the logged-in therapist
router.get('/dashboard-stats', getDashboardStats);

// Aggregated dashboard + summary (same router as other /api/therapist/* routes)
router.get('/dashboard-summary', getTherapistDashboardSummary);
router.get('/dashboard', getTherapistDashboard);

// Extended therapist referral flow (keeps existing /api/referrals routes intact)
router.patch('/referrals/:id/start-therapy', startReferral);

// Therapist recommendation notes by child (resolved to active therapy case)
router.post('/recommendations', addTherapistRecommendation);

// Therapy assignments linked by caseId
router.post(
  '/cases/:caseId/assignments',
  validateCaseState({
    childCaseId: 'params.caseId',
    requiredStatuses: ['THERAPY_ACTIVE'],
    actionName: 'CREATE_HOME_ASSIGNMENT',
    message: 'Home assignments can only be created during active therapy (THERAPY_ACTIVE).',
  }),
  createHomeAssignment
);
router.get('/cases/:caseId/assignments', getAssignmentsByCaseForTherapist);

module.exports = router;

