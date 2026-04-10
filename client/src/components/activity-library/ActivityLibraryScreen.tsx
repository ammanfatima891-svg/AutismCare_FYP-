import { useCallback, useEffect, startTransition, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Loader2, Copy, Pencil, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { activityAPI } from '../../api';
import type { ActivityTemplate } from './activityTypes';
import { FILTER_DOMAIN_OPTIONS } from './activityTypes';
import { ActivityTemplateFormDialog } from './ActivityTemplateFormDialog';

/** Friendlier labels for domain badges (UI only) */
const DOMAIN_DISPLAY: Record<string, string> = {
  Speech: 'Speech Therapy',
  OT: 'Occupational Therapy',
  Sensory: 'Sensory',
  Behavioral: 'Behavioral Therapy',
  'Behavioral (ABA)': 'ABA',
  AAC: 'AAC',
  PECS: 'PECS',
};

function domainLabel(domain: string | undefined) {
  if (!domain) return '—';
  return DOMAIN_DISPLAY[domain] || domain;
}

function previewText(s: string | undefined, max = 120) {
  const t = String(s || '').trim();
  if (!t) return '—';
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function activitySummary(a: { objective?: string; instructions?: string; procedure?: string }) {
  return String(a.instructions || a.objective || a.procedure || '').trim();
}

function ProcedureContent({ procedure }: { procedure?: string }) {
  const raw = String(procedure || '').trim();
  if (!raw) {
    return <p className="text-sm text-slate-500">—</p>;
  }
  const lines = raw
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return (
      <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700 marker:text-slate-500">
        {lines.slice(0, 8).map((line, i) => (
          <li key={i} className="pl-0.5">
            {line.replace(/^\d+[\).\s]+/, '').trim()}
          </li>
        ))}
      </ol>
    );
  }
  return <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{previewText(raw, 320)}</p>;
}

function isPlatformTemplate(a: ActivityTemplate) {
  if (a.isPlatformTemplate === true) return true;
  return a.createdBy == null || a.createdBy === '';
}

type Props = {
  caseId?: string;
  onAssignSuccess?: () => void | Promise<void>;
};

export function ActivityLibraryScreen({ caseId, onAssignSuccess }: Props) {
  const [items, setItems] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityTemplate | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignActivity, setAssignActivity] = useState<ActivityTemplate | null>(null);
  const [assignTarget, setAssignTarget] = useState<'home' | 'plan'>('home');
  const [assignDue, setAssignDue] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (domainFilter && domainFilter !== 'all') params.domain = domainFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const axiosRes = await activityAPI.listTemplates(params);
      const body = axiosRes.data as { data?: ActivityTemplate[] } | undefined;
      const list = Array.isArray(body?.data) ? body.data : [];
      setItems(list);
    } catch {
      toast.error('Failed to load activities');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [domainFilter, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearFilters = () => {
    setDomainFilter('all');
    setSearch('');
    setDebouncedSearch('');
  };

  const hasActiveFilters = domainFilter !== 'all' || debouncedSearch.trim().length > 0;

  const handleFormSaved = useCallback(() => {
    void load();
  }, [load]);

  const closeActivityForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  const openCreate = () => {
    startTransition(() => {
      setEditing(null);
      setFormOpen(true);
    });
  };

  const openEdit = (a: ActivityTemplate) => {
    startTransition(() => {
      setEditing(a);
      setFormOpen(true);
    });
  };

  const handleClone = async (a: ActivityTemplate) => {
    try {
      await activityAPI.cloneTemplate(a._id);
      toast.success('Activity cloned');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Clone failed');
    }
  };

  const openAssign = (a: ActivityTemplate) => {
    if (!caseId) {
      toast.message('Open a child therapy case file to assign activities.');
      return;
    }
    setAssignActivity(a);
    setAssignTarget('home');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setAssignDue(d.toISOString().slice(0, 10));
    setAssignOpen(true);
  };

  const submitAssign = async () => {
    if (!caseId || !assignActivity) return;
    if (assignTarget === 'home' && !assignDue) {
      toast.error('Due date is required for home assignments');
      return;
    }
    try {
      setAssignSaving(true);
      await activityAPI.assign(assignActivity._id, {
        caseId,
        assignTo: assignTarget,
        ...(assignTarget === 'home' ? { dueDate: new Date(assignDue).toISOString() } : {}),
      });
      toast.success(assignTarget === 'home' ? 'Home assignment created' : 'Activity added to therapy plan');
      setAssignOpen(false);
      if (onAssignSuccess) await onAssignSuccess();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page header — matches primary screens (Therapy Plans, Sessions) */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Activity Library</h1>
        <p className="text-base text-slate-600">Browse, search, and manage therapy activities.</p>
      </header>

      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <Label className="sr-only">Search activities</Label>
            <div className="flex h-11 w-full min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 shadow-sm transition-all focus-within:border-slate-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <Input
                type="search"
                autoComplete="off"
                aria-label="Search activities"
                className="h-full min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm shadow-none placeholder:text-slate-400 focus-visible:ring-0"
                placeholder="Search activities by name, objective, or materials…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setDebouncedSearch(search);
                }}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:max-w-[220px]">
                <Label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Domain
                </Label>
                <Select value={domainFilter} onValueChange={setDomainFilter}>
                  <SelectTrigger className="h-11 border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300">
                    <SelectValue placeholder="All domains" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    {FILTER_DOMAIN_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button
            type="button"
            id="activity-library-new-template"
            className="h-11 shrink-0 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98] lg:min-w-[180px]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openCreate();
            }}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden strokeWidth={2.5} />
            New Activity
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center sm:px-10">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">No activities found.</span>{' '}
            {hasActiveFilters
              ? 'Try adjusting search or domain, or create a new activity.'
              : 'Create an activity to use in therapy plans, sessions, and home assignments.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              className="rounded-lg bg-slate-900 px-6 font-semibold text-white shadow-sm hover:bg-slate-800"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openCreate();
              }}
            >
              <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
              New Activity
            </Button>
            {hasActiveFilters ? (
              <Button type="button" variant="outline" className="border-slate-300" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((a) => (
            <li
              key={a._id}
              className="group flex min-h-[320px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug tracking-tight text-slate-900">
                  {a.name}
                </h2>
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-md border-0 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
                >
                  {a.difficulty || 'Medium'}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {isPlatformTemplate(a) ? (
                  <Badge
                    variant="outline"
                    className="rounded-md border-slate-200 bg-white text-xs font-medium text-slate-700"
                  >
                    Platform
                  </Badge>
                ) : null}
                <Badge
                  variant="outline"
                  className="rounded-md border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                >
                  {domainLabel(a.domain)}
                </Badge>
              </div>

              <div className="mt-4 min-h-0 flex-1 space-y-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Objective</p>
                  <p className="mt-1.5 leading-relaxed text-slate-800">{previewText(a.objective || activitySummary(a), 220)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Procedure</p>
                  <ProcedureContent procedure={a.procedure} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Materials required</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    {a.materials ? previewText(a.materials, 240) : '—'}
                  </p>
                </div>
              </div>

              {a.frequency ? (
                <p className="mt-3 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Suggested frequency: </span>
                  {a.frequency}
                </p>
              ) : null}

              <div className="mt-auto border-t border-slate-100 pt-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 min-w-0 w-full border-slate-300 bg-white px-2 font-bold text-slate-800 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50 sm:px-3"
                    disabled={isPlatformTemplate(a)}
                    title={isPlatformTemplate(a) ? 'Platform templates cannot be edited — clone to customize' : undefined}
                    onClick={() => {
                      if (isPlatformTemplate(a)) return;
                      openEdit(a);
                    }}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 min-w-0 w-full border-slate-300 bg-white px-2 font-medium text-slate-800 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] sm:px-3"
                    onClick={() => void handleClone(a)}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Clone
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-10 min-w-0 w-full border border-slate-300 bg-white px-2 font-bold text-black shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:px-3"
                    onClick={() => openAssign(a)}
                    disabled={!caseId}
                    title={!caseId ? 'Open a case file to assign' : 'Assign to plan or home'}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <ActivityTemplateFormDialog
          key={editing?._id ?? 'new'}
          editing={editing}
          onClose={closeActivityForm}
          onSaved={handleFormSaved}
        />
      ) : null}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">Assign activity</DialogTitle>
          </DialogHeader>
          {assignActivity ? (
            <p className="text-sm font-medium text-slate-800">{assignActivity.name}</p>
          ) : null}
          <RadioGroup
            value={assignTarget}
            onValueChange={(v) => setAssignTarget(v as 'home' | 'plan')}
            className="grid gap-3 pt-2"
          >
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 has-[:checked]:border-slate-400 has-[:checked]:bg-slate-50">
              <RadioGroupItem value="home" id="assign-home" className="mt-0.5" />
              <div>
                <span className="text-sm font-medium text-slate-900">Home assignment</span>
                <p className="text-xs text-slate-600">Parent sees instructions and materials on their dashboard</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 has-[:checked]:border-slate-400 has-[:checked]:bg-slate-50">
              <RadioGroupItem value="plan" id="assign-plan" className="mt-0.5" />
              <div>
                <span className="text-sm font-medium text-slate-900">Therapy plan</span>
                <p className="text-xs text-slate-600">Adds this activity to the case therapy plan (requires a plan)</p>
              </div>
            </label>
          </RadioGroup>
          {assignTarget === 'home' ? (
            <div className="space-y-1.5 pt-2">
              <Label className="text-slate-700">Due date</Label>
              <Input type="date" value={assignDue} onChange={(e) => setAssignDue(e.target.value)} className="border-slate-200" />
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="border-slate-300" onClick={() => setAssignOpen(false)} disabled={assignSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-slate-900 font-semibold text-white hover:bg-slate-800"
              onClick={() => void submitAssign()}
              disabled={assignSaving || (assignTarget === 'home' && !assignDue)}
            >
              {assignSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
