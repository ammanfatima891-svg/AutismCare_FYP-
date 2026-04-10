/** Activity template as returned by GET /api/activities/templates */
export type ActivityTemplate = {
  _id: string;
  name: string;
  domain: string;
  objective?: string;
  procedure?: string;
  notes?: string;
  instructions?: string;
  materials?: string;
  frequency?: string;
  difficulty?: string;
  parentInvolvement?: boolean;
  isTemplate?: boolean;
  /** Present for therapist-owned; null/omitted = platform template */
  createdBy?: string | null;
  /** Set by GET /activities/templates for convenience */
  isPlatformTemplate?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Figma-aligned filter (maps Behavioral → Behavioral + Behavioral (ABA) on server) */
export const FILTER_DOMAIN_OPTIONS = ['Speech', 'OT', 'Sensory', 'Behavioral', 'AAC', 'PECS'] as const;

/** Full model domains (form) — includes Behavioral (ABA) for legacy rows */
export const FORM_DOMAIN_OPTIONS = [
  'Speech',
  'OT',
  'Sensory',
  'Behavioral',
  'Behavioral (ABA)',
  'AAC',
  'PECS',
] as const;

export const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'] as const;
