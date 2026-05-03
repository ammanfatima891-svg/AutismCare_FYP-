import { useCallback, useEffect, useMemo, useState } from 'react';
import { progressEngineAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import { TrendLineChart } from '../reports/ui/ChartSection';
import {
  ClinicalAlertsPanel,
  DomainPerformanceBarChart,
  GoalClinicalCard,
  GoalProgressLineChart,
  GoalWhyModal,
  LowConfidenceBanner,
  trendIcon,
} from '../progress-clinical';

interface ProgressMonitoringTabProps {
  caseId: string;
}

const DOMAIN_OPTIONS = ['communication', 'behavior', 'social'];

function formatDate(dateValue: string) {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleDateString();
}

export function ProgressMonitoringTab({ caseId }: ProgressMonitoringTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [engine, setEngine] = useState<any>(null);

  const [selectedDomain, setSelectedDomain] = useState<string>(DOMAIN_OPTIONS[0]);
  const [domainLoading, setDomainLoading] = useState(false);
  const [whyGoal, setWhyGoal] = useState<any>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await progressEngineAPI.getByCase(caseId);
      setEngine(res.data?.data || null);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load progress monitoring');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const loadDomain = useCallback(async () => {
    // Domain drilldown is derived from engine payload; keep async boundary to preserve UI behavior.
    setDomainLoading(true);
    try {
      // no-op; computed from engine
    } finally {
      setDomainLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadDomain();
  }, [loadDomain]);

  const hasAnyData = useMemo(() => {
    const goals = Array.isArray(engine?.goals) ? engine.goals.length > 0 : false;
    const weekly = Array.isArray(engine?.weeklyTrend) ? engine.weeklyTrend.length > 0 : false;
    const sessions = Number(engine?._meta?.sessionsCounted || 0) > 0;
    return goals || weekly || sessions;
  }, [engine]);

  const lowOverall = Boolean(engine?.confidence && Number(engine.confidence.overall) < 0.4);

  const domainChartData = useMemo(() => {
    const ds = Array.isArray(engine?.domainScores) ? engine.domainScores : engine?.domains;
    const arr = Array.isArray(ds) ? ds : [];
    if (!arr.length) return [];
    return arr.map((d: any) => ({
      name: String(d?.name || '—'),
      score: typeof d?.score === 'number' ? d.score : 0,
      confidence: typeof d?.confidence === 'number' ? d.confidence : Number(d?.confidenceScore) || 0,
    }));
  }, [engine]);

  const domains = useMemo(() => {
    const goals = Array.isArray(engine?.goals) ? engine.goals : [];
    return DOMAIN_OPTIONS.map((d) => ({
      domain: d,
      totalGoals: goals.filter((g: any) => String(g?.domain || '') === d).length,
      achievedGoals: goals.filter(
        (g: any) =>
          String(g?.domain || '') === d && (g?.mastery === true || String(g?.masteryStatus || '') === 'mastered')
      ).length,
    }));
  }, [engine]);

  const trendData = useMemo(() => {
    const w = Array.isArray(engine?.weeklyTrend) ? engine.weeklyTrend : [];
    return w.map((row: any) => ({
      x: String(row.x || row.week || ''),
      y: row.y != null ? Number(row.y) : 0,
    }));
  }, [engine]);

  const domainData = useMemo(() => {
    const target = String(selectedDomain || '').toLowerCase();
    const match = domains.find((d: any) => String(d.domain || '').toLowerCase() === target) || null;
    const goalsInDomain = (Array.isArray(engine?.goals) ? engine.goals : []).filter(
      (g: any) => String(g?.domain || '').toLowerCase() === target
    );
    return match
      ? {
          domain: match.domain,
          totalGoals: match.totalGoals,
          achievedGoals: match.achievedGoals,
          trendData,
          goalsInDomain,
        }
      : null;
  }, [selectedDomain, domains, trendData, engine?.goals]);

  const sessionInsights = useMemo(() => {
    return {
      totalSessions: Number(engine?._meta?.sessionsCounted || 0),
      averageResponseScore: engine?._meta?.therapyScoreAvg != null ? Number(engine._meta.therapyScoreAvg) : 0,
      lastSessionDate:
        Array.isArray(engine?.sessionInsights) && engine.sessionInsights.length
          ? engine.sessionInsights[engine.sessionInsights.length - 1]?.sessionDate
          : null,
      recentActivity: Array.isArray(engine?.sessionInsights) ? engine.sessionInsights.slice(-5).reverse() : [],
    };
  }, [engine]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-foreground">Progress Monitoring</h3>
        <p className="text-sm text-muted-foreground">
          Auto-calculated analytics from therapy goals and session logs. No manual input.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      ) : !hasAnyData ? (
        <div className="rounded-lg border-dashed border bg-background p-4 text-sm text-muted-foreground">
          No progress data available
        </div>
      ) : (
        <>
          <LowConfidenceBanner
            visible={lowOverall}
            message="Interpret with caution: overall estimate has low statistical confidence."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-2 border shadow-sm bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Overall score (0–5)</CardDescription>
                <CardTitle className="text-4xl tabular-nums text-blue-700">
                  {lowOverall
                    ? 'Limited data'
                    : engine?.overallScore != null
                      ? Number(engine.overallScore).toFixed(2)
                      : '—'}
                </CardTitle>
                {engine?.overallTrend ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    Trend {trendIcon(engine.overallTrend)} {String(engine.overallTrend)}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Goals tracked: {Array.isArray(engine?.goals) ? engine.goals.length : 0}</p>
                {engine?.confidence ? (
                  <p>
                    Confidence:{' '}
                    <span className="font-medium capitalize text-foreground">{engine.confidence.label}</span> (
                    {(Number(engine.confidence.overall) * 100).toFixed(0)}%)
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {(domains || []).map((d: any) => {
              const row = domainChartData.find((x) => String(x.name).toLowerCase() === String(d.domain).toLowerCase());
              const scoreFive = row != null && typeof row.score === 'number' ? row.score : null;
              return (
                <Card key={d.domain} className="border shadow-sm bg-card">
                  <CardHeader className="pb-2">
                    <CardDescription>{d.domain}</CardDescription>
                    <CardTitle className="text-2xl tabular-nums text-foreground">
                      {scoreFive == null || Number.isNaN(scoreFive) ? '—' : scoreFive.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Engine 0–5 · mastered {d.achievedGoals}/{d.totalGoals}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border shadow-sm bg-card">
              <CardHeader className="border-b border bg-blue-50/40">
                <CardTitle className="text-base text-blue-900">Domain performance</CardTitle>
                <CardDescription>Horizontal bars (0–5), color by statistical confidence</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 h-[320px]">
                <DomainPerformanceBarChart data={domainChartData} height={280} />
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-card">
              <CardHeader className="border-b border bg-blue-50/40">
                <CardTitle className="text-base text-blue-900">Composite trajectory</CardTitle>
                <CardDescription>Smoothed engine series (same as reports)</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 min-h-[320px]">
                {trendData.length ? (
                  <TrendLineChart data={trendData} xLabel="Period" yLabel="Score (0–5)" />
                ) : (
                  <p className="text-sm text-muted-foreground">No trajectory yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {Array.isArray(engine?.smartAlerts) && engine.smartAlerts.length ? (
            <Card className="border shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-base">Clinical alerts</CardTitle>
                <CardDescription>From progress engine (grouped)</CardDescription>
              </CardHeader>
              <CardContent>
                <ClinicalAlertsPanel alerts={engine.smartAlerts} />
              </CardContent>
            </Card>
          ) : null}

          <Card className="border shadow-sm bg-card">
            <CardHeader className="border-b border bg-blue-50/40">
              <CardTitle className="text-base text-blue-900">Domain Drilldown</CardTitle>
              <CardDescription>Analyze one therapy domain in detail</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="max-w-xs">
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {(domains?.map((d: any) => d.domain) || DOMAIN_OPTIONS).map((d: string) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {domainLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-lg border p-4 bg-background">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Domain snapshot</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {domainData?.achievedGoals || 0}/{domainData?.totalGoals || 0} goals mastered in this domain
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Case-wide composite trajectory</p>
                    <div className="h-[220px]">
                      {(domainData?.trendData || []).length ? (
                        <TrendLineChart
                          data={domainData!.trendData}
                          xLabel="Period"
                          yLabel="Score (0–5)"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">No trend series.</p>
                      )}
                    </div>
                  </div>
                  {(domainData as any)?.goalsInDomain?.length ? (
                    <div className="space-y-6">
                      <p className="text-sm font-medium text-foreground">Goals in this domain</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {(domainData as any).goalsInDomain.map((g: any) => (
                          <GoalClinicalCard
                            key={g.goalId}
                            goal={{
                              goalName: g.goalName,
                              current: g.current,
                              trend: g.trend,
                              confidenceLabel: g.confidenceLabel,
                              confidenceScore: g.confidenceScore,
                              limitedDataUi: Boolean(g.limitedDataUi || g.confidenceScore < 0.4),
                            }}
                            onWhy={() => setWhyGoal(g)}
                          />
                        ))}
                      </div>
                      {(domainData as any).goalsInDomain.map((g: any) =>
                        Array.isArray(g.timeSeries) && g.timeSeries.length ? (
                          <div key={`${g.goalId}-chart`} className="rounded-lg border bg-card p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">{g.goalName}</p>
                            <GoalProgressLineChart
                              height={200}
                              data={g.timeSeries.map((t: any) => ({
                                date: t.date,
                                score: Number(t.score),
                                smoothedScore: t.smoothedScore != null ? Number(t.smoothedScore) : undefined,
                                confidence: t.confidence != null ? Number(t.confidence) : undefined,
                              }))}
                              explanationSnippet={String(g.reasoningSummary || '').slice(0, 100)}
                            />
                          </div>
                        ) : null
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No goals tagged in this domain yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card">
            <CardHeader className="border-b border bg-blue-50/40">
              <CardTitle className="text-base text-blue-900">Session Summary</CardTitle>
              <CardDescription>Auto-generated insights from session logs</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 bg-background">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Sessions</p>
                  <p className="text-2xl font-semibold text-foreground">{sessionInsights?.totalSessions || 0}</p>
                </div>
                <div className="rounded-lg border p-4 bg-background">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Response Score</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {Number(sessionInsights?.averageResponseScore || 0).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-lg border p-4 bg-background">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Session</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatDate(sessionInsights?.lastSessionDate || '')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Recent Activity</p>
                {Array.isArray(sessionInsights?.recentActivity) && sessionInsights.recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {sessionInsights.recentActivity.map((item: any, idx: number) => (
                      <div key={`${item.sessionDate}-${idx}`} className="rounded-lg border p-3 bg-card">
                        <p className="text-sm font-medium text-foreground">
                          {formatDate(item.sessionDate)} · {item.duration || 0} mins
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Goals in session log:{' '}
                          {Array.isArray(item.goalsImpacted) && item.goalsImpacted.length
                            ? item.goalsImpacted
                                .map((gi: unknown) =>
                                  typeof gi === 'object' && gi && 'goalName' in gi
                                    ? String((gi as { goalName?: string }).goalName || '')
                                    : ''
                                )
                                .filter(Boolean)
                                .join(', ') || '—'
                            : Array.isArray(item.goalsTargeted)
                              ? item.goalsTargeted.join(', ') || '—'
                              : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border-dashed border bg-background p-4 text-sm text-muted-foreground">
                    No sessions available yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <GoalWhyModal
            open={Boolean(whyGoal)}
            onOpenChange={(open) => {
              if (!open) setWhyGoal(null);
            }}
            goal={whyGoal}
          />
        </>
      )}
    </div>
  );
}
