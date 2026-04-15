export const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const);

export type AppointmentStatus =
  | (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS]
  | string;

export function normalizeAppointmentStatus(input: unknown): AppointmentStatus {
  const v = String(input ?? '').trim().toUpperCase();
  if (!v) return '';
  if (Object.values(APPOINTMENT_STATUS).includes(v as any)) return v;
  // Legacy aliases seen across UI/data
  if (v === 'REQUESTED' || v === 'PENDING_APPROVAL' || v === 'RESCHEDULED') return APPOINTMENT_STATUS.PENDING;
  if (v === 'APPROVE') return APPOINTMENT_STATUS.APPROVED;
  if (v === 'REJECT') return APPOINTMENT_STATUS.REJECTED;
  if (v === 'CANCELED') return APPOINTMENT_STATUS.CANCELLED;
  return v;
}

export const SCREENING_REVIEW_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  FLAGGED: 'FLAGGED',
  REVIEWED: 'REVIEWED',
} as const);

export type ScreeningReviewStatus =
  | (typeof SCREENING_REVIEW_STATUS)[keyof typeof SCREENING_REVIEW_STATUS]
  | string;

export function normalizeScreeningReviewStatus(input: unknown): ScreeningReviewStatus {
  const v = String(input ?? '').trim().toUpperCase();
  if (!v) return '';
  if (Object.values(SCREENING_REVIEW_STATUS).includes(v as any)) return v;
  // Back-compat with earlier UI strings
  if (v === 'PENDING') return SCREENING_REVIEW_STATUS.SUBMITTED;
  if (v === 'NEEDS_ATTENTION' || v === 'NEEDS-ATTENTION') return SCREENING_REVIEW_STATUS.FLAGGED;
  return v;
}

