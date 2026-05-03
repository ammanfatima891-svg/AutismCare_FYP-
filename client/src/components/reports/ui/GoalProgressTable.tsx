import React from 'react';
import { cn } from '../../ui/utils';
import { CheckCircle2, AlertCircle, Minus, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface GoalProgressRow {
  goalName?: string;
  baseline?: number | null;
  current?: number | null;
  target?: number | null;
  trend?: string;
  masteryStatus?: string;
}

interface GoalProgressTableProps {
  data: GoalProgressRow[];
  className?: string;
}

function TrendBadge({ trend }: { trend?: string }) {
  const t = String(trend || '').toLowerCase();
  if (t.includes('up') || t.includes('improv')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <TrendingUp className="h-3 w-3" />
        Improving
      </span>
    );
  }
  if (t.includes('down') || t.includes('declin')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <TrendingDown className="h-3 w-3" />
        Declining
      </span>
    );
  }
  if (t.includes('stable') || t.includes('flat')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
        <Minus className="h-3 w-3" />
        Stable
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
      <ArrowRight className="h-3 w-3" />
      {trend || '—'}
    </span>
  );
}

function MasteryBadge({ status }: { status?: string }) {
  const s = String(status || '').toLowerCase();
  if (s.includes('mastered') || s.includes('achieved')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Mastered
      </span>
    );
  }
  if (s.includes('attention') || s.includes('concern')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
        <AlertCircle className="h-3 w-3" />
        Needs Attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      In Progress
    </span>
  );
}

export function GoalProgressTable({ data, className }: GoalProgressTableProps) {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-slate-400">No goal progress data available.</p>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
            <th className="pb-2 pr-4 pt-1">Goal</th>
            <th className="pb-2 pr-4 pt-1 text-right">Baseline</th>
            <th className="pb-2 pr-4 pt-1 text-right">Current</th>
            <th className="pb-2 pr-4 pt-1 text-right">Target</th>
            <th className="pb-2 pr-4 pt-1">Trend</th>
            <th className="pb-2 pt-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((g, i) => (
            <tr
              key={i}
              className={cn(
                'border-b border-slate-50 transition-colors hover:bg-slate-50/50',
                i === data.length - 1 && 'border-b-0'
              )}
            >
              <td className="py-2.5 pr-4 font-medium text-slate-800">
                {g.goalName || '—'}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">
                {g.baseline ?? '—'}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-slate-800">
                {g.current ?? '—'}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">
                {g.target ?? '—'}
              </td>
              <td className="py-2.5 pr-4">
                <TrendBadge trend={g.trend} />
              </td>
              <td className="py-2.5">
                <MasteryBadge status={g.masteryStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

