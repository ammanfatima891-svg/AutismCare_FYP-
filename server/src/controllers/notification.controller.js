const {
    getNotifications,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount
} = require('../utils/notification');

// Get all notifications for authenticated user
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { unreadOnly, limit } = req.query;

        let notifications;
        if (unreadOnly === 'true') {
            notifications = await getUnreadNotifications(userId, parseInt(limit) || 50);
        } else {
            notifications = await getNotifications(userId, parseInt(limit) || 100);
        }

        const unreadCount = await getUnreadCount(userId);

        res.status(200).json({
            success: true,
            data: {
                notifications,
                unreadCount
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
        const userId = req.user.id;
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
        const userId = req.user.id;

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
        const userId = req.user.id;
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

module.exports = {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getNotificationCount
};
