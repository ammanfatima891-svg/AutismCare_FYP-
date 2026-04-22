import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { evaluationAPI, referralAPI, integrationAPI } from '../../services/api';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { AlertCircle, Loader2, Info } from 'lucide-react';

export type EvaluationStatus = 'DRAFT' | 'FINALIZED';
export type FinalDisposition = 'MONITORING' | 'REFER_THERAPY';

export type ObservationTag =
  | 'Eye Contact Issues'
  | 'Delayed Speech'
  | 'Repetitive Behavior'
  | 'Social Withdrawal';

export type ObservationSeverity = '' | 'Mild' | 'Moderate' | 'Severe';

export type PrimaryDiagnosis = '' | 'ASD' | 'Speech Delay' | 'ADHD' | 'Typical Development';
export type ConfidenceLevel = '' | 'Low' | 'Medium' | 'High';
export type ASDSeverityLevel = '' | 'Level 1' | 'Level 2' | 'Level 3';

export type FollowUpOption = '' | '1 Month' | '3 Months' | '6 Months';

export interface EvaluationDraft {
  observations:
    | string
    | {
        tags: ObservationTag[];
        severity: ObservationSeverity;
        notes: string;
      };
  developmentalSummary:
    | string
    | {
        asq3?: any;
        mchat?: any;
        override?: {
          communication?: string;
          motorSkills?: string;
          social?: string;
        };
        notes?: string;
      };
  diagnosis:
    | string
    | {
        primary: PrimaryDiagnosis;
        primaryFreeText?: string;
        confidence: ConfidenceLevel;
        severityLevel: ASDSeverityLevel;
        rationale: string;
      };
  comorbidConditions: string[];
  recommendations:
    | string
    | {
        therapies: string[];
        therapiesFreeText?: string[];
        followUp: FollowUpOption;
        followUpFreeText?: string;
      };
  finalDisposition?: FinalDisposition | '';
}

export type EvaluationDecision = {
  referralRequired: boolean;
  suggestedSpecialists: string[];
  suggestFurtherTesting: boolean;
};

interface EvaluationFormProps {
  title: string;
  initialValue?: Partial<EvaluationDraft>;
  caseId?: string;
  submitting?: boolean;
  readOnly?: boolean;
  onSubmit: (payload: EvaluationDraft, status: EvaluationStatus) => Promise<void> | void;
}

const emptyDraft: EvaluationDraft = {
  observations: { tags: [], severity: '', notes: '' },
  developmentalSummary: { asq3: null, mchat: null, override: {}, notes: '' },
  diagnosis: { primary: '', primaryFreeText: '', confidence: '', severityLevel: '', rationale: '' },
  comorbidConditions: [],
  recommendations: { therapies: [], therapiesFreeText: [], followUp: '', followUpFreeText: '' },
  finalDisposition: '',
};

function normalizeToStructured(initial?: Partial<EvaluationDraft>): EvaluationDraft {
  const base = { ...emptyDraft, ...initial } as EvaluationDraft;

  // Backward compatibility: if legacy strings exist, keep them in notes/rationale where possible.
  const obs = base.observations;
  if (typeof obs === 'string') {
    base.observations = { tags: [], severity: '', notes: obs };
  } else {
    base.observations = {
      tags: Array.isArray(obs?.tags) ? obs.tags : [],
      severity: (obs?.severity as any) || '',
      notes: String(obs?.notes || ''),
    };
  }

  const dev = base.developmentalSummary;
  if (typeof dev === 'string') {
    base.developmentalSummary = { asq3: null, mchat: null, override: {}, notes: dev };
  } else {
    base.developmentalSummary = {
      asq3: dev?.asq3 ?? null,
      mchat: dev?.mchat ?? null,
      override: dev?.override ?? {},
      notes: String(dev?.notes || ''),
    };
  }

  const dx = base.diagnosis;
  if (typeof dx === 'string') {
    base.diagnosis = { primary: '', primaryFreeText: '', confidence: '', severityLevel: '', rationale: dx };
  } else {
    base.diagnosis = {
      primary: (dx?.primary as any) || '',
      primaryFreeText: String(dx?.primaryFreeText || ''),
      confidence: (dx?.confidence as any) || '',
      severityLevel: (dx?.severityLevel as any) || '',
      rationale: String(dx?.rationale || ''),
    };
  }

  const rec = base.recommendations;
  if (typeof rec === 'string') {
    base.recommendations = { therapies: [], followUp: '', notes: rec } as any;
    // note: we don't store recommendations.notes in schema; keep it in rationale/notes if desired.
    base.recommendations = { therapies: [], therapiesFreeText: [], followUp: '', followUpFreeText: '' };
  } else {
    base.recommendations = {
      therapies: Array.isArray(rec?.therapies) ? rec.therapies : [],
      therapiesFreeText: Array.isArray(rec?.therapiesFreeText) ? rec.therapiesFreeText : [],
      followUp: (rec?.followUp as any) || '',
      followUpFreeText: String(rec?.followUpFreeText || ''),
    };
  }

  base.comorbidConditions = Array.isArray(base.comorbidConditions) ? base.comorbidConditions : [];
  base.finalDisposition = (base.finalDisposition as any) || '';
  return base;
}

export function EvaluationForm({
  title,
  initialValue,
  caseId,
  submitting = false,
  readOnly = false,
  onSubmit,
}: EvaluationFormProps) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingDev, setLoadingDev] = useState(false);
  const [devSummary, setDevSummary] = useState<any>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [creatingReferral, setCreatingReferral] = useState(false);
  const [caseChildId, setCaseChildId] = useState<string | null>(null);
  const [referralNotes, setReferralNotes] = useState('');
  const [selectedSpecialists, setSelectedSpecialists] = useState<string[]>([]);

  const form = useForm<EvaluationDraft>({
    defaultValues: normalizeToStructured(initialValue),
    mode: 'onChange',
  });

  const steps = ['Observations', 'Development Summary', 'Diagnosis', 'Recommendations', 'Review & Finalize'];
  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step, steps.length]);

  const watchAll = form.watch();

  const diagnosisPrimary = useWatch({ control: form.control, name: 'diagnosis.primary' });
  const recommendationsTherapies = useWatch({ control: form.control, name: 'recommendations.therapies' });
  const recommendationsFollowUp = useWatch({ control: form.control, name: 'recommendations.followUp' });

  const decision: EvaluationDecision = useMemo(() => resolveEvaluationDecision(watchAll), [watchAll]);
  const finalDisposition = useWatch({ control: form.control, name: 'finalDisposition' as any });

  const canContinue = useMemo(() => {
    if (readOnly) return false;
    if (step === 2) {
      // Primary diagnosis supports "Other" via free text; enforce either a known option or free text.
      const dx = form.getValues('diagnosis') as any;
      const primary =
        dx?.primary === 'Other'
          ? String(dx?.primaryFreeText || '').trim()
          : String(diagnosisPrimary || '').trim();
      return !!primary;
    }
    if (step === 3) {
      const therapies = Array.isArray(recommendationsTherapies) ? recommendationsTherapies : [];
      const rec = form.getValues('recommendations') as any;
      const followUp =
        rec?.followUp === 'Other'
          ? String(rec?.followUpFreeText || '').trim()
          : String(recommendationsFollowUp || '').trim();
      return therapies.length > 0 && !!followUp;
    }
    return true;
  }, [readOnly, step, diagnosisPrimary, recommendationsTherapies, recommendationsFollowUp, form]);

  useEffect(() => {
    // Load case->childId for referral prefill + to fetch screening summaries.
    if (!caseId) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await integrationAPI.getCaseSummary(caseId);
        const childId = data?.data?.childInfo?.childId;
        if (alive) setCaseChildId(childId ? String(childId) : null);
      } catch {
        // silent: not critical for evaluation save
      }
    })();
    return () => {
      alive = false;
    };
  }, [caseId]);

  useEffect(() => {
    if (!caseId) return;
    let alive = true;
    (async () => {
      try {
        setLoadingDev(true);
        const { data } = await evaluationAPI.getDevelopmentSummary(caseId);
        if (!alive) return;
        setDevSummary(data?.data || null);

        // Pre-fill structured dev summary into form if empty / first load.
        const current = form.getValues('developmentalSummary') as any;
        if (current && typeof current === 'object') {
          form.setValue(
            'developmentalSummary',
            { ...current, asq3: data?.data?.asq3 || null, mchat: data?.data?.mchat || null },
            { shouldDirty: false }
          );
        }
      } catch {
        if (alive) setDevSummary(null);
      } finally {
        if (alive) setLoadingDev(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Keep referral modal selections synced to decision output (best-effort).
    const suggested = decision?.suggestedSpecialists || [];
    setSelectedSpecialists((prev) => (prev.length ? prev : suggested));
  }, [decision?.suggestedSpecialists]);

  const next = () => {
    setError(null);
    if (step === 2) {
      const dx = form.getValues('diagnosis') as any;
      const primary =
        typeof dx === 'string'
          ? dx.trim()
          : dx?.primary === 'Other'
            ? String(dx?.primaryFreeText || '').trim()
            : String(dx?.primary || '').trim();
      if (!primary) {
        setError('Primary diagnosis is required before proceeding.');
        return;
      }
    }
    if (step === 3) {
      const rec = form.getValues('recommendations') as any;
      const therapies = typeof rec === 'string' ? [] : Array.isArray(rec?.therapies) ? rec.therapies : [];
      const followUp =
        typeof rec === 'string'
          ? ''
          : rec?.followUp === 'Other'
            ? String(rec?.followUpFreeText || '').trim()
            : String(rec?.followUp || '').trim();
      if (therapies.length === 0 || !followUp) {
        setError('Select at least one therapy and a follow-up interval.');
        return;
      }
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const saveDraft = async () => {
    setError(null);
    await onSubmit(form.getValues(), 'DRAFT');
  };

  const finalize = async () => {
    setError(null);
    const disp = String((form.getValues() as any)?.finalDisposition || '').trim().toUpperCase();
    if (disp !== 'MONITORING' && disp !== 'REFER_THERAPY') {
      setError('Choose a final disposition (Monitoring or Refer to therapy) before finalizing.');
      return;
    }
    setFinalizing(true);
    try {
      await onSubmit(form.getValues(), 'FINALIZED');
      if (disp === 'REFER_THERAPY') setReferralOpen(true);
    } finally {
      setFinalizing(false);
    }
  };

  const createReferralsFromSpecialists = async () => {
    if (!caseId) return;
    if (!selectedSpecialists.length) {
      setError('Select at least one specialist to create referral(s), or click Skip.');
      return;
    }
    setCreatingReferral(true);
    setError(null);
    try {
      // Create one referral per suggested specialist using existing API contract.
      for (const therapistType of selectedSpecialists) {
        await referralAPI.create({
          caseId,
          therapistType,
          priority: 'medium',
          notes: referralNotes.trim(),
          childId: caseChildId,
          diagnosis: (form.getValues('diagnosis') as any)?.primary || '',
          specialists: selectedSpecialists,
        });
      }
      setReferralOpen(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create referral');
    } finally {
      setCreatingReferral(false);
    }
  };

  return (
    <Card className="border shadow-sm bg-card">
      <CardHeader className="border-b border bg-blue-50/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-blue-900">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Step {step + 1} of {steps.length} · {steps[step]}
            </p>
          </div>
          <div className="w-40">
            <Progress value={progress} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        {error && (
          <div className="rounded-lg border bg-muted px-4 py-3 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {decision.referralRequired && (
          <div className="rounded-lg border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">Referral Recommended</span>
            </div>
            <p className="mt-1 text-xs">
              Suggested specialists: {(decision.suggestedSpecialists || []).join(', ') || '—'}
            </p>
          </div>
        )}

        {step === 0 ? (
          <ObservationsStep control={form.control} readOnly={readOnly || submitting} />
        ) : null}

        {step === 1 ? (
          <DevelopmentSummaryStep
            control={form.control}
            readOnly={readOnly || submitting}
            loading={loadingDev}
            summary={devSummary}
          />
        ) : null}

        {step === 2 ? (
          <DiagnosisStep control={form.control} readOnly={readOnly || submitting} />
        ) : null}

        {step === 3 ? (
          <RecommendationsStep control={form.control} readOnly={readOnly || submitting} />
        ) : null}

        {step === 4 ? (
          <ReviewStep value={form.getValues()} decision={decision} />
        ) : null}

        {!readOnly && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={back} disabled={submitting || step === 0}>
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button type="button" onClick={next} disabled={submitting || !canContinue}>
                  Next
                </Button>
              ) : null}
            </div>

            <div className="flex gap-2 sm:justify-end">
              {step === steps.length - 1 ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={String(finalDisposition || '')}
                    onValueChange={(v) => form.setValue('finalDisposition' as any, v as any, { shouldDirty: true })}
                    disabled={submitting || finalizing}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Final disposition (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONITORING">Monitoring (no referral)</SelectItem>
                      <SelectItem value="REFER_THERAPY">Refer to therapy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={saveDraft}
                data-testid="save-draft-button"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Draft
              </Button>
              {step === steps.length - 1 ? (
                <Button
                  type="button"
                  className="border-blue-700"
                  style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
                  disabled={submitting || finalizing}
                  onClick={finalize}
                  data-testid="finalize-evaluation-button"
                >
                  {finalizing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Finalize Evaluation
                </Button>
              ) : null}
            </div>
          </div>
        )}

        <Dialog open={referralOpen} onOpenChange={setReferralOpen}>
          <DialogContent hideCloseButton={creatingReferral}>
            <DialogHeader>
              <DialogTitle>Create Referral</DialogTitle>
              <DialogDescription>
                Referral is recommended based on the evaluation decision engine. Create one or more referrals now, or skip.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                <div className="font-medium">Suggested specialists</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(decision.suggestedSpecialists || []).map((s) => {
                    const checked = selectedSpecialists.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs ${
                          checked ? 'bg-blue-600 text-white border-blue-600' : 'bg-background'
                        }`}
                        onClick={() => {
                          setSelectedSpecialists((prev) =>
                            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                          );
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  placeholder="Optional notes for the therapist(s)."
                  rows={4}
                  disabled={creatingReferral}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReferralOpen(false)} disabled={creatingReferral}>
                Skip
              </Button>
              <Button type="button" onClick={createReferralsFromSpecialists} disabled={creatingReferral}>
                {creatingReferral ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Referral
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function resolveEvaluationDecision(data: EvaluationDraft): EvaluationDecision {
  const result: EvaluationDecision = {
    referralRequired: false,
    suggestedSpecialists: [],
    suggestFurtherTesting: false,
  };

  const dx = data?.diagnosis as any;
  const primary =
    typeof dx === 'string'
      ? dx
      : dx?.primary === 'Other'
        ? String(dx?.primaryFreeText || '')
        : dx?.primary;
  const severityLevel = typeof dx === 'string' ? '' : dx?.severityLevel;
  const confidence = typeof dx === 'string' ? '' : dx?.confidence;

  const obs = data?.observations as any;
  const obsTags = typeof obs === 'object' && Array.isArray(obs?.tags) ? obs.tags.map((t: any) => String(t)) : [];

  const dev = data?.developmentalSummary as any;
  const mchat = typeof dev === 'object' ? dev?.mchat : null;
  const asq3 = typeof dev === 'object' ? dev?.asq3 : null;

  const comorbid = Array.isArray(data?.comorbidConditions) ? data.comorbidConditions.map(String) : [];

  const add = (...items: string[]) => {
    for (const it of items) {
      if (!it) continue;
      if (!result.suggestedSpecialists.includes(it)) result.suggestedSpecialists.push(it);
    }
  };

  // ASD mapping (mirrors backend engine)
  if (primary === 'ASD') {
    add('Further Testing');
    result.suggestFurtherTesting = true;

    if (severityLevel === 'Level 2' || severityLevel === 'Level 3') {
      result.referralRequired = true;
      add('Speech Therapist', 'Behavioral Therapist', 'Occupational Therapist');
    } else {
      add('Speech Therapist', 'Parent Training');
    }
  }

  // M-CHAT mapping (riskLevel/result from backend summary)
  const mchatRisk = mchat?.riskLevel ? String(mchat.riskLevel).toLowerCase() : '';
  const mchatResult = mchat?.result ? String(mchat.result).toLowerCase() : '';
  if (mchatRisk === 'high' || mchatResult === 'fail') {
    result.referralRequired = true;
    add('Further Testing', 'Early Intervention');
  } else if (mchatRisk === 'medium' || mchatResult === 'monitor') {
    result.suggestFurtherTesting = true;
    add('Further Testing');
  }

  // ASQ-3 mapping (domainStatuses labels)
  const domainStatuses = asq3?.domainStatuses && typeof asq3.domainStatuses === 'object' ? asq3.domainStatuses : null;
  if (domainStatuses) {
    const entries = Object.entries(domainStatuses);
    const anyAtRisk = entries.some(([_, v]: any) => String(v?.label || '').toLowerCase().includes('risk') || String(v?.label || '').toLowerCase().includes('further'));
    const anyMonitoring = entries.some(([_, v]: any) => String(v?.label || '').toLowerCase().includes('monitor'));
    if (anyAtRisk) {
      result.suggestFurtherTesting = true;
      add('Early Intervention', 'Further Testing');
    } else if (anyMonitoring) {
      result.suggestFurtherTesting = true;
    }
  }

  // Speech delay mapping
  if (primary === 'Speech Delay' || obsTags.includes('Delayed Speech')) {
    add('Speech Therapist', 'Audiologist');
  }

  // Comorbid mapping
  if (primary === 'ADHD' || comorbid.includes('ADHD')) {
    result.suggestFurtherTesting = true;
    add('Further Testing');
  }
  if (comorbid.includes('Anxiety')) {
    add('Child Psychologist');
  }
  if (comorbid.includes('Epilepsy')) {
    result.referralRequired = true;
    add('Pediatric Neurologist');
  }

  // Low confidence
  if (confidence === 'Low') {
    result.suggestFurtherTesting = true;
    add('Further Testing');
  }

  return result;
}

function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{text}</TooltipContent>
    </Tooltip>
  );
}

function ObservationsStep({ control, readOnly }: { control: any; readOnly: boolean }) {
  const tags: ObservationTag[] = [
    'Eye Contact Issues',
    'Delayed Speech',
    'Repetitive Behavior',
    'Social Withdrawal',
  ];
  const severities: ObservationSeverity[] = ['', 'Mild', 'Moderate', 'Severe'];
  const [customTag, setCustomTag] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label>Observation Tags</Label>
        <FieldHelp text="Focus on observable behavior during interaction and assessment." />
      </div>
      <Controller
        control={control}
        name="observations.tags"
        render={({ field }) => (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const active = Array.isArray(field.value) && field.value.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={readOnly}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      active ? 'bg-blue-600 text-white border-blue-600' : 'bg-background'
                    } ${readOnly ? 'opacity-60' : ''}`}
                    onClick={() => {
                      const next = active ? field.value.filter((x: string) => x !== t) : [...(field.value || []), t];
                      field.onChange(next);
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Add custom observation tag"
                disabled={readOnly}
              />
              <Button
                type="button"
                variant="outline"
                disabled={readOnly || !customTag.trim()}
                onClick={() => {
                  const next = customTag.trim();
                  if (!next) return;
                  const current = Array.isArray(field.value) ? field.value : [];
                  if (!current.includes(next)) field.onChange([...current, next]);
                  setCustomTag('');
                }}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can add a custom tag if the preset list doesn’t fit.
            </p>
          </div>
        )}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Severity</Label>
          <FieldHelp text="Choose the overall severity of the observed concerns; use Notes to justify." />
        </div>
        <Controller
          control={control}
          name="observations.severity"
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {severities.filter(Boolean).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Notes</Label>
          <FieldHelp text="Include examples, contexts, triggers, and frequency/duration when relevant." />
        </div>
        <Controller
          control={control}
          name="observations.notes"
          render={({ field }) => (
            <Textarea
              value={field.value || ''}
              onChange={field.onChange}
              placeholder="Add supporting notes (context, triggers, examples)."
              rows={4}
              disabled={readOnly}
            />
          )}
        />
      </div>
    </div>
  );
}

function DevelopmentSummaryStep({
  control,
  readOnly,
  loading,
  summary,
}: {
  control: any;
  readOnly: boolean;
  loading: boolean;
  summary: any;
}) {
  const domainBadge = (flag: string) => {
    if (flag === 'ok') return 'bg-green-100 text-green-800 border-green-200';
    if (flag === 'warn') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-muted text-foreground border';
  };

  const asqDomains = summary?.asq3?.domainStatuses || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Screening Summary</Label>
          <FieldHelp text="Pulled from latest ASQ-3 and M-CHAT-R submissions for this child (editable override below)." />
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="text-sm font-medium">ASQ-3</div>
        {summary?.asq3 ? (
          <div className="flex flex-wrap gap-2">
            {Object.keys(asqDomains).length ? (
              Object.entries(asqDomains).map(([domain, v]: any) => (
                <Badge key={domain} variant="outline" className={domainBadge(v?.flag)}>
                  {domain}: {v?.label}
                </Badge>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No domain statuses available.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No ASQ-3 submission found.</p>
        )}

        <div className="text-sm font-medium pt-2">M-CHAT-R</div>
        {summary?.mchat ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-muted text-foreground border">
              Result: {summary.mchat.result || '—'}
            </Badge>
            <Badge variant="outline" className="bg-muted text-foreground border">
              Risk: {summary.mchat.riskLevel || 'unknown'}
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No M-CHAT-R submission found.</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="text-sm font-medium">Clinician Override</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Communication</Label>
            <Controller
              control={control}
              name="developmentalSummary.override.communication"
              render={({ field }) => (
                <Input
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="e.g. Delayed"
                  disabled={readOnly}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Motor Skills</Label>
            <Controller
              control={control}
              name="developmentalSummary.override.motorSkills"
              render={({ field }) => (
                <Input
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="e.g. Normal"
                  disabled={readOnly}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Social</Label>
            <Controller
              control={control}
              name="developmentalSummary.override.social"
              render={({ field }) => (
                <Input
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="e.g. At Risk"
                  disabled={readOnly}
                />
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Notes</Label>
          <Controller
            control={control}
            name="developmentalSummary.notes"
            render={({ field }) => (
              <Textarea
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="Optional notes about screening interpretation."
                rows={3}
                disabled={readOnly}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

function DiagnosisStep({ control, readOnly }: { control: any; readOnly: boolean }) {
  const diagnoses = ['ASD', 'Speech Delay', 'ADHD', 'Typical Development', 'Other'] as const;
  const confidence: ConfidenceLevel[] = ['', 'Low', 'Medium', 'High'];
  const severity: ASDSeverityLevel[] = ['', 'Level 1', 'Level 2', 'Level 3'];
  const comorbidOptions = ['ADHD', 'Anxiety', 'Epilepsy', 'None'];
  const [customComorbid, setCustomComorbid] = useState('');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Primary Diagnosis</Label>
            <FieldHelp text="Required. Select the most likely primary diagnosis for decision support." />
          </div>
          <Controller
            control={control}
            name="diagnosis.primary"
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange} disabled={readOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Select diagnosis" />
                </SelectTrigger>
                <SelectContent>
                  {diagnoses.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">This field is required to continue.</p>
          <Controller
            control={control}
            name="diagnosis.primaryFreeText"
            render={({ field, formState }) => (
              <Controller
                control={control}
                name="diagnosis.primary"
                render={({ field: primaryField }) =>
                  primaryField.value === 'Other' ? (
                    <div className="pt-2 space-y-2">
                      <Label className="text-xs">Other (free text)</Label>
                      <Input
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Type the diagnosis label you want to use"
                        disabled={readOnly}
                      />
                      <p className="text-xs text-muted-foreground">
                        This will be stored as the primary diagnosis text.
                      </p>
                    </div>
                  ) : null
                }
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Confidence Level</Label>
            <FieldHelp text="How confident are you in the primary diagnosis based on the available information?" />
          </div>
          <Controller
            control={control}
            name="diagnosis.confidence"
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange} disabled={readOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Select confidence" />
                </SelectTrigger>
                <SelectContent>
                  {confidence.filter(Boolean).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>ASD Severity Level</Label>
          <FieldHelp text="If ASD is selected, choose Level 1–3; otherwise you can leave this blank." />
        </div>
        <Controller
          control={control}
          name="diagnosis.severityLevel"
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select severity level" />
              </SelectTrigger>
              <SelectContent>
                {severity.filter(Boolean).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Rationale</Label>
          <FieldHelp text="Summarize key findings supporting your diagnosis (observable + screening + history)." />
        </div>
        <Controller
          control={control}
          name="diagnosis.rationale"
          render={({ field }) => (
            <Textarea
              value={field.value || ''}
              onChange={field.onChange}
              placeholder="Summarize rationale supporting diagnosis."
              rows={4}
              disabled={readOnly}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Comorbid Conditions</Label>
          <FieldHelp text="Select applicable comorbidities. Choose 'None' if not present." />
        </div>
        <Controller
          control={control}
          name="comorbidConditions"
          render={({ field }) => (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {comorbidOptions.map((opt) => {
                  const active = Array.isArray(field.value) && field.value.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={readOnly}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        active ? 'bg-blue-600 text-white border-blue-600' : 'bg-background'
                      } ${readOnly ? 'opacity-60' : ''}`}
                      onClick={() => {
                        let next: string[] = Array.isArray(field.value) ? [...field.value] : [];
                        if (opt === 'None') {
                          next = active ? [] : ['None'];
                        } else {
                          next = next.filter((x) => x !== 'None');
                          next = active ? next.filter((x) => x !== opt) : [...next, opt];
                        }
                        field.onChange(next);
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Input
                  value={customComorbid}
                  onChange={(e) => setCustomComorbid(e.target.value)}
                  placeholder="Add custom comorbid condition"
                  disabled={readOnly}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={readOnly || !customComorbid.trim()}
                  onClick={() => {
                    const next = customComorbid.trim();
                    if (!next) return;
                    const current = Array.isArray(field.value) ? field.value : [];
                    const cleaned = current.filter((x) => x !== 'None');
                    if (!cleaned.includes(next)) field.onChange([...cleaned, next]);
                    setCustomComorbid('');
                  }}
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">You can add a custom comorbid if needed.</p>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function RecommendationsStep({ control, readOnly }: { control: any; readOnly: boolean }) {
  const therapyOptions = [
    'Speech Therapy',
    'Occupational Therapy',
    'Behavioral Therapy',
    'Parent Training',
  ];
  const followUps: FollowUpOption[] = ['', '1 Month', '3 Months', '6 Months'];
  const [customTherapy, setCustomTherapy] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label>Therapies</Label>
        <FieldHelp text="Select recommended therapy pathways. At least one is required." />
      </div>
      <Controller
        control={control}
        name="recommendations.therapies"
        render={({ field }) => (
          <div className="space-y-3">
            {therapyOptions.map((t) => {
              const checked = Array.isArray(field.value) && field.value.includes(t);
              return (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const isChecked = Boolean(v);
                      const next = isChecked
                        ? [...(field.value || []), t]
                        : (field.value || []).filter((x: string) => x !== t);
                      field.onChange(next);
                    }}
                    disabled={readOnly}
                  />
                  <span>{t}</span>
                </label>
              );
            })}

            <div className="flex gap-2 pt-1">
              <Input
                value={customTherapy}
                onChange={(e) => setCustomTherapy(e.target.value)}
                placeholder="Add custom therapy recommendation"
                disabled={readOnly}
              />
              <Button
                type="button"
                variant="outline"
                disabled={readOnly || !customTherapy.trim()}
                onClick={() => {
                  const next = customTherapy.trim();
                  if (!next) return;
                  const current = Array.isArray(field.value) ? field.value : [];
                  if (!current.includes(next)) field.onChange([...current, next]);
                  setCustomTherapy('');
                }}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Add custom therapies if needed.</p>
          </div>
        )}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Follow-up</Label>
          <FieldHelp text="Choose a follow-up interval; use custom text if you need a different cadence." />
        </div>
        <Controller
          control={control}
          name="recommendations.followUp"
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={field.onChange} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="Select follow-up" />
              </SelectTrigger>
              <SelectContent>
                {followUps.filter(Boolean).map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <Controller
          control={control}
          name="recommendations.followUpFreeText"
          render={({ field }) => (
            <Controller
              control={control}
              name="recommendations.followUp"
              render={({ field: fuField }) =>
                fuField.value === 'Other' ? (
                  <div className="pt-2 space-y-2">
                    <Label className="text-xs">Other follow-up (free text)</Label>
                    <Input
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="e.g. 2 Weeks, Weekly, Next visit"
                      disabled={readOnly}
                    />
                  </div>
                ) : null
              }
            />
          )}
        />
        <p className="text-xs text-muted-foreground">Follow-up is required.</p>
      </div>
    </div>
  );
}

function ReviewStep({ value, decision }: { value: EvaluationDraft; decision: EvaluationDecision }) {
  const obs = value.observations as any;
  const dev = value.developmentalSummary as any;
  const dx = value.diagnosis as any;
  const rec = value.recommendations as any;

  const fmt = (v: any) => (v == null || v === '' ? '—' : String(v));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="font-medium text-sm">Observations</div>
        <div className="text-xs text-muted-foreground">
          Tags: {Array.isArray(obs?.tags) && obs.tags.length ? obs.tags.join(', ') : '—'}
        </div>
        <div className="text-xs text-muted-foreground">Severity: {fmt(obs?.severity)}</div>
        <div className="text-sm whitespace-pre-wrap">{fmt(obs?.notes)}</div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="font-medium text-sm">Development Summary</div>
        <div className="text-xs text-muted-foreground">
          Overrides: {fmt(dev?.override?.communication)} / {fmt(dev?.override?.motorSkills)} / {fmt(dev?.override?.social)}
        </div>
        <div className="text-sm whitespace-pre-wrap">{fmt(dev?.notes)}</div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="font-medium text-sm">Diagnosis</div>
        <div className="text-sm">Primary: {fmt(dx?.primary)}</div>
        <div className="text-xs text-muted-foreground">
          Confidence: {fmt(dx?.confidence)} · Severity: {fmt(dx?.severityLevel)}
        </div>
        <div className="text-sm whitespace-pre-wrap">{fmt(dx?.rationale)}</div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="font-medium text-sm">Comorbid Conditions</div>
        <div className="flex flex-wrap gap-2">
          {Array.isArray(value.comorbidConditions) && value.comorbidConditions.length ? (
            value.comorbidConditions.map((c) => (
              <Badge key={c} variant="outline">
                {c}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="font-medium text-sm">Recommendations</div>
        <div className="text-sm">
          Therapies: {Array.isArray(rec?.therapies) && rec.therapies.length ? rec.therapies.join(', ') : '—'}
        </div>
        <div className="text-sm">Follow-up: {fmt(rec?.followUp)}</div>
      </div>

      <div className="rounded-lg border bg-muted px-4 py-3 text-sm">
        <div className="font-medium">Decision Output</div>
        <div className="mt-1">Referral Recommended: <span className="font-semibold">{decision.referralRequired ? 'YES' : 'NO'}</span></div>
        {decision.suggestedSpecialists?.length ? (
          <div className="mt-1">
            Suggested Specialists:
            <ul className="list-disc pl-6 mt-1">
              {decision.suggestedSpecialists.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <div className="font-medium text-sm">Final Disposition (required to finalize)</div>
        <div className="text-xs text-muted-foreground">
          This is the clinician’s explicit decision. Suggestions above are advisory only.
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="finalDisposition" disabled readOnly checked={String((value as any)?.finalDisposition).toUpperCase() === 'MONITORING'} />
            <span>Monitoring (no therapy referral)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="finalDisposition" disabled readOnly checked={String((value as any)?.finalDisposition).toUpperCase() === 'REFER_THERAPY'} />
            <span>Refer to therapy</span>
          </label>
          <div className="text-xs text-muted-foreground">
            Use the controls above the Finalize button to set this value.
          </div>
        </div>
      </div>
    </div>
  );
}
