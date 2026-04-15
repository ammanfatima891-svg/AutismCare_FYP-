/**
 * Global therapist home assignments list (dashboard sidebar + can be routed standalone later).
 */

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { therapistAPI } from '../../api';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { type AssignActivityCaseChoice } from '../../components/therapist/AssignActivityForm';

const AssignActivityFormLazy = lazy(() =>
  import('../../components/therapist/AssignActivityForm').then((m) => ({ default: m.AssignActivityForm }))
);
import { CheckCircle2, Clock, House, Loader2, Upload, XCircle } from 'lucide-react';
import { cn } from '../../components/ui/utils';

type AssignmentRow = {
  _id?: string;
  caseId?: string;
  title?: string;
  dueDate?: string;
  status?: string;
  childName?: string;
};

type SummaryData = {
  activeAssignments: number;
  completed: number;
  newSubmissions: number;
  behindSchedule: number;
};

type AssignedCaseRow = {
  caseId?: string;
  childName?: string;
  referralStatus?: string;
};

type Props = { embedded?: boolean };

function statusBadgeClass(status: string) {
  const s = (status || 'pending').toLowerCase();
  if (s === 'completed') return 'border bg-muted text-black';
  if (s === 'reviewed') return 'bg-blue-100 text-blue-900';
  if (s === 'submitted') return 'bg-blue-100 text-blue-900';
  return 'bg-yellow-100 text-yellow-900';
}

export default function TherapistHomeAssignmentsPage({ embedded = false }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<AssignmentRow[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [caseChoices, setCaseChoices] = useState<AssignActivityCaseChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function caseChoicesFromAssignments(rows: AssignmentRow[]): AssignActivityCaseChoice[] {
    const map = new Map<string, string>();
    for (const a of rows) {
      const cid = a.caseId ? String(a.caseId) : '';
      if (!cid) continue;
      const label = String(a.childName || 'Child').trim() || 'Child';
      if (!map.has(cid)) map.set(cid, label);
    }
    return [...map.entries()].map(([caseId, label]) => ({ caseId, label }));
  }

  function caseChoicesFromDashboard(cases: AssignedCaseRow[]): AssignActivityCaseChoice[] {
    return cases
      .filter((c) => c.caseId && ['in-progress', 'accepted'].includes(String(c.referralStatus || '').toLowerCase()))
      .map((c) => ({
        caseId: String(c.caseId),
        label: String(c.childName || 'Child'),
      }));
  }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [listOut, sumOut, dashOut] = await Promise.allSettled([
        therapistAPI.listAllHomeAssignments(),
        therapistAPI.getHomeAssignmentsSummary(),
        therapistAPI.getDashboardSummary(),
      ]);

      let rows: AssignmentRow[] = [];
      if (listOut.status === 'fulfilled') {
        const listBody = listOut.value.data as { data?: AssignmentRow[] };
        rows = Array.isArray(listBody?.data) ? listBody.data : [];
        setItems(rows);
      } else {
        setItems([]);
        const reason = listOut.reason as { response?: { data?: { message?: string } } };
        setError(reason?.response?.data?.message || 'Failed to load assignments');
      }

      if (sumOut.status === 'fulfilled') {
        const sumBody = sumOut.value.data as { data?: SummaryData };
        setSummary(sumBody?.data ?? null);
      } else {
        setSummary(null);
      }

      if (dashOut.status === 'fulfilled') {
        const dash = dashOut.value.data as { data?: { assignedCases?: AssignedCaseRow[] } };
        const cases = Array.isArray(dash?.data?.assignedCases) ? dash.data.assignedCases : [];
        setCaseChoices(caseChoicesFromDashboard(cases));
      } else {
        setCaseChoices(caseChoicesFromAssignments(rows));
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to load home assignments');
      setItems([]);
      setSummary(null);
      setCaseChoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, location.key, location.pathname]);

  const shell = embedded ? 'min-h-0 bg-transparent' : 'min-h-screen bg-card';

  const derivedSummary: SummaryData = (() => {
    if (summary) return summary;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    let activeAssignments = 0;
    let completed = 0;
    let newSubmissions = 0;
    let behindSchedule = 0;

    for (const a of items) {
      const st = String(a.status || 'pending').toLowerCase();
      if (st === 'completed') completed += 1;
      if (st === 'submitted') newSubmissions += 1;
      if (st === 'pending' || st === 'submitted' || st === 'reviewed') activeAssignments += 1;
      if ((st === 'pending' || st === 'submitted') && a.dueDate) {
        const d = new Date(a.dueDate);
        if (!Number.isNaN(d.getTime()) && d < startOfToday) behindSchedule += 1;
      }
    }

    return { activeAssignments, completed, newSubmissions, behindSchedule };
  })();

  const metrics = [
    {
      key: 'active',
      label: 'Active Assignments',
      value: derivedSummary.activeAssignments,
      icon: Clock,
      iconWrap: 'bg-blue-100',
      iconClass: 'text-blue-600',
    },
    {
      key: 'done',
      label: 'Completed',
      value: derivedSummary.completed,
      icon: CheckCircle2,
      iconWrap: 'bg-blue-100',
      iconClass: 'text-blue-600',
    },
    {
      key: 'new',
      label: 'New Submissions',
      value: derivedSummary.newSubmissions,
      icon: Upload,
      iconWrap: 'bg-yellow-100',
      iconClass: 'text-yellow-600',
    },
    {
      key: 'late',
      label: 'Behind Schedule',
      value: derivedSummary.behindSchedule,
      icon: XCircle,
      iconWrap: 'bg-blue-100',
      iconClass: 'text-blue-600',
    },
  ];

  return (
    <div className={shell}>
      <div className={`mx-auto max-w-5xl ${embedded ? 'px-0 py-2' : 'px-4 py-8 md:px-6'}`}>
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Home Assignments</h1>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              Manage and track home practice activities for families
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 border bg-muted text-black shadow-sm hover:bg-muted hover:text-black"
            onClick={() => {
              setShowForm(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            + Assign New Activity
          </Button>
        </div>

        {showForm ? (
          <div className="mb-6 min-w-0">
            <Card className="overflow-hidden rounded-xl border-blue-100/90 bg-card shadow-md ring-1 shadow-sm">
              <CardHeader className="border-b border bg-gradient-to-r from-blue-50/80 to-white pb-4">
                <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Assign activity</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Choose a child, then pick an activity from your library. Parents will see the assignment on their
                  dashboard.
                </CardDescription>
                <CardAction>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4 pb-6 pt-2">
                {caseChoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No assignable cases yet. Accept a referral and start therapy from <strong>Assigned Cases</strong>,
                    then try again.
                  </p>
                ) : (
                  <Suspense
                    fallback={
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      </div>
                    }
                  >
                    <AssignActivityFormLazy
                      bare
                      caseChoices={caseChoices}
                      onSuccess={async () => {
                        setShowForm(false);
                        await load();
                      }}
                    />
                  </Suspense>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border bg-muted px-4 py-3 text-sm text-destructive">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {metrics.map((m) => {
                const Icon = m.icon;
                return (
                  <Card key={m.key} className="border/90 bg-card shadow-sm">
                    <CardContent className="flex flex-row items-center justify-between gap-2 p-3 sm:p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium leading-tight text-muted-foreground sm:text-xs">{m.label}</p>
                        <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground sm:text-xl">{m.value}</p>
                      </div>
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10',
                          m.iconWrap
                        )}
                      >
                        <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', m.iconClass)} strokeWidth={1.75} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border-dashed border bg-muted/80 p-12 text-center text-sm text-muted-foreground">
                No home assignments yet. Use <span className="font-medium text-foreground">+ Assign New Activity</span>{' '}
                above or open a case from <span className="font-medium text-foreground">Assigned Cases</span> and use the
                home assignments tab.
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((a) => {
                  const due = a.dueDate ? new Date(a.dueDate) : null;
                  const dueStr = due
                    ? due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';
                  const st = (a.status || 'pending').toLowerCase();

                  return (
                    <li
                      key={String(a._id)}
                      className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <House className="h-6 w-6 text-blue-700" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold text-foreground line-clamp-2">{a.title || 'Assignment'}</p>
                          <p className="text-sm font-medium text-foreground">{a.childName || 'Child'}</p>
                          <p className="text-sm text-muted-foreground">Due {dueStr}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 border-t border pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusBadgeClass(st)}`}>
                          {st}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          className={
                            st === 'completed'
                              ? 'border text-black hover:bg-background hover:text-black'
                              : 'border text-foreground'
                          }
                          onClick={() => void navigate(`/therapist/case/${String(a.caseId)}?tab=assignments`)}
                        >
                          Open case
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
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
