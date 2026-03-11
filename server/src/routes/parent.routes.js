const express = require("express");
const router = express.Router();
const parentController = require("../controllers/parent.controller.js");
const { protect, restrictTo } = require("../middleware/auth.middleware.js");

router.use(protect);
router.use(restrictTo("parent"));

router.get("/screenings", parentController.getParentScreenings);

module.exports = router;
