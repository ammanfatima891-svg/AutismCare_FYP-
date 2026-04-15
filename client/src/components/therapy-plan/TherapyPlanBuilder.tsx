import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activityAPI, therapyPlanAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type { ActivityTemplate } from '../activity-library/activityTypes';
import { toast } from 'sonner';
import { cn } from '../ui/utils';

const DOMAIN_OPTIONS = ['Speech', 'OT', 'Sensory', 'Behavioral', 'Behavioral (ABA)', 'AAC', 'PECS'] as const;
const STATUS_OPTIONS = ['Active', 'Achieved', 'Modified', 'OnHold', 'Retired'] as const;
const MEASUREMENT_OPTIONS = ['rating_1_5', 'accuracy_trials'] as const;
const MASTERY_RULE_OPTIONS = ['threshold_out_of_n_sessions', 'threshold_consecutive_sessions'] as const;
const FREQUENCY_OPTIONS = ['Daily', 'Weekly', '2x/week', '3x/week', 'Monthly', 'As needed'] as const;
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'] as const;

/** Plan activity row description — mirrors server buildPlanDescription for embedded plan rows */
function buildPlanDescriptionFromActivityDoc(a: {
  objective?: string;
  instructions?: string;
  procedure?: string;
  notes?: string;
  materials?: string;
  frequency?: string;
}) {
  const parts = [a.objective, a.instructions, a.procedure, a.notes]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  let d = parts.join('\n\n');
  if (a.materials) {
    d += (d ? '\n\n' : '') + `Materials: ${String(a.materials).trim()}`;
  }
  if (a.frequency) {
    d += (d ? '\n\n' : '') + `Frequency: ${String(a.frequency).trim()}`;
  }
  return d;
}

export type ShortGoalRow = {
  /** Preserved from server for session goalData linkage */
  goalKey: string;
  title: string;
  measurableCriteria: string;
  reviewDate: string;
  status: (typeof STATUS_OPTIONS)[number];
  domain: (typeof DOMAIN_OPTIONS)[number];
  measurementType: (typeof MEASUREMENT_OPTIONS)[number];
  ruleType: (typeof MASTERY_RULE_OPTIONS)[number];
  masteryThreshold: number;
  masteryWindow: number;
  masteryMinSessions: number;
};

type Props = {
  caseId: string;
  /** Plan from case file aggregate (may be null). */
  plan: Record<string, unknown> | null;
  onSaved: () => void;
};

function emptyShortGoal(): ShortGoalRow {
  return {
    goalKey: '',
    title: '',
    measurableCriteria: '',
    reviewDate: '',
    status: 'Active',
    domain: 'Speech',
    measurementType: 'rating_1_5',
    ruleType: 'threshold_out_of_n_sessions',
    masteryThreshold: 80,
    masteryWindow: 5,
    masteryMinSessions: 3,
  };
}

export function TherapyPlanBuilder({ caseId, plan, onSaved }: Props) {
  const planId = plan?._id as string | undefined;

  const [domains, setDomains] = useState<string[]>([]);
  const [longTitle, setLongTitle] = useState('');
  const [longDesc, setLongDesc] = useState('');
  const [longTimeline, setLongTimeline] = useState('');
  const [shortGoals, setShortGoals] = useState<ShortGoalRow[]>([emptyShortGoal()]);
  type PlanActivity = {
    title: string;
    description: string;
    linkedGoal: string;
    libraryActivityId?: string;
  };
  const [activities, setActivities] = useState<PlanActivity[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<ActivityTemplate[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<'draft' | 'submit' | 'approval' | 'revision' | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Custom activity form (POST /activities) — design aligned */
  const [customName, setCustomName] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [customMaterials, setCustomMaterials] = useState('');
  const [customFrequency, setCustomFrequency] = useState<string>(FREQUENCY_OPTIONS[0]);
  const [customDifficulty, setCustomDifficulty] = useState<(typeof DIFFICULTY_OPTIONS)[number]>('Medium');
  const [customDomain, setCustomDomain] = useState<(typeof DOMAIN_OPTIONS)[number]>('Speech');
  const [customErrors, setCustomErrors] = useState<{ name?: string; instructions?: string }>({});
  const [creatingActivity, setCreatingActivity] = useState(false);

  const hasPlan = !!planId;

  /** Skip re-sync when `plan` is a new object reference but data unchanged (prevents setState loops / UI freeze). */
  const planSnapshotRef = useRef<string | null>(null);
  /** Panel can open below the fold — scroll it into view so the Browse action is visibly “doing something”. */
  const libraryPanelRef = useRef<HTMLDivElement | null>(null);
  /** Ignore stale listTemplates responses when Refresh is clicked quickly. */
  const libraryFetchGenRef = useRef(0);

  useEffect(() => {
    if (!plan) {
      if (planSnapshotRef.current !== '__empty__') {
        planSnapshotRef.current = '__empty__';
        setDomains([]);
        setLongTitle('');
        setLongDesc('');
        setLongTimeline('');
        setShortGoals([emptyShortGoal()]);
        setActivities([]);
      }
      return;
    }
    let snapshot: string;
    try {
      snapshot = JSON.stringify({
        _id: plan._id,
        updatedAt: plan.updatedAt,
        domains: plan.domains,
        longTermGoal: plan.longTermGoal,
        shortTermGoals: plan.shortTermGoals,
        activities: plan.activities,
      });
    } catch {
      snapshot = String(plan._id ?? '');
    }
    if (planSnapshotRef.current === snapshot) return;
    planSnapshotRef.current = snapshot;

    const d = Array.isArray(plan.domains) ? (plan.domains as string[]) : [];
    setDomains(d.filter((x) => DOMAIN_OPTIONS.includes(x as (typeof DOMAIN_OPTIONS)[number])));
    const lt = plan.longTermGoal as { title?: string; description?: string; timeline?: string } | undefined;
    setLongTitle(lt?.title || '');
    setLongDesc(lt?.description || '');
    setLongTimeline(lt?.timeline || '');
    const st = Array.isArray(plan.shortTermGoals) ? plan.shortTermGoals : [];
    if (st.length > 0) {
      setShortGoals(
        st.map((g: Record<string, unknown>) => {
          const mr = (g.masteryRule && typeof g.masteryRule === 'object' ? g.masteryRule : {}) as Record<
            string,
            unknown
          >;
          const meas = (g.measurement && typeof g.measurement === 'object' ? g.measurement : {}) as Record<
            string,
            unknown
          >;
          const mt = String(meas.type || 'rating_1_5');
          const rt = String(mr.ruleType || 'threshold_out_of_n_sessions');
          return {
            goalKey: String(g.goalKey || ''),
            title: String(g.title || ''),
            measurableCriteria: String(g.measurableCriteria || ''),
            reviewDate: g.reviewDate ? new Date(String(g.reviewDate)).toISOString().slice(0, 10) : '',
            status: (STATUS_OPTIONS.includes(g.status as never) ? g.status : 'Active') as ShortGoalRow['status'],
            domain: (DOMAIN_OPTIONS.includes(g.domain as never) ? g.domain : 'Speech') as ShortGoalRow['domain'],
            measurementType: (MEASUREMENT_OPTIONS.includes(mt as never)
              ? mt
              : 'rating_1_5') as ShortGoalRow['measurementType'],
            ruleType: (MASTERY_RULE_OPTIONS.includes(rt as never)
              ? rt
              : 'threshold_out_of_n_sessions') as ShortGoalRow['ruleType'],
            masteryThreshold: Number.isFinite(Number(mr.threshold)) ? Number(mr.threshold) : 80,
            masteryWindow: Number.isFinite(Number(mr.window)) && Number(mr.window) > 0 ? Number(mr.window) : 5,
            masteryMinSessions:
              Number.isFinite(Number(mr.minSessions)) && Number(mr.minSessions) > 0 ? Number(mr.minSessions) : 3,
          };
        })
      );
    } else {
      setShortGoals([emptyShortGoal()]);
    }
    const act = Array.isArray(plan.activities) ? plan.activities : [];
    setActivities(
      act.map((a: Record<string, unknown>) => ({
        title: String(a.title || ''),
        description: String(a.description || ''),
        linkedGoal: String(a.linkedGoal || ''),
        libraryActivityId: a.libraryActivityId ? String(a.libraryActivityId) : undefined,
      }))
    );
  }, [plan]);

  useEffect(() => {
    if (!libraryOpen) return;
    const id = requestAnimationFrame(() => {
      libraryPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [libraryOpen]);

  /** Inline panel (no modal/portal) — avoids freezes from overlays + Tabs/focus traps. */
  const openLibraryPicker = useCallback(() => {
    setLibraryOpen(true);
    setLibraryLoading(true);
    libraryFetchGenRef.current += 1;
    const gen = libraryFetchGenRef.current;
    void activityAPI
      .listTemplates({})
      .then((axiosRes) => {
        if (gen !== libraryFetchGenRef.current) return;
        const body = axiosRes.data as { data?: ActivityTemplate[] } | undefined;
        const list = Array.isArray(body?.data) ? body.data : [];
        setLibraryItems(list);
      })
      .catch((err: unknown) => {
        if (gen !== libraryFetchGenRef.current) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        toast.error(status === 401 ? 'Session expired — sign in again' : 'Could not load activity library');
        setLibraryItems([]);
      })
      .finally(() => {
        if (gen !== libraryFetchGenRef.current) return;
        setLibraryLoading(false);
      });
  }, []);

  const toggleDomain = (d: string) => {
    setDomains((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const addShortGoal = () => setShortGoals((g) => [...g, emptyShortGoal()]);
  const removeShortGoal = (idx: number) =>
    setShortGoals((g) => (g.length <= 1 ? g : g.filter((_, i) => i !== idx)));
  const updateShortGoal = (idx: number, patch: Partial<ShortGoalRow>) =>
    setShortGoals((g) => g.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const removeActivity = (idx: number) => setActivities((a) => a.filter((_, i) => i !== idx));
  const updateActivity = (idx: number, patch: Partial<PlanActivity>) =>
    setActivities((a) => a.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const addFromLibrary = (lib: ActivityTemplate) => {
    const description = [
      lib.objective?.trim(),
      lib.instructions?.trim(),
      lib.procedure?.trim(),
      lib.notes?.trim(),
      lib.materials ? `Materials: ${lib.materials}` : '',
      lib.frequency ? `Frequency: ${lib.frequency}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    let added = false;
    setActivities((prev) => {
      if (prev.some((x) => x.libraryActivityId === lib._id)) return prev;
      added = true;
      return [
        ...prev,
        {
          title: lib.name,
          description,
          linkedGoal: '',
          libraryActivityId: lib._id,
        },
      ];
    });
    if (added) toast.success('Activity added to plan');
    else toast.message('This activity is already in the plan');
  };

  const submitCustomActivity = async () => {
    const err: { name?: string; instructions?: string } = {};
    if (!customName.trim()) err.name = 'Activity name is required';
    if (!customInstructions.trim()) err.instructions = 'Instructions are required';
    setCustomErrors(err);
    if (Object.keys(err).length > 0) return;

    try {
      setCreatingActivity(true);
      const res = await activityAPI.create({
        name: customName.trim(),
        instructions: customInstructions.trim(),
        domain: customDomain,
        materials: customMaterials.trim(),
        frequency: customFrequency.trim(),
        difficulty: customDifficulty,
        parentInvolvement: false,
        isTemplate: true,
      });
      const body = res.data as { data?: Record<string, unknown> } | undefined;
      const created = body?.data;
      if (!created || !created._id) {
        toast.error('Invalid response from server');
        return;
      }
      const description = buildPlanDescriptionFromActivityDoc({
        objective: created.objective as string | undefined,
        instructions: created.instructions as string | undefined,
        procedure: created.procedure as string | undefined,
        notes: created.notes as string | undefined,
        materials: created.materials as string | undefined,
        frequency: created.frequency as string | undefined,
      });
      setActivities((prev) => [
        ...prev,
        {
          title: String(created.name || customName.trim()),
          description,
          linkedGoal: '',
          libraryActivityId: String(created._id),
        },
      ]);
      toast.success('Activity saved and added to this plan');
      setCustomName('');
      setCustomInstructions('');
      setCustomMaterials('');
      setCustomFrequency(FREQUENCY_OPTIONS[0]);
      setCustomDifficulty('Medium');
      setCustomDomain('Speech');
      setCustomErrors({});
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create activity');
    } finally {
      setCreatingActivity(false);
    }
  };

  const payloadBase = useMemo(
    () => ({
      caseId,
      domains,
      longTermGoal: {
        title: longTitle.trim(),
        description: longDesc.trim(),
        timeline: longTimeline.trim(),
      },
      shortTermGoals: shortGoals
        .filter((g) => g.title.trim())
        .map((g) => ({
          ...(g.goalKey.trim() ? { goalKey: g.goalKey.trim() } : {}),
          title: g.title.trim(),
          measurableCriteria: g.measurableCriteria.trim(),
          reviewDate: g.reviewDate || null,
          status: g.status,
          domain: g.domain,
          measurement: { type: g.measurementType, unit: '' },
          masteryRule: {
            ruleType: g.ruleType,
            threshold: g.masteryThreshold,
            window: g.masteryWindow,
            minSessions: g.masteryMinSessions,
          },
        })),
      activities: activities
        .filter((a) => a.title.trim())
        .map((a) => ({
          title: a.title.trim(),
          description: a.description.trim(),
          linkedGoal: a.linkedGoal.trim(),
          ...(a.libraryActivityId ? { libraryActivityId: a.libraryActivityId } : {}),
        })),
    }),
    [caseId, domains, longTitle, longDesc, longTimeline, shortGoals, activities]
  );

  const validateFinalSubmission = (): string | null => {
    if (domains.length === 0) {
      return 'Select at least one therapy domain before submitting.';
    }
    if (!longTitle.trim()) {
      return 'Long-term goal title is required before submitting.';
    }
    const filled = shortGoals.filter((g) => g.title.trim());
    if (filled.length === 0) {
      return 'Add at least one short-term goal before submitting.';
    }
    for (const g of filled) {
      if (!g.measurableCriteria.trim()) {
        return 'Each short-term goal must include measurable criteria before submitting.';
      }
    }
    return null;
  };

  const saveDraft = async () => {
    try {
      setLoading(true);
      setActiveAction('draft');
      setError(null);
      const payload = { ...payloadBase, status: 'draft' as const };
      if (hasPlan) {
        await therapyPlanAPI.update(planId!, payload);
      } else {
        await therapyPlanAPI.create(payload);
      }
      toast.success('Therapy Plan saved successfully');
      await onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to save draft';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const submitTherapyPlan = async () => {
    const validationError = validateFinalSubmission();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }
    try {
      setLoading(true);
      setActiveAction('submit');
      setError(null);
      const payload = { ...payloadBase, status: 'final' as const };
      if (hasPlan) {
        await therapyPlanAPI.update(planId!, payload);
      } else {
        await therapyPlanAPI.create(payload);
      }
      toast.success('Therapy Plan saved successfully');
      await onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to submit therapy plan';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const submitForClinicianApproval = async () => {
    if (!planId) return;
    try {
      setLoading(true);
      setActiveAction('approval');
      setError(null);
      await therapyPlanAPI.submitForApproval(planId);
      toast.success('Plan submitted for clinician approval');
      await onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to submit for approval';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const publishPlanRevision = async () => {
    if (!planId) return;
    if (
      !window.confirm(
        'Publish a new plan revision? This increments the plan version and clears approval status so stakeholders can align analytics with the new episode.'
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      setActiveAction('revision');
      setError(null);
      await therapyPlanAPI.update(planId, { publishRevision: true });
      toast.success('Plan revision published');
      await onSaved();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to publish revision';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const planStatusLabel =
    hasPlan && plan
      ? String((plan as { status?: string }).status || ((plan as { draft?: boolean }).draft ? 'draft' : 'final'))
      : null;

  const approvalStatus = hasPlan && plan ? String((plan as { approval?: { status?: string } }).approval?.status || 'none') : 'none';
  const planVersion = hasPlan && plan ? Number((plan as { planVersion?: number }).planVersion || 1) : 1;

  return (
    <div className="space-y-6">
      <Card className="border bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base text-foreground">Therapy plan</CardTitle>
              <CardDescription className="text-sm">
                Define domains, goals, and optional activities. Save a draft anytime, then submit when complete.
              </CardDescription>
            </div>
            {planStatusLabel ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={planStatusLabel === 'final' ? 'default' : 'secondary'}>
                  {planStatusLabel === 'final' ? 'Submitted' : 'Draft'}
                </Badge>
                {hasPlan ? <Badge variant="outline">v{planVersion}</Badge> : null}
                {approvalStatus !== 'none' ? (
                  <Badge variant="outline" className="capitalize">
                    approval: {approvalStatus}
                  </Badge>
                ) : null}
              </div>
            ) : (
              <Badge variant="secondary">New plan</Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <Card className="border bg-card shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-foreground">Therapy domains</CardTitle>
          <CardDescription>Select all areas addressed in this plan</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {DOMAIN_OPTIONS.map((d) => {
              const selected = domains.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleDomain(d)}
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    selected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tip: domain labels are used by clinician progress analytics and reports.
          </p>
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-foreground">Long-term goal</CardTitle>
          <CardDescription>One overarching goal for this episode of care</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-1">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={longTitle} onChange={(e) => setLongTitle(e.target.value)} placeholder="Main long-term goal" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={3} value={longDesc} onChange={(e) => setLongDesc(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Timeline</Label>
            <Input
              value={longTimeline}
              onChange={(e) => setLongTimeline(e.target.value)}
              placeholder="e.g. 12 weeks, 6 months"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-foreground">Short-term goals</CardTitle>
            <CardDescription>Linked to domains with status for progress tracking</CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addShortGoal}>
            <Plus className="mr-1 h-4 w-4" />
            Add goal
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Mobile-first responsive layout: cards on small screens, table on desktop */}
          <div className="space-y-3 md:hidden">
            {shortGoals.map((row, idx) => (
              <div key={idx} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Goal {idx + 1}</p>
                    <p className="text-xs text-muted-foreground">Define measurable criteria and tracking rules</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeShortGoal(idx)}
                    aria-label="Remove goal"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>

                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Goal title</Label>
                    <Input
                      value={row.title}
                      onChange={(e) => updateShortGoal(idx, { title: e.target.value })}
                      placeholder="Goal title"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Measurable criteria</Label>
                    <Input
                      value={row.measurableCriteria}
                      onChange={(e) => updateShortGoal(idx, { measurableCriteria: e.target.value })}
                      placeholder="Observable criteria"
                      className="h-11"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Domain</Label>
                      <Select
                        value={row.domain}
                        onValueChange={(v) => updateShortGoal(idx, { domain: v as ShortGoalRow['domain'] })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
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

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select
                        value={row.status}
                        onValueChange={(v) => updateShortGoal(idx, { status: v as ShortGoalRow['status'] })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Review date</Label>
                      <Input
                        type="date"
                        value={row.reviewDate}
                        onChange={(e) => updateShortGoal(idx, { reviewDate: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Measure</Label>
                      <Select
                        value={row.measurementType}
                        onValueChange={(v) =>
                          updateShortGoal(idx, { measurementType: v as ShortGoalRow['measurementType'] })
                        }
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rating_1_5">Rating (1–5)</SelectItem>
                          <SelectItem value="accuracy_trials">Accuracy (trials)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Mastery rule</Label>
                    <Select
                      value={row.ruleType}
                      onValueChange={(v) => updateShortGoal(idx, { ruleType: v as ShortGoalRow['ruleType'] })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="threshold_out_of_n_sessions">Average in window</SelectItem>
                        <SelectItem value="threshold_consecutive_sessions">Consecutive sessions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Threshold %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={row.masteryThreshold}
                        className="h-11"
                        onChange={(e) =>
                          updateShortGoal(idx, { masteryThreshold: Math.max(0, Math.min(100, Number(e.target.value))) })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Window</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={row.masteryWindow}
                        className="h-11"
                        onChange={(e) =>
                          updateShortGoal(idx, { masteryWindow: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Min sessions</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={row.masteryMinSessions}
                        className="h-11"
                        onChange={(e) =>
                          updateShortGoal(idx, {
                            masteryMinSessions: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-md border md:block">
            <div className="max-h-[min(55vh,520px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 z-10 bg-muted/90 backdrop-blur supports-[backdrop-filter]:bg-muted/70">
                    <TableHead className="min-w-[220px]">Goal</TableHead>
                    <TableHead className="min-w-[260px]">Measurable criteria</TableHead>
                    <TableHead className="min-w-[170px]">Domain</TableHead>
                    <TableHead className="min-w-[150px]">Review date</TableHead>
                    <TableHead className="min-w-[140px]">Status</TableHead>
                    <TableHead className="min-w-[170px] whitespace-nowrap">Measure</TableHead>
                    <TableHead className="min-w-[220px] whitespace-nowrap">Mastery rule</TableHead>
                    <TableHead className="w-[84px] whitespace-nowrap">Thr %</TableHead>
                    <TableHead className="w-[74px] whitespace-nowrap">Win</TableHead>
                    <TableHead className="w-[84px] whitespace-nowrap">Min n</TableHead>
                    <TableHead className="w-[60px]" aria-label="Actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shortGoals.map((row, idx) => (
                    <TableRow key={idx} className="align-top">
                      <TableCell>
                        <Input
                          value={row.title}
                          onChange={(e) => updateShortGoal(idx, { title: e.target.value })}
                          placeholder="Goal title"
                          className="h-10"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.measurableCriteria}
                          onChange={(e) => updateShortGoal(idx, { measurableCriteria: e.target.value })}
                          placeholder="Observable criteria"
                          className="h-10"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.domain}
                          onValueChange={(v) => updateShortGoal(idx, { domain: v as ShortGoalRow['domain'] })}
                        >
                          <SelectTrigger className="h-10 w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DOMAIN_OPTIONS.map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={row.reviewDate}
                          onChange={(e) => updateShortGoal(idx, { reviewDate: e.target.value })}
                          className="h-10 w-[150px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.status}
                          onValueChange={(v) => updateShortGoal(idx, { status: v as ShortGoalRow['status'] })}
                        >
                          <SelectTrigger className="h-10 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.measurementType}
                          onValueChange={(v) =>
                            updateShortGoal(idx, { measurementType: v as ShortGoalRow['measurementType'] })
                          }
                        >
                          <SelectTrigger className="h-10 w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rating_1_5">Rating (1–5)</SelectItem>
                            <SelectItem value="accuracy_trials">Accuracy (trials)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.ruleType}
                          onValueChange={(v) => updateShortGoal(idx, { ruleType: v as ShortGoalRow['ruleType'] })}
                        >
                          <SelectTrigger className="h-10 w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="threshold_out_of_n_sessions">Avg in window</SelectItem>
                            <SelectItem value="threshold_consecutive_sessions">Consecutive sessions</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="h-10 w-[72px]"
                          value={row.masteryThreshold}
                          onChange={(e) =>
                            updateShortGoal(idx, { masteryThreshold: Math.max(0, Math.min(100, Number(e.target.value))) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          className="h-10 w-[64px]"
                          value={row.masteryWindow}
                          onChange={(e) =>
                            updateShortGoal(idx, { masteryWindow: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          className="h-10 w-[64px]"
                          value={row.masteryMinSessions}
                          onChange={(e) =>
                            updateShortGoal(idx, {
                              masteryMinSessions: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeShortGoal(idx)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Required for submission: select domains, add a long‑term goal title, and add at least one short‑term goal with measurable criteria.
          </p>
        </CardContent>
      </Card>

      <Card className="border bg-card shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-foreground">Activity assignment</CardTitle>
          <CardDescription>Optional — add activities from your library or create and save new ones to this plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Select from Activity Library</Label>
            <Button
              type="button"
              variant="outline"
              disabled={libraryLoading}
              className="h-11 w-full border bg-card text-base font-medium text-foreground shadow-sm hover:bg-background"
              onClick={openLibraryPicker}
            >
              {libraryLoading ? <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" /> : null}
              {libraryOpen ? 'Refresh activity list' : 'Browse Activity Library'}
            </Button>
            {libraryOpen ? (
              <div
                ref={libraryPanelRef}
                className="mt-3 rounded-lg border bg-background/90 p-4 shadow-inner ring-1 ring-border"
                role="region"
                aria-label="Activity library results"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Add from activity library</p>
                  <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-muted-foreground" onClick={() => setLibraryOpen(false)}>
                    Hide
                  </Button>
                </div>
                {libraryLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
                    <p className="text-sm text-muted-foreground">Loading activities…</p>
                  </div>
                ) : libraryItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No templates found. Create activities under <strong>Activity library</strong> on the dashboard or case
                    file, then use Refresh here.
                  </p>
                ) : (
                  <ul className="max-h-[min(50vh,420px)] space-y-2 overflow-y-auto pr-1">
                    {libraryItems.slice(0, 500).map((lib) => (
                      <li
                        key={lib._id}
                        className="flex flex-col gap-2 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{lib.name}</p>
                          <p className="text-xs text-muted-foreground">{lib.domain}</p>
                        </div>
                        <Button type="button" size="sm" className="shrink-0" onClick={() => addFromLibrary(lib)}>
                          Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <span className="w-full border-t border" />
            </div>
            <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="bg-card px-4">OR</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Add custom activity</Label>
            <div className="rounded-xl border bg-muted/40 p-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Domain</Label>
                  <Select
                    value={customDomain}
                    onValueChange={(v) => setCustomDomain(v as (typeof DOMAIN_OPTIONS)[number])}
                  >
                    <SelectTrigger className="h-11 border bg-background">
                      <SelectValue placeholder="Domain" />
                    </SelectTrigger>
                    <SelectContent className="z-[1100]" position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                      {DOMAIN_OPTIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Activity name</Label>
                  <Input
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      if (customErrors.name) setCustomErrors((x) => ({ ...x, name: undefined }));
                    }}
                    placeholder="Activity name"
                    className={cn(
                      'h-11 border bg-background placeholder:text-muted-foreground',
                      customErrors.name && 'border-red-400 ring-1 ring-red-200'
                    )}
                  />
                  {customErrors.name ? <p className="text-xs text-destructive">{customErrors.name}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Instructions</Label>
                  <Textarea
                    value={customInstructions}
                    onChange={(e) => {
                      setCustomInstructions(e.target.value);
                      if (customErrors.instructions) setCustomErrors((x) => ({ ...x, instructions: undefined }));
                    }}
                    placeholder="Instructions"
                    rows={5}
                    className={cn(
                      'min-h-[120px] resize-y border bg-background placeholder:text-muted-foreground',
                      customErrors.instructions && 'border-red-400 ring-1 ring-red-200'
                    )}
                  />
                  {customErrors.instructions ? <p className="text-xs text-destructive">{customErrors.instructions}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Materials required</Label>
                  <Input
                    value={customMaterials}
                    onChange={(e) => setCustomMaterials(e.target.value)}
                    placeholder="Materials required"
                    className="h-11 border bg-background placeholder:text-muted-foreground"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Frequency</Label>
                    <Select value={customFrequency} onValueChange={setCustomFrequency}>
                      <SelectTrigger className="h-11 border bg-background">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent className="z-[1100]" position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                        {FREQUENCY_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Difficulty</Label>
                    <Select
                      value={customDifficulty}
                      onValueChange={(v) => setCustomDifficulty(v as (typeof DIFFICULTY_OPTIONS)[number])}
                    >
                      <SelectTrigger className="h-11 border bg-background">
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent className="z-[1100]" position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={creatingActivity}
                  className="h-11 w-full border bg-card text-base font-medium text-foreground shadow-sm hover:bg-background"
                  onClick={() => void submitCustomActivity()}
                >
                  {creatingActivity ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Add activity
                </Button>
              </div>
            </div>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-3 border-t border pt-6">
              <h4 className="text-sm font-semibold text-foreground">Activities in this plan</h4>
              <ul className="space-y-3">
                {activities.map((a, idx) => (
                  <li
                    key={`${a.libraryActivityId ?? 'row'}-${idx}`}
                    className="rounded-lg border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        {a.libraryActivityId ? (
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-xs text-blue-900">
                            Saved activity
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Plan only
                          </Badge>
                        )}
                        <p className="font-medium text-foreground">{a.title || 'Untitled activity'}</p>
                        <Input
                          placeholder="Linked goal (optional)"
                          value={a.linkedGoal}
                          onChange={(e) => updateActivity(idx, { linkedGoal: e.target.value })}
                          className="max-w-md border bg-background text-sm"
                        />
                        <Textarea
                          value={a.description}
                          onChange={(e) => updateActivity(idx, { description: e.target.value })}
                          rows={3}
                          className="border bg-background text-sm"
                          placeholder="Description shown in plan"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeActivity(idx)} aria-label="Remove activity">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No activities in this plan yet. Use the library or the form above.</p>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-20 -mx-1 border-t bg-background/80 px-1 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex w-full max-w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={loading}
            onClick={saveDraft}
          >
            {loading && activeAction === 'draft' ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : null}
            Save draft
          </Button>
          <Button
            type="button"
            className="h-11"
            disabled={loading}
            onClick={submitTherapyPlan}
          >
            {loading && activeAction === 'submit' ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : null}
            Submit plan
          </Button>
        </div>
      </div>

      {hasPlan && planId ? (
        <Card className="border bg-muted/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-foreground">Compliance &amp; revisions</CardTitle>
            <CardDescription>
              Request supervising clinician approval, or publish a numbered revision after material goal changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="secondary"
              className="h-10 shrink-0"
              disabled={loading || approvalStatus === 'pending'}
              onClick={() => void submitForClinicianApproval()}
            >
              {loading && activeAction === 'approval' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Request clinician approval
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 shrink-0 border"
              disabled={loading}
              onClick={() => void publishPlanRevision()}
            >
              {loading && activeAction === 'revision' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publish plan revision
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
