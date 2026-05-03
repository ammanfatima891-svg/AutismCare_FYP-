const express = require("express");
const router = express.Router();

const {
  getScreeningReviewsForClinician,
  recordScreeningDecision,
  approveTherapyPlan,
} = require("../controllers/clinician.controller.js");
const { getCaseloadProgress } = require("../controllers/clinicianCaseload.controller.js");
const { protect, restrictTo } = require("../middleware/auth.middleware.js");

// All clinician routes require authentication and clinician role
router.use(protect);
router.use(restrictTo("clinician"));

// GET /api/clinician/caseload-progress
router.get("/caseload-progress", getCaseloadProgress);

// GET /api/clinician/screening-reviews
router.get("/screening-reviews", getScreeningReviewsForClinician);
router.patch("/screening-reviews/:submissionId/decision", recordScreeningDecision);
router.patch("/therapy-plans/:planId/approve", approveTherapyPlan);

module.exports = router;

