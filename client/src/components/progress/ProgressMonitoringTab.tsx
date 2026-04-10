import { useCallback, useEffect, useMemo, useState } from 'react';
import { progressAPI } from '../../services/api';
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

const DOMAIN_OPTIONS = ['Speech', 'Occupational Therapy', 'Behavioral', 'Sensory'];

function formatDate(dateValue: string) {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleDateString();
}

export function ProgressMonitoringTab({ caseId }: ProgressMonitoringTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [sessionInsights, setSessionInsights] = useState<any>(null);

  const [selectedDomain, setSelectedDomain] = useState<string>('Speech');
  const [domainData, setDomainData] = useState<any>(null);
  const [domainLoading, setDomainLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, sessionsRes] = await Promise.all([
        progressAPI.getOverview(caseId),
        progressAPI.getSessions(caseId),
      ]);
      setOverview(overviewRes.data?.data || null);
      setSessionInsights(sessionsRes.data?.data || null);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load progress monitoring');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const loadDomain = useCallback(async () => {
    if (!selectedDomain) return;
    setDomainLoading(true);
    try {
      const res = await progressAPI.getDomain(caseId, selectedDomain);
      setDomainData(res.data?.data || null);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load domain progress');
    } finally {
      setDomainLoading(false);
    }
  }, [caseId, selectedDomain]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadDomain();
  }, [loadDomain]);

  const hasAnyData = useMemo(() => {
    const domainGoals = Array.isArray(overview?.domains)
      ? overview.domains.some((d: any) => Number(d.totalGoals || 0) > 0)
      : false;
    const trend = Array.isArray(overview?.trendData) && overview.trendData.length > 0;
    const sessions = Number(sessionInsights?.totalSessions || 0) > 0;
    return domainGoals || trend || sessions;
  }, [overview, sessionInsights]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">Progress Monitoring</h3>
        <p className="text-sm text-slate-600">
          Auto-calculated analytics from therapy goals and session logs. No manual input.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      ) : !hasAnyData ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          No progress data available
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardDescription>Overall Progress</CardDescription>
                <CardTitle className="text-4xl text-blue-700">
                  {Number(overview?.overallProgressPercent || 0).toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                Achieved {overview?.achievedGoals || 0} of {overview?.totalGoals || 0} goals
              </CardContent>
            </Card>

            {(overview?.domains || DOMAIN_OPTIONS.map((d) => ({ domain: d, progressPercent: 0 }))).map((d: any) => (
              <Card key={d.domain} className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardDescription>{d.domain}</CardDescription>
                  <CardTitle className="text-2xl text-slate-900">
                    {Number(d.progressPercent || 0).toFixed(1)}%
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-500">
                  {d.achievedGoals || 0}/{d.totalGoals || 0} goals achieved
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 bg-blue-50/40">
                <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Domain Progress Comparison
                </CardTitle>
                <CardDescription>Goal completion % by therapy domain</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.domains || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="domain" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="progressPercent" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 bg-blue-50/40">
                <CardTitle className="text-base text-blue-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Response Trend Over Time
                </CardTitle>
                <CardDescription>Average child response trend from sessions</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overview?.trendData || []}>
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

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 bg-blue-50/40">
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
                    {DOMAIN_OPTIONS.map((d) => (
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
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Progress</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {Number(domainData?.progressPercent || 0).toFixed(1)}%
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {domainData?.achievedGoals || 0}/{domainData?.totalGoals || 0} goals achieved
                    </p>
                  </div>
                  <div className="lg:col-span-2 rounded-lg border border-slate-200 p-3 bg-white h-[220px]">
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

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 bg-blue-50/40">
              <CardTitle className="text-base text-blue-900">Session Summary</CardTitle>
              <CardDescription>Auto-generated insights from session logs</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Total Sessions</p>
                  <p className="text-2xl font-semibold text-slate-900">{sessionInsights?.totalSessions || 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Avg Response Score</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {Number(sessionInsights?.averageResponseScore || 0).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Last Session</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatDate(sessionInsights?.lastSessionDate || '')}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Recent Activity</p>
                {Array.isArray(sessionInsights?.recentActivity) && sessionInsights.recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {sessionInsights.recentActivity.map((item: any, idx: number) => (
                      <div key={`${item.sessionDate}-${idx}`} className="rounded-lg border border-slate-200 p-3 bg-white">
                        <p className="text-sm font-medium text-slate-900">
                          {formatDate(item.sessionDate)} · {item.duration || 0} mins
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Response: {item.childResponse || 'n/a'}
                          {item.responseScore != null ? ` (${Number(item.responseScore).toFixed(1)})` : ''}
                        </p>
                        <p className="text-xs text-slate-500">
                          Goals targeted: {Array.isArray(item.goalsTargeted) ? item.goalsTargeted.join(', ') || '—' : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
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
