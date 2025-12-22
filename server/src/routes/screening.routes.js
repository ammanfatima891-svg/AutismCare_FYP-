// routes/screening.routes.js
const express = require("express");
const router = express.Router();
const { calculateScreening, getQuestionnaireByType, getAvailableQuestionnaires, getScreeningHistory, getSubmissionById, getChildScreeningStatus, getAvailableCliniciansAndTherapists } = require("../controllers/screening.controller");
const { protect } = require("../middleware/auth.middleware");

// All screening routes require authentication
router.use(protect);

router.post("/calculate-screening", calculateScreening);
router.get("/questionnaires/:type", getQuestionnaireByType);
router.get("/available-questionnaires", getAvailableQuestionnaires);
router.get("/screening-history", getScreeningHistory);
router.get("/submission/:id", getSubmissionById);
router.get("/child/:childId/screening-status", getChildScreeningStatus);
router.get("/available-clinicians-therapists", getAvailableCliniciansAndTherapists);
module.exports = router;
