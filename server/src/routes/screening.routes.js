// routes/screening.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { calculateScreening, getQuestionnaireByType, getAvailableQuestionnaires, getScreeningHistory, getSubmissionById, getChildScreeningStatus, getChildScreeningsCount, getChildScreenings, getAvailableCliniciansAndTherapists, getScreeningStats, downloadSubmissionReport, sendReportByEmail } = require("../controllers/screening.controller");
const { protect } = require("../middleware/auth.middleware");

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

router.post("/calculate-screening", calculateScreening);
router.post("/send-report", sendReportWithUpload, sendReportByEmail);
router.get("/questionnaires/:type", getQuestionnaireByType);
router.get("/available-questionnaires", getAvailableQuestionnaires);
router.get("/screening-history", getScreeningHistory);
router.get("/submission/:id", getSubmissionById);
router.get("/submission/:id/download", downloadSubmissionReport);
router.get("/child/:childId/screening-status", getChildScreeningStatus);
router.get("/stats", getScreeningStats);
router.get("/available-clinicians-therapists", getAvailableCliniciansAndTherapists);
module.exports = router;
