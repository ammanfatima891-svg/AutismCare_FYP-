import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Bell, CheckCircle, Clock, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import API from '../../api';

interface Notification {
    _id: string;
    type: 'new_test_order' | 'order_assigned' | 'report_uploaded' | 'order_completed' | 'report_released' | 'urgent_order' | 'system';
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}

export function LabNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await API.get('/notifications');
            if (response.data.success) {
                setNotifications(response.data.data.notifications);
                setUnreadCount(response.data.data.unreadCount);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await API.patch(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await API.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'urgent_order':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'new_test_order':
                return <FileText className="h-5 w-5 text-blue-500" />;
            case 'order_completed':
            case 'report_released':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            default:
                return <Bell className="h-5 w-5 text-gray-500" />;
        }
    };

    const getNotificationStyle = (type: string, read: boolean) => {
        const baseStyle = read ? 'bg-white' : 'bg-blue-50';
        switch (type) {
            case 'urgent_order':
                return `${baseStyle} border-l-4 border-l-red-500`;
            case 'new_test_order':
                return `${baseStyle} border-l-4 border-l-blue-500`;
            case 'order_completed':
            case 'report_released':
                return `${baseStyle} border-l-4 border-l-green-500`;
            default:
                return `${baseStyle} border-l-4 border-l-gray-300`;
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-orange-600 mb-2">Notifications</h2>
                    <p className="text-gray-600">
                        {unreadCount > 0
                            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                            : 'All caught up!'
                        }
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchNotifications}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-orange-600" />
                        Recent Notifications
                    </CardTitle>
                    <CardDescription>Stay updated with test orders and system alerts</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">
                            <RefreshCw className="h-8 w-8 mx-auto mb-4 text-gray-300 animate-spin" />
                            <p>Loading notifications...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notification) => (
                                <div
                                    key={notification._id}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${getNotificationStyle(notification.type, notification.isRead)}`}
                                    onClick={() => !notification.isRead && markAsRead(notification._id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className={`font-medium ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                                    {notification.title}
                                                </p>
                                                {!notification.isRead && (
                                                    <Badge className="bg-blue-100 text-blue-800 text-xs">New</Badge>
                                                )}
                                            </div>
                                            <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-500' : 'text-gray-600'}`}>
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatTime(notification.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

