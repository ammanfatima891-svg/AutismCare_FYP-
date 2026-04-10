import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Loader2, Plus, X } from 'lucide-react';

export type EvaluationStatus = 'draft' | 'final';

export interface EvaluationDraft {
  observations: string;
  developmentalSummary: string;
  diagnosis: string;
  comorbidConditions: string[];
  recommendations: string;
}

interface EvaluationFormProps {
  title: string;
  initialValue?: Partial<EvaluationDraft>;
  submitting?: boolean;
  readOnly?: boolean;
  onSubmit: (payload: EvaluationDraft, status: EvaluationStatus) => Promise<void> | void;
}

const emptyDraft: EvaluationDraft = {
  observations: '',
  developmentalSummary: '',
  diagnosis: '',
  comorbidConditions: [],
  recommendations: '',
};

function hasAnyField(value: EvaluationDraft) {
  return Boolean(
    value.observations.trim() ||
      value.developmentalSummary.trim() ||
      value.diagnosis.trim() ||
      value.recommendations.trim() ||
      value.comorbidConditions.length
  );
}

export function EvaluationForm({
  title,
  initialValue,
  submitting = false,
  readOnly = false,
  onSubmit,
}: EvaluationFormProps) {
  const [value, setValue] = useState<EvaluationDraft>({
    ...emptyDraft,
    ...initialValue,
    comorbidConditions: initialValue?.comorbidConditions || [],
  });
  const [newTag, setNewTag] = useState('');
  const canSubmit = useMemo(() => hasAnyField(value), [value]);

  const addTag = () => {
    const next = newTag.trim();
    if (!next) return;
    if (value.comorbidConditions.includes(next)) {
      setNewTag('');
      return;
    }
    setValue((prev) => ({ ...prev, comorbidConditions: [...prev.comorbidConditions, next] }));
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setValue((prev) => ({
      ...prev,
      comorbidConditions: prev.comorbidConditions.filter((it) => it !== tag),
    }));
  };

  const submit = async (status: EvaluationStatus) => {
    await onSubmit(value, status);
  };

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="border-b border-slate-100 bg-blue-50/40">
        <CardTitle className="text-base text-blue-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        <div className="space-y-2">
          <Label>Observations</Label>
          <Textarea
            value={value.observations}
            onChange={(e) => setValue((prev) => ({ ...prev, observations: e.target.value }))}
            placeholder="Clinical observations from interaction and assessment."
            rows={4}
            disabled={readOnly || submitting}
          />
        </div>

        <div className="space-y-2">
          <Label>Developmental Summary</Label>
          <Textarea
            value={value.developmentalSummary}
            onChange={(e) =>
              setValue((prev) => ({ ...prev, developmentalSummary: e.target.value }))
            }
            placeholder="Summarize developmental profile and milestones."
            rows={4}
            disabled={readOnly || submitting}
          />
        </div>

        <div className="space-y-2">
          <Label>Diagnosis Impression</Label>
          <Textarea
            value={value.diagnosis}
            onChange={(e) => setValue((prev) => ({ ...prev, diagnosis: e.target.value }))}
            placeholder="Diagnostic impression and rationale."
            rows={3}
            disabled={readOnly || submitting}
          />
        </div>

        <div className="space-y-2">
          <Label>Comorbid Conditions</Label>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add condition and press +"
              disabled={readOnly || submitting}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={readOnly || submitting || !newTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {value.comorbidConditions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {value.comorbidConditions.map((tag) => (
                <Badge key={tag} variant="outline" className="border-slate-300 text-slate-700">
                  {tag}
                  {!readOnly && (
                    <button
                      type="button"
                      className="ml-1.5 text-slate-500 hover:text-slate-700"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No conditions added.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Recommendations</Label>
          <Textarea
            value={value.recommendations}
            onChange={(e) => setValue((prev) => ({ ...prev, recommendations: e.target.value }))}
            placeholder="Intervention, therapy, monitoring, and follow-up recommendations."
            rows={4}
            disabled={readOnly || submitting}
          />
        </div>

        {!readOnly && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center"
              disabled={submitting || !canSubmit}
              onClick={() => submit('draft')}
              data-testid="save-draft-button"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save as Draft
            </Button>
            <Button
              type="button"
              className="w-full justify-center border border-emerald-700"
              style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
              disabled={submitting || !canSubmit}
              onClick={() => submit('final')}
              data-testid="finalize-evaluation-button"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Finalize Evaluation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
