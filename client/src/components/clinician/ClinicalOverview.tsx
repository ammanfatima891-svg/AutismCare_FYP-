import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Loader2, RefreshCw, AlertTriangle, ChevronDown } from 'lucide-react';
import { DomainPerformanceBarChart } from '../progress-clinical/DomainPerformanceBarChart';
import { GoalProgressLineChart } from '../progress-clinical/GoalProgressLineChart';
import { ClinicalAlertsPanel } from '../progress-clinical/ClinicalAlertsPanel';
import { confidenceTierFromLabel, CONFIDENCE_BG } from '../progress-clinical/constants';
import { cn } from '../ui/utils';
import { progressEngineAPI } from '../../api';
import type { CaseloadEngineEntry } from './useClinicianCaseloadEngines';
import { isAtRisk, sortCaseloadByUrgency } from './clinicalCaseloadUtils';
import { CaseloadHealthSummary, type CaseloadHealth } from './CaseloadHealthSummary';
import { TrendContextBadges } from './TrendContextBadges';

type Props = {
  entries: CaseloadEngineEntry[];
  health: CaseloadHealth | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  onOpenCase: (caseId: string) => void;
  onViewProgress: (caseId: string) => void;
  onStartInterventionReview: (caseId: string) => void;
  onScheduleReassessment: (caseId: string) => void;
};

function firstGoalTimeSeries(engine: Record<string, unknown> | null) {
  if (!engine) return [];
  const goals = Array.isArray(engine.goals) ? engine.goals : [];
  for (const g of goals) {
    const ts = (g as { timeSeries?: unknown[] }).timeSeries;
    if (Array.isArray(ts) && ts.length > 1) {
      return ts.map((t: { date?: string; score?: number; smoothedScore?: number; confidence?: number }) => ({
        date: t.date || null,
        score: Number(t.score ?? 0),
        smoothedScore: t.smoothedScore != null ? Number(t.smoothedScore) : undefined,
        confidence: t.confidence != null ? Number(t.confidence) : undefined,
      }));
    }
  }
  return [];
}

function domainRows(engine: Record<string, unknown> | null) {
  if (!engine) return [];
  const ds = Array.isArray(engine.domainScores) ? engine.domainScores : engine.domains;
  if (!Array.isArray(ds)) return [];
  return ds.map((d: { name?: string; score?: number; confidence?: number; confidenceScore?: number }) => ({
    name: String(d.name || '—'),
    score: typeof d.score === 'number' ? d.score : 0,
    confidence: typeof d.confidence === 'number' ? d.confidence : Number(d.confidenceScore) || 0,
  }));
}

function weeklyMini(engine: Record<string, unknown> | null) {
  const w = engine?.weeklyTrendMini;
  if (!Array.isArray(w)) return [];
  return w.map((row: { x?: string; y?: number; week?: string }) => ({
    week: String(row.week || ''),
    x: String(row.x || row.week || ''),
    y: typeof row.y === 'number' ? row.y : 0,
  }));
}

function topAlertTone(sev?: string) {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical' || s === 'error' || s === 'danger') {
    return 'border-red-200/90 bg-red-50/95 text-red-950';
  }
  if (s === 'warning') {
    return 'border-amber-200/90 bg-amber-50/90 text-amber-950';
  }
  return 'border-sky-200/90 bg-sky-50/85 text-sky-950';
}

function clipRec(s: string, n = 72) {
  const t = String(s || '').trim();
  if (!t) return '—';
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function ClinicalOverview({
  entries,
  health,
  loading,
  error,
  onReload,
  onOpenCase,
  onViewProgress,
  onStartInterventionReview,
  onScheduleReassessment,
}: Props) {
  const sorted = useMemo(() => sortCaseloadByUrgency(entries), [entries]);
  const atRisk = useMemo(() => sorted.filter(isAtRisk), [sorted]);
  const stable = useMemo(() => sorted.filter((e) => !isAtRisk(e)), [sorted]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Clinical overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Caseload progress from a single bulk query — short- vs long-term trends are shown separately.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onReload()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {health ? <CaseloadHealthSummary health={health} /> : null}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading && !entries.length ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      ) : null}

      {!loading && !entries.length && !error ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">No cases in your caseload yet.</CardContent>
        </Card>
      ) : null}

      {entries.length > 0 ? (
        <>
          <section>
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-foreground">At-risk & action cases</h3>
              <Badge variant="secondary">{atRisk.length}</Badge>
            </div>
            {atRisk.length === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-950">
                No cases currently exceed routine triage thresholds.
              </p>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {atRisk.map((entry) => (
                  <CaseClinicalCard
                    key={entry.row._id}
                    entry={entry}
                    onOpenCase={onOpenCase}
                    onViewProgress={onViewProgress}
                    onStartInterventionReview={onStartInterventionReview}
                    onScheduleReassessment={onScheduleReassessment}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-lg font-semibold text-foreground">Other cases</h3>
            {stable.length === 0 ? (
              <p className="text-sm text-muted-foreground">All cases appear in the section above.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {stable.slice(0, 12).map((entry) => (
                  <CaseClinicalCard
                    key={entry.row._id}
                    entry={entry}
                    compact
                    onOpenCase={onOpenCase}
                    onViewProgress={onViewProgress}
                    onStartInterventionReview={onStartInterventionReview}
                    onScheduleReassessment={onScheduleReassessment}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function CaseClinicalCard({
  entry,
  compact,
  onOpenCase,
  onViewProgress,
  onStartInterventionReview,
  onScheduleReassessment,
}: {
  entry: CaseloadEngineEntry;
  compact?: boolean;
  onOpenCase: (id: string) => void;
  onViewProgress: (id: string) => void;
  onStartInterventionReview: (id: string) => void;
  onScheduleReassessment: (id: string) => void;
}) {
  const { row, engine, loadError } = entry;
  const eng = engine;
  const topAlert = eng?.topAlert as { severity?: string; message?: string } | undefined;
  const confLabel = (eng?.confidence as { label?: string } | undefined)?.label || 'low';
  const tierClass = CONFIDENCE_BG[confidenceTierFromLabel(confLabel)];
  const lowOverall = Boolean(
    (eng?.confidence as { overall?: number } | undefined)?.overall != null &&
      Number((eng?.confidence as { overall?: number }).overall) < 0.4
  );
  const actionRequired = Boolean(eng?.actionRequired);
  const rec = String(eng?.clinicalRecommendation || '');
  const recHint = String(eng?.recommendationChangeHint || '');
  const recChanged = Boolean(eng?.recommendationChanged);
  const prevRec = String(eng?.previousRecommendation || '');
  const sessionsN = Number(eng?.sessionsCounted ?? 0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEngine, setDetailEngine] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetails = async (open: boolean) => {
    setDetailOpen(open);
    if (!open || detailEngine || !row._id) return;
    setDetailLoading(true);
    try {
      const res = await progressEngineAPI.getByCase(row._id);
      const body = res.data as { data?: Record<string, unknown> };
      setDetailEngine(body?.data && typeof body.data === 'object' ? body.data : null);
    } catch {
      setDetailEngine(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const chartEngine = detailEngine || eng;

  return (
    <Card
      className={cn(
        'border shadow-sm transition-shadow',
        actionRequired && 'ring-2 ring-red-300/80 border-red-200/80'
      )}
    >
      <CardHeader className="space-y-2 pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base text-foreground">{row.childName}</CardTitle>
            <CardDescription>Case · {row.status}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {actionRequired ? (
              <Badge className="bg-red-600 text-white hover:bg-red-600">Action required</Badge>
            ) : null}
            <Badge variant="outline" className={cn('text-[10px] uppercase', tierClass)}>
              {confLabel} confidence
            </Badge>
          </div>
        </div>
        {eng && !loadError ? (
          <TrendContextBadges
            shortTermTrend={eng.shortTermTrend != null ? String(eng.shortTermTrend) : null}
            longTermTrend={eng.longTermTrend != null ? String(eng.longTermTrend) : null}
            overallTrend={eng.overallTrend != null ? String(eng.overallTrend) : null}
          />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
        {eng && !loadError ? (
          <>
            {topAlert?.message ? (
              <div className={cn('rounded-lg border px-3 py-2 text-sm', topAlertTone(topAlert.severity))}>
                <span className="font-semibold">Top alert: </span>
                <span>{topAlert.message}</span>
                {topAlert.severity ? (
                  <span className="ml-2 text-[10px] uppercase opacity-90">({topAlert.severity})</span>
                ) : null}
              </div>
            ) : null}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Clinical recommendation</p>
              <p className="mt-1 text-sm font-medium leading-snug text-foreground">{rec || '—'}</p>
            </div>
            {recChanged && prevRec ? (
              <p className="text-xs font-medium text-amber-950">
                Recommendation changed: {clipRec(prevRec)} → {clipRec(rec)}
              </p>
            ) : recHint ? (
              <p className="text-xs text-muted-foreground">{recHint}</p>
            ) : !recChanged && sessionsN > 0 ? (
              <p className="text-xs text-muted-foreground">
                No change in clinical recommendation text across recent caseload reviews ({sessionsN} session
                {sessionsN === 1 ? '' : 's'} in engine window).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No prior stored recommendation to compare yet.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Overall (0–5):{' '}
              <span className="font-medium tabular-nums text-foreground">
                {lowOverall ? 'Limited data' : eng.overallScore != null ? Number(eng.overallScore).toFixed(2) : '—'}
              </span>
            </p>

            {!compact ? (
              <Collapsible open={detailOpen} onOpenChange={(o) => void openDetails(o)}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between gap-2">
                    Charts & deeper insights
                    <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', detailOpen && 'rotate-180')} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {detailLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Clinical reasoning (excerpt)</p>
                        <p className="text-sm text-foreground/90">{String(eng.clinicalReasoning || chartEngine?.clinicalReasoning || '')}</p>
                      </div>
                      {domainRows(chartEngine).length ? (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Domains (0–5)</p>
                          <DomainPerformanceBarChart data={domainRows(chartEngine)} height={160} />
                        </div>
                      ) : null}
                      {weeklyMini(eng).length ? (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Composite trajectory (recent)</p>
                          <GoalProgressLineChart
                            data={weeklyMini(eng).map((p) => ({
                              date: p.week || null,
                              score: p.y,
                              confidence: undefined,
                            }))}
                            height={140}
                          />
                        </div>
                      ) : null}
                      {firstGoalTimeSeries(chartEngine).length ? (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">First goal with session points</p>
                          <GoalProgressLineChart data={firstGoalTimeSeries(chartEngine)} height={160} />
                        </div>
                      ) : null}
                      {Array.isArray(chartEngine?.smartAlerts) && (chartEngine.smartAlerts as unknown[]).length ? (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">All alerts (severity-sorted)</p>
                          <ClinicalAlertsPanel alerts={chartEngine.smartAlerts as { severity?: string; message?: string }[]} />
                        </div>
                      ) : null}
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
              <Button size="sm" className="btn-accent" onClick={() => onOpenCase(row._id)}>
                Open case
              </Button>
              <Button size="sm" variant="outline" onClick={() => onViewProgress(row._id)}>
                View progress
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onStartInterventionReview(row._id)}>
                Review plan
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onStartInterventionReview(row._id)}>
                Modify therapy
              </Button>
              <Button size="sm" variant="outline" onClick={() => onScheduleReassessment(row._id)}>
                Schedule reassessment
              </Button>
            </div>
          </>
        ) : !loadError ? (
          <p className="text-sm text-muted-foreground">No engine data for this case yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
