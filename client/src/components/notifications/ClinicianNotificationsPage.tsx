import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, RefreshCw, CheckCheck, AlertCircle, Trash2 } from 'lucide-react';
import { notificationAPI } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';

function formatTime(dateString: string) {
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
}

export function ClinicianNotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await notificationAPI.list({ limit: 100, page: 1 });
      const payload = data?.data || {};
      setItems(payload.notifications || []);
      setUnreadCount(payload.unreadCount || 0);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(() => {
    if (filter === 'unread') return items.filter((n) => !n.isRead);
    if (filter === 'read') return items.filter((n) => n.isRead);
    return items;
  }, [items, filter]);

  const markRead = async (id: string) => {
    try {
      await notificationAPI.markRead(id);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const removeOne = async (id: string) => {
    try {
      await notificationAPI.remove(id);
      setItems((prev) => prev.filter((n) => n._id !== id));
      const remainingUnread = items.filter((n) => n._id !== id && !n.isRead).length;
      setUnreadCount(remainingUnread);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete notification');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-blue-700 mb-1">Notifications</h2>
          <p className="text-sm text-slate-600">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread' | 'read')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 bg-blue-50/40">
          <CardTitle className="text-base text-blue-900 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Event Alerts
          </CardTitle>
          <CardDescription>Case, referral, progress, and follow-up events</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No notifications.
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((n) => (
                <div
                  key={n._id}
                  className={`rounded-lg border p-4 ${n.isRead ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-200'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                        {!n.isRead && <Badge className="bg-blue-100 text-blue-800">Unread</Badge>}
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{n.message}</p>
                      <p className="text-xs text-slate-500 mt-2">{formatTime(n.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.isRead && (
                        <Button size="sm" variant="outline" onClick={() => markRead(n._id)}>
                          Mark read
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => removeOne(n._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
