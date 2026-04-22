import React from 'react';
import { Badge } from './ui/badge';

const STATUS_META = {
  NEW: { label: 'NEW', meaning: 'Screening not started', className: 'bg-muted text-foreground border' },
  SCREENING: { label: 'SCREENING', meaning: 'Screening in progress', className: 'bg-blue-50 text-blue-900 border-blue-200' },
  REVIEW: { label: 'REVIEW', meaning: 'Awaiting clinician evaluation', className: 'bg-yellow-50 text-yellow-900 border-yellow-200' },
  DIAGNOSIS: { label: 'DIAGNOSIS', meaning: 'Lab tests in progress', className: 'bg-violet-50 text-violet-900 border-violet-200' },
  DIAGNOSIS_READY: { label: 'DIAGNOSIS_READY', meaning: 'Report ready for clinician review', className: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  THERAPY: { label: 'THERAPY', meaning: 'Therapy referral / assignment pending', className: 'bg-sky-50 text-sky-900 border-sky-200' },
  THERAPY_ACTIVE: { label: 'THERAPY_ACTIVE', meaning: 'Therapy active', className: 'bg-secondary text-primary border' },
  MONITORING: { label: 'MONITORING', meaning: 'Monitoring / follow-up', className: 'bg-muted text-foreground border' },
};

export function CaseStatusBadge({ status, showMeaning = true, className = '' }) {
  const key = String(status || '').trim().toUpperCase();
  const meta = STATUS_META[key] || {
    label: key || 'UNKNOWN',
    meaning: 'Unknown state',
    className: 'bg-muted text-foreground border',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className={meta.className}>
        {meta.label}
      </Badge>
      {showMeaning ? (
        <span className="text-xs text-muted-foreground">{meta.meaning}</span>
      ) : null}
    </div>
  );
}

export const CASE_STATUS_META = STATUS_META;

