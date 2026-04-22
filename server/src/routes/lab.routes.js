const express = require('express');
const router = express.Router();
const {
    getTestRequests,
    getTestRequestById,
    uploadReport,
    acceptTestRequest,
    updateTestStatus,
    getReportById,
    getAllReports,
    getLabStats,
    getClinicianTestRequests,
    getClinicianRequestById,
    releaseReport,
    searchParentsWithChildren,
    createTestRequest,
    getParentReports
} = require('../controllers/lab.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { validateCaseState } = require('../middleware/validateCaseState');
const { ACTIONS } = require('../services/actionPermissionService');

// All lab routes require authentication
router.use(protect);

// ─── Parent-facing endpoints ───────────────────────────────────────
router.get('/parent/reports', restrictTo('parent'), getParentReports);

// ─── Clinician-facing endpoints ────────────────────────────────────
router.get('/clinician/parents', restrictTo('clinician'), searchParentsWithChildren);
router.get('/clinician/requests', restrictTo('clinician'), getClinicianTestRequests);
router.post(
  '/clinician/requests',
  restrictTo('clinician'),
  validateCaseState({
    childCaseId: 'body.caseId',
    requiredStatuses: ['DIAGNOSIS'],
    actionName: ACTIONS.CREATE_LAB_REQUEST,
    message: 'Lab requests can only be created during DIAGNOSIS.',
  }),
  createTestRequest
);
router.get('/clinician/requests/:id', restrictTo('clinician'), getClinicianRequestById);
router.patch('/clinician/requests/:id/release', restrictTo('clinician'), releaseReport);

// ─── Lab technician endpoints ──────────────────────────────────────
router.get('/stats', restrictTo('lab'), getLabStats);
router.get('/requests', restrictTo('lab'), getTestRequests);
router.get('/requests/:id', restrictTo('lab'), getTestRequestById);
router.patch('/requests/:id/accept', restrictTo('lab'), acceptTestRequest);
router.patch('/requests/:id/status', restrictTo('lab'), updateTestStatus);
router.post('/reports/upload', restrictTo('lab'), uploadReport);
router.get('/reports', restrictTo('lab'), getAllReports);
router.get('/reports/:id', restrictTo('lab'), getReportById);

module.exports = router;
