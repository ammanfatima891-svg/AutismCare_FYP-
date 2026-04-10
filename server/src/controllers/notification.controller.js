const {
    getNotifications,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    deleteNotification,
    createFollowUpDueNotifications
} = require('../utils/notification');

function isClinician(req) {
    const role = String(req.user?.role ?? req.jwtRole ?? '').trim().toLowerCase();
    return role === 'clinician';
}

/** Mongoose documents expose both _id and id; JWT-only flows may differ. */
function authUserId(req) {
    return req.user?._id || req.user?.id;
}

// Get all notifications for authenticated user
const getUserNotifications = async (req, res) => {
    try {
        const userId = authUserId(req);
        const { unreadOnly, limit, page } = req.query;

        // Lazy follow-up generator (idempotent) for clinician module.
        if (isClinician(req)) {
            await createFollowUpDueNotifications(userId, 7);
        }

        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const pageNum = Math.max(1, parseInt(page) || 1);
        const offset = (pageNum - 1) * limitNum;

        let notifications;
        if (unreadOnly === 'true') {
            const unread = await getUnreadNotifications(userId, 1000);
            notifications = unread.slice(offset, offset + limitNum);
        } else {
            const all = await getNotifications(userId, 2000);
            notifications = all.slice(offset, offset + limitNum);
        }

        const unreadCount = await getUnreadCount(userId);

        res.status(200).json({
            success: true,
            data: {
                notifications,
                unreadCount,
                pagination: {
                    page: pageNum,
                    limit: limitNum
                }
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};

// Mark a notification as read
const markNotificationAsRead = async (req, res) => {
    try {
        const userId = authUserId(req);
        const { id } = req.params;

        const notification = await markAsRead(id, userId);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = authUserId(req);

        const result = await markAllAsRead(userId);

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            data: { modifiedCount: result?.modifiedCount || 0 }
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
};

// Get unread notification count
const getNotificationCount = async (req, res) => {
    try {
        const userId = authUserId(req);
        if (isClinician(req)) {
            await createFollowUpDueNotifications(userId, 7);
        }
        const count = await getUnreadCount(userId);

        res.status(200).json({
            success: true,
            data: { count }
        });
    } catch (error) {
        console.error('Error getting notification count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notification count'
        });
    }
};

// Delete a notification
const removeNotification = async (req, res) => {
    try {
        const userId = authUserId(req);
        const { id } = req.params;
        const deleted = await deleteNotification(id, userId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
};

module.exports = {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getNotificationCount,
    removeNotification
};
