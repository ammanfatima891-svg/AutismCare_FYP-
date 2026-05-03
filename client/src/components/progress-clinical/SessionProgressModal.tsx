import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { ClinicalAlertsPanel, type ClinicalAlert } from './ClinicalAlertsPanel';

export type SessionProgressFeedback = {
  summary?: {
    improving?: number;
    stagnant?: number;
    attention?: number;
    goalsTracked?: number;
  };
  improvingGoals?: { goalId?: string; goalName?: string }[];
  stagnantGoals?: { goalId?: string; goalName?: string }[];
  alerts?: ClinicalAlert[];
  overallTrend?: string;
  confidence?: { overall?: number; label?: string };
  goals?: Array<{ goalName?: string; clinicalRecommendation?: string }>;
  clinicalRecommendation?: string;
  clinicalReasoning?: string;
  overallClinicalStatus?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: SessionProgressFeedback | null;
};

function listNames(items?: { goalName?: string }[]) {
  if (!items?.length) return '—';
  return items.map((x) => x.goalName || 'Goal').join(', ');
}

export function SessionProgressModal({ open, onOpenChange, feedback }: Props) {
  const s = feedback?.summary;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Progress update</DialogTitle>
          <DialogDescription>
            Snapshot from the progress engine after this session. Use alongside your clinical judgment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="font-medium text-foreground">Summary</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>Improving goals: {s?.improving ?? 0}</li>
              <li>Steady / stagnant: {s?.stagnant ?? 0}</li>
              <li>Need attention: {s?.attention ?? 0}</li>
              <li>Tracked: {s?.goalsTracked ?? '—'}</li>
            </ul>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium text-foreground">Improving</p>
            <p className="mt-1 text-muted-foreground">{listNames(feedback?.improvingGoals)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="font-medium text-foreground">Stagnant</p>
            <p className="mt-1 text-muted-foreground">{listNames(feedback?.stagnantGoals)}</p>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">Alerts</p>
            <ClinicalAlertsPanel alerts={feedback?.alerts || []} />
          </div>
          {feedback?.goals?.some((g) => g.clinicalRecommendation) ? (
            <div className="rounded-lg border p-3">
              <p className="mb-2 font-medium text-foreground">Per-goal guidance (engine)</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {feedback.goals
                  ?.filter((g) => g.clinicalRecommendation)
                  .map((g, i) => (
                    <li key={`${g.goalName}-${i}`}>
                      <span className="font-medium text-foreground">{g.goalName || 'Goal'}: </span>
                      {g.clinicalRecommendation}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
          {feedback?.clinicalRecommendation ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm">
              <p className="font-medium text-foreground">Case-level recommendation</p>
              <p className="mt-1 text-muted-foreground">{feedback.clinicalRecommendation}</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
