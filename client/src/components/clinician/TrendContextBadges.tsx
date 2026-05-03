import React from 'react';
import { Badge } from '../ui/badge';
import { trendIcon } from '../progress-clinical/constants';
import { cn } from '../ui/utils';

type Props = {
  shortTermTrend?: string | null;
  longTermTrend?: string | null;
  /** Fallback when longTerm not set (legacy overallTrend). */
  overallTrend?: string | null;
  className?: string;
};

export function TrendContextBadges({ shortTermTrend, longTermTrend, overallTrend, className }: Props) {
  const longT = longTermTrend || overallTrend;
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <span className="text-muted-foreground">Short-term (last sessions):</span>
      <Badge variant="outline" className="border-slate-300 bg-slate-50 font-medium tabular-nums text-slate-900">
        {trendIcon(String(shortTermTrend || ''))} {String(shortTermTrend || '—')}
      </Badge>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">Long-term (overall):</span>
      <Badge variant="outline" className="border-blue-200 bg-blue-50 font-medium tabular-nums text-blue-950">
        {trendIcon(String(longT || ''))} {String(longT || '—')}
      </Badge>
    </div>
  );
}
