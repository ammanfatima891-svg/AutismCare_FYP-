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

const CHART_LINE = '#1E3A8A';
const CHART_BAR = '#3B82F6';
const CHART_GRID = '#E5E7EB';

type Props = {
  caseId: string;
  /** Optional — shown in header */
  childLabel?: string;
};

function trendStyles(t: DomainTrend) {
  if (t === 'improving') return { label: 'Improving', className: 'border-blue-200 bg-blue-50 text-blue-800' };
  if (t === 'declining') return { label: 'Declining', className: 'border-yellow-200 bg-yellow-50 text-yellow-900' };
  return { label: 'Stable', className: 'border bg-background text-foreground' };
}

function formatDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function smartAlertRowClass(severity?: string) {
  const s = String(severity || 'warning').toLowerCase();
  if (s === 'critical' || s === 'error' || s === 'danger') {
    return 'rounded-md border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-950';
  }
  return 'rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950';
}

function formatGoalImpact(
  gi: string | { goalId?: string; goalName?: string; scoreChange?: number; score?: number }
): string {
  if (typeof gi === 'string') return gi;
  const name = gi.goalName || gi.goalId || 'Goal';
  const ch = gi.scoreChange;
  if (ch != null && Number.isFinite(Number(ch))) {
    const sign = Number(ch) > 0 ? '+' : '';
    return `${name} (${sign}${Number(ch).toFixed(2)})`;
  }
  return name;
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
      <p className="text-sm text-muted-foreground">No analytics data.</p>
    );
  }

  const sessionTrend = Array.isArray(data.sessionTrend) ? data.sessionTrend : [];
  const domainProgress = Array.isArray(data.domainProgress) ? data.domainProgress : [];
  const goalProgress = Array.isArray(data.goalProgress) ? data.goalProgress : [];
  const activityEffectiveness = Array.isArray(data.activityEffectiveness) ? data.activityEffectiveness : [];
  const overallProgress =
    typeof data.overallProgress === 'number' && !Number.isNaN(data.overallProgress) ? data.overallProgress : 0;
  const assignmentStats = data.assignmentStats ?? {
    total: 0,
    pending: 0,
    submitted: 0,
    completed: 0,
    percentages: { pending: 0, submitted: 0, completed: 0 },
  };

  const lineData = sessionTrend
    .filter((p) => p.childResponse != null)
    .map((p) => ({
      ...p,
      label: formatDateShort(p.date),
    }));

  const domainChartData = domainProgress.map((d) => ({
    name: d.domain,
    value: Math.round(d.progressPercent * 100) / 100,
  }));

  const pe = data.progressEngine;
  const clinicalDomainChart =
    pe?.domains?.map((d) => ({
      name: d.name,
      value: Math.round((d.score ?? 0) * 20 * 100) / 100,
    })) ?? [];
  const weeklyEngineData = (pe?.weeklyTrend || []).map((w) => ({
    label: w.x,
    score: w.y,
  }));

  return (
    <div className="space-y-6">
      {childLabel ? (
        <div>
          <h2 className="text-lg font-bold text-foreground">Progress analytics</h2>
          <p className="text-sm text-muted-foreground">{childLabel}</p>
        </div>
      ) : null}

      {data.reviewAlert?.reviewRequired ? (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-yellow-900">
            <span className="font-medium">{data.reviewAlert.message || 'Review goals for this child'}</span>
          </CardContent>
        </Card>
      ) : null}

      {data.schemaVersion === 2 && data.kpis ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Clinical &amp; program KPIs</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Goals mastered</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-blue-900">
                  {data.kpis.goalsMastered}/{data.kpis.goalsTracked || '—'}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Trend mix</CardDescription>
                <CardTitle className="text-sm font-normal text-foreground">
                  ↑ {data.kpis.goalsImproving} · → stable · ↓ {data.kpis.goalsDeclining}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Stalled: {data.kpis.goalsStalled}</CardContent>
            </Card>
            <Card className="border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Session attendance</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-foreground">
                  {data.kpis.attendance.attendanceRatePercent != null
                    ? `${data.kpis.attendance.attendanceRatePercent}%`
                    : '—'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Done {data.kpis.attendance.completed} · Missed {data.kpis.attendance.missed} · Rescheduled{' '}
                {data.kpis.attendance.rescheduled}
              </CardContent>
            </Card>
            <Card className="border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Home program on-time</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-foreground">
                  {data.kpis.homeProgram.onTimeSubmissionRatePercent != null
                    ? `${data.kpis.homeProgram.onTimeSubmissionRatePercent}%`
                    : '—'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Submissions counted: {data.kpis.homeProgram.submittedOrReviewed}
              </CardContent>
            </Card>
          </div>
          {data.reviewAlertV2?.reviewRequired ? (
            <p className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
              {data.reviewAlertV2.message || 'Plan review recommended.'}
            </p>
          ) : null}
          {Array.isArray(data.alerts) && data.alerts.length > 0 ? (
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {data.alerts.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {data.schemaVersion === 2 && data.goalKpis && data.goalKpis.length > 0 ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Goal-level KPIs</CardTitle>
            <CardDescription>Per-goal performance from session measurements and mastery rules</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead className="text-right">Data pts</TableHead>
                  <TableHead className="text-right">Recent %</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Mastery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.goalKpis.map((g) => (
                  <TableRow key={g.goalKey}>
                    <TableCell className="max-w-[220px] font-medium">{g.goalName}</TableCell>
                    <TableCell className="text-muted-foreground">{g.domain}</TableCell>
                    <TableCell className="text-right tabular-nums">{g.dataPoints}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {g.recentPerformance != null ? `${Math.round(g.recentPerformance * 100) / 100}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal capitalize">
                        {g.trend}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {g.mastery?.mastered ? (
                        <Badge className="bg-green-700 text-white">Met</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal">
                          Open
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border bg-card shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription>Overall progress</CardDescription>
            <CardTitle className="text-3xl font-semibold text-blue-900 tabular-nums">
              {Math.round(overallProgress * 100) / 100}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {pe ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Progress engine composite: {(pe.overallScore ?? 0).toFixed(2)} / 5 (therapy + home). Consistency{' '}
                {((pe.consistency ?? 0) * 100).toFixed(0)}%. Improvement rate: {pe.improvementRate ?? 0}.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Average of per-goal session success rates (response ≥ 3 / 5 or equivalent).
              </p>
            )}
          </CardContent>
        </Card>

        {domainProgress.map((d) => {
          const ts = trendStyles(d.trend);
          return (
            <Card key={d.domain} className="border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>{d.domain}</CardDescription>
                <CardTitle className="text-2xl font-semibold text-foreground tabular-nums">
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

      {pe ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Progress engine (clinical view)</h3>
          {pe.smartAlerts && pe.smartAlerts.length > 0 ? (
            <Card className="border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-foreground">Smart alerts</CardTitle>
                <CardDescription>Red items need timely clinical review</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {pe.smartAlerts.map((a, i) => (
                    <li key={i} className={smartAlertRowClass(a.severity)}>
                      {a.message}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          {pe.goals && pe.goals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border border-amber-200/80 bg-amber-50/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-950">Goals needing attention</CardTitle>
                  <CardDescription>Declining trend or very low recent level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                    {(() => {
                      const weak = pe.goals.filter(
                        (g) => g.trend === 'declining' || (g.current != null && g.current < 2)
                      );
                      if (weak.length === 0) {
                        return (
                          <li className="list-none text-muted-foreground">None flagged right now.</li>
                        );
                      }
                      return weak.map((g) => (
                        <li key={g.goalId}>{g.goalName || g.goalId}</li>
                      ));
                    })()}
                  </ul>
                </CardContent>
              </Card>
              <Card className="border border-emerald-200/80 bg-emerald-50/40 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-950">Improving goals</CardTitle>
                  <CardDescription>Positive trajectory on measurements</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                    {(() => {
                      const up = pe.goals.filter((g) => g.trend === 'improving');
                      if (up.length === 0) {
                        return (
                          <li className="list-none text-muted-foreground">
                            None flagged yet — keep collecting data.
                          </li>
                        );
                      }
                      return up.map((g) => (
                        <li key={g.goalId}>{g.goalName || g.goalId}</li>
                      ));
                    })()}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : null}
          {pe.weakAreas && pe.weakAreas.length > 0 ? (
            <Card className="border bg-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-foreground">Weak areas</CardTitle>
                <CardDescription>Prioritize review or intervention</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {pe.weakAreas.map((w, i) => (
                    <li key={i}>{typeof w === 'string' ? w : w.reason || 'Area of concern'}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Clinical domains (0–5)</CardTitle>
                <CardDescription>Communication · behavior · social</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                {clinicalDomainChart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No domain scores yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clinicalDomainChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip formatter={(v: number) => [`${v}% of 0–5 scale`, '']} />
                      <Bar dataKey="value" fill={CHART_BAR} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card className="border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Weekly trend (engine)</CardTitle>
                <CardDescription>Chart-ready x / y (0–5 per week)</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                {weeklyEngineData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not enough weeks of session data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyEngineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip formatter={(v: number) => [String(v), 'Score']} />
                      <Bar dataKey="score" fill={CHART_LINE} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          {pe.goals && pe.goals.length > 0 ? (
            <Card className="border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Goal trajectory (0–5)</CardTitle>
                <CardDescription>Current vs target where available</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pe.goals.map((g) => {
                  const tgt = g.target != null && g.target > 0 ? g.target : 5;
                  const cur = g.current ?? 0;
                  const pct = Math.min(100, Math.round((cur / tgt) * 100));
                  return (
                    <div key={g.goalId} className="space-y-1">
                      <div className="flex justify-between gap-2 text-xs">
                        <span className="font-medium text-foreground">{g.goalName || g.goalId}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {g.current != null ? g.current.toFixed(2) : '—'} / {g.target != null ? g.target.toFixed(2) : '5'}{' '}
                          · {g.trend}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                          title={`${pct}% of target band`}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
          {pe.sessionInsights && pe.sessionInsights.length > 0 ? (
            <Card className="border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-foreground">Session impact</CardTitle>
                <CardDescription>Per-session score change vs prior completed session (linked goals)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {pe.sessionInsights.map((s) => (
                  <div key={s.sessionId} className="rounded-md border bg-muted/40 px-3 py-2">
                    <p className="font-medium text-foreground">
                      {s.sessionDate ? new Date(s.sessionDate).toLocaleString() : 'Session'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Goals:{' '}
                      {(s.goalsImpacted || []).map((gi) => formatGoalImpact(gi)).join(' · ') || '—'}
                    </p>
                    {s.notePreview ? <p className="mt-1 text-xs text-foreground">{s.notePreview}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Session trend</CardTitle>
            <CardDescription>Child response score over time (0–100)</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {lineData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scored sessions yet.</p>
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

        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Domain comparison</CardTitle>
            <CardDescription>Average goal progress by domain</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {domainChartData.every((x) => x.value === 0) ? (
              <p className="text-sm text-muted-foreground">No domain-level goals or data yet.</p>
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
      <Card className="border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Goal progress</CardTitle>
          <CardDescription>Based on sessions where each goal was targeted</CardDescription>
        </CardHeader>
        <CardContent>
          {goalProgress.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goals in the therapy plan yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-background/90">
                    <TableHead>Goal</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goalProgress.map((g) => (
                    <TableRow key={g.goalId}>
                      <TableCell className="max-w-[280px] font-medium text-foreground">{g.goalName}</TableCell>
                      <TableCell className="text-muted-foreground">{g.domain}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground">
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
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Activity effectiveness</CardTitle>
            <CardDescription>From session logs (activities used)</CardDescription>
          </CardHeader>
          <CardContent>
            {activityEffectiveness.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activities recorded in sessions.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background/90">
                      <TableHead>Activity</TableHead>
                      <TableHead className="text-right">Avg score</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityEffectiveness.map((a) => (
                      <TableRow key={a.activityName}>
                        <TableCell className="font-medium text-foreground">{a.activityName}</TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {a.avgChildResponse != null ? a.avgChildResponse : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{a.usageCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Home assignment compliance</CardTitle>
            <CardDescription>
              Total: {assignmentStats.total}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignmentStats.total === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments for this case.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border bg-muted/80 py-3">
                    <p className="text-lg font-semibold text-foreground tabular-nums">
                      {assignmentStats.percentages.completed}%
                    </p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="rounded-lg border bg-muted/80 py-3">
                    <p className="text-lg font-semibold text-foreground tabular-nums">
                      {assignmentStats.percentages.submitted}%
                    </p>
                    <p className="text-xs text-muted-foreground">Submitted / reviewed</p>
                  </div>
                  <div className="rounded-lg border bg-muted/80 py-3">
                    <p className="text-lg font-semibold text-foreground tabular-nums">
                      {assignmentStats.percentages.pending}%
                    </p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Raw counts — pending: {assignmentStats.pending}, submitted+reviewed:{' '}
                  {assignmentStats.submitted}, completed: {assignmentStats.completed}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
