const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    createAppointment,
    getParentAppointments,
    getProfessionalAppointments,
    approveAppointment,
    rejectAppointment,
    rescheduleAppointment,
    completeAppointment,
    cancelAppointment,
    getAllAppointments,
    getAppointmentStats,
    getAvailableProfessionals
} = require('../controllers/appointment.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { auditContext } = require('../utils/audit');

// ─── Multer config for appointment document uploads (25MB max) ───────────────

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads/appointment-documents/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'appt-doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png), PDF, and Word documents are allowed'));
    }
});

// All routes require authentication + audit context
router.use(protect);
router.use(auditContext);

// ─── Parent Routes ───────────────────────────────────────────────────────────

// Create new appointment (parent only)
router.post('/', restrictTo('parent'), upload.array('documents', 5), createAppointment);

// Get parent's own appointments
router.get('/my', restrictTo('parent'), getParentAppointments);

// Cancel an appointment (parent only)
router.put('/:id/cancel', restrictTo('parent'), cancelAppointment);

// Get available professionals for a given appointment type (parent use)
router.get('/professionals/:type', restrictTo('parent'), getAvailableProfessionals);

// ─── Professional Routes ─────────────────────────────────────────────────────

// Get appointments assigned to the professional
router.get('/professional', restrictTo('clinician', 'therapist', 'lab'), getProfessionalAppointments);

// Approve appointment
router.put('/:id/approve', restrictTo('clinician', 'therapist', 'lab'), approveAppointment);

// Reject appointment
router.put('/:id/reject', restrictTo('clinician', 'therapist', 'lab'), rejectAppointment);

// Reschedule appointment
router.put('/:id/reschedule', restrictTo('clinician', 'therapist', 'lab'), rescheduleAppointment);

// Complete appointment
router.put('/:id/complete', restrictTo('clinician', 'therapist', 'lab'), completeAppointment);

// ─── Admin Routes ────────────────────────────────────────────────────────────

// Get all appointments (admin overview)
router.get('/all', restrictTo('admin'), getAllAppointments);

// Get appointment statistics
router.get('/stats', restrictTo('admin'), getAppointmentStats);

module.exports = router;
