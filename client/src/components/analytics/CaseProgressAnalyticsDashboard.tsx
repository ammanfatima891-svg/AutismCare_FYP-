import { useCallback, useEffect, useState } from 'react';
import { analyticsAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CaseAnalyticsPayload } from './types';
import { TrendLineChart } from '../reports/ui/ChartSection';
import {
  ClinicalAlertsPanel,
  DomainPerformanceBarChart,
  GoalClinicalCard,
  GoalWhyModal,
  LowConfidenceBanner,
  trendIcon,
} from '../progress-clinical';

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

export function CaseProgressAnalyticsDashboard({ caseId, childLabel }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CaseAnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whyGoal, setWhyGoal] = useState<NonNullable<CaseAnalyticsPayload['progressEngine']>['goals'][number] | null>(
    null
  );

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
  const domainChartData = Array.isArray(pe.domainScores) && pe.domainScores.length
    ? pe.domainScores.map((d) => ({ name: d.name, score: d.score, confidence: d.confidence }))
    : domains.length
      ? domains.map((d: { name?: string; score?: number; confidenceScore?: number }) => ({
          name: d.name || '—',
          score: typeof d.score === 'number' ? d.score : 0,
          confidence: typeof d.confidenceScore === 'number' ? d.confidenceScore : 0,
        }))
      : [];
  const weeklyTrend = Array.isArray(pe.weeklyTrend) ? pe.weeklyTrend : [];
  const smartAlerts = Array.isArray(pe.smartAlerts) ? pe.smartAlerts : [];
  const weakAreas = Array.isArray(pe.weakAreas) ? pe.weakAreas : [];
  const lowOverall = Boolean(pe.confidence && pe.confidence.overall < 0.4);

  return (
    <div className="space-y-6">
      {childLabel ? (
        <div>
          <h2 className="text-lg font-bold text-foreground">Progress analytics</h2>
          <p className="text-sm text-muted-foreground">{childLabel}</p>
        </div>
      ) : null}

      <LowConfidenceBanner
        visible={lowOverall}
        message="Interpret with caution — overall metric has low statistical confidence."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Overall score (0–5)</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums text-foreground">
              {lowOverall ? 'Limited data' : typeof pe.overallScore === 'number' && !Number.isNaN(pe.overallScore)
                ? pe.overallScore.toFixed(2)
                : '—'}
            </CardTitle>
            {typeof pe.overallTrend === 'string' ? (
              <p className="text-xs text-muted-foreground mt-1">
                Trend {trendIcon(pe.overallTrend)} {pe.overallTrend}
              </p>
            ) : null}
          </CardHeader>
          {pe.confidence ? (
            <CardContent className="text-xs text-muted-foreground">
              Confidence: {(pe.confidence.overall * 100).toFixed(0)}% ({pe.confidence.label})
              {typeof pe.overallExplanation?.dataQuality === 'string' ? (
                <span>&nbsp;· data quality {pe.overallExplanation.dataQuality}</span>
              ) : null}
            </CardContent>
          ) : null}
        </Card>

        {domainChartData.length ? (
          <Card className="border bg-card shadow-sm sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-foreground">Domain performance</CardTitle>
              <CardDescription>Bars tinted by statistical confidence</CardDescription>
            </CardHeader>
            <CardContent className="h-[240px]">
              <DomainPerformanceBarChart data={domainChartData} height={220} />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {weeklyTrend.length > 0 ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-foreground">Composite trajectory</CardTitle>
            <CardDescription>Same engine smoothing as therapist reports</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[260px]">
            <TrendLineChart
              data={weeklyTrend.map((w: { x?: string; y?: number; week?: string }) => ({
                x: String(w.x || w.week || ''),
                y: typeof w.y === 'number' ? w.y : 0,
              }))}
              xLabel="Period"
              yLabel="Score (0–5)"
            />
          </CardContent>
        </Card>
      ) : null}

      {smartAlerts.length > 0 ? (
        <Card className="border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-foreground">Alerts</CardTitle>
            <CardDescription>Grouped severity</CardDescription>
          </CardHeader>
          <CardContent>
            <ClinicalAlertsPanel alerts={smartAlerts} />
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
            <CardTitle className="text-base text-foreground">Goals</CardTitle>
            <CardDescription>Unified engine visuals</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {pe.goals.map((g) => (
              <GoalClinicalCard
                key={g.goalId}
                goal={{
                  goalId: g.goalId,
                  goalName: g.goalName,
                  current: g.current,
                  trend: g.trend,
                  confidenceLabel: g.confidenceLabel,
                  confidenceScore: typeof g.confidenceScore === 'number' ? g.confidenceScore : undefined,
                  limitedDataUi: Boolean(
                    g.limitedDataUi || (typeof g.confidenceScore === 'number' ? g.confidenceScore < 0.4 : false)
                  ),
                }}
                onWhy={() => setWhyGoal(g)}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <GoalWhyModal
        open={Boolean(whyGoal)}
        onOpenChange={(o) => {
          if (!o) setWhyGoal(null);
        }}
        goal={whyGoal}
      />
    </div>
  );
}
