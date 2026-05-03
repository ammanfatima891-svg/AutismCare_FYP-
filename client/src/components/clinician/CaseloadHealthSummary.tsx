import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export type CaseloadHealth = {
  total?: number;
  triaged?: number;
  counts?: { on_track?: number; needs_attention?: number; high_concern?: number };
  onTrackPct?: number;
  needsAttentionPct?: number;
  highConcernPct?: number;
};

type Props = {
  health: CaseloadHealth | null;
  className?: string;
};

export function CaseloadHealthSummary({ health, className }: Props) {
  if (!health || !health.counts) return null;
  const c = health.counts;
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Caseload triage mix</CardTitle>
        <CardDescription>
          From progress engine overall clinical status ({health.triaged ?? 0} cases with data)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-emerald-900">{health.onTrackPct ?? 0}%</p>
            <p className="text-xs font-medium text-emerald-800">On track</p>
            <p className="text-[11px] text-emerald-700/90">{c.on_track ?? 0} case(s)</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-amber-950">{health.needsAttentionPct ?? 0}%</p>
            <p className="text-xs font-medium text-amber-900">Needs attention</p>
            <p className="text-[11px] text-amber-800/90">{c.needs_attention ?? 0} case(s)</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-red-950">{health.highConcernPct ?? 0}%</p>
            <p className="text-xs font-medium text-red-900">High concern</p>
            <p className="text-[11px] text-red-800/90">{c.high_concern ?? 0} case(s)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
