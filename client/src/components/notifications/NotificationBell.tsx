import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { notificationAPI } from '../../services/api';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

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
          clinical ? 'text-sky-800 hover:bg-sky-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-sky-400/40' : 'text-gray-600 hover:bg-gray-100'
        )}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white',
              clinical ? 'bg-rose-600' : 'bg-red-500'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-xl border bg-white shadow-xl',
            clinical ? 'border-sky-100 ring-1 ring-slate-200/60' : 'border-slate-200 shadow-lg'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between border-b px-4 py-3',
              clinical ? 'border-sky-100/80 bg-sky-50/60' : 'border-slate-100'
            )}
          >
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadItems.length > 0 ? (
              <button
                type="button"
                className={cn(
                  'text-xs font-medium',
                  clinical ? 'text-sky-800 hover:text-sky-950' : 'text-blue-600 hover:text-blue-700'
                )}
                onClick={markAll}
              >
                Mark all as read
              </button>
            ) : null}
          </div>

          <div className="max-h-[320px] overflow-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-slate-500">Loading...</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((n) => (
                  <button
                    key={n._id}
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-slate-50',
                      n.isRead ? 'bg-white' : clinical ? 'bg-sky-50/70' : 'bg-blue-50/60'
                    )}
                    onClick={() => {
                      if (!n.isRead) markRead(n._id);
                    }}
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500">{n.type}</p>
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="line-clamp-2 text-sm text-slate-600">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatTime(n.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={cn('border-t p-3', clinical ? 'border-sky-100 bg-slate-50/40' : 'border-slate-100')}>
            <Button
              variant="outline"
              size="sm"
              className={cn('w-full', clinical && 'border-slate-200 bg-white hover:bg-sky-50/80')}
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
