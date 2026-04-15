import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notificationAPI } from '../../services/api';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { AuthContext } from '../../context/AuthContext';
import {
  CASE_MESSAGE_NOTIFICATION_TYPE,
  getCaseMessageConversationId,
  navigateToCaseMessageInbox,
} from '../../utils/caseMessageNotificationNav';

interface NotificationBellProps {
  onViewAll?: () => void;
  /** Clinical: sky accents for therapist / healthcare dashboards */
  variant?: 'default' | 'clinical';
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function NotificationBell({ onViewAll, variant = 'default' }: NotificationBellProps) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await notificationAPI.list({ limit: 8, page: 1 });
      const payload = data?.data || {};
      setItems(payload.notifications || []);
      setUnreadCount(payload.unreadCount || 0);
    } catch (error) {
      // silent in topbar
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const unreadItems = useMemo(() => items.filter((n) => !n.isRead), [items]);

  const markRead = async (id: string) => {
    try {
      await notificationAPI.markRead(id);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      // noop
    }
  };

  const markAll = async () => {
    try {
      await notificationAPI.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      // noop
    }
  };

  const clinical = variant === 'clinical';

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          'relative rounded-full p-2 transition-colors',
          clinical ? 'text-blue-800 hover:bg-blue-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-400/40' : 'text-muted-foreground hover:bg-muted'
        )}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-background px-1 text-[10px] font-semibold tabular-nums text-primary-foreground shadow-sm',
              clinical
                ? 'bg-primary ring-1 ring-primary/25'
                : 'bg-primary ring-1 ring-primary/20 dark:ring-primary/30'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-xl border bg-card shadow-xl',
            clinical ? 'border-blue-100 shadow-sm' : 'border shadow-lg'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between border-b px-4 py-3',
              clinical ? 'border-blue-100/80 bg-blue-50/60' : 'border'
            )}
          >
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unreadItems.length > 0 ? (
              <button
                type="button"
                className={cn(
                  'text-xs font-medium',
                  clinical ? 'text-blue-800 hover:text-blue-950' : 'text-blue-600 hover:text-blue-700'
                )}
                onClick={markAll}
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          <div className="max-h-[320px] overflow-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Loading...</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {items.map((n) => (
                  <button
                    key={n._id}
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-background',
                      n.isRead ? 'bg-card' : clinical ? 'bg-blue-50/70' : 'bg-blue-50/60'
                    )}
                    onClick={() => {
                      if (!n.isRead) void markRead(n._id);
                      const cid = getCaseMessageConversationId(n);
                      if (cid) {
                        setOpen(false);
                        navigateToCaseMessageInbox(navigate, user?.role, cid);
                      }
                    }}
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {n.type === CASE_MESSAGE_NOTIFICATION_TYPE ? 'Case message' : n.type}
                    </p>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatTime(n.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={cn('border-t p-3', clinical ? 'border-blue-100 bg-background/40' : 'border')}>
            <Button
              variant="outline"
              size="sm"
              className={cn('w-full', clinical && 'border bg-card hover:bg-blue-50/80')}
              onClick={() => {
                setOpen(false);
                onViewAll?.();
              }}
            >
              View all notifications
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
