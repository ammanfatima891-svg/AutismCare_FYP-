// routes/screening.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { calculateScreening, getQuestionnaireByType, getAvailableQuestionnaires, getScreeningHistory, getSubmissionById, getChildScreeningStatus, getChildScreeningsCount, getChildScreenings, getAvailableCliniciansAndTherapists, getScreeningStats, downloadSubmissionReport, sendReportByEmail, getScreeningPlan } = require("../controllers/screening.controller");
const { protect, requireRole } = require("../middleware/auth.middleware");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file) return cb(new Error("No file uploaded."));
    const ok = file.mimetype === "application/pdf" || file.mimetype === "application/octet-stream" || file.originalname && file.originalname.toLowerCase().endsWith(".pdf");
    if (ok) return cb(null, true);
    cb(new Error("Only PDF files are allowed."));
  },
});

// Wrap multer so upload errors return JSON (client can show message)
function sendReportWithUpload(req, res, next) {
  upload.single("pdf")(req, res, (err) => {
    if (err) {
      const message = err instanceof multer.MulterError
        ? (err.code === "LIMIT_FILE_SIZE" ? "PDF is too large (max 10MB)." : "Upload failed.")
        : (err.message || "Upload failed.");
      return res.status(400).json({ success: false, message });
    }
    next();
  });
}

// All screening routes require authentication
router.use(protect);
router.use(requireRole('parent', 'clinician', 'admin'));

// Parent-only: submit/view own screening history and child screening dashboards.
router.post("/calculate-screening", requireRole('parent'), calculateScreening);
router.post("/send-report", requireRole('parent'), sendReportWithUpload, sendReportByEmail);
router.get("/available-questionnaires", requireRole('parent'), getAvailableQuestionnaires);
router.get("/screening-plan", requireRole('parent'), getScreeningPlan);
router.get("/screening-history", requireRole('parent'), getScreeningHistory);
router.get("/submission/:id", requireRole('parent', 'clinician', 'admin'), getSubmissionById);
router.get("/submission/:id/download", requireRole('parent'), downloadSubmissionReport);
router.get("/child/:childId/screening-status", requireRole('parent'), getChildScreeningStatus);
router.get("/stats", requireRole('parent'), getScreeningStats);

// Clinician/admin: questionnaire metadata + directory for appointments.
router.get("/questionnaires/:type", getQuestionnaireByType);
router.get("/available-clinicians-therapists", getAvailableCliniciansAndTherapists);
module.exports = router;
