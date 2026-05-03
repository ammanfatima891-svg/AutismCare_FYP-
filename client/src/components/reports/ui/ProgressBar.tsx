import React from 'react';
import { cn } from '../../ui/utils';

interface ProgressBarProps {
  label: string;
  percent: number;
  trend?: string;
  className?: string;
}

const trendColor = (trend?: string) => {
  const t = String(trend || '').toLowerCase();
  if (t.includes('up') || t.includes('improv')) return 'text-green-600';
  if (t.includes('down') || t.includes('declin')) return 'text-red-500';
  return 'text-slate-500';
};

export function ProgressBar({ label, percent, trend, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="tabular-nums text-slate-600">
          {clamped}%
          {trend ? <span className={cn('ml-1.5 text-xs', trendColor(trend))}>({trend})</span> : null}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            clamped >= 75
              ? 'bg-green-500'
              : clamped >= 40
              ? 'bg-blue-500'
              : 'bg-yellow-500'
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

