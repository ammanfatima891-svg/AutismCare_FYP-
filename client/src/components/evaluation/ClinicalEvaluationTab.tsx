import { useCallback, useEffect, useMemo, useState } from 'react';
import { evaluationAPI } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertCircle, ClipboardCheck, FileClock, Loader2, PlusCircle } from 'lucide-react';
import { EvaluationForm, type EvaluationDraft, type EvaluationStatus } from './EvaluationForm';

interface ClinicalEvaluationTabProps {
  caseId: string;
  childName: string;
  onCreateReferral?: () => void;
}

const badgeClassByStatus: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-300',
  final: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

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
    () => evaluations.some((item) => item.status === 'final'),
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
    const isEmpty =
      !payload.observations.trim() &&
      !payload.developmentalSummary.trim() &&
      !payload.diagnosis.trim() &&
      !payload.recommendations.trim() &&
      (!Array.isArray(payload.comorbidConditions) || payload.comorbidConditions.length === 0);
    if (isEmpty) {
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
          <h3 className="text-xl font-semibold text-slate-900">Clinical Evaluation</h3>
          <p className="text-sm text-slate-600">
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm flex gap-2 items-center">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100 bg-blue-50/40">
            <CardTitle className="text-base text-blue-900">Evaluation History</CardTitle>
            <CardDescription>Latest first · Draft and Final versions</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {loading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              </div>
            ) : evaluations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
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
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setSelectedId(item._id);
                    setMode('list');
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    <Badge
                      variant="outline"
                      className={badgeClassByStatus[item.status] || badgeClassByStatus.draft}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-800 line-clamp-2">
                    {item.diagnosis || item.developmentalSummary || item.observations || 'No text provided'}
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
              submitting={submitting}
              onSubmit={handleCreate}
            />
          )}

          {mode === 'edit' && selected && (
            <EvaluationForm
              title={`Create New Version (${selected.status === 'final' ? 'from final evaluation' : 'from draft'})`}
              initialValue={toDraft(selected)}
              submitting={submitting}
              onSubmit={handleVersionUpdate}
            />
          )}

          {mode === 'list' && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="border-b border-slate-100 bg-blue-50/40">
                <CardTitle className="text-base text-blue-900">Evaluation Detail</CardTitle>
                <CardDescription>
                  Final evaluations are immutable; editing creates a new version.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {!selected ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">
                    Select an evaluation from the history or create a new one.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={badgeClassByStatus[selected.status] || badgeClassByStatus.draft}
                      >
                        {selected.status}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Created {new Date(selected.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <section>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Observations</h4>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">
                        {selected.observations || '—'}
                      </p>
                    </section>

                    <section>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Developmental Summary</h4>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">
                        {selected.developmentalSummary || '—'}
                      </p>
                    </section>

                    <section>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Diagnosis Impression</h4>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">
                        {selected.diagnosis || '—'}
                      </p>
                    </section>

                    <section>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Comorbid Conditions</h4>
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
                        <p className="text-sm text-slate-800">—</p>
                      )}
                    </section>

                    <section>
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Recommendations</h4>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">
                        {selected.recommendations || '—'}
                      </p>
                    </section>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button variant="outline" onClick={() => setMode('edit')}>
                        {selected.status === 'final'
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
                      <p className="text-xs text-slate-500">
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
