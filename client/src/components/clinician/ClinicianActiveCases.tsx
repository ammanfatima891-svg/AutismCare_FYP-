import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '../ui/utils';
import { DomainPerformanceBarChart } from '../progress-clinical/DomainPerformanceBarChart';
import { GoalProgressLineChart } from '../progress-clinical/GoalProgressLineChart';
import { ClinicalAlertsPanel } from '../progress-clinical/ClinicalAlertsPanel';
import { confidenceTierFromLabel, CONFIDENCE_BG } from '../progress-clinical/constants';
import type { CaseloadEngineEntry } from './useClinicianCaseloadEngines';
import { sortCaseloadByUrgency } from './clinicalCaseloadUtils';
import { TrendContextBadges } from './TrendContextBadges';
import { progressEngineAPI } from '../../api';

type Props = {
  entries: CaseloadEngineEntry[];
  loading: boolean;
  error: string | null;
  onOpenCase: (caseId: string) => void;
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

export function ClinicianActiveCases({ entries, loading, error, onOpenCase }: Props) {
  const sorted = useMemo(() => sortCaseloadByUrgency(entries), [entries]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fullEngineByCase, setFullEngineByCase] = useState<Record<string, Record<string, unknown> | null>>({});
  const [fullLoading, setFullLoading] = useState<Record<string, boolean>>({});
  const enginesRef = React.useRef(fullEngineByCase);
  enginesRef.current = fullEngineByCase;

  useEffect(() => {
    if (!openId) return;
    if (enginesRef.current[openId] !== undefined) return;
    let cancelled = false;
    setFullLoading((m) => ({ ...m, [openId]: true }));
    void (async () => {
      try {
        const res = await progressEngineAPI.getByCase(openId);
        const body = res.data as { data?: Record<string, unknown> };
        const data = body?.data && typeof body.data === 'object' ? body.data : null;
        if (!cancelled) {
          setFullEngineByCase((m) => ({ ...m, [openId]: data }));
        }
      } catch {
        if (!cancelled) {
          setFullEngineByCase((m) => ({ ...m, [openId]: null }));
        }
      } finally {
        if (!cancelled) {
          setFullLoading((m) => ({ ...m, [openId]: false }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openId]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Active cases</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One caseload request, sorted by urgency. Short- vs long-term trends are labeled separately; expand for full
          trajectories (loaded on demand).
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !entries.length ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : null}
      <div className="space-y-2">
        {sorted.map((entry) => {
          const { row, engine, loadError } = entry;
          const eng = engine;
          const conf = eng?.confidence as { overall?: number; label?: string } | undefined;
          const low = Boolean(conf?.overall != null && conf.overall < 0.4);
          const label = conf?.label || 'low';
          const isOpen = openId === row._id;
          const alerts = Array.isArray(eng?.smartAlerts) ? eng.smartAlerts : [];
          const fullEng = fullEngineByCase[row._id];
          const chartEngine = fullEng != null ? fullEng : eng;
          const actionRequired = Boolean(eng?.actionRequired);
          const topSev = String((eng?.topAlert as { severity?: string } | undefined)?.severity || '').toLowerCase();

          return (
            <Collapsible
              key={row._id}
              open={isOpen}
              onOpenChange={(o) => setOpenId(o ? row._id : null)}
              className={cn(
                'rounded-xl border bg-card shadow-sm',
                actionRequired && 'ring-2 ring-red-300/70 border-red-200/80',
                topSev === 'critical' && !actionRequired && 'ring-1 ring-red-200/80'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{row.childName}</p>
                    {actionRequired ? (
                      <Badge className="bg-red-600 text-[10px] uppercase text-white hover:bg-red-600">Action required</Badge>
                    ) : null}
                  </div>
                  {eng && !loadError ? (
                    <TrendContextBadges
                      shortTermTrend={eng.shortTermTrend != null ? String(eng.shortTermTrend) : null}
                      longTermTrend={eng.longTermTrend != null ? String(eng.longTermTrend) : null}
                      overallTrend={eng.overallTrend != null ? String(eng.overallTrend) : null}
                    />
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Overall {low ? 'Limited data' : eng?.overallScore != null ? Number(eng.overallScore).toFixed(2) : '—'} / 5
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('text-[10px] uppercase', CONFIDENCE_BG[confidenceTierFromLabel(label)])}>
                    {label}
                  </Badge>
                  <Button size="sm" className="btn-accent" onClick={() => onOpenCase(row._id)}>
                    Open
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                      Details
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className="border-t border-border/60 px-4 pb-4 pt-2">
                {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
                {eng ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="min-h-[140px]">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Domains</p>
                      <DomainPerformanceBarChart data={domainRows(eng)} height={140} />
                    </div>
                    <div className="min-h-[140px]">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Goal trajectory</p>
                      {fullLoading[row._id] && !chartEngine?.goals ? (
                        <div className="flex h-[140px] items-center justify-center text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <GoalProgressLineChart data={firstGoalTimeSeries(chartEngine)} height={140} />
                      )}
                    </div>
                    {alerts.length ? (
                      <div className="lg:col-span-2">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Alerts (severity-sorted)</p>
                        <ClinicalAlertsPanel alerts={alerts as { severity?: string; message?: string }[]} />
                      </div>
                    ) : null}
                  </div>
                ) : !loadError ? (
                  <p className="text-sm text-muted-foreground">No engine snapshot.</p>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
