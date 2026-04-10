import { useCallback, useEffect, useState } from 'react';
import { analyticsAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  LineChart,
  Line,
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
import type { CaseAnalyticsPayload, DomainTrend } from './types';
import { cn } from '../ui/utils';

const CHART_LINE = '#64748b';
const CHART_BAR = '#94a3b8';
const CHART_GRID = '#e2e8f0';

type Props = {
  caseId: string;
  /** Optional — shown in header */
  childLabel?: string;
};

function trendStyles(t: DomainTrend) {
  if (t === 'improving') return { label: 'Improving', className: 'border-sky-200 bg-sky-50 text-sky-800' };
  if (t === 'declining') return { label: 'Declining', className: 'border-amber-200 bg-amber-50 text-amber-900' };
  return { label: 'Stable', className: 'border-slate-200 bg-slate-50 text-slate-700' };
}

function formatDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
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
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-slate-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800">{error}</div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-slate-600">No analytics data.</p>
    );
  }

  const lineData = data.sessionTrend
    .filter((p) => p.childResponse != null)
    .map((p) => ({
      ...p,
      label: formatDateShort(p.date),
    }));

  const domainChartData = data.domainProgress.map((d) => ({
    name: d.domain,
    value: Math.round(d.progressPercent * 100) / 100,
  }));

  return (
    <div className="space-y-6">
      {childLabel ? (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Progress analytics</h2>
          <p className="text-sm text-slate-600">{childLabel}</p>
        </div>
      ) : null}

      {data.reviewAlert?.reviewRequired ? (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-amber-950">
            <span className="font-medium">{data.reviewAlert.message || 'Review goals for this child'}</span>
          </CardContent>
        </Card>
      ) : null}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-slate-200 bg-white shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>Overall progress</CardDescription>
            <CardTitle className="text-3xl font-semibold text-sky-900 tabular-nums">
              {Math.round(data.overallProgress * 100) / 100}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Average of per-goal session success rates (response ≥ 3 / 5 or equivalent).
          </CardContent>
        </Card>

        {data.domainProgress.map((d) => {
          const ts = trendStyles(d.trend);
          return (
            <Card key={d.domain} className="border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>{d.domain}</CardDescription>
                <CardTitle className="text-2xl font-semibold text-slate-900 tabular-nums">
                  {Math.round(d.progressPercent * 100) / 100}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className={cn('text-xs font-normal', ts.className)}>
                  {ts.label}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Session trend</CardTitle>
            <CardDescription>Child response score over time (0–100)</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {lineData.length === 0 ? (
              <p className="text-sm text-slate-500">No scored sessions yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}`, 'Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="childResponse"
                    stroke={CHART_LINE}
                    strokeWidth={2}
                    dot={{ r: 3, fill: CHART_LINE }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Domain comparison</CardTitle>
            <CardDescription>Average goal progress by domain</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {domainChartData.every((x) => x.value === 0) ? (
              <p className="text-sm text-slate-500">No domain-level goals or data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={domainChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}%`, 'Progress']}
                  />
                  <Bar dataKey="value" fill={CHART_BAR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goal list */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Goal progress</CardTitle>
          <CardDescription>Based on sessions where each goal was targeted</CardDescription>
        </CardHeader>
        <CardContent>
          {data.goalProgress.length === 0 ? (
            <p className="text-sm text-slate-500">No goals in the therapy plan yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/90">
                    <TableHead>Goal</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.goalProgress.map((g) => (
                    <TableRow key={g.goalId}>
                      <TableCell className="max-w-[280px] font-medium text-slate-900">{g.goalName}</TableCell>
                      <TableCell className="text-slate-600">{g.domain}</TableCell>
                      <TableCell className="text-right tabular-nums text-slate-900">
                        {Math.round(g.progressPercent * 100) / 100}%
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {g.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Activity effectiveness</CardTitle>
            <CardDescription>From session logs (activities used)</CardDescription>
          </CardHeader>
          <CardContent>
            {data.activityEffectiveness.length === 0 ? (
              <p className="text-sm text-slate-500">No activities recorded in sessions.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/90">
                      <TableHead>Activity</TableHead>
                      <TableHead className="text-right">Avg score</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.activityEffectiveness.map((a) => (
                      <TableRow key={a.activityName}>
                        <TableCell className="font-medium text-slate-900">{a.activityName}</TableCell>
                        <TableCell className="text-right tabular-nums text-slate-700">
                          {a.avgChildResponse != null ? a.avgChildResponse : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-600">{a.usageCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-slate-900">Home assignment compliance</CardTitle>
            <CardDescription>
              Total: {data.assignmentStats.total}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.assignmentStats.total === 0 ? (
              <p className="text-sm text-slate-500">No assignments for this case.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 py-3">
                    <p className="text-lg font-semibold text-slate-900 tabular-nums">
                      {data.assignmentStats.percentages.completed}%
                    </p>
                    <p className="text-xs text-slate-600">Completed</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 py-3">
                    <p className="text-lg font-semibold text-slate-900 tabular-nums">
                      {data.assignmentStats.percentages.submitted}%
                    </p>
                    <p className="text-xs text-slate-600">Submitted / reviewed</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 py-3">
                    <p className="text-lg font-semibold text-slate-900 tabular-nums">
                      {data.assignmentStats.percentages.pending}%
                    </p>
                    <p className="text-xs text-slate-600">Pending</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Raw counts — pending: {data.assignmentStats.pending}, submitted+reviewed:{' '}
                  {data.assignmentStats.submitted}, completed: {data.assignmentStats.completed}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
