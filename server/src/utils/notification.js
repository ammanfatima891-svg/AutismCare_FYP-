const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const { ClinicalEvaluation } = require('../models/ClinicalEvaluation');

/**
 * Create a notification for a user
 * @param {Object} params - Notification parameters
 * @param {string} params.recipientId - ID of the notification recipient
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.relatedResourceType - Type of related resource (optional)
 * @param {string} params.relatedResourceId - ID of related resource (optional)
 * @param {string} params.relatedCaseId - ChildCase id (optional)
 */
const createNotification = async ({
    recipientId,
    type,
    title,
    message,
    relatedResourceType,
    relatedResourceId,
    relatedCaseId
}) => {
    try {
        const notification = new Notification({
            recipientId,
            type,
            title,
            message,
            relatedResourceType,
            relatedResourceId,
            relatedCaseId
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
 * Create a notification only if same recipient/type/resource does not already exist.
 */
const createNotificationIfNotExists = async ({
    recipientId,
    type,
    title,
    message,
    relatedResourceType,
    relatedResourceId,
    relatedCaseId
}) => {
    try {
        const existing = await Notification.findOne({
            recipientId,
            type,
            relatedResourceId: relatedResourceId || null
        }).lean();

        if (existing) return existing;

        return await createNotification({
            recipientId,
            type,
            title,
            message,
            relatedResourceType,
            relatedResourceId,
            relatedCaseId
        });
    } catch (error) {
        console.error('Error creating deduped notification:', error);
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
 * Delete one notification that belongs to the user.
 */
const deleteNotification = async (notificationId, userId) => {
    try {
        return await Notification.findOneAndDelete({ _id: notificationId, recipientId: userId });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return null;
    }
};

/**
 * Create FOLLOW_UP notifications for final evaluations older than X days.
 * Uses evaluation _id as related resource for idempotency.
 */
const createFollowUpDueNotifications = async (clinicianId, days = 7) => {
    try {
        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const dueEvaluations = await ClinicalEvaluation.find({
            clinicianId,
            status: 'final',
            createdAt: { $lte: threshold }
        })
            .select('_id caseId createdAt')
            .lean();

        for (const ev of dueEvaluations) {
            await createNotificationIfNotExists({
                recipientId: clinicianId,
                type: NOTIFICATION_TYPES.FOLLOW_UP,
                title: 'Follow-up Due',
                message: `Follow-up review required for case ${ev.caseId}`,
                relatedResourceType: 'ClinicalEvaluation',
                relatedResourceId: ev._id
            });
        }
    } catch (error) {
        console.error('Error creating follow-up notifications:', error);
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
    createNotificationIfNotExists,
    createBulkNotifications,
    getUnreadNotifications,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createFollowUpDueNotifications,
    getUnreadCount,
    NOTIFICATION_TYPES
};
