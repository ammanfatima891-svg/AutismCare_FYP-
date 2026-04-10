import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { activityAPI, scheduleAPI } from '../../api';
import { createSession, getSessionApiErrorMessage, updateSession } from '../../services/sessionService';
import { toast } from 'sonner';
import { buildChildResponseString, parseChildResponseToForm, RESPONSE_SCALE_LABELS } from './sessionFormat';
import type { SessionRow } from './SessionList';
import { isActiveGoalStatus, normalizeShortTermGoalsList } from '../../utils/therapyPlanResponse';

export type TherapyPlanLike = {
  domains?: string[];
  longTermGoal?: { title?: string; description?: string; timeline?: string };
  shortTermGoals?: { _id?: string; title?: string; domain?: string; status?: string }[];
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

/**
 * Build selectable goals from everything the plan may store. Plans often have activities
 * (and domain) while shortTermGoals is still empty in DB — activities alone still showed
 * under "Activities used", but "Goals targeted" stayed empty. We also include long-term
 * title and unique activity linkedGoal strings.
 */
function buildGoalOptionsFromPlan(therapyPlan: TherapyPlanLike | null | undefined): { key: string; label: string }[] {
  if (!therapyPlan) return [];
  const seen = new Set<string>();
  const rows: { key: string; label: string }[] = [];
  const push = (key: string, label: string) => {
    const t = String(label || '').trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    rows.push({ key, label: t });
  };

  const st = normalizeShortTermGoalsList(therapyPlan.shortTermGoals);
  let stUse = st.filter((g) => g && String(g.title || '').trim() && isActiveGoalStatus(g.status));
  if (stUse.length === 0) stUse = st.filter((g) => g && String(g.title || '').trim());
  stUse.forEach((g, idx) => {
    const k = g._id != null ? String(g._id) : `st-${idx}`;
    push(k, String(g.title).trim());
  });

  const legacyRaw = Array.isArray(therapyPlan.goals) ? therapyPlan.goals : [];
  let leg = legacyRaw.filter(
    (g) => g && String(g.title || '').trim() && g.type !== 'long-term' && isActiveGoalStatus(g.status)
  );
  if (leg.length === 0) {
    leg = legacyRaw.filter((g) => g && String(g.title || '').trim() && g.type !== 'long-term');
  }
  leg.forEach((g, idx) => push(`lg-${idx}`, String(g.title).trim()));

  const lt = therapyPlan.longTermGoal?.title;
  if (typeof lt === 'string' && lt.trim()) push('lt-goal', lt.trim());

  (therapyPlan.activities || []).forEach((a, i) => {
    const link = String(a?.linkedGoal || '').trim();
    if (link) push(`lnk-${i}`, link);
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

  const activityOptions = useMemo(() => {
    const merged = [...new Set([...libraryNames, ...filteredPlanActivityTitles])];
    return merged.sort((a, b) => a.localeCompare(b));
  }, [libraryNames, filteredPlanActivityTitles]);

  const allowManualActivityList = activityOptions.length === 0;

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
        if (!activityOptions.includes(k)) delete next[k];
      }
      return next;
    });
  }, [activityOptions]);

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
      gMap[g.key] = targets.has(g.label);
    }
    setSelectedGoals(gMap);
  }, [open, isPage, mode, initialSession, goalOptions]);

  useEffect(() => {
    if ((!open && !isPage) || mode !== 'edit' || !initialSession?._id) return;
    const used = initialSession.activitiesUsed || [];
    if (activityOptions.length === 0) {
      setSelectedActivities({});
      setManualActivitiesOnly(used.join(', '));
      return;
    }
    const known = new Set(activityOptions);
    const aMap: Record<string, boolean> = {};
    const unknown: string[] = [];
    for (const a of used) {
      if (known.has(a)) aMap[a] = true;
      else unknown.push(a);
    }
    setSelectedActivities(aMap);
    setManualActivitiesOnly(unknown.join(', '));
  }, [open, isPage, mode, initialSession, activityOptions]);

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
      activities = activityOptions.filter((a) => selectedActivities[a]);
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

      const goalsTargeted = goalOptions.filter((g) => selectedGoals[g.key]).map((g) => g.label);
      let activitiesUsed: string[] = [];
      if (allowManualActivityList) {
        activitiesUsed = manualActivitiesOnly
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
      } else {
        activitiesUsed = activityOptions.filter((a) => selectedActivities[a]);
      }

      const childResponse = buildChildResponseString('scale', scaleVal, 0);
      const payload = {
        sessionDate: new Date(sessionDate).toISOString(),
        duration: Number(duration),
        goalsTargeted,
        activitiesUsed,
        childResponse,
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

  const renderGoalsTargeted = () => {
    if (casePicker && !hasCaseContext) {
      return (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Select a child to load goals from the therapy plan.
        </p>
      );
    }
    if (hasCaseContext && therapyPlan === undefined) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-600" />
          Loading goals from therapy plan…
        </div>
      );
    }
    if (therapyPlanError) {
      return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{therapyPlanError}</p>;
    }
    if (hasCaseContext && therapyPlan == null) {
      return (
        <p className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
          No therapy plan found. Please create a plan first.
        </p>
      );
    }
    if (goalOptions.length === 0) {
      return (
        <p className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
          No goals available in this plan. Add short-term goals in the therapy plan, or link activities to a goal title.
        </p>
      );
    }
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500">
          {goalsSelectedCount > 0
            ? `${goalsSelectedCount} goal(s) selected`
            : 'Select one or more goals addressed in this session'}
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          {goalOptions.map((g, idx) => (
            <label
              key={`${g.key}-${idx}`}
              className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-2 text-sm hover:bg-white"
            >
              <Checkbox
                checked={!!selectedGoals[g.key]}
                onCheckedChange={(c) => setSelectedGoals((prev) => ({ ...prev, [g.key]: c === true }))}
              />
              <span className="leading-snug text-slate-800">{g.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const domainFieldPage =
    planDomains.length > 1 ? (
      <div className="space-y-1.5">
        <Label className="text-slate-800">Therapy Domain</Label>
        <Select value={domainUi || planDomains[0]} onValueChange={setDomainUi}>
          <SelectTrigger className="border-slate-200 bg-slate-50/80">
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
        <p className="text-xs text-slate-500">Domain reflects the therapy plan; goals below are tied to this case.</p>
      </div>
    ) : planDomains.length === 1 || domainLabel ? (
      <div className="space-y-1.5">
        <Label className="text-slate-800">Therapy Domain</Label>
        <Input readOnly className="border-slate-200 bg-slate-50 text-slate-800" value={planDomains[0] || domainLabel} />
      </div>
    ) : null;

  const dialogFields = (
        <div className="space-y-5 py-2">
          {errors._api ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errors._api}</div>
          ) : null}

          {casePicker ? (
            <div className="space-y-1.5">
              <Label className="text-slate-800">Child</Label>
              <Select value={casePicker.value || undefined} onValueChange={casePicker.onChange}>
                <SelectTrigger className="border-slate-200 bg-white">
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
              {errors.caseId ? <p className="text-xs text-red-600">{errors.caseId}</p> : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-slate-800">Date</Label>
              <Input
                type="datetime-local"
                className="border-slate-200"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
              {errors.sessionDate ? <p className="text-xs text-red-600">{errors.sessionDate}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-800">Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                step={1}
                className="border-slate-200"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              {errors.duration ? <p className="text-xs text-red-600">{errors.duration}</p> : null}
            </div>
          </div>

          {mode === 'create' && hasCaseContext && scheduleSlotOptions.length > 0 ? (
            <div className="space-y-1.5 rounded-lg border border-sky-100 bg-sky-50/40 p-3">
              <Label className="text-slate-800">Select Scheduled Session (optional)</Label>
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
                <SelectTrigger className="border-slate-200 bg-white">
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
              <p className="text-xs text-slate-600">
                Choosing a slot fills date/time and marks that slot completed when you save (therapy schedule).
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-slate-800">Goals targeted</Label>
            {renderGoalsTargeted()}
            {errors.goalsTargeted ? <p className="text-xs text-red-600">{errors.goalsTargeted}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-800">Activities used</Label>
            {effectiveDomain ? (
              <p className="text-xs text-slate-500">
                Showing library + plan activities for domain: <span className="font-medium text-slate-700">{effectiveDomain}</span>
              </p>
            ) : null}
            {allowManualActivityList ? (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  placeholder="Enter activity names separated by commas (required when no activities match this domain)"
                  className="border-slate-200"
                  value={manualActivitiesOnly}
                  onChange={(e) => setManualActivitiesOnly(e.target.value)}
                />
                <p className="text-xs text-slate-500">Add templates to the activity library for this domain, or embed activities on the therapy plan.</p>
              </div>
            ) : activityOptions.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                No activities available for this therapy domain.
              </p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                {activityOptions.map((a) => (
                  <label key={a} className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-2 text-sm hover:bg-white">
                    <Checkbox
                      checked={!!selectedActivities[a]}
                      onCheckedChange={(c) => setSelectedActivities((prev) => ({ ...prev, [a]: c === true }))}
                    />
                    <span className="leading-snug text-slate-800">{a}</span>
                  </label>
                ))}
              </div>
            )}
            {errors.activitiesUsed ? <p className="text-xs text-red-600">{errors.activitiesUsed}</p> : null}
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            <Label className="text-base text-slate-900">Child Response Assessment</Label>
            <div className="space-y-1.5">
              <Label className="text-sm font-normal text-slate-700">Overall response</Label>
              <Select value={String(scaleVal)} onValueChange={(v) => setScaleVal(Number(v))}>
                <SelectTrigger className="border-slate-200 bg-white">
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
            {errors.childResponse ? <p className="text-xs text-red-600">{errors.childResponse}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-800">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="border-slate-200 bg-white">
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
            {errors.status ? <p className="text-xs text-red-600">{errors.status}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-800">Clinical notes</Label>
            <Textarea rows={3} className="border-slate-200" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-800">Parent instructions</Label>
            <p className="text-xs text-slate-500">Visible to parents when saved (therapy session instructions).</p>
            <Textarea
              rows={3}
              className="border-slate-200"
              placeholder="Home carryover, reminders, or strategies for caregivers"
              value={parentInstructions}
              onChange={(e) => setParentInstructions(e.target.value)}
            />
          </div>
        </div>
  );

  if (isPage) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 py-8 pb-32">
          <button
            type="button"
            onClick={() => handleCancel()}
            className="mb-4 text-sm text-slate-600 transition-colors hover:text-sky-800"
          >
            ← Back to Sessions
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Log Therapy Session</h1>
          <p className="mt-1 text-sm text-slate-600">Document session details, progress, and observations</p>

          {errors._api ? (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errors._api}</div>
          ) : null}

          <Card className="mt-8 border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg text-slate-900">Session Information</CardTitle>
              <CardDescription>Child, domain, date, and duration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {casePicker ? (
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Child</Label>
                  <Select value={casePicker.value || undefined} onValueChange={casePicker.onChange}>
                    <SelectTrigger className="border-slate-200 bg-slate-50/80">
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
                  {errors.caseId ? <p className="text-xs text-red-600">{errors.caseId}</p> : null}
                </div>
              ) : null}
              {domainFieldPage}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Session Date</Label>
                  <Input
                    type="datetime-local"
                    className="border-slate-200 bg-slate-50/80"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                  />
                  {errors.sessionDate ? <p className="text-xs text-red-600">{errors.sessionDate}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-800">Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    className="border-slate-200 bg-slate-50/80"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                  {errors.duration ? <p className="text-xs text-red-600">{errors.duration}</p> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg text-slate-900">Goals and Activities</CardTitle>
              <CardDescription>From the therapy plan and activity library</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-1.5">
                <Label className="text-slate-800">Goals targeted</Label>
                {renderGoalsTargeted()}
                {errors.goalsTargeted ? <p className="text-xs text-red-600">{errors.goalsTargeted}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-800">Activities used</Label>
                {effectiveDomain ? (
                  <p className="text-xs text-slate-500">
                    Library and plan activities for domain:{' '}
                    <span className="font-medium text-slate-700">{effectiveDomain}</span>
                  </p>
                ) : null}
                {allowManualActivityList ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      placeholder="Enter activity names separated by commas (required when no activities match this domain)"
                      className="border-slate-200 bg-slate-50/50"
                      value={manualActivitiesOnly}
                      onChange={(e) => setManualActivitiesOnly(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">Add templates to the activity library for this domain, or embed activities on the therapy plan.</p>
                  </div>
                ) : activityOptions.length === 0 ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    No activities available for this therapy domain.
                  </p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                    {activityOptions.map((a) => (
                      <label key={a} className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-2 text-sm hover:bg-white">
                        <Checkbox
                          checked={!!selectedActivities[a]}
                          onCheckedChange={(c) => setSelectedActivities((prev) => ({ ...prev, [a]: c === true }))}
                        />
                        <span className="leading-snug text-slate-800">{a}</span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.activitiesUsed ? <p className="text-xs text-red-600">{errors.activitiesUsed}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg text-slate-900">Child Response Assessment</CardTitle>
              <CardDescription>Overall response (saved for clinician analytics as a 1–5 scale)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-1.5">
                <Label className="text-slate-800">Overall response</Label>
                <Select value={String(scaleVal)} onValueChange={(v) => setScaleVal(Number(v))}>
                  <SelectTrigger className="border-slate-200 bg-slate-50/80">
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
              {errors.childResponse ? <p className="text-xs text-red-600">{errors.childResponse}</p> : null}
            </CardContent>
          </Card>

          <Card className="mt-6 border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg text-slate-900">Session Notes</CardTitle>
              <CardDescription>Clinical observations and parent-facing guidance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-1.5">
                <Label className="text-slate-800">Clinical Observations</Label>
                <Textarea
                  rows={4}
                  className="border-slate-200 bg-slate-50/50"
                  placeholder="Document child's performance, engagement level, challenges, and progress..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-800">Parent Instructions</Label>
                <p className="text-xs text-slate-500">Saved to the parent module for home guidance.</p>
                <Textarea
                  rows={4}
                  className="border-slate-200 bg-slate-50/50"
                  placeholder="Recommendations for home practice and parent follow-up..."
                  value={parentInstructions}
                  onChange={(e) => setParentInstructions(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg text-slate-900">Session Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <RadioGroup value={status} onValueChange={setStatus} className="space-y-3">
                {STATUS_OPTIONS.map((o) => (
                  <div key={o.value} className="flex items-center gap-3">
                    <RadioGroupItem value={o.value} id={`page-st-${o.value}`} />
                    <Label htmlFor={`page-st-${o.value}`} className="font-normal text-slate-800">
                      {o.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.status ? <p className="mt-2 text-xs text-red-600">{errors.status}</p> : null}
            </CardContent>
          </Card>

          <div className="mt-10 flex flex-row flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-8">
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 text-slate-900 hover:bg-slate-50"
              onClick={() => handleCancel()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 text-slate-900 hover:bg-slate-50"
              onClick={() => void handleSubmit()}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-900" /> : null}
              Save Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] overflow-y-auto border-slate-200 bg-white sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-slate-100 pb-3">
          <DialogTitle className="text-lg text-sky-950">{mode === 'create' ? 'Log therapy session' : 'Edit session'}</DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Goals and activities are validated against your therapy plan and library. Parent instructions appear on the parent view when provided.
          </DialogDescription>
        </DialogHeader>
        {dialogFields}
        <DialogFooter className="flex flex-row flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            className="border-slate-200 text-slate-900 hover:bg-slate-50"
            onClick={() => handleCancel()}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-200 text-slate-900 hover:bg-slate-50"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-900" /> : null}
            {mode === 'create' ? 'Save session' : 'Update session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
