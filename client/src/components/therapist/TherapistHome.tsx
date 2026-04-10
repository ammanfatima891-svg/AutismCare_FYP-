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
    pending: 'border-slate-300 bg-slate-50 text-slate-700',
    accepted: 'border-sky-200 bg-sky-50 text-sky-900',
    'in-progress': 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };

  /** Badge: pending = new; accepted = show “Action” if recently updated (client-only recency hint). */
  function assignedCaseShowNewOrActionBadge(row: AssignedCaseRow, referralStatus: string) {
    const s = normalizeStatus(referralStatus);
    if (s === 'pending') return true;
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
      'h-auto w-full shrink-0 rounded-lg border bg-white transition-all duration-200 ease-out motion-safe:transition-[padding,box-shadow,border-color]';
    const compact = 'border-slate-200 p-3 shadow-sm';
    if (s === 'pending') {
      return cn(
        base,
        'border-sky-500 p-3.5 shadow-md shadow-sky-200/30 ring-2 ring-sky-400/35 ring-offset-0 bg-sky-50/70'
      );
    }
    if (s === 'accepted') {
      return cn(
        base,
        'border-sky-400/95 p-3.5 shadow-md shadow-sky-100/40 ring-1 ring-sky-300/45 bg-sky-50/45'
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
      iconWrap: 'bg-sky-100',
      iconClass: 'text-sky-600',
    },
    {
      key: 'today',
      label: "Today's Sessions",
      value: loading ? '—' : String(data.todaySessions),
      icon: Calendar,
      iconWrap: 'bg-emerald-100',
      iconClass: 'text-emerald-600',
    },
    {
      key: 'pending',
      label: 'Pending Reviews',
      value: loading ? '—' : String(data.pendingReviews),
      icon: Clock,
      iconWrap: 'bg-amber-100',
      iconClass: 'text-amber-600',
    },
    {
      key: 'progress',
      label: 'Overall Progress',
      value: loading ? '—' : `${data.overallProgress}%`,
      icon: TrendingUp,
      iconWrap: 'bg-violet-100',
      iconClass: 'text-violet-600',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Therapist Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600 md:text-base">
          Welcome back, {name}! Here&apos;s your therapy overview for today.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {/* Summary metrics — always one row (4 equal columns); compact on narrow viewports */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.key}
              className="flex min-h-[92px] flex-col border border-slate-200/90 bg-white shadow-sm sm:min-h-[104px] md:min-h-[112px]"
            >
              <CardContent className="flex min-w-0 flex-1 flex-row items-center justify-between gap-1.5 p-2 sm:gap-2 sm:p-3 md:gap-3 md:p-4">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[10px] font-medium leading-tight text-slate-500 sm:text-[11px] md:text-xs">
                    {c.label}
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 sm:text-lg md:text-xl">{c.value}</p>
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
      <div className="space-y-5 border-t border-slate-200/80 pt-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <Card className="flex h-auto flex-col border border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-sky-50/60 px-4 py-3 md:px-6">
              <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-900">
                <span>Assigned Cases</span>
                <Users className="h-4 w-4 text-sky-600" />
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Referrals assigned to you (pending, accepted, or in progress)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex max-h-[min(360px,45vh)] flex-col gap-2 overflow-y-auto px-4 pb-4 pt-4 md:px-6">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : data.assignedCases.length === 0 ? (
                <p className="text-sm text-slate-600">No assigned cases yet.</p>
              ) : (
                data.assignedCases.map((c) => {
                  const status = normalizeStatus(c.referralStatus);
                  const caseIdStr = String(c.caseId ?? '');
                  const showBadge = assignedCaseShowNewOrActionBadge(c, c.referralStatus);
                  const isPending = status === 'pending';

                  return (
                    <div key={c.referralId} className={assignedCaseCardClass(c.referralStatus)}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium leading-snug text-slate-900">{c.childName}</p>
                        {showBadge ? (
                          <span className="shrink-0 rounded-full border border-sky-300 bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 shadow-sm">
                            {isPending ? 'New' : 'Action'}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">Case status: {c.caseStatus}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="h-6 shrink-0 px-2 text-xs capitalize">
                          Risk: {c.riskLevel || '—'}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn('h-6 shrink-0 px-2 text-xs', referralStatusBadgeClass[status])}
                        >
                          {c.referralStatus}
                        </Badge>
                        {status === 'pending' ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              assignedChipBtn,
                              'border-sky-600 bg-sky-600 text-white hover:bg-sky-700 hover:text-white'
                            )}
                            onClick={() => acceptReferral(c.referralId)}
                            disabled={actingId === c.referralId}
                          >
                            {actingId === c.referralId ? '…' : 'Accept'}
                          </Button>
                        ) : null}
                        {status === 'accepted' ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                assignedChipBtn,
                                'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white'
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
                              className={cn(assignedChipBtn, 'border-slate-200')}
                              onClick={() => navigate(`/therapist/case/${caseIdStr}`)}
                            >
                              View Case
                            </Button>
                          </>
                        ) : null}
                        {status === 'in-progress' ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(assignedChipBtn, 'border-slate-200')}
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

          <Card className="flex h-auto flex-col border border-slate-200/80 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-sky-50/50 px-4 py-3 md:px-6">
              <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-900">
                <span>Upcoming Sessions</span>
                <Calendar className="h-4 w-4 text-sky-600" />
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Next scheduled appointments (today onward)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex max-h-[min(360px,45vh)] flex-col gap-2 overflow-y-auto px-4 pb-4 pt-4 md:px-6">
              {loading ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : data.upcomingSessions.length === 0 ? (
                <p className="text-sm text-slate-600">No upcoming sessions.</p>
              ) : (
                data.upcomingSessions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 ease-out"
                  >
                    <p className="font-medium text-slate-900">{s.childName}</p>
                    <p className="text-xs text-slate-600">
                      {new Date(s.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      {s.time ? `· ${s.time}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">{s.duration} min</p>
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
