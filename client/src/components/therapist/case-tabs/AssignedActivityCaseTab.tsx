import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { BookOpen, Loader2 } from 'lucide-react';
import { therapistAPI } from '../../../api';
import type { TherapistCaseFileData } from './caseFileTypes';

type ActivityRef = {
  name?: string;
  domain?: string;
  instructions?: string;
  objective?: string;
  procedure?: string;
};

type AssignmentRow = {
  _id?: string;
  caseId?: string;
  title?: string;
  activityName?: string;
  instructions?: string;
  status?: string;
  activityId?: ActivityRef | string | null;
  sourceActivityId?: ActivityRef | string | null;
};

type Props = {
  caseId: string;
  data: TherapistCaseFileData;
  onRefresh: () => Promise<void>;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'border-slate-200 bg-slate-100 text-slate-800',
  submitted: 'border-sky-200 bg-sky-50 text-sky-900',
  reviewed: 'border-amber-200 bg-amber-50 text-amber-950',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-950',
};

function resolveActivity(a: AssignmentRow): ActivityRef | null {
  if (a.activityId && typeof a.activityId === 'object') return a.activityId;
  if (a.sourceActivityId && typeof a.sourceActivityId === 'object') return a.sourceActivityId;
  return null;
}

function displayName(a: AssignmentRow) {
  const act = resolveActivity(a);
  const fromEnrich = a.activityName != null ? String(a.activityName).trim() : '';
  return fromEnrich || act?.name || a.title || 'Activity';
}

function displayInstructions(a: AssignmentRow) {
  const direct = a.instructions != null ? String(a.instructions).trim() : '';
  if (direct) return direct;
  const act = resolveActivity(a);
  if (!act) return '';
  const parts: string[] = [];
  if (act.objective) parts.push(`Objective: ${act.objective}`);
  if (act.procedure) parts.push(`Procedure: ${act.procedure}`);
  if (act.instructions) parts.push(act.instructions);
  return parts.join('\n\n').trim() || act.instructions || '';
}

function displayDomain(a: AssignmentRow) {
  const act = resolveActivity(a);
  const d = act?.domain;
  return d != null && String(d).trim() ? String(d).trim() : null;
}

function statusLabel(raw: string) {
  const s = String(raw || 'pending').toLowerCase();
  if (s === 'pending') return 'Pending';
  if (s === 'submitted') return 'Submitted';
  if (s === 'reviewed') return 'Reviewed';
  if (s === 'completed') return 'Completed';
  return raw || 'Pending';
}

/**
 * Case file tab: activities assigned to this child only (home assignments for caseId).
 * Data comes from the case file payload (same query as GET /api/assignments/case/:caseId).
 */
export function AssignedActivityCaseTab({ caseId, data, onRefresh }: Props) {
  const fromCaseFile = useMemo(() => {
    const list = (data.assignments || []) as AssignmentRow[];
    return list.filter((a) => !a.caseId || String(a.caseId) === String(caseId));
  }, [data.assignments, caseId]);

  const [fromApi, setFromApi] = useState<AssignmentRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFromApi = useCallback(async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      const { data: res } = await therapistAPI.getHomeAssignmentsByCase(caseId);
      const list = Array.isArray(res?.data) ? (res.data as AssignmentRow[]) : [];
      setFromApi(list.filter((a) => !a.caseId || String(a.caseId) === String(caseId)));
    } catch {
      setFromApi(null);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadFromApi();
  }, [loadFromApi]);

  const rows = fromApi ?? fromCaseFile;

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">Assigned Activity</CardTitle>
          <CardDescription className="text-slate-600">
            Activities you have assigned to this child from your library. To add or manage assignments, use the{' '}
            <strong>Home assignments</strong> tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loading && rows.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-9 w-9 animate-spin text-sky-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
              <p className="text-sm text-slate-700">No activities assigned to this child yet.</p>
              <p className="mt-2 text-xs text-slate-500">
                Assign from the <strong>Home assignments</strong> tab, or from the therapist dashboard home assignments
                page.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 border-slate-200"
                onClick={() => {
                  void (async () => {
                    await onRefresh();
                    await loadFromApi();
                  })();
                }}
              >
                Refresh list
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {loading ? (
                <li className="flex justify-end py-1">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-600" aria-hidden />
                </li>
              ) : null}
              {rows.map((a) => {
                const st = String(a.status || 'pending').toLowerCase();
                const badgeClass = STATUS_BADGE[st] || STATUS_BADGE.pending;
                const name = displayName(a);
                const domain = displayDomain(a);
                const instructions = displayInstructions(a);

                return (
                  <li
                    key={String(a._id)}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-100/80"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-100">
                          <BookOpen className="h-5 w-5 text-sky-700" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold leading-snug text-slate-900">{name}</p>
                          {domain ? (
                            <p className="text-xs font-medium uppercase tracking-wide text-sky-800/90">{domain}</p>
                          ) : null}
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 capitalize ${badgeClass}`}>
                        {statusLabel(st)}
                      </Badge>
                    </div>
                    {instructions ? (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{instructions}</p>
                    ) : (
                      <p className="mt-4 text-sm italic text-slate-500">No instructions provided.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
