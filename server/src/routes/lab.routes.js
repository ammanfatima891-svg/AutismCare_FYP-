const express = require('express');
const router = express.Router();
const {
    getTestRequests,
    getTestRequestById,
    uploadReport,
    updateTestStatus,
    getReportById,
    getAllReports,
    getLabStats
} = require('../controllers/lab.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// All lab routes require authentication + lab role
router.use(protect);
router.use(restrictTo('lab'));

// Dashboard statistics
router.get('/stats', getLabStats);

// Test request endpoints
router.get('/requests', getTestRequests);
router.get('/requests/:id', getTestRequestById);
router.patch('/requests/:id/status', updateTestStatus);

// Report endpoints
router.post('/reports/upload', uploadReport);
router.get('/reports', getAllReports);
router.get('/reports/:id', getReportById);

module.exports = router;
