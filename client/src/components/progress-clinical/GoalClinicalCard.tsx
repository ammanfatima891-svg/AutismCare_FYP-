import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { CONFIDENCE_BG, trendIcon, type ConfidenceTier } from './constants';
import { LimitedDataGuard } from './LimitedDataGuard';

export type ClinicalGoalRow = {
  goalId?: string;
  goalName?: string;
  current?: number | null;
  trend?: string;
  confidenceLabel?: string;
  confidenceScore?: number;
  limitedDataUi?: boolean;
};

type Props = {
  goal: ClinicalGoalRow;
  onWhy?: () => void;
  className?: string;
};

function tierFromLabel(label?: string): ConfidenceTier {
  const l = String(label || 'low').toLowerCase();
  if (l === 'high' || l === 'medium' || l === 'low') return l;
  return 'low';
}

export function GoalClinicalCard({ goal, onWhy, className }: Props) {
  const tier = tierFromLabel(goal.confidenceLabel);
  const current = goal.current != null ? Number(goal.current) : null;
  const pct = current != null && Number.isFinite(current) ? Math.max(0, Math.min(100, (current / 5) * 100)) : 0;
  const limited = Boolean(goal.limitedDataUi || tier === 'low');

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-card p-4 shadow-sm', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground line-clamp-2">{goal.goalName || 'Goal'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-lg tabular-nums" title="Trend" aria-label="trend">
              {trendIcon(goal.trend)}
            </span>
            <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide', CONFIDENCE_BG[tier])}>
              {tier} confidence
            </Badge>
          </div>
        </div>
        {onWhy ? (
          <Button type="button" variant="ghost" size="sm" className="shrink-0 text-xs" onClick={onWhy}>
            Why?
          </Button>
        ) : null}
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Progress (0–5)</span>
          <LimitedDataGuard limited={limited}>
            <span className="font-medium tabular-nums text-foreground">
              {current != null ? current.toFixed(2) : '—'}
            </span>
          </LimitedDataGuard>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full transition-all', limited ? 'bg-slate-300' : 'bg-blue-600')}
            style={{ width: `${limited ? Math.min(pct, 100) : pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
