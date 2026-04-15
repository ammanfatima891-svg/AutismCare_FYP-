import { useCallback, useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { messagingAPI } from '../../api';
import { NotificationBell } from '../notifications/NotificationBell';
import { cn } from '../ui/utils';

type Props = {
  onOpenMessages: () => void;
  onOpenNotifications: () => void;
  /** Clinical shell: sky accents aligned with therapist dashboard */
  variant?: 'clinical' | 'default';
};

/**
 * Top navigation cluster: quick access to Messages + notification dropdown.
 * Conversation count is informational (active threads); unread is tracked in-app when messaging UI adds read receipts.
 */
export function TherapistCommunicationTopBar({
  onOpenMessages,
  onOpenNotifications,
  variant = 'clinical',
}: Props) {
  const [threadCount, setThreadCount] = useState<number | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      const { data } = await messagingAPI.listConversations();
      const list = data?.data;
      setThreadCount(Array.isArray(list) ? list.length : 0);
    } catch {
      setThreadCount(null);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
    const id = window.setInterval(() => void loadThreads(), 60000);
    return () => window.clearInterval(id);
  }, [loadThreads]);

  const clinical = variant === 'clinical';

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button
        type="button"
        onClick={onOpenMessages}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors',
          clinical
            ? 'text-primary hover:bg-muted focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring/50'
            : 'text-muted-foreground hover:bg-muted'
        )}
        aria-label="Open messages"
        title="Messages"
      >
        <MessageSquare className="h-5 w-5" strokeWidth={1.75} />
        {threadCount != null && threadCount > 0 ? (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
              clinical ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'
            )}
          >
            {threadCount > 99 ? '99+' : threadCount}
          </span>
        ) : null}
      </button>

      <NotificationBell onViewAll={onOpenNotifications} variant={clinical ? 'clinical' : 'default'} />
    </div>
  );
}
