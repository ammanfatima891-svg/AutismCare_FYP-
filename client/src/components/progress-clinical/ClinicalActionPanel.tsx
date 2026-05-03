import React from 'react';
import { cn } from '../ui/utils';
import { Badge } from '../ui/badge';

export type OverallClinicalStatus = 'on_track' | 'needs_attention' | 'high_concern';

export type ClinicalActionPanelProps = {
  /** What is happening — headline status */
  overallClinicalStatus?: OverallClinicalStatus | string;
  /** Why — engine narrative */
  clinicalReasoning?: string;
  /** What to do next — engine recommendation */
  clinicalRecommendation?: string;
  /** Top alert message (from smartAlerts[0]) */
  topAlert?: { severity?: string; message?: string } | null;
  className?: string;
};

const statusStyles: Record<string, string> = {
  on_track: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
  needs_attention: 'border-amber-200 bg-amber-50/90 text-amber-950',
  high_concern: 'border-red-200 bg-red-50/90 text-red-950',
};

const statusLabel: Record<string, string> = {
  on_track: 'On track',
  needs_attention: 'Needs attention',
  high_concern: 'High concern',
};

export function ClinicalActionPanel({
  overallClinicalStatus = 'on_track',
  clinicalReasoning,
  clinicalRecommendation,
  topAlert,
  className,
}: ClinicalActionPanelProps) {
  const key = String(overallClinicalStatus || 'on_track').toLowerCase();
  const boxClass = statusStyles[key] || statusStyles.on_track;

  return (
    <div className={cn('rounded-xl border p-4 text-sm shadow-sm', boxClass, className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">What is happening?</p>
          <p className="mt-1 text-base font-semibold">{statusLabel[key] || 'Clinical status'}</p>
        </div>
        <Badge variant="outline" className="border-current/30 bg-white/60 text-xs capitalize">
          {key.replace(/_/g, ' ')}
        </Badge>
      </div>
      {topAlert?.message ? (
        <div className="mt-3 rounded-lg border border-current/15 bg-white/50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Top alert</p>
          <p className="mt-0.5 font-medium leading-snug">{topAlert.message}</p>
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Why</p>
          <p className="mt-1 leading-relaxed text-foreground/95">{clinicalReasoning || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Recommended next step</p>
          <p className="mt-1 font-medium leading-relaxed text-foreground">{clinicalRecommendation || '—'}</p>
        </div>
      </div>
    </div>
  );
}
