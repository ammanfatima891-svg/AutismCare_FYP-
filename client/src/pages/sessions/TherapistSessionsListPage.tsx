/**
 * Global therapist sessions list: /therapist/sessions
 * When embedded in Therapist Dashboard, pass embedded to avoid double full-bleed backgrounds.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { sessionAPI } from '../../api';
import { Button } from '../../components/ui/button';
import { Loader2, Calendar, Plus } from 'lucide-react';
import { formatChildResponseDisplay } from '../../components/session/sessionFormat';

type SessionListItem = {
  _id?: string;
  caseId?: string;
  sessionDate?: string;
  duration?: number;
  childName?: string;
  therapyDomain?: string;
  childResponse?: string;
  status?: string;
};

type Props = { embedded?: boolean };

export default function TherapistSessionsListPage({ embedded = false }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await sessionAPI.listAll();
      const body = res.data as { data?: SessionListItem[] };
      setItems(Array.isArray(body?.data) ? body.data : []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to load sessions');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, location.key, location.pathname]);

  const shell = embedded ? 'min-h-0 bg-transparent' : 'min-h-screen bg-card';

  return (
    <div className={shell}>
      <div className={`mx-auto max-w-4xl ${embedded ? 'px-0 py-2' : 'px-4 py-8 md:px-6'}`}>
        <div className="mb-8 flex min-w-0 flex-row items-center justify-between gap-4">
          <div className="min-w-0 flex-1 pr-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sessions</h1>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">View and manage therapy sessions</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="inline-flex h-9 shrink-0 whitespace-nowrap rounded-lg border bg-card px-4 text-sm font-medium text-black shadow-sm hover:bg-background"
            onClick={() => void navigate('/therapist/sessions/new')}
          >
            <Plus className="mr-1.5 h-4 w-4 shrink-0 text-black" strokeWidth={2.5} />
            Add New Session
          </Button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border bg-muted px-4 py-3 text-sm text-destructive">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border-dashed border bg-muted/80 p-12 text-center text-sm text-muted-foreground">
            No sessions logged yet.{' '}
            <Link to="/therapist/sessions/new" className="font-medium text-blue-700 underline">
              Add your first session
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((s) => {
              const dt = s.sessionDate ? new Date(s.sessionDate) : null;
              const dateStr = dt
                ? dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : '—';
              const timeStr = dt ? dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—';
              const st = (s.status || 'completed').toLowerCase();
              const completed = st === 'completed';

              return (
                <li
                  key={String(s._id)}
                  className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <Calendar className="h-6 w-6 text-blue-700" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0">
                        <span className="font-semibold text-foreground">{dateStr}</span>
                        <span className="text-sm text-muted-foreground">{timeStr}</span>
                      </div>
                      <p className="font-medium text-foreground">{s.childName || 'Child'}</p>
                      <p className="text-sm text-muted-foreground">{s.therapyDomain || 'Therapy'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 border-t border pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-semibold text-foreground">
                        {s.duration != null && s.duration > 0 ? `${s.duration} min` : '—'}
                      </p>
                    </div>
                    {completed ? (
                      <div>
                        <p className="text-xs text-muted-foreground">Response Rating</p>
                        <p className="font-semibold text-foreground">{formatChildResponseDisplay(s.childResponse)}</p>
                      </div>
                    ) : null}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        completed ? 'bg-primary text-white' : 'bg-muted text-foreground'
                      }`}
                    >
                      {st}
                    </span>
                    <Button
                      type="button"
                      variant={completed ? 'outline' : 'default'}
                      className={completed ? 'border text-foreground' : 'bg-primary text-white hover:bg-blue-800'}
                      onClick={() => void navigate(`/therapist/case/${String(s.caseId)}?tab=sessions`)}
                    >
                      {completed ? 'View Details' : 'View case'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!embedded ? (
          <div className="mt-8">
            <Button type="button" variant="ghost" className="text-muted-foreground" onClick={() => void navigate('/therapist-dashboard')}>
              ← Back to dashboard
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
