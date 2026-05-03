import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '../ui/utils';
import { CONFIDENCE_COLORS, confidenceTierFromScore, type ConfidenceTier } from './constants';

export type DomainScoreRow = {
  name: string;
  score: number;
  confidence?: number;
};

type Props = {
  data: DomainScoreRow[];
  className?: string;
  height?: number;
};

function barColor(confidence?: number): string {
  const tier: ConfidenceTier = confidenceTierFromScore(confidence ?? 0);
  return CONFIDENCE_COLORS[tier];
}

export function DomainPerformanceBarChart({ data, className, height = 220 }: Props) {
  if (!data?.length) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400',
          className
        )}
        style={{ height }}
      >
        No domain scores
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
            formatter={(value: number, _name: unknown, props: { payload?: DomainScoreRow }) => {
              const conf = props?.payload?.confidence;
              const pct = conf != null && Number.isFinite(conf) ? ` (${(conf * 100).toFixed(0)}% conf.)` : '';
              return [`${Number(value).toFixed(2)} / 5${pct}`, 'Score'];
            }}
          />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={22}>
            {data.map((entry, i) => (
              <Cell key={`${entry.name}-${i}`} fill={barColor(entry.confidence)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
