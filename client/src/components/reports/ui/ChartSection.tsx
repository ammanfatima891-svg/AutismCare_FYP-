import React from 'react';
import { cn } from '../../ui/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface TrendLineChartProps {
  data: Array<{ x: string; y: number }>;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  className?: string;
}

export function TrendLineChart({
  data,
  title,
  xLabel,
  yLabel,
  className,
}: TrendLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          'flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400',
          className
        )}
      >
        No trend data available
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-transparent', className)}>
      {title ? (
        <h4 className="mb-3 text-sm font-semibold text-slate-800">{title}</h4>
      ) : null}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 12, fill: '#64748b' }}
            angle={-30}
            textAnchor="end"
            height={50}
            label={
              xLabel
                ? { value: xLabel, position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 12 }
                : undefined
            }
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DomainBarChartProps {
  data: Array<{ name: string; score: number; status?: string }>;
  title?: string;
  className?: string;
}

const statusColor = (status?: string) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('mastered') || s.includes('strong')) return '#22c55e';
  if (s.includes('progress') || s.includes('improving')) return '#3b82f6';
  if (s.includes('attention') || s.includes('decline')) return '#eab308';
  if (s.includes('risk') || s.includes('concern')) return '#ef4444';
  return '#94a3b8';
};

export function DomainBarChart({ data, title, className }: DomainBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={cn(
          'flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400',
          className
        )}
      >
        No domain data available
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-transparent', className)}>
      {title ? (
        <h4 className="mb-3 text-sm font-semibold text-slate-800">{title}</h4>
      ) : null}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 16, bottom: 5, left: 16 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 5]}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: '#64748b' }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 13,
            }}
            formatter={(value: number, _name: string, props: { payload?: { status?: string } }) => [
              `${value} / 5`,
              props?.payload?.status ? `Status: ${props.payload.status}` : 'Score',
            ]}
          />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={statusColor(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

