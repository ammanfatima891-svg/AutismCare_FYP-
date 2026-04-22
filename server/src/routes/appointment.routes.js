const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { validateFileStrict, wrapMulter } = require('../middleware/uploadValidation');
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
const { validateCaseState } = require('../middleware/validateCaseState');
const { ACTIONS } = require('../services/actionPermissionService');

// ─── Multer config for appointment document uploads ─────────────────────────
// Global rule: Images (jpeg/png/webp) <=5MB, PDFs <=10MB. No doc/docx.

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads/appointment-documents/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = getCurrentTimeMs() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'appt-doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const v = validateFileStrict({ ...file, size: 0 }, ['image', 'pdf']);
        if (v.ok) return cb(null, true);
        cb(new Error('Only jpeg/png/webp images or PDFs are allowed'));
    }
});

const uploadDocuments = wrapMulter(upload.array('documents', 5));

// All routes require authentication + audit context
router.use(protect);
router.use(auditContext);

// ─── Parent Routes ───────────────────────────────────────────────────────────

// Create new appointment (parent only)
router.post('/', restrictTo('parent'), uploadDocuments, (req, res, next) => {
    // Enforce stricter per-type size (images <= 5MB, pdf <= 10MB)
    if (Array.isArray(req.files)) {
        for (const f of req.files) {
            const v = validateFileStrict(f, ['image', 'pdf']);
            if (!v.ok) {
                return res.status(400).json({ success: false, message: v.message, errorCode: v.errorCode });
            }
        }
    }
    return next();
},
// State gate: appointment booking requires REVIEW (screening submitted)
validateCaseState({
    childCaseId: 'body.caseId',
    requiredStatuses: ['REVIEW'],
    actionName: ACTIONS.BOOK_APPOINTMENT,
    message: 'Complete screening before booking clinician appointment.',
}),
createAppointment);

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
