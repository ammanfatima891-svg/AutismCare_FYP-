import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarCheck2,
  ClipboardList,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Home,
  Loader2,
  Stethoscope,
  TrendingUp,
  UserCircle2,
} from 'lucide-react';
import { clinicalIntelligenceAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { cn } from '../ui/utils';

const MODULE_COLORS: Record<string, string> = {
  therapy: 'border-amber-200/90 bg-amber-50 text-amber-950',
  progress: 'border-sky-200/90 bg-sky-50 text-sky-950',
  lab: 'border-violet-200/90 bg-violet-50 text-violet-950',
  screening: 'border-emerald-200/90 bg-emerald-50 text-emerald-950',
  appointments: 'border-rose-200/90 bg-rose-50 text-rose-950',
  assignments: 'border-teal-200/90 bg-teal-50 text-teal-950',
};

function eventIcon(type: string) {
  switch (type) {
    case 'SESSION_COMPLETED':
      return Stethoscope;
    case 'HOME_ASSIGNMENT_SUBMITTED':
      return Home;
    case 'LAB_REPORT_UPLOADED':
      return FlaskConical;
    case 'SCREENING_COMPLETED':
      return ClipboardList;
    case 'PROGRESS_UPDATED':
      return TrendingUp;
    case 'THERAPY_PLAN_UPDATED':
      return ClipboardList;
    case 'APPOINTMENT_UPDATED':
      return CalendarCheck2;
    default:
      return UserCircle2;
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export interface CaseTimelineViewProps {
  caseId: string;
  /** When true, shows a compact header (e.g. embedded in therapist case file). */
  compact?: boolean;
}

export function CaseTimelineView({ caseId, compact }: CaseTimelineViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grouped, setGrouped] = useState<Array<{ date: string; events: unknown[] }>>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await clinicalIntelligenceAPI.getCaseTimeline(caseId);
      const g = res?.data?.groupedByDate;
      setGrouped(Array.isArray(g) ? g : []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Could not load clinical timeline');
      setGrouped([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card className="border border-slate-200/90 shadow-sm">
      <CardHeader className={cn('border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-sky-50/40', compact ? 'py-3' : '')}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className={cn('text-slate-900', compact ? 'text-base' : 'text-lg')}>Clinical timeline</CardTitle>
            <CardDescription className="text-slate-600">
              Unified event stream across therapy, labs, screening, and scheduling.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-4', compact ? 'p-3 pt-4' : 'pt-6')}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading timeline…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
        ) : !grouped.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No clinical events recorded yet. Events appear as sessions, labs, screenings, and plans update.
          </p>
        ) : (
          grouped.map((day) => (
            <div key={day.date} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{day.date}</p>
              <ul className="space-y-2">
                {(day.events as Record<string, unknown>[]).map((ev) => {
                  const id = String(ev._id || `${ev.eventType}-${ev.timestamp}`);
                  const Icon = eventIcon(String(ev.eventType));
                  const modules = (ev.linkedModules as string[]) || [];
                  const isOpen = Boolean(open[id]);
                  return (
                    <li key={id}>
                      <Collapsible open={isOpen} onOpenChange={() => toggle(id)}>
                        <div
                          className={cn(
                            'flex flex-wrap items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                            'border-slate-200 bg-white hover:bg-slate-50/80'
                          )}
                        >
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-800">
                            <Icon className="h-4 w-4" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {String(ev.eventType || '').replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-muted-foreground">{formatTime(String(ev.timestamp))}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {String(ev.actorRole || '—')}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {modules.map((m) => (
                                <span
                                  key={m}
                                  className={cn(
                                    'rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
                                    MODULE_COLORS[m] || 'border-slate-200 bg-slate-50 text-slate-800'
                                  )}
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                            <CollapsibleTrigger asChild>
                              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-sky-800">
                                {isOpen ? (
                                  <>
                                    <ChevronDown className="mr-1 h-3.5 w-3.5" />
                                    Hide details
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight className="mr-1 h-3.5 w-3.5" />
                                    Event details
                                  </>
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>
                        <CollapsibleContent className="mt-1 space-y-2 rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3 text-xs text-slate-800">
                          {Array.isArray(ev.crossDomainInsight) && (ev.crossDomainInsight as string[]).length > 0 && (
                            <div>
                              <p className="font-semibold text-slate-700">Cross-domain insights</p>
                              <ul className="mt-1 list-disc space-y-1 pl-4">
                                {(ev.crossDomainInsight as string[]).map((t, i) => (
                                  <li key={i}>{t}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {ev.recommendationAudit &&
                            typeof ev.recommendationAudit === 'object' &&
                            (ev.recommendationAudit as { newRecommendation?: string }).newRecommendation && (
                              <div>
                                <p className="font-semibold text-slate-700">Recommendation audit</p>
                                <p className="mt-1 text-[11px] text-slate-600">
                                  <span className="font-medium">From:</span>{' '}
                                  {String(
                                    (ev.recommendationAudit as { previousRecommendation?: string }).previousRecommendation || '—'
                                  ).slice(0, 240)}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-600">
                                  <span className="font-medium">To:</span>{' '}
                                  {String(
                                    (ev.recommendationAudit as { newRecommendation?: string }).newRecommendation || '—'
                                  ).slice(0, 240)}
                                </p>
                              </div>
                            )}
                          {(ev.previousState || ev.newState) && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {ev.previousState && (
                                <div>
                                  <p className="font-semibold text-slate-700">Previous state</p>
                                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed">
                                    {JSON.stringify(ev.previousState, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {ev.newState && (
                                <div>
                                  <p className="font-semibold text-slate-700">New state</p>
                                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed">
                                    {JSON.stringify(ev.newState, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                          {ev.payload && (
                            <div>
                              <p className="font-semibold text-slate-700">Payload</p>
                              <pre className="mt-1 max-h-48 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed">
                                {JSON.stringify(ev.payload, null, 2)}
                              </pre>
                            </div>
                          )}
                          {ev.progressEngineSnapshotResolved && (
                            <div>
                              <p className="font-semibold text-slate-700">Progress engine snapshot</p>
                              <pre className="mt-1 max-h-40 overflow-auto rounded bg-white p-2 text-[10px] leading-relaxed">
                                {JSON.stringify(ev.progressEngineSnapshotResolved, null, 2)}
                              </pre>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
