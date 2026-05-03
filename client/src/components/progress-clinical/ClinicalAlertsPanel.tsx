import React, { useMemo } from 'react';
import { cn } from '../ui/utils';

export type ClinicalAlert = {
  severity?: string;
  code?: string;
  message?: string;
  goalId?: string;
};

type Props = {
  alerts: ClinicalAlert[];
  className?: string;
  emptyText?: string;
};

function tierClass(severity?: string) {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical' || s === 'error') {
    return 'border-red-200 bg-red-50/90 text-red-950';
  }
  if (s === 'warning') {
    return 'border-amber-200 bg-amber-50/90 text-amber-950';
  }
  return 'border-sky-200 bg-sky-50/80 text-sky-950';
}

function rankSev(sev?: string) {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical' || s === 'error' || s === 'danger') return 0;
  if (s === 'warning') return 1;
  return 2;
}

export function ClinicalAlertsPanel({ alerts, className, emptyText = 'No active alerts.' }: Props) {
  const grouped = useMemo(() => {
    const sorted = [...(alerts || [])].sort((a, b) => {
      const d = rankSev(a.severity) - rankSev(b.severity);
      if (d !== 0) return d;
      return String(a.code || '').localeCompare(String(b.code || ''));
    });
    const critical: ClinicalAlert[] = [];
    const warning: ClinicalAlert[] = [];
    const info: ClinicalAlert[] = [];
    for (const a of sorted) {
      const s = String(a.severity || '').toLowerCase();
      if (s === 'critical' || s === 'error') critical.push(a);
      else if (s === 'warning') warning.push(a);
      else info.push(a);
    }
    return [
      { label: 'Critical', items: critical, key: 'c' },
      { label: 'Warning', items: warning, key: 'w' },
      { label: 'Info', items: info, key: 'i' },
    ];
  }, [alerts]);

  if (!alerts?.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {grouped.map(
        (g) =>
          g.items.length > 0 && (
            <div key={g.key}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
              <ul className="space-y-2">
                {g.items.map((a, idx) => (
                  <li
                    key={`${a.code}-${idx}`}
                    className={cn('rounded-lg border px-3 py-2 text-sm', tierClass(a.severity))}
                  >
                    {a.message || a.code || 'Alert'}
                  </li>
                ))}
              </ul>
            </div>
          )
      )}
    </div>
  );
}
