import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Users,
  Calendar,
  Loader2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { therapistAPI, referralAPI } from '../../api';
import { cn } from '../ui/utils';
import { AuthContext } from '../../context/AuthContext';
import { CaseStatusBadge } from '../CaseStatusBadge';

const assignedChipBtn =
  'inline-flex h-6 min-h-6 shrink-0 items-center justify-center gap-1 rounded-md px-2 py-0 text-xs font-medium leading-none shadow-none';

export interface TherapistHomeProps {
  onNavigate: (section: string) => void;
}

type AssignedCaseRow = {
  referralId: string;
  caseId: string;
  childName: string;
  caseStatus: string;
  riskLevel: string;
  referralStatus: string;
  /** Present in dashboard-summary payload; used only for optional UI (e.g. recency). */
  updatedAt?: string;
};

type SummaryPayload = {
  activeCases: number;
  todaySessions: number;
  pendingReviews: number;
  overallProgress: number;
  assignedCases: AssignedCaseRow[];
  upcomingSessions: Array<{
    id: string;
    date: string;
    time: string;
    childName: string;
    duration: number;
    /** Confirmed / Scheduled / Rescheduled — from dashboard-summary API */
    sessionStatus?: string;
  }>;
};

const emptySummary: SummaryPayload = {
  activeCases: 0,
  todaySessions: 0,
  pendingReviews: 0,
  overallProgress: 0,
  assignedCases: [],
  upcomingSessions: [],
};

function therapistDisplayName(user: { firstName?: string; lastName?: string } | null | undefined): string {
  const first = user?.firstName?.trim();
  const last = user?.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return 'Therapist';
}

export function TherapistHome({ onNavigate: _onNavigate }: TherapistHomeProps) {
  void _onNavigate;
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const sessionUser = auth?.user;

  const [data, setData] = useState<SummaryPayload>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const normalizeStatus = (value: string | undefined) =>
    String(value ?? '')
      .trim()
      .toLowerCase();

  const referralStatusBadgeClass: Record<string, string> = {
    pending: 'border bg-background text-foreground',
    sent: 'border bg-background text-foreground',
    accepted: 'border-border bg-secondary/50 text-primary',
    'in-progress': 'border-border bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  };

  /** Badge: pending = new; accepted = show “Action” if recently updated (client-only recency hint). */
  function assignedCaseShowNewOrActionBadge(row: AssignedCaseRow, referralStatus: string) {
    const s = normalizeStatus(referralStatus);
    if (s === 'pending' || s === 'sent') return true;
    if (s !== 'accepted' || !row.updatedAt) return false;
    const t = new Date(row.updatedAt).getTime();
    if (Number.isNaN(t)) return false;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - t < sevenDays;
  }

  /** Compact base matches Upcoming Sessions rows; expanded + sky accent when attention needed. */
  function assignedCaseCardClass(referralStatus: string) {
    const s = normalizeStatus(referralStatus);
    const base =
      'h-auto w-full shrink-0 rounded-lg border bg-card transition-all duration-200 ease-out motion-safe:transition-[padding,box-shadow,border-color]';
    const compact = 'border p-3 shadow-sm';
    if (s === 'pending' || s === 'sent') {
      return cn(
        base,
        'border-primary p-3.5 shadow-md ring-2 ring-ring/40 ring-offset-0 bg-secondary/40'
      );
    }
    if (s === 'accepted') {
      return cn(
        base,
        'border-primary/50 p-3.5 shadow-md ring-1 ring-ring/30 bg-secondary/20'
      );
    }
    return cn(base, compact);
  }

  const applySummary = useCallback((raw: Record<string, unknown>) => {
    setData({
      activeCases: Number(raw.activeCases) || 0,
      todaySessions: Number(raw.todaySessions) || 0,
      pendingReviews: Number(raw.pendingReviews) || 0,
      overallProgress: Number(raw.overallProgress) || 0,
      assignedCases: (raw.assignedCases as AssignedCaseRow[]) || [],
      upcomingSessions: (raw.upcomingSessions as SummaryPayload['upcomingSessions']) || [],
    });
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await therapistAPI.getDashboardSummary();
      applySummary(res.data?.data || {});
    } catch (e) {
      console.error(e);
      setError('Unable to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [applySummary]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const acceptReferral = async (referralId: string) => {
    try {
      setActingId(referralId);
      await referralAPI.accept(referralId);
      const res = await therapistAPI.getDashboardSummary();
      applySummary(res.data?.data || {});
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Failed to accept referral.');
    } finally {
      setActingId(null);
    }
  };

  const startTherapy = async (referralId: string) => {
    try {
      setActingId(referralId);
      const { data: body } = await therapistAPI.startTherapyFromReferral(referralId);
      const caseId = body?.caseId ?? body?.therapyCase?.caseId ?? body?.data?.caseId;
      const res = await therapistAPI.getDashboardSummary();
      applySummary(res.data?.data || {});
      if (caseId) navigate(`/therapist/case/${String(caseId)}`);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || 'Failed to start therapy.');
    } finally {
      setActingId(null);
    }
  };

  const name = therapistDisplayName(sessionUser);

  const summaryCards = [
    {
      key: 'active',
      label: 'Active Cases',
      value: loading ? '—' : String(data.activeCases),
      icon: Users,
      iconWrap: 'bg-secondary',
      iconClass: 'text-primary',
    },
    {
      key: 'today',
      label: "Today's Sessions",
      value: loading ? '—' : String(data.todaySessions),
      icon: Calendar,
      iconWrap: 'bg-secondary',
      iconClass: 'text-primary',
    },
    {
      key: 'pending',
      label: 'Pending Reviews',
      value: loading ? '—' : String(data.pendingReviews),
      icon: Clock,
      iconWrap: 'bg-accent/15',
      iconClass: 'text-accent',
    },
    {
      key: 'progress',
      label: 'Caseload progress (engine)',
      value: loading ? '—' : `${data.overallProgress}%`,
      icon: TrendingUp,
      iconWrap: 'bg-secondary',
      iconClass: 'text-primary',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Therapist Dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Welcome back, {name}! Here&apos;s your therapy overview for today.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      {/* Summary metrics — always one row (4 equal columns); compact on narrow viewports */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.key}
              className="flex min-h-[92px] flex-col border/90 bg-card shadow-sm sm:min-h-[104px] md:min-h-[112px]"
            >
              <CardContent className="flex min-w-0 flex-1 flex-row items-center justify-between gap-1.5 p-2 sm:gap-2 sm:p-3 md:gap-3 md:p-4">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px] md:text-xs">
                    {c.label}
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground sm:text-lg md:text-xl">{c.value}</p>
                </div>
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md sm:h-9 sm:rounded-lg md:h-10 md:w-10',
                    c.iconWrap
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5', c.iconClass)} strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Row 2: Assigned Cases (left) + Upcoming Sessions (right) */}
      <div className="space-y-5 border-t border/80 pt-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <Card className="flex h-auto flex-col border/80 bg-card shadow-sm">
            <CardHeader className="border-b border border-border bg-secondary/30 px-4 py-3 md:px-6">
              <CardTitle className="flex items-center justify-between text-base font-semibold text-foreground">
                <span>Assigned Cases</span>
                <Users className="h-4 w-4 text-primary" />
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Referrals assigned to you (pending, accepted, or in progress)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex max-h-[min(360px,45vh)] flex-col gap-2 overflow-y-auto px-4 pb-4 pt-4 md:px-6">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : data.assignedCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assigned cases yet.</p>
              ) : (
                data.assignedCases.map((c) => {
                  const status = normalizeStatus(c.referralStatus);
                  const caseIdStr = String(c.caseId ?? '');
                  const caseSt = String(c.caseStatus || '').toUpperCase();
                  const showBadge = assignedCaseShowNewOrActionBadge(c, c.referralStatus);
                  const isPending = status === 'pending' || status === 'sent';
                  const needsAccept = status === 'pending' || status === 'sent';
                  const therapyStarted = status === 'in-progress';
                  const canStartTherapy = status === 'accepted' && caseSt === 'THERAPY';

                  return (
                    <div key={c.referralId} className={assignedCaseCardClass(c.referralStatus)}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium leading-snug text-foreground">{c.childName}</p>
                        {showBadge ? (
                          <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary shadow-sm">
                            {isPending ? 'New' : 'Action'}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1">
                        <CaseStatusBadge status={c.caseStatus} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="h-6 shrink-0 px-2 text-xs capitalize">
                          Risk: {c.riskLevel || '—'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-6 shrink-0 px-2 text-xs capitalize',
                            referralStatusBadgeClass[status] ?? 'border bg-background text-foreground',
                          )}
                        >
                          {c.referralStatus}
                        </Badge>
                        {needsAccept ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              assignedChipBtn,
                              'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                            )}
                            onClick={() => acceptReferral(c.referralId)}
                            disabled={actingId === c.referralId}
                          >
                            {actingId === c.referralId ? '…' : 'Accept'}
                          </Button>
                        ) : null}
                        {canStartTherapy ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                assignedChipBtn,
                                'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                              )}
                              onClick={() => startTherapy(c.referralId)}
                              disabled={actingId === c.referralId}
                            >
                              {actingId === c.referralId ? '…' : 'Start Therapy'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(assignedChipBtn, 'border')}
                              onClick={() => navigate(`/therapist/case/${caseIdStr}`)}
                            >
                              View Case
                            </Button>
                          </>
                        ) : null}
                        {(therapyStarted || (status === 'accepted' && !canStartTherapy) || status === 'rejected') &&
                        caseIdStr ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(assignedChipBtn, 'border')}
                            onClick={() => navigate(`/therapist/case/${caseIdStr}`)}
                          >
                            View Case
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="flex h-auto flex-col border/80 bg-card shadow-sm">
            <CardHeader className="border-b border border-border bg-secondary/20 px-4 py-3 md:px-6">
              <CardTitle className="flex items-center justify-between text-base font-semibold text-foreground">
                <span>Upcoming Sessions</span>
                <Calendar className="h-4 w-4 text-primary" />
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Next scheduled appointments (today onward)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex max-h-[min(360px,45vh)] flex-col gap-2 overflow-y-auto px-4 pb-4 pt-4 md:px-6">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : data.upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
              ) : (
                data.upcomingSessions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border bg-card p-3 shadow-sm transition-all duration-200 ease-out"
                  >
                    <p className="font-medium text-foreground">{s.childName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      {s.time ? `· ${s.time}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.duration} min</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
