import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, RefreshCw, CheckCheck, AlertCircle, Trash2, MessageSquare } from 'lucide-react';
import { notificationAPI } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { getCaseMessageConversationId, navigateToCaseMessageInbox } from '../../utils/caseMessageNotificationNav';
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

/** Full-page notifications list for therapist dashboard (embedded). */
export function TherapistNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const removeOne = async (id: string) => {
    try {
      await notificationAPI.remove(id);
      setItems((prev) => {
        const next = prev.filter((n) => n._id !== id);
        setUnreadCount(next.filter((n) => !n.isRead).length);
        return next;
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread' | 'read')}>
            <SelectTrigger className="w-[150px] border bg-card">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="border" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <Card className="border/90 bg-card shadow-sm">
        <CardHeader className="border-b border border-border bg-secondary/20">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Bell className="h-4 w-4 text-primary" strokeWidth={1.75} />
            Clinical alerts
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Case updates, assignments, referrals, and system messages
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-lg border-dashed border bg-muted/80 p-8 text-center text-sm text-muted-foreground">
              No notifications to display.
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((n) => (
                <div
                  key={n._id}
                  className={`rounded-xl border p-4 ${
                    n.isRead ? 'border border-border bg-card' : 'border-primary/30 bg-secondary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        {!n.isRead ? (
                          <Badge className="border-border bg-secondary text-primary">Unread</Badge>
                        ) : null}
                      </div>
                      {n.type ? (
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{n.type}</p>
                      ) : null}
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{n.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatTime(n.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      {getCaseMessageConversationId(n) ? (
                        <Button
                          size="sm"
                          variant="default"
                          className="border"
                          onClick={() => {
                            const cid = getCaseMessageConversationId(n);
                            if (cid) {
                              void markRead(n._id);
                              navigateToCaseMessageInbox(navigate, user?.role, cid);
                            }
                          }}
                        >
                          <MessageSquare className="mr-1 h-4 w-4" />
                          Open thread
                        </Button>
                      ) : null}
                      {!n.isRead ? (
                        <Button size="sm" variant="outline" className="border" onClick={() => void markRead(n._id)}>
                          Mark read
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-muted"
                        onClick={() => void removeOne(n._id)}
                      >
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
