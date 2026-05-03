import React from 'react';
import { cn } from '../../ui/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricsCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  highlight?: 'blue' | 'green' | 'yellow' | 'neutral';
  className?: string;
}

const bgStyles = {
  blue: 'bg-blue-50 border-blue-100',
  green: 'bg-green-50 border-green-100',
  yellow: 'bg-yellow-50 border-yellow-100',
  neutral: 'bg-white border-slate-100',
};

const valueStyles = {
  blue: 'text-blue-900',
  green: 'text-green-900',
  yellow: 'text-yellow-900',
  neutral: 'text-slate-900',
};

export function MetricsCard({
  label,
  value,
  suffix,
  change,
  changeLabel,
  highlight = 'neutral',
  className,
}: MetricsCardProps) {
  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 shadow-sm',
        bgStyles[highlight],
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cn('text-2xl font-bold', valueStyles[highlight])}>
          {value}
        </span>
        {suffix ? (
          <span className="text-sm font-medium text-slate-500">{suffix}</span>
        ) : null}
      </div>
      {typeof change === 'number' ? (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          ) : isNegative ? (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-slate-400" />
          )}
          <span
            className={cn(
              'font-medium',
              isPositive
                ? 'text-green-700'
                : isNegative
                ? 'text-red-600'
                : 'text-slate-500'
            )}
          >
            {change > 0 ? '+' : ''}
            {change}%
          </span>
          {changeLabel ? (
            <span className="text-slate-400">{changeLabel}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

