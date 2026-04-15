import { useCallback, useEffect, useMemo, useState } from 'react';
import { evaluationAPI } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertCircle, ClipboardCheck, FileClock, Loader2, PlusCircle } from 'lucide-react';
import { EvaluationForm, type EvaluationDraft, type EvaluationStatus } from '@/components/evaluation/EvaluationForm';

interface ClinicalEvaluationTabProps {
  caseId: string;
  childName: string;
  onCreateReferral?: () => void;
}

const badgeClassByStatus: Record<string, string> = {
  DRAFT: 'bg-muted text-foreground border',
  FINALIZED: 'bg-blue-100 text-blue-800 border-blue-200',
};

function safeText(value: any) {
  return typeof value === 'string' ? value.trim() : '';
}

function summarizeDiagnosis(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const primary = value.primary === 'Other' ? value.primaryFreeText : value.primary;
  const sev = value.severityLevel ? ` · ${value.severityLevel}` : '';
  const conf = value.confidence ? ` · ${value.confidence}` : '';
  return [primary, conf, sev].filter(Boolean).join('');
}

function summarizeObservations(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const tags = Array.isArray(value.tags) && value.tags.length ? value.tags.join(', ') : '';
  const sev = value.severity ? `Severity: ${value.severity}` : '';
  const notes = safeText(value.notes);
  return [tags, sev, notes].filter(Boolean).join(' · ');
}

function summarizeRecommendations(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const therapies = Array.isArray(value.therapies) && value.therapies.length ? value.therapies.join(', ') : '';
  const followUp =
    value.followUp === 'Other' ? safeText(value.followUpFreeText) : safeText(value.followUp);
  return [therapies ? `Therapies: ${therapies}` : '', followUp ? `Follow-up: ${followUp}` : '']
    .filter(Boolean)
    .join(' · ');
}

function hasAnyEvaluationField(payload: EvaluationDraft) {
  const obs = payload.observations as any;
  const dev = payload.developmentalSummary as any;
  const dx = payload.diagnosis as any;
  const rec = payload.recommendations as any;

  const observationsFilled =
    typeof obs === 'string'
      ? !!safeText(obs)
      : !!(Array.isArray(obs?.tags) && obs.tags.length) || !!safeText(obs?.severity) || !!safeText(obs?.notes);

  const devFilled =
    typeof dev === 'string'
      ? !!safeText(dev)
      : !!safeText(dev?.notes) ||
        !!safeText(dev?.override?.communication) ||
        !!safeText(dev?.override?.motorSkills) ||
        !!safeText(dev?.override?.social);

  const diagnosisFilled =
    typeof dx === 'string'
      ? !!safeText(dx)
      : !!safeText(dx?.primary) ||
        !!safeText(dx?.primaryFreeText) ||
        !!safeText(dx?.confidence) ||
        !!safeText(dx?.severityLevel) ||
        !!safeText(dx?.rationale);

  const recommendationsFilled =
    typeof rec === 'string'
      ? !!safeText(rec)
      : !!(Array.isArray(rec?.therapies) && rec.therapies.length) ||
        !!safeText(rec?.followUp) ||
        !!safeText(rec?.followUpFreeText);

  const comorbidFilled = Array.isArray(payload.comorbidConditions) && payload.comorbidConditions.length > 0;

  return observationsFilled || devFilled || diagnosisFilled || recommendationsFilled || comorbidFilled;
}

function toDraft(value: any): EvaluationDraft {
  return {
    observations: value?.observations || '',
    developmentalSummary: value?.developmentalSummary || '',
    diagnosis: value?.diagnosis || '',
    comorbidConditions: Array.isArray(value?.comorbidConditions) ? value.comorbidConditions : [],
    recommendations: value?.recommendations || '',
  };
}

export function ClinicalEvaluationTab({ caseId, childName, onCreateReferral }: ClinicalEvaluationTabProps) {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');

  const selected = useMemo(
    () => evaluations.find((item) => item._id === selectedId) || evaluations[0] || null,
    [evaluations, selectedId]
  );
  const hasFinal = useMemo(
    () => evaluations.some((item) => item.status === 'FINALIZED'),
    [evaluations]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await evaluationAPI.listByCase(caseId);
      const list = data?.data || [];
      setEvaluations(list);
      if (list.length) setSelectedId((prev) => prev || list[0]._id);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (payload: EvaluationDraft, status: EvaluationStatus) => {
    if (!hasAnyEvaluationField(payload)) {
      setError('Please fill at least one field before submitting.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await evaluationAPI.create({ caseId, ...payload, status });
      await load();
      setMode('list');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVersionUpdate = async (payload: EvaluationDraft, status: EvaluationStatus) => {
    if (!selected) return;
    try {
      setSubmitting(true);
      setError(null);
      await evaluationAPI.updateVersion(selected._id, { ...payload, status });
      await load();
      setMode('list');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save evaluation version');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Clinical Evaluation</h3>
          <p className="text-sm text-muted-foreground">
            Evaluation history and versioned notes for {childName || 'this case'}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Refresh
          </Button>
          <Button onClick={() => setMode('create')} className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Evaluation
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-destructive text-sm flex gap-2 items-center">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 border shadow-sm bg-card">
          <CardHeader className="border-b border bg-blue-50/40">
            <CardTitle className="text-base text-blue-900">Evaluation History</CardTitle>
            <CardDescription>Latest first · Draft and Final versions</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              </div>
            ) : evaluations.length === 0 ? (
              <div className="rounded-lg border-dashed border bg-background p-4 text-sm text-muted-foreground">
                No evaluations yet. Create the first draft for this case.
              </div>
            ) : (
              evaluations.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    selected?._id === item._id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border hover:border hover:bg-background'
                  }`}
                  onClick={() => {
                    setSelectedId(item._id);
                    setMode('list');
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    <Badge
                      variant="outline"
                      className={badgeClassByStatus[item.status] || badgeClassByStatus.DRAFT}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground line-clamp-2">
                    {summarizeDiagnosis(item.diagnosis) ||
                      summarizeRecommendations(item.recommendations) ||
                      summarizeObservations(item.observations) ||
                      'No details provided'}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-8 space-y-4">
          {mode === 'create' && (
            <EvaluationForm
              title="New Clinical Evaluation"
              caseId={caseId}
              submitting={submitting}
              onSubmit={handleCreate}
            />
          )}

          {mode === 'edit' && selected && (
            <EvaluationForm
              title={`Create New Version (${selected.status === 'FINALIZED' ? 'from finalized evaluation' : 'from draft'})`}
              initialValue={toDraft(selected)}
              caseId={caseId}
              submitting={submitting}
              onSubmit={handleVersionUpdate}
            />
          )}

          {mode === 'list' && (
            <Card className="border shadow-sm bg-card">
              <CardHeader className="border-b border bg-blue-50/40">
                <CardTitle className="text-base text-blue-900">Evaluation Detail</CardTitle>
                <CardDescription>
                  Final evaluations are immutable; editing creates a new version.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!selected ? (
                  <div className="rounded-lg border-dashed border bg-background p-6 text-muted-foreground">
                    Select an evaluation from the history or create a new one.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={badgeClassByStatus[selected.status] || badgeClassByStatus.DRAFT}
                      >
                        {selected.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(selected.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <section>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Observations</h4>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {summarizeObservations(selected.observations) || '—'}
                      </p>
                    </section>

                    <section>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Developmental Summary</h4>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {typeof selected.developmentalSummary === 'string'
                          ? (selected.developmentalSummary || '—')
                          : (safeText(selected.developmentalSummary?.notes) || '—')}
                      </p>
                    </section>

                    <section>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Diagnosis Impression</h4>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {summarizeDiagnosis(selected.diagnosis) ||
                          (typeof selected.diagnosis === 'string' ? selected.diagnosis : '') ||
                          '—'}
                      </p>
                    </section>

                    <section>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Comorbid Conditions</h4>
                      {Array.isArray(selected.comorbidConditions) &&
                      selected.comorbidConditions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selected.comorbidConditions.map((c: string) => (
                            <Badge key={c} variant="outline">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-foreground">—</p>
                      )}
                    </section>

                    <section>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Recommendations</h4>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {summarizeRecommendations(selected.recommendations) ||
                          (typeof selected.recommendations === 'string' ? selected.recommendations : '') ||
                          '—'}
                      </p>
                    </section>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button variant="outline" onClick={() => setMode('edit')}>
                        {selected.status === 'FINALIZED'
                          ? 'Create New Version'
                          : 'Edit (New Version)'}
                      </Button>

                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!hasFinal}
                        onClick={() => {
                          if (!hasFinal) return;
                          onCreateReferral?.();
                        }}
                        title={
                          hasFinal
                            ? 'Final evaluation exists. Referral can be created.'
                            : 'Finalize at least one evaluation to enable referrals.'
                        }
                      >
                        {hasFinal ? <ClipboardCheck className="h-4 w-4 mr-2" /> : <FileClock className="h-4 w-4 mr-2" />}
                        Create Referral
                      </Button>
                    </div>
                    {!hasFinal && (
                      <p className="text-xs text-muted-foreground">
                        Referral is disabled until at least one evaluation is finalized.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
