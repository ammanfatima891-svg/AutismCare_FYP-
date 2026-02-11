const express = require("express");
const router = express.Router();
const {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getNotificationCount
} = require("../controllers/notification.controller");
const { protect } = require("../middleware/auth.middleware");

// All notification routes require authentication
router.use(protect);

// Get all notifications for the authenticated user
router.get("/", getUserNotifications);

// Get unread notification count
router.get("/count", getNotificationCount);

// Mark a specific notification as read
router.patch("/:id/read", markNotificationAsRead);

// Mark all notifications as read
router.patch("/read-all", markAllNotificationsAsRead);

module.exports = router;
