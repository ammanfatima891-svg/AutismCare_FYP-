import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { BookOpen, Calendar, ClipboardList, History, Loader2, TrendingUp } from 'lucide-react';
import { integrationAPI, parentAPI } from '../../api';

type ParentCaseRow = {
  caseId: string;
  childId: string;
  childName?: string;
  status?: string;
};

type SessionRow = {
  _id?: string;
  date: string;
  duration: number;
  childResponse: string;
  parentInstructions: string;
  status?: string;
};

type TherapistFeedback = {
  comment?: string | null;
  feedback?: string | null;
  rating?: number | null;
  reviewedAt?: string | null;
};

type ParentSubmission = {
  fileUrl?: string;
  submissionUrl?: string;
  fileType?: string;
  submittedAt?: string;
};

type AssignmentRow = {
  _id: string;
  activityName?: string;
  title?: string;
  dueDate: string;
  status: string;
  isLate?: boolean;
  instructions?: string;
  materials?: string;
  parentSubmission?: ParentSubmission;
  therapistFeedback?: TherapistFeedback;
  submissionUrl?: string;
};

type ProgressPayload = {
  overallProgressPercent?: number;
  totalGoals?: number;
  achievedGoals?: number;
  domains?: { domain: string; progressPercent: number; totalGoals: number; achievedGoals: number }[];
  trendData?: { date: string; value: number }[];
};

type SlotRow = {
  _id: string;
  date: string;
  time: string;
  duration: number;
  status: string;
};

const SLOT_STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-slate-100 text-slate-800 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  missed: 'bg-red-50 text-red-900 border-red-200',
  rescheduled: 'bg-amber-50 text-amber-950 border-amber-200',
};

const ASSIGN_BADGE: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-800',
  submitted: 'bg-sky-100 text-sky-900',
  reviewed: 'bg-amber-100 text-amber-950',
  completed: 'bg-emerald-100 text-emerald-950',
};

function formatDate(iso: string | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function resolveUploadUrl(filePath: string) {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  const origin = base.replace(/\/api\/?$/, '');
  return `${origin}${filePath.startsWith('/') ? '' : '/'}${filePath}`;
}

function assignmentDisplayName(a: AssignmentRow) {
  const n = (a.activityName || a.title || '').trim();
  return n || 'Home activity';
}

function hasTherapistFeedbackForParent(tf: TherapistFeedback | undefined) {
  if (!tf || typeof tf !== 'object') return false;
  const c = String(tf.comment || tf.feedback || '').trim();
  if (c) return true;
  if (tf.rating != null && tf.rating > 0) return true;
  if (tf.reviewedAt) return true;
  return false;
}

/** Pull scale 1–5 from therapist session log childResponse (e.g. "scale:4"). */
function extractResponseScale(cr: string | undefined): number | null {
  const m = String(cr || '').match(/scale:\s*(\d)/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 5 ? n : null;
}

type PanelProps = {
  /** Initial / URL case (Child Case page). Selection can change when multiple children exist. */
  forcedCaseId?: string;
  /** Called when the parent picks another child — e.g. sync `/parent/case/:caseId`. */
  onCaseIdChange?: (caseId: string) => void;
};

export function ParentCaseIntegrationPanels({ forcedCaseId, onCaseIdChange }: PanelProps) {
  const [cases, setCases] = useState<ParentCaseRow[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [sessionSlots, setSessionSlots] = useState<SlotRow[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    try {
      setLoadingCases(true);
      setError(null);
      const res = await parentAPI.getCases();
      const rows = (res.data?.data || []) as ParentCaseRow[];
      const normalized = rows.map((r) => ({
        ...r,
        caseId: String(r.caseId),
        childId: String(r.childId),
      }));
      setCases(normalized);
      setSelectedCaseId((prev) => {
        if (normalized.length === 0) return '';
        if (forcedCaseId && normalized.some((c) => c.caseId === forcedCaseId)) return forcedCaseId;
        if (prev && normalized.some((c) => c.caseId === prev)) return prev;
        return normalized[0].caseId;
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to load cases');
      setCases([]);
      setSelectedCaseId('');
    } finally {
      setLoadingCases(false);
    }
  }, [forcedCaseId]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (forcedCaseId && cases.some((c) => c.caseId === forcedCaseId)) {
      setSelectedCaseId(forcedCaseId);
    }
  }, [forcedCaseId, cases]);

  const handleChildCaseSelect = (value: string) => {
    setSelectedCaseId(value);
    onCaseIdChange?.(value);
  };

  useEffect(() => {
    if (!selectedCaseId) {
      setSessions([]);
      setAssignments([]);
      setProgress(null);
      setSessionSlots([]);
      return;
    }

    const load = async () => {
      try {
        setLoadingDetail(true);
        setError(null);
        const [sRes, aRes, pRes, slotRes] = await Promise.all([
          parentAPI.getCaseSessions(selectedCaseId),
          parentAPI.getCaseAssignments(selectedCaseId),
          integrationAPI.getCaseProgress(selectedCaseId),
          parentAPI.getSessionSlots(selectedCaseId),
        ]);
        setSessions(Array.isArray(sRes.data?.data) ? sRes.data.data : []);
        setAssignments(Array.isArray(aRes.data?.data) ? aRes.data.data : []);
        setProgress(pRes.data?.data || null);
        const rawSlots = Array.isArray(slotRes.data?.data) ? slotRes.data.data : [];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const upcoming = (rawSlots as SlotRow[])
          .filter((row) => {
            const d = new Date(row.date);
            return !Number.isNaN(d.getTime()) && d >= startOfToday;
          })
          .sort((a, b) => {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            if (da !== db) return da - db;
            return String(a.time).localeCompare(String(b.time));
          })
          .slice(0, 24);
        setSessionSlots(upcoming);
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err.response?.data?.message || 'Failed to load therapy data');
        setSessions([]);
        setAssignments([]);
        setProgress(null);
        setSessionSlots([]);
      } finally {
        setLoadingDetail(false);
      }
    };

    void load();
  }, [selectedCaseId]);

  if (loadingCases) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 p-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <Card className="mx-auto w-full max-w-5xl border-dashed border-sky-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-sky-950">Child case</CardTitle>
          <CardDescription>
            When your care team opens a case for your child, sessions, assignments, and progress will appear here.
            Add or manage children under <strong className="font-medium text-slate-700">My Children</strong>.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const activeCase = cases.find((c) => c.caseId === selectedCaseId);
  const invalidForced = !!forcedCaseId && !cases.some((c) => c.caseId === forcedCaseId);

  if (invalidForced) {
    return (
      <Card className="mx-auto w-full max-w-5xl border border-amber-200 bg-amber-50/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-amber-900">Case not found</CardTitle>
          <CardDescription>
            This case is not linked to your account, or the link may be outdated. Use <strong>Child Case</strong> from
            the menu to open your active case.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {forcedCaseId && cases.length > 1 ? (
        <Card className="border border-sky-100 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="max-w-md space-y-2">
              <Label htmlFor="child-case-select" className="text-slate-800">
                Select Child
              </Label>
              <Select value={selectedCaseId} onValueChange={handleChildCaseSelect}>
                <SelectTrigger
                  id="child-case-select"
                  className="h-11 w-full border-slate-200 bg-white shadow-sm focus:ring-sky-500"
                >
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.caseId} value={c.caseId}>
                      {c.childName || 'Child'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {forcedCaseId && cases.length === 1 ? (
        <div className="rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-sky-950">Child: </span>
            {cases[0].childName || 'Child'}
          </p>
        </div>
      ) : null}

      {forcedCaseId && activeCase ? (
        <Card className="border border-sky-100 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-lg font-semibold text-sky-950">Child / case information</CardTitle>
            <CardDescription>Basic details for this therapy case.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Child</dt>
                <dd className="text-base font-medium text-slate-900">{activeCase.childName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Case status</dt>
                <dd className="text-base text-slate-800">{activeCase.status || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Case reference</dt>
                <dd className="font-mono text-sm text-slate-700">{String(activeCase.caseId)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {!forcedCaseId ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="max-w-md flex-1 space-y-2">
            <Label htmlFor="case-select">Child / case</Label>
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger id="case-select" className="w-full border-slate-200">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.caseId} value={c.caseId}>
                    {c.childName || 'Child'} · {String(c.caseId).slice(-6)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {error && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2" role="alert">
          {error}
        </p>
      )}

      {/* Upcoming therapy session slots (schedule — not booking) */}
      <Card className="border border-sky-100 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sky-600" />
            <CardTitle className="text-lg">Upcoming sessions</CardTitle>
          </div>
          <CardDescription>
            Planned therapy times from your therapist&apos;s schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : sessionSlots.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming scheduled sessions for this case.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {sessionSlots.map((row) => (
                <li key={row._id} className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatDate(row.date)} · {row.time}
                    </p>
                    <p className="text-xs text-slate-500">{row.duration} minutes</p>
                  </div>
                  <Badge variant="outline" className={SLOT_STATUS_BADGE[row.status] || SLOT_STATUS_BADGE.scheduled}>
                    {row.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Logged sessions — compact history (same API as Session guidance) */}
      <Card className="border border-sky-100 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-sky-600" />
            <CardTitle className="text-lg">Session history</CardTitle>
          </div>
          <CardDescription>
            Logged therapy sessions for this case (newest first). Response trend uses 1–5 scale when present in session
            notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading session history…
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No logged sessions yet. Your therapist will record sessions here.</p>
          ) : (
            <>
              {(() => {
                const chronological = [...sessions].slice(0, 12).reverse();
                const scales = chronological
                  .map((s) => extractResponseScale(s.childResponse))
                  .filter((x): x is number => x != null)
                  .slice(-8);
                const trend =
                  scales.length >= 2 ? (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium text-sky-900">Response trend (1–5): </span>
                      {scales.join(' → ')}
                    </p>
                  ) : null;
                return trend;
              })()}
              <div className="grid gap-3">
                {sessions.map((s, idx) => (
                  <div
                    key={s._id ? String(s._id) : `hist-${idx}`}
                    className="rounded-lg border border-slate-100 bg-slate-50/40 p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <p className="font-semibold text-sky-950">{formatDate(s.date)}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        {s.duration != null ? <span>{s.duration} min</span> : null}
                        {s.status ? (
                          <Badge variant="outline" className="text-xs capitalize">
                            {s.status}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-800">
                      <span className="font-medium text-slate-600">Response: </span>
                      {s.childResponse?.trim() || '—'}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm text-slate-700">
                      <span className="font-medium text-sky-800">Instructions: </span>
                      {s.parentInstructions?.trim() || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Session guidance */}
      <Card className="border border-sky-100 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Session guidance</CardTitle>
          </div>
          <CardDescription>
            Full detail for each session — including instructions for you between visits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No sessions logged yet for this case.</p>
          ) : (
            <ul className="space-y-4">
              {sessions.map((s, idx) => (
                <li
                  key={s._id ? String(s._id) : `${s.date}-${idx}`}
                  className="rounded-lg border border-slate-100 bg-white p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">{formatDate(s.date)}</span>
                    {s.duration ? <span>· {s.duration} min</span> : null}
                    {s.status ? (
                      <Badge variant="outline" className="text-xs">
                        {s.status}
                      </Badge>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Child response</p>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{s.childResponse || '—'}</p>
                  </div>
                  <div className="rounded-md bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 mb-1">
                      Instructions for you
                    </p>
                    <p className="text-sm text-blue-950 whitespace-pre-wrap">
                      {s.parentInstructions?.trim() ? s.parentInstructions : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Home assignments */}
      <Card className="border border-sky-100 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-sky-700" />
            <CardTitle className="text-lg">Home assignments</CardTitle>
          </div>
          <CardDescription>Activities your therapist assigned for this case.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading assignments…
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-slate-500">No home assignments for this case yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {assignments.map((a) => {
                const st = String(a.status || 'pending').toLowerCase();
                const ps = a.parentSubmission;
                const rawUrl = a.submissionUrl || ps?.submissionUrl || ps?.fileUrl || '';
                const fileAbs = rawUrl ? resolveUploadUrl(rawUrl) : '';
                const fb = a.therapistFeedback;
                const showFeedback = (st === 'reviewed' || st === 'completed') && hasTherapistFeedbackForParent(fb);
                const feedbackText = String(fb?.feedback || fb?.comment || '').trim();
                return (
                  <li key={a._id} className="space-y-3 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{assignmentDisplayName(a)}</p>
                        <p className="text-xs text-slate-500">Due {formatDate(a.dueDate)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.isLate ? (
                          <Badge variant="outline" className="border-rose-200 text-rose-800">
                            Late
                          </Badge>
                        ) : null}
                        <Badge className={ASSIGN_BADGE[st] || 'bg-slate-100'}>{a.status}</Badge>
                      </div>
                    </div>

                    {rawUrl && st !== 'pending' ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/90 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Parent submission</p>
                        {ps?.submittedAt ? (
                          <p className="text-xs text-slate-500">Submitted {formatDate(ps.submittedAt)}</p>
                        ) : null}
                        {ps?.fileType === 'image' ? (
                          <img
                            src={fileAbs}
                            alt=""
                            className="mt-2 max-h-40 rounded-md border border-slate-200 object-contain"
                          />
                        ) : ps?.fileType === 'video' ? (
                          <video
                            src={fileAbs}
                            className="mt-2 max-h-40 w-full rounded-md border border-slate-200"
                            controls
                          />
                        ) : null}
                      </div>
                    ) : null}

                    {showFeedback ? (
                      <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">Therapist feedback</p>
                        {feedbackText ? (
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{feedbackText}</p>
                        ) : null}
                        {fb?.rating != null && fb.rating > 0 ? (
                          <p className="mt-1 text-sm text-sky-950">
                            Rating: <span className="font-medium">{fb.rating}/5</span>
                          </p>
                        ) : null}
                        {fb?.reviewedAt ? (
                          <p className="mt-1 text-xs text-sky-800/90">
                            Reviewed {formatDate(typeof fb.reviewedAt === 'string' ? fb.reviewedAt : String(fb.reviewedAt))}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <Card className="border border-sky-100 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-700" />
            <CardTitle className="text-lg">Progress</CardTitle>
          </div>
          <CardDescription>Goal completion and session trends for this case.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading progress…
            </div>
          ) : !progress ? (
            <p className="text-sm text-slate-500">No progress data yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs uppercase text-slate-500">Overall goals</p>
                  <p className="text-2xl font-semibold text-emerald-800">
                    {progress.overallProgressPercent ?? 0}%
                  </p>
                  <p className="text-xs text-slate-500">
                    {progress.achievedGoals ?? 0} / {progress.totalGoals ?? 0} goals achieved
                  </p>
                </div>
              </div>
              {Array.isArray(progress.domains) && progress.domains.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">By domain</p>
                  <ul className="space-y-2">
                    {progress.domains
                      .filter((d) => d.totalGoals > 0)
                      .map((d) => (
                        <li key={d.domain}>
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span>{d.domain}</span>
                            <span>{d.progressPercent}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, d.progressPercent)}%` }}
                            />
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
              {Array.isArray(progress.trendData) && progress.trendData.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Recent trend (session response)</p>
                  <div className="flex flex-wrap gap-2">
                    {progress.trendData.slice(-8).map((t) => (
                      <span
                        key={t.date}
                        className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700"
                        title={t.date}
                      >
                        {t.date}: {t.value}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Trends appear when sessions include scorable responses.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
