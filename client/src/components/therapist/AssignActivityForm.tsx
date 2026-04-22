import { startTransition, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import { activityAPI, therapistAPI, therapyPlanAPI } from '../../api';
import { cn } from '../ui/utils';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Info } from 'lucide-react';
import { isActiveGoalStatus, normalizeShortTermGoalsList } from '../../utils/therapyPlanResponse';

const selectClassName =
  'flex h-10 w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60';

type ActivityTemplate = {
  _id?: string;
  name?: string;
  domain?: string;
  materials?: string;
  frequency?: string;
  instructions?: string;
  objective?: string;
  procedure?: string;
};

type PlanGoalOption = { value: string; label: string; domain: string };

export type AssignActivityCaseChoice = {
  caseId: string;
  label: string;
};

type Props = {
  /** Case file tab: single case */
  fixedCaseId?: string;
  /** Home assignments page: therapist picks child/case */
  caseChoices?: AssignActivityCaseChoice[];
  onSuccess?: () => void | Promise<void>;
  /** Render inside existing Card (e.g. dialog) — skip outer Card wrapper */
  bare?: boolean;
};

export function AssignActivityForm({ fixedCaseId, caseChoices, onSuccess, bare = false }: Props) {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState(fixedCaseId || '');
  const [activityQuery, setActivityQuery] = useState('');
  const [activityId, setActivityId] = useState('');
  const [instructionsOverride, setInstructionsOverride] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [materials, setMaterials] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [therapyPlan, setTherapyPlan] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [selectedGoalKey, setSelectedGoalKey] = useState('');

  useEffect(() => {
    if (fixedCaseId) setSelectedCaseId(fixedCaseId);
  }, [fixedCaseId]);

  useEffect(() => {
    const cid = (fixedCaseId || selectedCaseId || '').trim();
    if (!cid) {
      setTherapyPlan(undefined);
      setSelectedGoalKey('');
      return;
    }
    let cancelled = false;
    setLoadingPlan(true);
    void (async () => {
      try {
        const res = await therapyPlanAPI.getByCase(cid);
        const body = res.data as { data?: Record<string, unknown> | null };
        if (!cancelled) setTherapyPlan(body?.data ?? null);
      } catch {
        if (!cancelled) setTherapyPlan(null);
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fixedCaseId, selectedCaseId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingTemplates(true);
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await activityAPI.listTemplates({});
          const body = res.data as { data?: ActivityTemplate[] };
          const raw = Array.isArray(body?.data) ? body.data : [];
          const minimal: ActivityTemplate[] = raw
            .filter((row) => row._id)
            .map((row) => ({
              _id: String(row._id),
              name: row.name,
              domain: row.domain,
              frequency: row.frequency,
              materials:
                typeof row.materials === 'string' && row.materials.length > 400
                  ? `${row.materials.slice(0, 400)}…`
                  : row.materials,
            }));
          if (!cancelled) {
            startTransition(() => {
              setTemplates(minimal);
              setLoadingTemplates(false);
            });
          }
        } catch {
          if (!cancelled) {
            startTransition(() => {
              setTemplates([]);
              setLoadingTemplates(false);
            });
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t._id) === activityId),
    [templates, activityId]
  );

  const MAX_ACTIVITY_OPTIONS = 400;

  const activityMatches = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return templates.filter((t) => {
      const hay = `${t.name || ''} ${t.domain || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [templates, activityQuery]);

  const displayActivityMatches = useMemo(
    () =>
      activityMatches.length > MAX_ACTIVITY_OPTIONS ? activityMatches.slice(0, MAX_ACTIVITY_OPTIONS) : activityMatches,
    [activityMatches]
  );

  const effectiveCaseId = fixedCaseId || selectedCaseId;
  const showCasePicker = Boolean(caseChoices?.length) && !fixedCaseId;

  useEffect(() => {
    setSelectedGoalKey('');
  }, [activityId, effectiveCaseId]);

  const planGoalOptions = useMemo((): PlanGoalOption[] => {
    if (!therapyPlan || typeof therapyPlan !== 'object') return [];
    const st = normalizeShortTermGoalsList(
      (therapyPlan as { shortTermGoals?: unknown }).shortTermGoals as never
    );
    const rows: PlanGoalOption[] = [];
    const seen = new Set<string>();
    const push = (value: string, label: string, domain: string) => {
      const v = value.trim();
      if (!v || seen.has(v)) return;
      seen.add(v);
      rows.push({ value: v, label: label.trim() || v, domain: domain.trim() });
    };
    let use = st.filter((g) => g && String(g.title || '').trim() && isActiveGoalStatus(g.status));
    if (use.length === 0) use = st.filter((g) => g && String(g.title || '').trim());
    use.forEach((g, idx) => {
      const mongoId = g._id != null ? String(g._id).trim() : '';
      const gk = g.goalKey ? String(g.goalKey).trim() : '';
      const title = String(g.title || '').trim();
      const dom = String(g.domain || '').trim();
      if (gk) push(gk, title, dom);
      else if (mongoId) push(mongoId, title, dom);
      else push(`st-${idx}`, title, dom);
    });
    return rows;
  }, [therapyPlan]);

  const planHasGoals = planGoalOptions.length > 0;

  const usingLibraryActivity = Boolean(activityId);
  const customActivityTitle = activityQuery.trim();
  const hasActivityContext = usingLibraryActivity || customActivityTitle.length > 0;

  const createAssignment = async () => {
    if (!effectiveCaseId) {
      setError('Select a child / case.');
      return;
    }
    if (!dueDate) {
      setError('Choose a due date.');
      return;
    }
    if (!hasActivityContext) {
      setError('Enter an activity name or pick one from your library.');
      return;
    }
    if (usingLibraryActivity && planHasGoals && !String(selectedGoalKey).trim()) {
      setError('Select a therapy goal to link this library assignment.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload: Record<string, string> = {
        caseId: effectiveCaseId,
        dueDate,
        instructions: instructionsOverride.trim(),
        materials: materials.trim(),
        frequency: frequency.trim(),
        duration: duration.trim(),
      };
      if (usingLibraryActivity) {
        payload.activityId = activityId;
      } else {
        payload.title = customActivityTitle;
      }
      if (String(selectedGoalKey).trim()) {
        const hit = planGoalOptions.find((g) => g.value === selectedGoalKey);
        payload.goalKey = selectedGoalKey.trim();
        if (hit?.domain) payload.domain = hit.domain;
      }
      await therapistAPI.createHomeAssignment(payload);
      setActivityId('');
      setActivityQuery('');
      setSelectedGoalKey('');
      setInstructionsOverride('');
      setFrequency('');
      setDuration('');
      setMaterials('');
      setDueDate('');
      if (showCasePicker) setSelectedCaseId('');
      await onSuccess?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <>
      {error ? (
        <div className="rounded-md border bg-muted px-3 py-2 text-sm text-destructive">{error}</div>
      ) : null}

      {showCasePicker ? (
        <div className="space-y-2">
          <Label className="text-foreground" htmlFor="assign-activity-case">
            Child / case
          </Label>
          <select
            id="assign-activity-case"
            className={cn(selectClassName)}
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
          >
            <option value="">Select a child</option>
            {caseChoices.map((c) => (
              <option key={c.caseId} value={c.caseId}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label className="text-foreground" htmlFor="assign-activity-search">
          Activity
        </Label>
        {loadingTemplates ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading library…
          </div>
        ) : (
          <>
            <Input
              id="assign-activity-search"
              className="border"
              placeholder="Type a name or search library (min. 2 characters to filter)"
              value={activityQuery}
              onChange={(e) => {
                setActivityQuery(e.target.value);
                setActivityId('');
              }}
              autoComplete="off"
            />
            {activityQuery.trim().length < 2 ? (
              <p className="text-xs text-muted-foreground">
                {templates.length === 0
                  ? 'No templates in your library yet — type an activity name below and submit to assign a custom activity.'
                  : `Type at least 2 characters to search ${templates.length} activit${templates.length === 1 ? 'y' : 'ies'}, or enter any activity name and submit without picking from the list.`}
              </p>
            ) : activityMatches.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No library match for that search — you can still assign this as a <span className="font-medium">custom</span>{' '}
                activity using the name above (set due date and submit).
              </p>
            ) : (
              <>
                {activityMatches.length > MAX_ACTIVITY_OPTIONS ? (
                  <p className="text-xs text-muted-foreground">
                    Showing first {MAX_ACTIVITY_OPTIONS} of {activityMatches.length} matches — type more to narrow.
                  </p>
                ) : null}
                <select
                  id="assign-activity-template"
                  className={cn(selectClassName)}
                  value={activityId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setActivityId(id);
                    const t = templates.find((x) => String(x._id) === id);
                    if (t) {
                      setFrequency(String(t.frequency || '').trim());
                      setMaterials(
                        typeof t.materials === 'string' ? t.materials.replace(/…$/, '').trim() : String(t.materials || '')
                      );
                    }
                  }}
                >
                  <option value="">Select activity from results (optional)</option>
                  {displayActivityMatches.map((t) => {
                    const id = String(t._id);
                    const label = `${t.name || 'Activity'}${t.domain ? ` · ${t.domain}` : ''}`.slice(0, 200);
                    return (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </>
            )}
          </>
        )}
      </div>

      {selectedTemplate ? (
        <div className="rounded-lg border bg-muted/80 px-3 py-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">From library</p>
          {selectedTemplate.frequency ? <p className="mt-1">Default frequency: {selectedTemplate.frequency}</p> : null}
          {selectedTemplate.materials ? <p className="mt-1">Default materials: {selectedTemplate.materials}</p> : null}
        </div>
      ) : null}

      {effectiveCaseId && (planHasGoals || loadingPlan) ? (
        <div className="space-y-2">
          <Label className="text-foreground" htmlFor="assign-goal-key">
            Therapy goal
          </Label>
          {loadingPlan ? (
            <p className="text-xs text-muted-foreground">Loading goals from plan…</p>
          ) : planHasGoals ? (
            <>
              <select
                id="assign-goal-key"
                className={cn(selectClassName)}
                value={selectedGoalKey}
                onChange={(e) => setSelectedGoalKey(e.target.value)}
              >
                <option value="">
                  {usingLibraryActivity ? 'Select goal (required for library activity)' : 'Optional — link to a goal'}
                </option>
                {planGoalOptions.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
              {!selectedGoalKey ? (
                <Alert className="border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-50">
                  <Info className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  <AlertTitle className="text-sm">Progress tracking</AlertTitle>
                  <AlertDescription className="text-sm text-amber-950/90 dark:text-amber-50/90">
                    Linking this assignment to a therapy goal improves progress tracking.
                  </AlertDescription>
                </Alert>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No short-term goals on this case&apos;s plan yet.</p>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground" htmlFor="assign-frequency">
            Frequency
          </Label>
          <Input
            id="assign-frequency"
            className="border"
            placeholder="e.g. 3× per week, daily"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground" htmlFor="assign-duration">
            Duration
          </Label>
          <Input
            id="assign-duration"
            className="border"
            placeholder="e.g. 10 minutes per session"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground" htmlFor="assign-materials">
          Material(s)
        </Label>
        <Textarea
          id="assign-materials"
          rows={2}
          className="border"
          placeholder="What the family needs (toys, printouts, app, etc.)"
          value={materials}
          onChange={(e) => setMaterials(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Due date</Label>
        <Input type="date" className="border" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Instructions (optional override)</Label>
        <Textarea
          rows={4}
          className="border"
          placeholder="Leave blank to use the activity’s default instructions (library only)"
          value={instructionsOverride}
          onChange={(e) => setInstructionsOverride(e.target.value)}
        />
      </div>

      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          className="border bg-card text-black hover:bg-background hover:text-black"
          onClick={() => void createAssignment()}
          disabled={saving || !dueDate || !effectiveCaseId || !hasActivityContext}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" /> : null}
          Submit
        </Button>
      </div>
    </>
  );

  if (bare) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <Card className="border bg-card shadow-sm">
      <CardHeader className="border-b border">
        <CardTitle className="text-base font-semibold text-foreground">Assign activity</CardTitle>
        <CardDescription className="text-muted-foreground">
          Choose a library activity or type a custom name, add frequency / duration / materials, set a due date, and optionally
          override instructions. Parents complete uploads from their dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">{body}</CardContent>
    </Card>
  );
}
