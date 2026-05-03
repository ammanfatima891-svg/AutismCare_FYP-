/** Labels and short blurbs for therapy report types — aligned with server REPORT_TYPES. */

export type ReportListRow = {
  id: string;
  caseId: string;
  type: string;
  childName: string;
  generatedAt: string;
  insufficientData?: boolean;
};

export const REPORT_TYPE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '__all__', label: 'All types' },
  { value: 'integrated', label: 'Integrated' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'iep', label: 'IEP' },
  { value: 'clinician', label: 'Clinician' },
  { value: 'parent', label: 'Parent' },
  { value: 'therapy', label: 'Therapy' },
  { value: 'session', label: 'Session summary' },
  { value: 'progress', label: 'Progress' },
];

export const GENERATE_TYPE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  {
    value: 'integrated',
    label: 'Integrated',
    description: 'End-to-end clinical overview with analytics, trends, and recommendations',
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Goals progress, sessions, activities, and assignment compliance',
  },
  {
    value: 'iep',
    label: 'IEP',
    description: 'Long- and short-term goals with strategies',
  },
  {
    value: 'clinician',
    label: 'Clinician',
    description: 'Diagnosis context, progress summary, and red flags',
  },
  {
    value: 'parent',
    label: 'Parent',
    description: 'Simple progress, improvements, and home tips',
  },
  {
    value: 'therapy',
    label: 'Therapy (detailed)',
    description: 'Plan summary with domain progress',
  },
  {
    value: 'session',
    label: 'Session summary',
    description: 'Session-level outcomes and engagement',
  },
  {
    value: 'progress',
    label: 'Progress analytics',
    description: 'Goal and domain trends from analytics',
  },
];

export function reportTypeLabel(type: string): string {
  const t = String(type || '').toLowerCase();
  const map: Record<string, string> = {
    integrated: 'Integrated',
    monthly: 'Monthly',
    iep: 'IEP',
    clinician: 'Clinician',
    parent: 'Parent',
    therapy: 'Therapy',
    session: 'Session summary',
    progress: 'Progress',
  };
  return map[t] || 'Report';
}

export function reportCardSummary(row: ReportListRow): string {
  const label = reportTypeLabel(row.type);
  if (row.insufficientData) {
    return `${label} — Limited case data at generation time. Add plan, sessions, or assignments for a fuller document.`;
  }
  switch (String(row.type).toLowerCase()) {
    case 'integrated':
      return `${label} — Unified clinical view with trends, domain performance, and recommendations.`;
    case 'monthly':
      return `${label} — Progress across goals, session activity, and home assignment follow-through.`;
    case 'iep':
      return `${label} — Structured goals, measurable criteria, and recommended strategies.`;
    case 'clinician':
      return `${label} — Clinical overview with progress signals and areas requiring attention.`;
    case 'parent':
      return `${label} — Family-friendly summary with practical home support tips.`;
    case 'therapy':
      return `${label} — Therapy plan domains, goals, and aggregated progress.`;
    case 'session':
      return `${label} — Session notes, response patterns, and engagement.`;
    case 'progress':
      return `${label} — Analytics-driven goal and domain progress.`;
    default:
      return `${label} — Auto-generated from case analytics and documentation.`;
  }
}
