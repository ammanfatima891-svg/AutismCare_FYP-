const express = require("express");
const router = express.Router();
const parentController = require("../controllers/parent.controller.js");
const {
  getParentHomeAssignments,
  getParentTherapySessionInstructions,
  getParentAssignmentsByCase,
  submitParentAssignment,
  parentMarkComplete,
} = require("../controllers/homeAssignment.controller");
const integrationController = require("../controllers/integrationController");
const { uploadHomeAssignmentEvidence } = require("../middleware/uploadHomeAssignmentEvidence");
const { validateFileStrict } = require("../middleware/uploadValidation");
const { protect, restrictTo } = require("../middleware/auth.middleware.js");

router.use(protect);
router.use(restrictTo("parent"));

router.get("/screenings", parentController.getParentScreenings);
/** Case integration: list cases for parent dashboard (caseId per child). */
router.get("/cases", integrationController.getParentCases);
/** Session summaries + parentInstructions for a case. */
router.get("/case/:caseId/sessions", integrationController.getParentCaseSessions);
/** Home assignments for a case (activity name, due date, status). */
router.get("/case/:caseId/assignments", integrationController.getParentCaseAssignments);
router.get("/case/:caseId/lab-requests", integrationController.getParentCaseLabRequests);
router.get("/home-assignments", getParentHomeAssignments);
/** @deprecated prefer GET /parent/case/:caseId/assignments — kept for backward compatibility */
router.get("/assignments/:caseId", getParentAssignmentsByCase);
function submitAssignmentMiddleware(req, res, next) {
  const ct = req.headers["content-type"] || "";
  if (ct.includes("application/json")) {
    return next();
  }
  return uploadHomeAssignmentEvidence.single("file")(req, res, (err) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return res.status(400).json({ success: false, message });
    }
    if (req.file) {
      // Parent evidence uploads: images or short videos (UI supports photo/video).
      const v = validateFileStrict(req.file, ['image', 'video']);
      if (!v.ok) {
        return res.status(400).json({ success: false, message: v.message, errorCode: v.errorCode });
      }
    }
    return next();
  });
}

router.patch("/assignments/:id/submit", submitAssignmentMiddleware, submitParentAssignment);
router.patch("/assignments/:id/complete", parentMarkComplete);
router.get("/therapy-session-instructions", getParentTherapySessionInstructions);

module.exports = router;
