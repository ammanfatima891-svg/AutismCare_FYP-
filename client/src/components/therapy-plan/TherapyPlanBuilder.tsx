import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activityAPI, therapyPlanAPI } from '../../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
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
const STATUS_OPTIONS = ['Active', 'Achieved', 'Modified'] as const;
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
  title: string;
  measurableCriteria: string;
  reviewDate: string;
  status: (typeof STATUS_OPTIONS)[number];
  domain: (typeof DOMAIN_OPTIONS)[number];
};

type Props = {
  caseId: string;
  /** Plan from case file aggregate (may be null). */
  plan: Record<string, unknown> | null;
  onSaved: () => void;
};

function emptyShortGoal(): ShortGoalRow {
  return {
    title: '',
    measurableCriteria: '',
    reviewDate: '',
    status: 'Active',
    domain: 'Speech',
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
  const [activeAction, setActiveAction] = useState<'draft' | 'submit' | null>(null);
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
        st.map((g: Record<string, unknown>) => ({
          title: String(g.title || ''),
          measurableCriteria: String(g.measurableCriteria || ''),
          reviewDate: g.reviewDate ? new Date(String(g.reviewDate)).toISOString().slice(0, 10) : '',
          status: (STATUS_OPTIONS.includes(g.status as never) ? g.status : 'Active') as ShortGoalRow['status'],
          domain: (DOMAIN_OPTIONS.includes(g.domain as never) ? g.domain : 'Speech') as ShortGoalRow['domain'],
        }))
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
          title: g.title.trim(),
          measurableCriteria: g.measurableCriteria.trim(),
          reviewDate: g.reviewDate || null,
          status: g.status,
          domain: g.domain,
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

  const planStatusLabel =
    hasPlan && plan
      ? String((plan as { status?: string }).status || ((plan as { draft?: boolean }).draft ? 'draft' : 'final'))
      : null;

  return (
    <div className="space-y-6">
      {planStatusLabel ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Plan status:</span>
          <Badge
            variant={planStatusLabel === 'final' ? 'default' : 'secondary'}
            className={planStatusLabel === 'final' ? 'bg-sky-600' : ''}
          >
            {planStatusLabel === 'final' ? 'Submitted' : 'Draft'}
          </Badge>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-sky-50/60">
          <CardTitle className="text-sky-900">Therapy domains</CardTitle>
          <CardDescription>Select all areas addressed in this plan</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {DOMAIN_OPTIONS.map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={domains.includes(d)} onCheckedChange={() => toggleDomain(d)} />
                <span>{d}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {domains.map((d) => (
              <Badge key={d} variant="outline" className="border-sky-200 bg-sky-50 text-sky-900">
                {d}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-sky-50/60">
          <CardTitle className="text-sky-900">Long-term goal</CardTitle>
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

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-sky-50/60">
          <div>
            <CardTitle className="text-sky-900">Short-term goals</CardTitle>
            <CardDescription>Linked to domains with status for progress tracking</CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addShortGoal}>
            <Plus className="mr-1 h-4 w-4" />
            Add goal
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Goal title</TableHead>
                  <TableHead>Measurable criteria</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Review date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortGoals.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        value={row.title}
                        onChange={(e) => updateShortGoal(idx, { title: e.target.value })}
                        placeholder="Goal title"
                        className="min-w-[140px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.measurableCriteria}
                        onChange={(e) => updateShortGoal(idx, { measurableCriteria: e.target.value })}
                        placeholder="Observable criteria"
                        className="min-w-[160px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.domain}
                        onValueChange={(v) => updateShortGoal(idx, { domain: v as ShortGoalRow['domain'] })}
                      >
                        <SelectTrigger className="w-[160px]">
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
                        className="w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.status}
                        onValueChange={(v) => updateShortGoal(idx, { status: v as ShortGoalRow['status'] })}
                      >
                        <SelectTrigger className="w-[130px]">
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeShortGoal(idx)}>
                        <Trash2 className="h-4 w-4 text-slate-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-sky-50/60">
          <CardTitle className="text-sky-900">Activity assignment</CardTitle>
          <CardDescription>Optional — add activities from your library or create and save new ones to this plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-800">Select from Activity Library</Label>
            <Button
              type="button"
              variant="outline"
              disabled={libraryLoading}
              className="h-12 w-full border-slate-300 bg-white text-base font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              onClick={openLibraryPicker}
            >
              {libraryLoading ? <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" /> : null}
              {libraryOpen ? 'Refresh activity list' : 'Browse Activity Library'}
            </Button>
            {libraryOpen ? (
              <div
                ref={libraryPanelRef}
                className="mt-3 rounded-lg border border-slate-200 bg-slate-50/90 p-4 shadow-inner ring-2 ring-sky-200/80"
                role="region"
                aria-label="Activity library results"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">Add from activity library</p>
                  <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-slate-600" onClick={() => setLibraryOpen(false)}>
                    Hide
                  </Button>
                </div>
                {libraryLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
                    <p className="text-sm text-slate-600">Loading activities…</p>
                  </div>
                ) : libraryItems.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No templates found. Create activities under <strong>Activity library</strong> on the dashboard or case
                    file, then use Refresh here.
                  </p>
                ) : (
                  <ul className="max-h-[min(50vh,420px)] space-y-2 overflow-y-auto pr-1">
                    {libraryItems.slice(0, 500).map((lib) => (
                      <li
                        key={lib._id}
                        className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{lib.name}</p>
                          <p className="text-xs text-slate-500">{lib.domain}</p>
                        </div>
                        <Button type="button" size="sm" className="shrink-0 bg-sky-600 hover:bg-sky-700" onClick={() => addFromLibrary(lib)}>
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
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs font-medium uppercase tracking-wide text-slate-500">
              <span className="bg-white px-4">OR</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-800">Add custom activity</Label>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-inner">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Domain</Label>
                  <Select
                    value={customDomain}
                    onValueChange={(v) => setCustomDomain(v as (typeof DOMAIN_OPTIONS)[number])}
                  >
                    <SelectTrigger className="h-11 border-slate-200 bg-[#f5f5f5]">
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
                  <Label className="text-xs font-medium text-slate-600">Activity name</Label>
                  <Input
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      if (customErrors.name) setCustomErrors((x) => ({ ...x, name: undefined }));
                    }}
                    placeholder="Activity name"
                    className={cn(
                      'h-11 border-slate-200 bg-[#f5f5f5] placeholder:text-slate-400',
                      customErrors.name && 'border-red-400 ring-1 ring-red-200'
                    )}
                  />
                  {customErrors.name ? <p className="text-xs text-red-600">{customErrors.name}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Instructions</Label>
                  <Textarea
                    value={customInstructions}
                    onChange={(e) => {
                      setCustomInstructions(e.target.value);
                      if (customErrors.instructions) setCustomErrors((x) => ({ ...x, instructions: undefined }));
                    }}
                    placeholder="Instructions"
                    rows={5}
                    className={cn(
                      'min-h-[120px] resize-y border-slate-200 bg-[#f5f5f5] placeholder:text-slate-400',
                      customErrors.instructions && 'border-red-400 ring-1 ring-red-200'
                    )}
                  />
                  {customErrors.instructions ? <p className="text-xs text-red-600">{customErrors.instructions}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Materials required</Label>
                  <Input
                    value={customMaterials}
                    onChange={(e) => setCustomMaterials(e.target.value)}
                    placeholder="Materials required"
                    className="h-11 border-slate-200 bg-[#f5f5f5] placeholder:text-slate-400"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Frequency</Label>
                    <Select value={customFrequency} onValueChange={setCustomFrequency}>
                      <SelectTrigger className="h-11 border-slate-200 bg-[#f5f5f5]">
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
                    <Label className="text-xs font-medium text-slate-600">Difficulty</Label>
                    <Select
                      value={customDifficulty}
                      onValueChange={(v) => setCustomDifficulty(v as (typeof DIFFICULTY_OPTIONS)[number])}
                    >
                      <SelectTrigger className="h-11 border-slate-200 bg-[#f5f5f5]">
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
                  className="h-11 w-full border-slate-300 bg-white text-base font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                  onClick={() => void submitCustomActivity()}
                >
                  {creatingActivity ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Add activity
                </Button>
              </div>
            </div>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-3 border-t border-slate-100 pt-6">
              <h4 className="text-sm font-semibold text-slate-900">Activities in this plan</h4>
              <ul className="space-y-3">
                {activities.map((a, idx) => (
                  <li
                    key={`${a.libraryActivityId ?? 'row'}-${idx}`}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        {a.libraryActivityId ? (
                          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-xs text-sky-900">
                            Saved activity
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Plan only
                          </Badge>
                        )}
                        <p className="font-medium text-slate-900">{a.title || 'Untitled activity'}</p>
                        <Input
                          placeholder="Linked goal (optional)"
                          value={a.linkedGoal}
                          onChange={(e) => updateActivity(idx, { linkedGoal: e.target.value })}
                          className="max-w-md border-slate-200 bg-slate-50 text-sm"
                        />
                        <Textarea
                          value={a.description}
                          onChange={(e) => updateActivity(idx, { description: e.target.value })}
                          rows={3}
                          className="border-slate-200 bg-slate-50 text-sm"
                          placeholder="Description shown in plan"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeActivity(idx)} aria-label="Remove activity">
                        <Trash2 className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No activities in this plan yet. Use the library or the form above.</p>
          )}
        </CardContent>
      </Card>

      <div
        className="mt-2 flex w-full max-w-full flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
        role="group"
        aria-label="Therapy plan actions"
      >
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-11 min-w-[140px] shrink-0 border-slate-300 bg-white px-4 text-slate-900',
            'hover:bg-slate-50'
          )}
          disabled={loading}
          onClick={saveDraft}
        >
          {loading && activeAction === 'draft' ? (
            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
          ) : null}
          Save Draft
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-11 min-w-[200px] shrink-0 border-slate-300 bg-white px-4 text-slate-900',
            'hover:bg-slate-50 sm:min-w-[220px]'
          )}
          disabled={loading}
          onClick={submitTherapyPlan}
        >
          {loading && activeAction === 'submit' ? (
            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-slate-900" aria-hidden />
          ) : null}
          Submit Therapy Plan
        </Button>
      </div>
    </div>
  );
}
