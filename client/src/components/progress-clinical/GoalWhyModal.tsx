import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';

export type WhyModalGoal = {
  goalName?: string;
  reasoningSummary?: string;
  explanation?: {
    dataSource?: string;
    sessionsUsed?: number;
    structuredDataRatio?: number;
    smoothingApplied?: boolean;
    inferredMeasurement?: boolean;
  };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: WhyModalGoal | null;
};

export function GoalWhyModal({ open, onOpenChange, goal }: Props) {
  const ex = goal?.explanation;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Why this rating?</DialogTitle>
          <DialogDescription className="line-clamp-none text-left">
            {goal?.goalName ? `Goal: ${goal.goalName}` : 'Clinical explainability snapshot'}
          </DialogDescription>
        </DialogHeader>
        {goal?.reasoningSummary ? <p className="text-sm text-foreground">{goal.reasoningSummary}</p> : null}
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Data source: </span>
            {ex?.dataSource || '—'}
          </li>
          <li>
            <span className="font-medium text-foreground">Sessions used: </span>
            {ex?.sessionsUsed ?? '—'}
          </li>
          <li>
            <span className="font-medium text-foreground">Structured data ratio: </span>
            {ex?.structuredDataRatio != null ? `${Math.round(Number(ex.structuredDataRatio) * 100)}%` : '—'}
          </li>
          <li>
            <span className="font-medium text-foreground">Smoothing: </span>
            {ex?.smoothingApplied ? 'Applied' : 'Not applied'}
          </li>
          <li>
            <span className="font-medium text-foreground">Inference used: </span>
            {ex?.inferredMeasurement ? 'Yes' : 'No'}
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
