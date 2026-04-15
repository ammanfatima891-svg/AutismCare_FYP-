import { startTransition, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import { activityAPI, therapistAPI } from '../../api';
import { cn } from '../ui/utils';

const selectClassName =
  'flex h-10 w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60';

type ActivityTemplate = {
  _id?: string;
  name?: string;
  domain?: string;
  materials?: string;
  instructions?: string;
  objective?: string;
  procedure?: string;
};

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
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fixedCaseId) setSelectedCaseId(fixedCaseId);
  }, [fixedCaseId]);

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

  const createAssignment = async () => {
    if (!effectiveCaseId) {
      setError('Select a child / case.');
      return;
    }
    if (!dueDate) {
      setError('Choose a due date.');
      return;
    }
    if (!activityId) {
      setError('Select an activity from the library.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await therapistAPI.createHomeAssignment({
        caseId: effectiveCaseId,
        activityId,
        dueDate,
        instructions: instructionsOverride.trim(),
        materials: '',
      });
      setActivityId('');
      setActivityQuery('');
      setInstructionsOverride('');
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
              placeholder="Search by name or domain (min. 2 characters)"
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
                  ? 'No templates in your library yet.'
                  : `Type at least 2 characters to search ${templates.length} activit${templates.length === 1 ? 'y' : 'ies'}.`}
              </p>
            ) : activityMatches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activities match that search.</p>
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
                  onChange={(e) => setActivityId(e.target.value)}
                >
                  <option value="">Select activity from results</option>
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
          {selectedTemplate.materials ? <p className="mt-1">Materials: {selectedTemplate.materials}</p> : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label className="text-foreground">Due date</Label>
        <Input type="date" className="border" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Instructions (optional override)</Label>
        <Textarea
          rows={4}
          className="border"
          placeholder="Leave blank to use the activity’s default instructions"
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
          disabled={saving || !dueDate || !activityId || !effectiveCaseId}
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
          Choose a library activity, set a due date, and optionally override instructions. Parents complete uploads from
          their dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">{body}</CardContent>
    </Card>
  );
}
