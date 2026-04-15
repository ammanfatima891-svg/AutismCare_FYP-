import { useCallback, useEffect, useMemo, useState } from 'react';
import { progressEngineAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';

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

  const overallProgressPercent = useMemo(() => {
    const s = engine?.overallScore;
    if (s == null || Number.isNaN(Number(s))) return 0;
    return (Number(s) / 5) * 100;
  }, [engine?.overallScore]);

  const domains = useMemo(() => {
    const ds = Array.isArray(engine?.domains) ? engine.domains : [];
    const goals = Array.isArray(engine?.goals) ? engine.goals : [];
    if (!ds.length) {
      return DOMAIN_OPTIONS.map((d) => ({
        domain: d,
        progressPercent: 0,
        totalGoals: goals.filter((g: any) => String(g?.domain || '') === d).length,
        achievedGoals: goals.filter(
          (g: any) => String(g?.domain || '') === d && (g?.mastery === true || String(g?.masteryStatus || '') === 'mastered')
        ).length,
      }));
    }
    return ds.map((d: any) => {
      const domain = String(d?.name || '');
      const totalGoals = goals.filter((g: any) => String(g?.domain || '') === domain).length;
      const achievedGoals = goals.filter(
        (g: any) => String(g?.domain || '') === domain && (g?.mastery === true || String(g?.masteryStatus || '') === 'mastered')
      ).length;
      const scoreFive = d?.score != null ? Number(d.score) : 0;
      return {
        domain,
        progressPercent: (scoreFive / 5) * 100,
        totalGoals,
        achievedGoals,
      };
    });
  }, [engine]);

  const trendData = useMemo(() => {
    const w = Array.isArray(engine?.weeklyTrend) ? engine.weeklyTrend : [];
    return w
      .filter((row: any) => row && row.week)
      .map((row: any) => ({
        date: String(row.week),
        value: row.y != null ? Number(row.y) * 20 : null, // 0–5 → 0–100
      }));
  }, [engine]);

  const domainData = useMemo(() => {
    const target = String(selectedDomain || '').toLowerCase();
    const match = domains.find((d: any) => String(d.domain || '').toLowerCase() === target) || null;
    return match
      ? {
          domain: match.domain,
          progressPercent: match.progressPercent,
          totalGoals: match.totalGoals,
          achievedGoals: match.achievedGoals,
          trendData,
        }
      : null;
  }, [selectedDomain, domains, trendData]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-2 border shadow-sm bg-card">
              <CardHeader className="pb-2">
                <CardDescription>Overall Progress</CardDescription>
                <CardTitle className="text-4xl text-blue-700">
                  {Number(overallProgressPercent || 0).toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Goals tracked: {Array.isArray(engine?.goals) ? engine.goals.length : 0}
              </CardContent>
            </Card>

            {(domains || []).map((d: any) => (
              <Card key={d.domain} className="border shadow-sm bg-card">
                <CardHeader className="pb-2">
                  <CardDescription>{d.domain}</CardDescription>
                  <CardTitle className="text-2xl text-foreground">
                    {Number(d.progressPercent || 0).toFixed(1)}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {d.achievedGoals || 0}/{d.totalGoals || 0} goals achieved
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border shadow-sm bg-card">
              <CardHeader className="border-b border bg-blue-50/40">
                <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Domain Progress Comparison
                </CardTitle>
                <CardDescription>Goal completion % by therapy domain</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domains || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="domain" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="progressPercent" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-card">
              <CardHeader className="border-b border bg-blue-50/40">
                <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Response Trend Over Time
                </CardTitle>
                <CardDescription>Average child response trend from sessions</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 bg-background">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Progress</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {Number(domainData?.progressPercent || 0).toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {domainData?.achievedGoals || 0}/{domainData?.totalGoals || 0} goals achieved
                    </p>
                  </div>
                  <div className="lg:col-span-2 rounded-lg border p-3 bg-card h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={domainData?.trendData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
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
                        <p className="text-xs text-muted-foreground mt-1">
                          Response: {item.childResponse || 'n/a'}
                          {item.responseScore != null ? ` (${Number(item.responseScore).toFixed(1)})` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Goals targeted: {Array.isArray(item.goalsTargeted) ? item.goalsTargeted.join(', ') || '—' : '—'}
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
        </>
      )}
    </div>
  );
}
