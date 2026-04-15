import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { therapyPlanAPI, therapistAPI } from '../../services/api';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';

type AssignedCaseRow = {
  caseId: string | { toString: () => string };
  childId?: string | { toString: () => string };
  childName?: string;
  referralId?: string;
};

type PlanRow = {
  _id: string;
  caseId: string | { toString: () => string };
  status?: string;
  draft?: boolean;
  updatedAt?: string;
  childName?: string;
  goalsCount?: number;
  progressPercent?: number;
  domainsPrimaryLabel?: string;
  domainsDisplay?: string;
  assignedChildId?: string | { toString: () => string };
};

type AssignContextData = {
  caseId: string;
  caseChildId: string;
  plans: Array<{ _id: string; label: string; status?: string; draft?: boolean; updatedAt?: string }>;
  children: Array<{ childId: string; firstName?: string; lastName?: string; displayName: string }>;
};

function fmtDate(iso: string | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function caseIdStr(id: string | { toString: () => string } | undefined) {
  if (id == null) return '';
  return typeof id === 'string' ? id : String(id);
}

/** Normalize assign/list API payload so `_id` is always a string for React keys and merge logic. */
function normalizePlanRow(raw: Record<string, unknown>): PlanRow {
  const id = raw._id != null ? String(raw._id) : raw.id != null ? String(raw.id) : '';
  return { ...raw, _id: id } as PlanRow;
}

export function TherapyPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignedCases, setAssignedCases] = useState<AssignedCaseRow[]>([]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCaseId, setAssignCaseId] = useState<string>('');
  const [assignContext, setAssignContext] = useState<AssignContextData | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [assignSaving, setAssignSaving] = useState(false);

  const loadPlans = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const res = await therapyPlanAPI.list();
      const body = res.data as { data?: PlanRow[] } | undefined;
      const rows = Array.isArray(body?.data) ? body.data.map((r) => normalizePlanRow(r as unknown as Record<string, unknown>)) : [];
      setPlans(rows);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      if (!silent) {
        setError(err.response?.data?.message || 'Failed to load therapy plans');
        setPlans([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadAssignedCases = useCallback(async () => {
    try {
      const res = await therapistAPI.getDashboardSummary();
      const data = (res.data as { data?: { assignedCases?: AssignedCaseRow[] } })?.data;
      setAssignedCases(Array.isArray(data?.assignedCases) ? data!.assignedCases! : []);
    } catch {
      setAssignedCases([]);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
    void loadAssignedCases();
  }, [loadPlans, loadAssignedCases]);

  const openAssignModal = () => {
    setAssignCaseId('');
    setAssignContext(null);
    setSelectedPlanId('');
    setSelectedChildId('');
    setAssignOpen(true);
  };

  useEffect(() => {
    if (!assignOpen || !assignCaseId) {
      setAssignContext(null);
      setSelectedPlanId('');
      setSelectedChildId('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setAssignLoading(true);
        const res = await therapyPlanAPI.getAssignContext(assignCaseId);
        const body = res.data as { data?: AssignContextData } | undefined;
        const data = body?.data;
        if (!cancelled && data) {
          setAssignContext(data);
          setSelectedPlanId(data.plans[0]?._id ?? '');
          setSelectedChildId(data.children[0]?.childId ?? '');
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        if (!cancelled) {
          setAssignContext(null);
          toast.error(err.response?.data?.message || 'Could not load case plans');
        }
      } finally {
        if (!cancelled) setAssignLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignOpen, assignCaseId]);

  const handleAssignPlan = async () => {
    if (!assignCaseId || !selectedPlanId || !selectedChildId) {
      toast.error('Select a case file, therapy plan, and child');
      return;
    }
    try {
      setAssignSaving(true);
      const res = await therapyPlanAPI.assignPlan({
        planId: selectedPlanId,
        childId: selectedChildId,
        caseId: assignCaseId,
      });
      const body = res.data as { therapyPlan?: Record<string, unknown> } | undefined;
      const tp = body?.therapyPlan;
      if (tp && typeof tp === 'object') {
        const row = normalizePlanRow(tp);
        const id = caseIdStr(row._id);
        setPlans((prev) => {
          const idx = prev.findIndex((p) => caseIdStr(p._id) === id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...row };
            return next;
          }
          return [row, ...prev];
        });
      }
      toast.success('Plan assigned');
      setAssignOpen(false);
      await loadPlans({ silent: true });
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Could not assign plan';
      if (err.response?.status === 409) {
        toast.warning(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setAssignSaving(false);
    }
  };

  const planStatusLabel = (p: PlanRow) => {
    if (p.assignedChildId != null && String(p.assignedChildId).length > 0) return 'Active';
    const s = p.status === 'final' || (!p.draft && p.status !== 'draft') ? 'final' : 'draft';
    return s === 'final' ? 'Active' : 'Draft';
  };

  const planStatusBadgeClass = (p: PlanRow) => {
    const active = planStatusLabel(p) === 'Active';
    return active
      ? 'rounded-full border-0 bg-primary px-3 py-1 text-xs font-medium text-white'
      : 'rounded-full border bg-muted px-3 py-1 text-xs font-medium text-foreground';
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-10 pt-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Therapy Plans</h1>
          <p className="text-base text-muted-foreground">Manage therapy plans and track goal progress</p>
        </div>
        <Button
          type="button"
          className="h-11 shrink-0 rounded-lg bg-primary px-5 text-white shadow-sm hover:bg-primary/90"
          onClick={openAssignModal}
        >
          <Plus className="mr-2 h-5 w-5" />
          + Create New Plan
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border bg-muted px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border-dashed border bg-background/90 px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">No therapy plans available</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Use <span className="font-medium">+ Create New Plan</span> to assign a plan from a case file, or open a
            case file to build goals.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const cid = caseIdStr(plan.caseId);
            const goals = plan.goalsCount ?? 0;
            const pct = plan.progressPercent ?? 0;
            const domainLine = plan.domainsPrimaryLabel || plan.domainsDisplay || 'Therapy plan';
            return (
              <li
                key={plan._id}
                className="flex min-w-0 flex-col rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="text-lg font-bold text-foreground">{plan.childName || 'Child'}</h2>
                      <p className="text-sm font-medium text-primary">{domainLine}</p>
                  </div>
                  <span className={cn('shrink-0', planStatusBadgeClass(plan))}>{planStatusLabel(plan)}</span>
                </div>

                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Overall progress</span>
                    <span className="tabular-nums text-foreground">{pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-end justify-between gap-2 border-t border pt-4 text-xs text-muted-foreground">
                  <span>
                    {goals} {goals === 1 ? 'goal' : 'goals'} defined
                  </span>
                  <span>Updated: {fmtDate(plan.updatedAt)}</span>
                </div>

                <div className="mt-5 w-full border-t border pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-h-[2.75rem] w-full border bg-card text-sm font-bold text-foreground hover:bg-background"
                    onClick={() => navigate(`/therapist/case/${cid}`)}
                  >
                    {'View & Edit'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choose a case file to see its therapy plans, then assign the plan to the child linked to that case.
          </p>
          <div className="space-y-2">
            <Label>Case file</Label>
            <Select value={assignCaseId || undefined} onValueChange={setAssignCaseId}>
              <SelectTrigger className="border bg-card">
                <SelectValue placeholder="Select case file" />
              </SelectTrigger>
              <SelectContent className="z-[1100]" position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                {assignedCases.map((c) => {
                  const id = caseIdStr(c.caseId);
                  return (
                    <SelectItem key={id} value={id}>
                      {c.childName || 'Child'} — case
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {assignCaseId ? (
            <div className="space-y-4">
              {assignLoading ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/80 px-3 py-3 text-sm text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading plans for this case…
                </div>
              ) : assignContext ? (
                <>
                  <div className="space-y-2">
                    <Label>Select therapy plan</Label>
                    <Select
                      value={selectedPlanId || undefined}
                      onValueChange={setSelectedPlanId}
                      disabled={assignContext.plans.length === 0}
                    >
                      <SelectTrigger className="border bg-card">
                        <SelectValue
                          placeholder={
                            assignContext.plans.length === 0 ? 'No plans available for this case' : 'Select plan'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="z-[1100]" position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                        {assignContext.plans.map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignContext.plans.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No plans available for this case. Open the{' '}
                        <button
                          type="button"
                          className="font-medium text-primary underline"
                          onClick={() => {
                            setAssignOpen(false);
                            navigate(`/therapist/case/${assignCaseId}`);
                          }}
                        >
                          case file
                        </button>{' '}
                        to add goals and save a plan.
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Select child</Label>
                    <Select
                      value={selectedChildId || undefined}
                      onValueChange={setSelectedChildId}
                      disabled={assignContext.children.length === 0}
                    >
                      <SelectTrigger className="border bg-card">
                        <SelectValue
                          placeholder={assignContext.children.length === 0 ? 'No children on file' : 'Select child'}
                        />
                      </SelectTrigger>
                      <SelectContent className="z-[1100]" position="popper" onCloseAutoFocus={(e) => e.preventDefault()}>
                        {assignContext.children.map((ch) => (
                          <SelectItem key={ch.childId} value={ch.childId}>
                            {ch.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignContext.children.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No child is linked to this case in the parent profile.</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Could not load case context.</p>
              )}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-lg bg-primary hover:bg-primary/90"
              disabled={
                !assignCaseId ||
                assignLoading ||
                assignSaving ||
                !assignContext ||
                assignContext.plans.length === 0 ||
                assignContext.children.length === 0 ||
                !selectedPlanId ||
                !selectedChildId
              }
              onClick={() => void handleAssignPlan()}
            >
              {assignSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
