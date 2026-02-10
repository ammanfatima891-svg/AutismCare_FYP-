const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');

/**
 * Create a notification for a user
 * @param {Object} params - Notification parameters
 * @param {string} params.recipientId - ID of the notification recipient
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.relatedResourceType - Type of related resource (optional)
 * @param {string} params.relatedResourceId - ID of related resource (optional)
 */
const createNotification = async ({
    recipientId,
    type,
    title,
    message,
    relatedResourceType,
    relatedResourceId
}) => {
    try {
        const notification = new Notification({
            recipientId,
            type,
            title,
            message,
            relatedResourceType,
            relatedResourceId
        });

        await notification.save();

        // TODO: Emit socket event for real-time notification if Socket.io is configured
        // io.to(recipientId.toString()).emit('notification', notification);

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

/**
 * Create notifications for multiple recipients
 * @param {Array<string>} recipientIds - Array of recipient IDs
 * @param {Object} notificationData - Notification data (type, title, message, etc.)
 */
const createBulkNotifications = async (recipientIds, notificationData) => {
    try {
        const notifications = recipientIds.map(recipientId => ({
            recipientId,
            ...notificationData
        }));

        return await Notification.insertMany(notifications);
    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        return [];
    }
};

/**
 * Get unread notifications for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum notifications to return
 */
const getUnreadNotifications = async (userId, limit = 50) => {
    try {
        return await Notification.find({ recipientId: userId, isRead: false })
            .sort({ createdAt: -1 })
            .limit(limit);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
};

/**
 * Get all notifications for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum notifications to return
 */
const getNotifications = async (userId, limit = 100) => {
    try {
        return await Notification.find({ recipientId: userId })
            .sort({ createdAt: -1 })
            .limit(limit);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
};

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for verification)
 */
const markAsRead = async (notificationId, userId) => {
    try {
        return await Notification.findOneAndUpdate(
            { _id: notificationId, recipientId: userId },
            { isRead: true, readAt: new Date() },
            { new: true }
        );
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return null;
    }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 */
const markAllAsRead = async (userId) => {
    try {
        return await Notification.updateMany(
            { recipientId: userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return null;
    }
};

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 */
const getUnreadCount = async (userId) => {
    try {
        return await Notification.countDocuments({ recipientId: userId, isRead: false });
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

module.exports = {
    createNotification,
    createBulkNotifications,
    getUnreadNotifications,
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    NOTIFICATION_TYPES
};
