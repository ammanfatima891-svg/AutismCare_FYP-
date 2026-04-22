import { useCallback, useEffect, useState } from 'react';
import { analyticsAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CaseAnalyticsPayload } from './types';

const CHART_BAR = '#3B82F6';
const CHART_LINE = '#1E3A8A';
const CHART_GRID = '#E5E7EB';

type Props = {
  caseId: string;
  childLabel?: string;
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function smartAlertRowClass(severity?: string) {
  const s = String(severity || 'warning').toLowerCase();
  if (s === 'critical' || s === 'error' || s === 'danger') {
    return 'rounded-md border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-950';
  }
  return 'rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950';
}

export function CaseProgressAnalyticsDashboard({ caseId, childLabel }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CaseAnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getByCase(caseId);
      const body = res.data as { data?: CaseAnalyticsPayload };
      setData(body?.data ?? null);
    } catch (e: unknown) {
      const ax = e as { message?: string; response?: { data?: unknown } };
      const payload = ax.response?.data;
      let fromBody: string | null = null;
      if (payload != null && typeof payload === 'object' && 'message' in payload) {
        const m = (payload as { message?: unknown }).message;
        if (typeof m === 'string') fromBody = m;
      } else if (typeof payload === 'string') {
        fromBody = payload;
      }
      const msg = fromBody || ax.message || 'Could not load analytics';
      setError(msg);
      toast.error(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border bg-muted/80 px-4 py-3 text-sm text-destructive">{error}</div>
    );
  }

  if (!data) {
    return (
      <EmptyState message="No therapy data available yet. Start sessions to see progress." />
    );
  }

  const pe = data.progressEngine;
  if (!pe) {
    return <EmptyState message="No sessions recorded yet." />;
  }

  const domains = Array.isArray(pe.domains) ? pe.domains : [];
  const weeklyTrend = Array.isArray(pe.weeklyTrend) ? pe.weeklyTrend : [];
  const smartAlerts = Array.isArray(pe.smartAlerts) ? pe.smartAlerts : [];
  const weakAreas = Array.isArray(pe.weakAreas) ? pe.weakAreas : [];

  return (
    <div className="space-y-6">
      {childLabel ? (
        <div>
          <h2 className="text-lg font-bold text-foreground">Progress analytics</h2>
          <p className="text-sm text-muted-foreground">{childLabel}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Overall score (engine)</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums text-foreground">
              {typeof pe.overallScore === 'number' && !Number.isNaN(pe.overallScore)
                ? pe.overallScore.toFixed(2)
                : '—'}
            </CardTitle>
          </CardHeader>
          {pe.confidence ? (
            <CardContent className="text-xs text-muted-foreground">
              Confidence: {(pe.confidence.overall * 100).toFixed(0)}% ({pe.confidence.label})
            </CardContent>
          ) : null}
        </Card>

        {domains.length ? (
          <Card className="border bg-card shadow-sm sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-foreground">Domain scores</CardTitle>
              <CardDescription>From progress engine (0–5 scale)</CardDescription>
            </CardHeader>
            <CardContent className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domains} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip formatter={(v: number) => [String(v), 'Score']} />
                  <Bar dataKey="score" fill={CHART_BAR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {weeklyTrend.length > 0 ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Trends</CardTitle>
            <CardDescription>Weekly trend series from backend</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(v: number) => [String(v), 'Score']} />
                <Bar dataKey="y" fill={CHART_LINE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {smartAlerts.length > 0 ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Alerts</CardTitle>
            <CardDescription>From progress engine</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {smartAlerts.map((a, i) => (
                <li key={i} className={smartAlertRowClass(a.severity)}>
                  {a.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {weakAreas.length > 0 ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Weak areas</CardTitle>
            <CardDescription>From progress engine</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {weakAreas.map((w, i) => (
                <li key={i}>{typeof w === 'string' ? w : w.reason || '—'}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {Array.isArray(pe.goals) && pe.goals.length > 0 ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Goals (engine)</CardTitle>
            <CardDescription>Backend goal rows only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {pe.goals.map((g) => (
              <div key={g.goalId} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0">
                <span className="font-medium text-foreground">{g.goalName || g.goalId}</span>
                <span className="text-muted-foreground">
                  current {g.current != null ? g.current.toFixed(2) : '—'} · trend {g.trend}
                  {typeof g.linkedAssignmentsCount === 'number' && g.linkedAssignmentsCount > 0 ? (
                    <Badge variant="outline" className="ml-2 font-normal">
                      {g.linkedAssignmentsCount} home link
                      {g.linkedAssignmentsCount > 1 ? 's' : ''}
                      {g.assignmentRatingAvg != null ? ` · avg ${g.assignmentRatingAvg}` : ''}
                    </Badge>
                  ) : null}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
