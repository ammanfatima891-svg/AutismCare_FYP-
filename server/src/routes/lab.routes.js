const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    getTestOrders,
    getTestOrderById,
    assignTestOrder,
    updateTestOrder,
    uploadReport,
    completeTestOrder,
    createTestOrder,
    getLabStats,
    releaseToParent,
    getPendingRequests
} = require("../controllers/lab.controller");
const { protect } = require("../middleware/auth.middleware");
const { auditContext } = require("../utils/audit");

// Configure multer for lab report uploads (25MB limit per requirements)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads/lab-reports/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for lab reports
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png) and PDF files are allowed'));
        }
    }
});

// All lab routes require authentication and audit context
router.use(protect);
router.use(auditContext);

// Get lab dashboard stats
router.get("/stats", getLabStats);

// Get pending test requests (as specified in requirements: GET /api/lab/requests)
router.get("/requests", getPendingRequests);

// Get all test orders
router.get("/orders", getTestOrders);

// Get specific test order
router.get("/orders/:id", getTestOrderById);

// Create new test order (for clinicians)
router.post("/orders", createTestOrder);

// Assign test order to lab technician
router.post("/orders/:id/assign", assignTestOrder);

// Update test order
router.put("/orders/:id", updateTestOrder);

// Upload report for test order (POST /api/lab/upload as per requirements)
router.post("/upload", upload.single('report'), uploadReport);

// Upload report for specific test order
router.post("/orders/:id/report", upload.single('report'), uploadReport);

// Complete test order
router.post("/orders/:id/complete", completeTestOrder);

// Release report to parent
router.post("/orders/:id/release", releaseToParent);

module.exports = router;

