import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { AlertTriangle, ArrowLeft, Info, Loader2 } from 'lucide-react';
import { activityAPI, scheduleAPI } from '../../api';
import { createSession, getSessionApiErrorMessage, updateSession } from '../../services/sessionService';
import { toast } from 'sonner';
import { buildChildResponseString, parseChildResponseToForm, RESPONSE_SCALE_LABELS } from './sessionFormat';
import type { SessionRow } from './SessionList';
import { isActiveGoalStatus, normalizeShortTermGoalsList } from '../../utils/therapyPlanResponse';

export type TherapyPlanLike = {
  domains?: string[];
  longTermGoal?: { title?: string; description?: string; timeline?: string };
  shortTermGoals?: {
    _id?: string;
    goalKey?: string;
    title?: string;
    domain?: string;
    status?: string;
    measurement?: { type?: string; unit?: string };
  }[];
  goals?: { title?: string; type?: string; status?: string }[];
  activities?: { title?: string; linkedGoal?: string }[];
} | null;

type FieldErrors = Partial<Record<string, string>>;

export type SessionCasePickerOption = { caseId: string; label: string };

type Props = {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plan for this case from GET /therapy-plan/:caseId — undefined while loading; null if none. */
  therapyPlan: TherapyPlanLike | undefined;
  /** When set, goals could not be loaded (shown above the goals control). */
  therapyPlanError?: string | null;
  onSaved: () => void | Promise<void>;
  mode: 'create' | 'edit';
  initialSession?: SessionRow | null;
  /** Full-page layout (no modal). */
  variant?: 'dialog' | 'page';
  /** Global log flow: pick active case / child. Omit when logging from a fixed case. */
  casePicker?: { options: SessionCasePickerOption[]; value: string; onChange: (caseId: string) => void } | null;
  /** First therapy domain from plan (read-only display). */
  domainLabel?: string;
};

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

/** Full-page variant: align Select with Input (rounded-xl, border-2) — avoid `border` alone, it overrides border-2 from primitives. */
const PAGE_INPUT_CLASS = 'bg-background shadow-xs hover:shadow-md';
const PAGE_SELECT_TRIGGER_CLASS =
  'h-10 w-full rounded-xl border-2 border-input bg-background px-4 shadow-xs hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

function defaultDateTimeLocal() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function percentToApproxScale(p: number): number {
  const x = Math.max(0, Math.min(100, p));
  if (x <= 20) return 1;
  if (x <= 40) return 2;
  if (x <= 60) return 3;
  if (x <= 80) return 4;
  return 5;
}

/** Plan activities filtered by therapy domain (short-term goals in that domain, or unlinked activities). */
function filterPlanActivityTitlesForDomain(plan: TherapyPlanLike, domain: string): string[] {
  if (!plan?.activities?.length) return [];
  const acts = plan.activities;
  const st = normalizeShortTermGoalsList(plan?.shortTermGoals);
  const inDomain = domain ? st.filter((g) => String(g.domain || '') === domain) : [];
  if (domain && inDomain.length > 0) {
    const titlesInDomain = new Set(inDomain.map((g) => String(g.title || '').trim()).filter(Boolean));
    return acts
      .filter((a) => {
        const lg = String(a.linkedGoal || '').trim();
        if (!lg) return true;
        return [...titlesInDomain].some((t) => lg.includes(t) || t.includes(lg));
      })
      .map((a) => String(a.title || '').trim())
      .filter(Boolean);
  }
  if (domain && inDomain.length === 0) {
    return acts
      .filter((a) => !String(a.linkedGoal || '').trim())
      .map((a) => String(a.title || '').trim())
      .filter(Boolean);
  }
  return acts.map((a) => String(a.title || '').trim()).filter(Boolean);
}

type GoalOptionRow = { key: string; label: string; goalKey?: string; measurementType?: string; goalId?: string };

/** Plan activity titles whose `linkedGoal` matches a selected goal label or goalKey. */
function planActivitiesMatchingSelectedGoals(
  plan: TherapyPlanLike | null | undefined,
  selectedRows: GoalOptionRow[]
): string[] {
  if (!plan?.activities?.length || !selectedRows.length) return [];
  const tokens = new Set<string>();
  for (const g of selectedRows) {
    if (g.label) tokens.add(g.label.trim());
    if (g.goalKey) tokens.add(g.goalKey.trim());
  }
  const out: string[] = [];
  for (const a of plan.activities) {
    const title = String(a.title || '').trim();
    const lg = String(a.linkedGoal || '').trim();
    if (!title || !lg) continue;
    const hit = [...tokens].some((tok) => lg === tok || lg.includes(tok) || tok.includes(lg));
    if (hit) out.push(title);
  }
  return [...new Set(out)];
}

/**
 * When the plan defines `shortTermGoals`, therapists must pick from those rows (with stable `goalId` when present).
 * Legacy plans without short-term rows still fall back to legacy goals / long-term / activity-linked titles.
 */
function buildGoalOptionsFromPlan(therapyPlan: TherapyPlanLike | null | undefined): GoalOptionRow[] {
  if (!therapyPlan) return [];
  const seen = new Set<string>();
  const rows: GoalOptionRow[] = [];
  const push = (key: string, label: string, goalKey?: string, measurementType?: string, goalId?: string) => {
    const t = String(label || '').trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    rows.push({ key, label: t, goalKey, measurementType, goalId });
  };

  const st = normalizeShortTermGoalsList(therapyPlan.shortTermGoals);
  if (st.length > 0) {
    let stUse = st.filter((g) => g && String(g.title || '').trim() && isActiveGoalStatus(g.status));
    if (stUse.length === 0) stUse = st.filter((g) => g && String(g.title || '').trim());
    stUse.forEach((g, idx) => {
      const mongoId = g._id != null ? String(g._id).trim() : '';
      const k = mongoId || `st-${idx}`;
      const gk = g.goalKey ? String(g.goalKey).trim() : undefined;
      const mt = g.measurement?.type ? String(g.measurement.type) : undefined;
      push(k, String(g.title).trim(), gk, mt, mongoId || undefined);
    });
    return rows;
  }

  const legacyRaw = Array.isArray(therapyPlan.goals) ? therapyPlan.goals : [];
  let leg = legacyRaw.filter(
    (g) => g && String(g.title || '').trim() && g.type !== 'long-term' && isActiveGoalStatus(g.status)
  );
  if (leg.length === 0) {
    leg = legacyRaw.filter((g) => g && String(g.title || '').trim() && g.type !== 'long-term');
  }
  leg.forEach((g, idx) => push(`lg-${idx}`, String(g.title).trim(), undefined, undefined, undefined));

  const lt = therapyPlan.longTermGoal?.title;
  if (typeof lt === 'string' && lt.trim()) push('lt-goal', lt.trim(), undefined, undefined, undefined);

  (therapyPlan.activities || []).forEach((a, i) => {
    const link = String(a?.linkedGoal || '').trim();
    if (link) push(`lnk-${i}`, link, undefined, undefined, undefined);
  });

  return rows;
}

export function SessionForm({
  caseId,
  open,
  onOpenChange,
  therapyPlan,
  therapyPlanError = null,
  onSaved,
  mode,
  initialSession,
  variant = 'dialog',
  casePicker = null,
  domainLabel = '',
}: Props) {
  const isPage = variant === 'page';
  const submitLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [libraryNames, setLibraryNames] = useState<string[]>([]);
  const [sessionDate, setSessionDate] = useState(defaultDateTimeLocal);
  const [duration, setDuration] = useState('45');
  const [selectedGoals, setSelectedGoals] = useState<Record<string, boolean>>({});
  const [selectedActivities, setSelectedActivities] = useState<Record<string, boolean>>({});
  const [manualActivitiesOnly, setManualActivitiesOnly] = useState('');
  const [scaleVal, setScaleVal] = useState(3);
  const [notes, setNotes] = useState('');
  const [parentInstructions, setParentInstructions] = useState('');
  const [status, setStatus] = useState('completed');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [domainUi, setDomainUi] = useState('');
  /** Optional link to Therapy Schedule slot (create mode). */
  const [scheduleSlotOptions, setScheduleSlotOptions] = useState<{ id: string; label: string; duration: number; time: string; date: string }[]>([]);
  const [loadingScheduleSlots, setLoadingScheduleSlots] = useState(false);
  const [sessionSlotId, setSessionSlotId] = useState('');

  const planDomains = useMemo(() => {
    const d = therapyPlan?.domains;
    if (!Array.isArray(d)) return [];
    return d.map((x) => String(x).trim()).filter(Boolean);
  }, [therapyPlan]);

  const goalOptions = useMemo(() => buildGoalOptionsFromPlan(therapyPlan), [therapyPlan]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (therapyPlan == null || therapyPlan === undefined) return;
    // eslint-disable-next-line no-console -- session goals bind debug
    console.log('[SessionForm] Case ID:', caseId);
    // eslint-disable-next-line no-console -- session goals bind debug
    console.info('[SessionForm] Goals bind', {
      shortTermGoalsIn: normalizeShortTermGoalsList(therapyPlan.shortTermGoals).length,
      goalOptionsCount: goalOptions.length,
    });
  }, [caseId, therapyPlan, goalOptions.length]);

  const effectiveDomain = useMemo(() => {
    if (domainUi.trim()) return domainUi.trim();
    if (planDomains.length === 1) return planDomains[0];
    if (domainLabel.trim()) return domainLabel.trim();
    return '';
  }, [domainUi, planDomains, domainLabel]);

  const filteredPlanActivityTitles = useMemo(
    () => filterPlanActivityTitlesForDomain(therapyPlan, effectiveDomain),
    [therapyPlan, effectiveDomain]
  );

  const selectedGoalRows = useMemo(
    () => goalOptions.filter((g) => selectedGoals[g.key]),
    [goalOptions, selectedGoals]
  );

  const prioritizedActivityOptions = useMemo(() => {
    const goalLinked = planActivitiesMatchingSelectedGoals(therapyPlan, selectedGoalRows);
    const domainPlan = filteredPlanActivityTitles.filter((t) => !goalLinked.includes(t));
    const lib = libraryNames.filter((n) => !goalLinked.includes(n) && !domainPlan.includes(n));
    return [...new Set([...goalLinked, ...domainPlan, ...lib])];
  }, [therapyPlan, selectedGoalRows, filteredPlanActivityTitles, libraryNames]);

  const planActivityTitleSet = useMemo(
    () =>
      new Set(
        (therapyPlan?.activities || []).map((a) => String(a.title || '').trim()).filter(Boolean)
      ),
    [therapyPlan]
  );

  const allowManualActivityList = prioritizedActivityOptions.length === 0;

  const loadLibrary = useCallback(async () => {
    try {
      const params = effectiveDomain ? { domain: effectiveDomain } : {};
      const axiosRes = await activityAPI.listTemplates(params);
      const body = axiosRes.data as { data?: { name?: string }[] } | undefined;
      const list = Array.isArray(body?.data) ? body.data : [];
      setLibraryNames(list.map((x) => String(x.name || '').trim()).filter(Boolean));
    } catch {
      setLibraryNames([]);
    }
  }, [effectiveDomain]);

  useEffect(() => {
    if (open || isPage) void loadLibrary();
  }, [open, isPage, loadLibrary]);

  useEffect(() => {
    setSelectedActivities((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (!prioritizedActivityOptions.includes(k)) delete next[k];
      }
      return next;
    });
  }, [prioritizedActivityOptions]);

  useEffect(() => {
    if (planDomains.length) setDomainUi(planDomains[0]);
    else setDomainUi(domainLabel || '');
  }, [planDomains, domainLabel, therapyPlan]);

  const resetForCreate = useCallback(() => {
    setSessionDate(defaultDateTimeLocal());
    setDuration('45');
    setSelectedGoals({});
    setSelectedActivities({});
    setManualActivitiesOnly('');
    setScaleVal(3);
    setNotes('');
    setParentInstructions('');
    setStatus('completed');
    setSessionSlotId('');
    setErrors({});
    submitLock.current = false;
  }, []);

  useEffect(() => {
    if (mode !== 'create' || (!open && !isPage)) return;
    const cid = String(caseId || '').trim();
    if (!cid) {
      setScheduleSlotOptions([]);
      setSessionSlotId('');
      return;
    }
    let cancelled = false;
    setLoadingScheduleSlots(true);
    void (async () => {
      try {
        const res = await scheduleAPI.getTherapistScheduleBundle(cid);
        const raw = (res.data as { data?: { slots?: { _id?: string; date?: string; time?: string; duration?: number; status?: string }[] } })?.data?.slots;
        const list = Array.isArray(raw) ? raw : [];
        const opts = list
          .filter((s) => String(s.status || '').toLowerCase() === 'scheduled')
          .map((s) => {
            const id = String(s._id || '');
            const d = s.date ? new Date(s.date) : new Date();
            const ds = Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            const t = String(s.time || '');
            return {
              id,
              label: `${ds} · ${t}`,
              duration: Number(s.duration) || 45,
              time: t,
              date: s.date ? String(s.date) : '',
            };
          })
          .filter((o) => o.id);
        if (!cancelled) setScheduleSlotOptions(opts);
      } catch {
        if (!cancelled) setScheduleSlotOptions([]);
      } finally {
        if (!cancelled) setLoadingScheduleSlots(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, mode, open, isPage]);

  useEffect(() => {
    if (!open && !isPage) return;
    if (mode === 'create') {
      resetForCreate();
    }
  }, [open, isPage, mode, resetForCreate]);

  useEffect(() => {
    if ((!open && !isPage) || mode !== 'edit' || !initialSession?._id) return;
    const s = initialSession;
    const sd = s.sessionDate ? new Date(s.sessionDate) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${sd.getFullYear()}-${pad(sd.getMonth() + 1)}-${pad(sd.getDate())}T${pad(sd.getHours())}:${pad(sd.getMinutes())}`;
    setSessionDate(local);
    setDuration(String(s.duration ?? 45));
    const parsed = parseChildResponseToForm(s.childResponse);
    if (parsed.mode === 'percent') {
      setScaleVal(percentToApproxScale(parsed.percent));
    } else {
      setScaleVal(parsed.scale);
    }
    setNotes(String(s.notes ?? ''));
    setParentInstructions(String((s as { parentInstructions?: string }).parentInstructions ?? ''));
    setStatus((s.status || 'completed').toLowerCase());
    setErrors({});
    submitLock.current = false;
  }, [open, isPage, mode, initialSession]);

  useEffect(() => {
    if ((!open && !isPage) || mode !== 'edit' || !initialSession?._id) return;
    const targets = new Set((initialSession.goalsTargeted || []).map((x) => String(x).trim()));
    const gMap: Record<string, boolean> = {};
    for (const g of goalOptions) {
      const tokens = [g.label, g.goalKey].filter(Boolean).map((x) => String(x).trim());
      gMap[g.key] = tokens.some((t) => targets.has(t));
    }
    setSelectedGoals(gMap);
  }, [open, isPage, mode, initialSession, goalOptions]);

  useEffect(() => {
    if ((!open && !isPage) || mode !== 'edit' || !initialSession?._id) return;
    const used = initialSession.activitiesUsed || [];
    if (prioritizedActivityOptions.length === 0) {
      setSelectedActivities({});
      setManualActivitiesOnly(used.join(', '));
      return;
    }
    const known = new Set(prioritizedActivityOptions);
    const aMap: Record<string, boolean> = {};
    const unknown: string[] = [];
    for (const a of used) {
      if (known.has(a)) aMap[a] = true;
      else unknown.push(a);
    }
    setSelectedActivities(aMap);
    setManualActivitiesOnly(unknown.join(', '));
  }, [open, isPage, mode, initialSession, prioritizedActivityOptions]);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!String(caseId || '').trim()) next.caseId = 'Case is required';
    if (!sessionDate) next.sessionDate = 'Date is required';
    const dur = Number(duration);
    if (Number.isNaN(dur) || dur <= 0) next.duration = 'Duration must be a positive number (minutes)';

    const goalKeys = goalOptions.filter((g) => selectedGoals[g.key]).map((g) => g.label);
    if (goalKeys.length === 0) next.goalsTargeted = 'Select at least one goal from the therapy plan';

    let activities: string[] = [];
    if (allowManualActivityList) {
      activities = manualActivitiesOnly
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      if (activities.length === 0) next.activitiesUsed = 'Enter at least one activity (or add items to your library / plan)';
    } else {
      activities = prioritizedActivityOptions.filter((a) => selectedActivities[a]);
      if (activities.length === 0) next.activitiesUsed = 'Select at least one activity';
    }

    const cr = buildChildResponseString('scale', scaleVal, 0);
    if (!cr || scaleVal < 1 || scaleVal > 5) next.childResponse = 'Select a child response rating';

    if (!status) next.status = 'Status is required';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (submitLock.current) return;
    setErrors({});
    if (!validate()) {
      toast.error('Please complete all required fields: child/case, goals, activities, and response.');
      if (isPage && typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const caseIdTrim = String(caseId || '').trim();

    submitLock.current = true;
    setSaving(true);
    try {
      if (!parentInstructions.trim()) {
        toast.warning('Parent instructions are empty — families rely on this for home follow-up. Consider adding guidance before saving.');
      }

      const goalsTargeted = goalOptions
        .filter((g) => selectedGoals[g.key])
        .map((g) => (g.goalKey ? String(g.goalKey).trim() : g.label));
      let activitiesUsed: string[] = [];
      if (allowManualActivityList) {
        activitiesUsed = manualActivitiesOnly
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
      } else {
        activitiesUsed = prioritizedActivityOptions.filter((a) => selectedActivities[a]);
      }

      const childResponse = buildChildResponseString('scale', scaleVal, 0);
      const goalData = goalOptions
        .filter((g) => selectedGoals[g.key])
        .map((g) => ({
          ...(g.goalId ? { goalId: g.goalId } : {}),
          ...(g.goalKey ? { goalKey: g.goalKey } : {}),
          goalTitleMatch: g.label,
          measurementType: 'rating_1_5' as const,
          rating: scaleVal,
          source: 'therapist' as const,
        }));
      const payload = {
        sessionDate: new Date(sessionDate).toISOString(),
        duration: Number(duration),
        goalsTargeted,
        activitiesUsed,
        childResponse,
        goalData,
        notes: notes.trim(),
        parentInstructions: parentInstructions.trim(),
        status,
        ...(sessionSlotId.trim() ? { sessionSlotId: sessionSlotId.trim() } : {}),
      };

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[SessionForm] POST /api/sessions', { caseId: caseIdTrim, ...payload });
      }

      if (mode === 'create') {
        await createSession({ ...payload, caseId: caseIdTrim });
        toast.success('Session saved successfully');
      } else if (initialSession?._id) {
        await updateSession(initialSession._id, payload);
        toast.success('Session updated');
      }
      await onSaved();
      if (!isPage) onOpenChange(false);
    } catch (e: unknown) {
      const msg = getSessionApiErrorMessage(e);
      setErrors({ _api: msg });
      toast.error(msg);
    } finally {
      setSaving(false);
      submitLock.current = false;
    }
  };

  /** Cancel: reset draft fields on create, then close (page → navigate back via parent). */
  const handleCancel = useCallback(() => {
    if (mode === 'create') {
      resetForCreate();
    }
    onOpenChange(false);
  }, [mode, resetForCreate, onOpenChange]);

  const goalsSelectedCount = goalOptions.filter((g) => selectedGoals[g.key]).length;

  const hasCaseContext = String(caseId || '').trim().length > 0;

  const planTabHref = `/therapist/case/${String(caseId || '').trim()}?tab=plans`;

  const renderGoalsTargeted = () => {
    if (casePicker && !hasCaseContext) {
      return (
        <Alert className="border-blue-200/80 bg-blue-50/80 text-foreground dark:border-blue-900/50 dark:bg-blue-950/40">
          <Info className="text-blue-600 dark:text-blue-400" />
          <AlertTitle>Select a child</AlertTitle>
          <AlertDescription className="text-foreground/90">
            Choose a case above to load goals from the therapy plan.
          </AlertDescription>
        </Alert>
      );
    }
    if (hasCaseContext && therapyPlan === undefined) {
      return (
        <Alert>
          <Loader2 className="animate-spin text-primary" />
          <AlertTitle>Loading therapy plan</AlertTitle>
          <AlertDescription>Fetching goals for this case…</AlertDescription>
        </Alert>
      );
    }
    if (therapyPlanError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Could not load goals</AlertTitle>
          <AlertDescription>{therapyPlanError}</AlertDescription>
        </Alert>
      );
    }
    if (hasCaseContext && therapyPlan == null) {
      return (
        <Alert className="border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-50">
          <AlertTriangle className="text-amber-600 dark:text-amber-400" />
          <AlertTitle>No therapy plan yet</AlertTitle>
          <AlertDescription className="space-y-3 text-amber-950/90 dark:text-amber-100/90">
            <p>Add a plan for this case before you can tie session notes to goals.</p>
            {String(caseId || '').trim() ? (
              <Button asChild size="sm" variant="secondary" className="border border-amber-300/80 bg-background shadow-sm hover:bg-muted dark:border-amber-800">
                <Link to={planTabHref}>Open therapy plan</Link>
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      );
    }
    if (goalOptions.length === 0) {
      const stCount = normalizeShortTermGoalsList(therapyPlan?.shortTermGoals).length;
      return (
        <Alert className="border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-50">
          <AlertTriangle className="text-amber-600 dark:text-amber-400" />
          <AlertTitle>No goals to select yet</AlertTitle>
          <AlertDescription className="space-y-3 text-amber-950/90 dark:text-amber-100/90">
            <p>
              {stCount > 0
                ? 'Short-term goals exist on the plan but need titles before you can log a session against them.'
                : 'Add short-term goals in the therapy plan, or link activities to a goal title.'}
            </p>
            {String(caseId || '').trim() ? (
              <Button asChild size="sm" variant="secondary" className="border border-amber-300/80 bg-background shadow-sm hover:bg-muted dark:border-amber-800">
                <Link to={planTabHref}>Edit therapy plan</Link>
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {goalsSelectedCount > 0
            ? `${goalsSelectedCount} goal(s) selected`
            : 'Select one or more goals addressed in this session'}
        </p>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border-2 border-border/80 bg-muted/20 p-3 shadow-inner">
          {goalOptions.map((g, idx) => (
            <label
              key={`${g.key}-${idx}`}
              className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-background"
            >
              <Checkbox
                checked={!!selectedGoals[g.key]}
                onCheckedChange={(c) => setSelectedGoals((prev) => ({ ...prev, [g.key]: c === true }))}
                className="mt-0.5"
              />
              <span className="leading-snug text-foreground">{g.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const domainFieldPage =
    planDomains.length > 1 ? (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Therapy domain</Label>
        <Select value={domainUi || planDomains[0]} onValueChange={setDomainUi}>
          <SelectTrigger className={PAGE_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="Select domain" />
          </SelectTrigger>
          <SelectContent>
            {planDomains.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Domain follows the therapy plan; goals and activities below filter to this area.
        </p>
      </div>
    ) : planDomains.length === 1 || domainLabel ? (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Therapy domain</Label>
        <Input readOnly className={cn(PAGE_INPUT_CLASS, 'text-foreground')} value={planDomains[0] || domainLabel} />
      </div>
    ) : null;

  const dialogFields = (
        <div className="space-y-5 py-2">
          {errors._api ? (
            <div className="rounded-md border bg-muted px-3 py-2 text-sm text-destructive">{errors._api}</div>
          ) : null}

          {casePicker ? (
            <div className="space-y-1.5">
              <Label className="text-foreground">Child</Label>
              <Select value={casePicker.value || undefined} onValueChange={casePicker.onChange}>
                <SelectTrigger className="border bg-card">
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {casePicker.options.map((o) => (
                    <SelectItem key={o.caseId} value={o.caseId}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.caseId ? <p className="text-xs text-destructive">{errors.caseId}</p> : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-foreground">Date</Label>
              <Input
                type="datetime-local"
                className="border"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
              {errors.sessionDate ? <p className="text-xs text-destructive">{errors.sessionDate}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground">Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                step={1}
                className="border"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              {errors.duration ? <p className="text-xs text-destructive">{errors.duration}</p> : null}
            </div>
          </div>

          {mode === 'create' && hasCaseContext && scheduleSlotOptions.length > 0 ? (
            <div className="space-y-1.5 rounded-lg border-blue-100 bg-blue-50/40 p-3">
              <Label className="text-foreground">Select Scheduled Session (optional)</Label>
              <Select
                value={sessionSlotId || '__none__'}
                onValueChange={(v) => {
                  if (v === '__none__') {
                    setSessionSlotId('');
                    return;
                  }
                  setSessionSlotId(v);
                  const picked = scheduleSlotOptions.find((o) => o.id === v);
                  if (picked?.date && picked.time) {
                    const d = new Date(picked.date);
                    const [hh, mm] = picked.time.split(':').map((x) => parseInt(x, 10));
                    if (!Number.isNaN(d.getTime()) && !Number.isNaN(hh)) {
                      d.setHours(hh || 0, Number.isNaN(mm) ? 0 : mm, 0, 0);
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setSessionDate(
                        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                      );
                      setDuration(String(picked.duration || duration));
                    }
                  }
                }}
              >
                <SelectTrigger className="border bg-card">
                  <SelectValue placeholder={loadingScheduleSlots ? 'Loading slots…' : 'No match — choose date/time above'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None — log without a scheduled slot</SelectItem>
                  {scheduleSlotOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choosing a slot fills date/time and marks that slot completed when you save (therapy schedule).
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-foreground">Goals targeted</Label>
            {renderGoalsTargeted()}
            {errors.goalsTargeted ? <p className="text-xs text-destructive">{errors.goalsTargeted}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Activities used</Label>
            {effectiveDomain ? (
              <p className="text-xs text-muted-foreground">
                Showing library + plan activities for domain: <span className="font-medium text-foreground">{effectiveDomain}</span>
              </p>
            ) : null}
            {allowManualActivityList ? (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  placeholder="Enter activity names separated by commas (required when no activities match this domain)"
                  className="border"
                  value={manualActivitiesOnly}
                  onChange={(e) => setManualActivitiesOnly(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Add templates to the activity library for this domain, or embed activities on the therapy plan.</p>
              </div>
            ) : prioritizedActivityOptions.length === 0 ? (
              <p className="rounded-md border bg-background px-3 py-3 text-sm text-muted-foreground">
                No activities available for this therapy domain.
              </p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border bg-background/50 p-3">
                {prioritizedActivityOptions.map((a) => (
                  <label key={a} className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-2 text-sm hover:bg-card">
                    <Checkbox
                      checked={!!selectedActivities[a]}
                      onCheckedChange={(c) => setSelectedActivities((prev) => ({ ...prev, [a]: c === true }))}
                    />
                    <span className="flex flex-1 flex-col gap-1">
                      <span className="leading-snug text-foreground">{a}</span>
                      {!planActivityTitleSet.has(a) ? (
                        <Badge variant="secondary" className="w-fit text-xs font-normal">
                          Custom Activity (Not in Plan)
                        </Badge>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {errors.activitiesUsed ? <p className="text-xs text-destructive">{errors.activitiesUsed}</p> : null}
          </div>

          <div className="space-y-3 rounded-lg border bg-background/40 p-4">
            <Label className="text-base text-foreground">Child Response Assessment</Label>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-foreground">Overall response</Label>
              <Select value={String(scaleVal)} onValueChange={(v) => setScaleVal(Number(v))}>
                <SelectTrigger className="border bg-card">
                  <SelectValue placeholder="Select response" />
                </SelectTrigger>
                <SelectContent>
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {RESPONSE_SCALE_LABELS[n]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.childResponse ? <p className="text-xs text-destructive">{errors.childResponse}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="border bg-card">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status ? <p className="text-xs text-destructive">{errors.status}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Clinical notes</Label>
            <Textarea rows={3} className="border" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Parent instructions</Label>
            <p className="text-xs text-muted-foreground">Visible to parents when saved (therapy session instructions).</p>
            <Textarea
              rows={3}
              className="border"
              placeholder="Home carryover, reminders, or strategies for caregivers"
              value={parentInstructions}
              onChange={(e) => setParentInstructions(e.target.value)}
            />
          </div>
        </div>
  );

  if (isPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 via-background to-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-8 pb-36 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 mb-5 gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => handleCancel()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sessions
            </Button>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Log therapy session</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Document session details, progress, and observations in one place.
            </p>
          </div>

          {errors._api ? (
            <Alert variant="destructive" className="mb-8">
              <AlertTriangle />
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>{errors._api}</AlertDescription>
            </Alert>
          ) : null}

          <Card className="overflow-hidden rounded-2xl border-border/80 bg-card shadow-md">
            <CardHeader className="border-b border-border/80 bg-muted/30 pb-5">
              <CardTitle className="text-xl font-semibold tracking-tight">Session information</CardTitle>
              <CardDescription className="text-base">Child, domain, date, and duration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              {casePicker ? (
                <div className="space-y-2">
                  <Label htmlFor="session-child" className="text-sm font-medium text-foreground">
                    Child
                  </Label>
                  <Select value={casePicker.value || undefined} onValueChange={casePicker.onChange}>
                    <SelectTrigger id="session-child" className={PAGE_SELECT_TRIGGER_CLASS}>
                      <SelectValue placeholder="Select child" />
                    </SelectTrigger>
                    <SelectContent>
                      {casePicker.options.map((o) => (
                        <SelectItem key={o.caseId} value={o.caseId}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.caseId ? <p className="text-sm text-destructive">{errors.caseId}</p> : null}
                </div>
              ) : null}
              {domainFieldPage}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session-datetime" className="text-sm font-medium text-foreground">
                    Session date &amp; time
                  </Label>
                  <Input
                    id="session-datetime"
                    type="datetime-local"
                    className={PAGE_INPUT_CLASS}
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                  />
                  {errors.sessionDate ? <p className="text-sm text-destructive">{errors.sessionDate}</p> : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-duration" className="text-sm font-medium text-foreground">
                    Duration (minutes)
                  </Label>
                  <Input
                    id="session-duration"
                    type="number"
                    min={1}
                    step={1}
                    className={PAGE_INPUT_CLASS}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                  {errors.duration ? <p className="text-sm text-destructive">{errors.duration}</p> : null}
                </div>
              </div>

              {mode === 'create' && hasCaseContext && scheduleSlotOptions.length > 0 ? (
                <div className="space-y-3 rounded-xl border-2 border-primary/15 bg-primary/5 p-4 dark:border-primary/25 dark:bg-primary/10">
                  <Label className="text-sm font-medium text-foreground">Match a scheduled slot (optional)</Label>
                  <Select
                    value={sessionSlotId || '__none__'}
                    onValueChange={(v) => {
                      if (v === '__none__') {
                        setSessionSlotId('');
                        return;
                      }
                      setSessionSlotId(v);
                      const picked = scheduleSlotOptions.find((o) => o.id === v);
                      if (picked?.date && picked.time) {
                        const d = new Date(picked.date);
                        const [hh, mm] = picked.time.split(':').map((x) => parseInt(x, 10));
                        if (!Number.isNaN(d.getTime()) && !Number.isNaN(hh)) {
                          d.setHours(hh || 0, Number.isNaN(mm) ? 0 : mm, 0, 0);
                          const pad = (n: number) => String(n).padStart(2, '0');
                          setSessionDate(
                            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
                          );
                          setDuration(String(picked.duration || duration));
                        }
                      }
                    }}
                  >
                    <SelectTrigger className={PAGE_SELECT_TRIGGER_CLASS}>
                      <SelectValue placeholder={loadingScheduleSlots ? 'Loading slots…' : 'Choose a slot or enter time manually'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None — log without a scheduled slot</SelectItem>
                      {scheduleSlotOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Selecting a slot fills date and time; saving can complete that appointment in the therapy schedule.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="mt-8 overflow-hidden rounded-2xl border-border/80 bg-card shadow-md">
            <CardHeader className="border-b border-border/80 bg-muted/30 pb-5">
              <CardTitle className="text-xl font-semibold tracking-tight">Goals and activities</CardTitle>
              <CardDescription className="text-base">From the therapy plan and activity library</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Goals targeted</Label>
                {renderGoalsTargeted()}
                {errors.goalsTargeted ? <p className="text-sm text-destructive">{errors.goalsTargeted}</p> : null}
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Activities used</Label>
                {effectiveDomain ? (
                  <p className="text-sm text-muted-foreground">
                    Library and plan activities for{' '}
                    <span className="font-medium text-foreground">{effectiveDomain}</span>
                  </p>
                ) : null}
                {allowManualActivityList ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      placeholder="Enter activity names separated by commas (required when no activities match this domain)"
                      className={cn(PAGE_INPUT_CLASS, 'min-h-[5.5rem]')}
                      value={manualActivitiesOnly}
                      onChange={(e) => setManualActivitiesOnly(e.target.value)}
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Add templates to the activity library for this domain, or embed activities on the therapy plan.
                    </p>
                  </div>
                ) : prioritizedActivityOptions.length === 0 ? (
                  <Alert>
                    <Info className="text-muted-foreground" />
                    <AlertTitle>No activities for this domain</AlertTitle>
                    <AlertDescription>
                      Add activities to your library or therapy plan, or enter them manually when the list is empty.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border-2 border-border/80 bg-muted/20 p-3 shadow-inner">
                    {prioritizedActivityOptions.map((a) => (
                      <label
                        key={a}
                        className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-background"
                      >
                        <Checkbox
                          checked={!!selectedActivities[a]}
                          onCheckedChange={(c) => setSelectedActivities((prev) => ({ ...prev, [a]: c === true }))}
                          className="mt-0.5"
                        />
                        <span className="flex flex-1 flex-col gap-1">
                          <span className="leading-snug text-foreground">{a}</span>
                          {!planActivityTitleSet.has(a) ? (
                            <Badge variant="secondary" className="w-fit text-xs font-normal">
                              Custom Activity (Not in Plan)
                            </Badge>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.activitiesUsed ? <p className="text-sm text-destructive">{errors.activitiesUsed}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8 overflow-hidden rounded-2xl border-border/80 bg-card shadow-md">
            <CardHeader className="border-b border-border/80 bg-muted/30 pb-5">
              <CardTitle className="text-xl font-semibold tracking-tight">Child response</CardTitle>
              <CardDescription className="text-base">Overall response (1–5 scale for analytics)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-8">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Overall response</Label>
                <Select value={String(scaleVal)} onValueChange={(v) => setScaleVal(Number(v))}>
                  <SelectTrigger className={PAGE_SELECT_TRIGGER_CLASS}>
                    <SelectValue placeholder="Select response" />
                  </SelectTrigger>
                  <SelectContent>
                    {([1, 2, 3, 4, 5] as const).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {RESPONSE_SCALE_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.childResponse ? <p className="text-sm text-destructive">{errors.childResponse}</p> : null}
            </CardContent>
          </Card>

          <Card className="mt-8 overflow-hidden rounded-2xl border-border/80 bg-card shadow-md">
            <CardHeader className="border-b border-border/80 bg-muted/30 pb-5">
              <CardTitle className="text-xl font-semibold tracking-tight">Session notes</CardTitle>
              <CardDescription className="text-base">Clinical observations and parent-facing guidance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Clinical observations</Label>
                <Textarea
                  rows={4}
                  className={cn(PAGE_INPUT_CLASS, 'min-h-[7rem] resize-y')}
                  placeholder="Performance, engagement, challenges, and progress…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Parent instructions</Label>
                <p className="text-sm text-muted-foreground">Visible to caregivers in the parent app when saved.</p>
                <Textarea
                  rows={4}
                  className={cn(PAGE_INPUT_CLASS, 'min-h-[7rem] resize-y')}
                  placeholder="Home practice, reminders, or strategies for families…"
                  value={parentInstructions}
                  onChange={(e) => setParentInstructions(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8 overflow-hidden rounded-2xl border-border/80 bg-card shadow-md">
            <CardHeader className="border-b border-border/80 bg-muted/30 pb-5">
              <CardTitle className="text-xl font-semibold tracking-tight">Session status</CardTitle>
              <CardDescription className="text-base">Completed, missed, or rescheduled</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <RadioGroup value={status} onValueChange={setStatus} className="flex flex-col gap-3">
                {STATUS_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    htmlFor={`page-st-${o.value}`}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-muted/40 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
                  >
                    <RadioGroupItem value={o.value} id={`page-st-${o.value}`} />
                    <span className="text-sm font-medium text-foreground">{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
              {errors.status ? <p className="mt-3 text-sm text-destructive">{errors.status}</p> : null}
            </CardContent>
          </Card>

          <div className="mt-10 flex flex-wrap items-center justify-end gap-3 border-t border-border/80 bg-background/95 py-6">
            <Button type="button" variant="outline" className="min-w-[112px]" onClick={() => handleCancel()} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" className="min-w-[140px]" onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] overflow-y-auto border bg-card sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border pb-3">
          <DialogTitle className="text-lg text-blue-950">{mode === 'create' ? 'Log therapy session' : 'Edit session'}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Goals and activities are validated against your therapy plan and library. Parent instructions appear on the parent view when provided.
          </DialogDescription>
        </DialogHeader>
        {dialogFields}
        <DialogFooter className="flex flex-row flex-wrap items-center justify-end gap-3 border-t border pt-4">
          <Button
            type="button"
            variant="outline"
            className="border text-foreground hover:bg-background"
            onClick={() => handleCancel()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border text-foreground hover:bg-background"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-foreground" /> : null}
            {mode === 'create' ? 'Save session' : 'Update session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
