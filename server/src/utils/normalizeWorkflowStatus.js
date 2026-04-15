const {
  APPOINTMENT_STATUS,
  REFERRAL_STATUS,
  THERAPY_STATUS,
  EVALUATION_STATUS,
  SCREENING_STATUS,
} = require('../constants/workflowEnums');

function upper(v) {
  return String(v || '').trim().toUpperCase();
}

function normalizeAppointmentStatus(input) {
  const v = upper(input);
  if (!v) return null;
  if (Object.values(APPOINTMENT_STATUS).includes(v)) return v;
  // Legacy aliases
  if (v === 'REQUESTED' || v === 'PENDING_APPROVAL' || v === 'RESCHEDULED') return APPOINTMENT_STATUS.PENDING;
  if (v === 'APPROVE') return APPOINTMENT_STATUS.APPROVED;
  if (v === 'REJECT') return APPOINTMENT_STATUS.REJECTED;
  return null;
}

function normalizeReferralStatus(input) {
  const v = upper(input);
  if (!v) return null;
  if (Object.values(REFERRAL_STATUS).includes(v)) return v;
  // Legacy aliases
  if (v === 'PENDING') return REFERRAL_STATUS.CREATED;
  if (v === 'IN-PROGRESS' || v === 'IN_PROGRESS') return REFERRAL_STATUS.ACCEPTED;
  return null;
}

function normalizeTherapyStatus(input) {
  const v = upper(input);
  if (!v) return null;
  if (Object.values(THERAPY_STATUS).includes(v)) return v;
  // Legacy aliases
  if (v === 'ACTIVE') return THERAPY_STATUS.ACTIVE;
  if (v === 'DRAFT') return THERAPY_STATUS.DRAFT;
  if (v === 'FINAL') return THERAPY_STATUS.ACTIVE;
  return null;
}

function normalizeEvaluationStatus(input) {
  const v = upper(input);
  if (!v) return null;
  if (Object.values(EVALUATION_STATUS).includes(v)) return v;
  // Legacy aliases
  if (v === 'FINAL') return EVALUATION_STATUS.FINALIZED;
  return null;
}

function normalizeScreeningStatus(input) {
  const v = upper(input);
  if (!v) return null;
  if (Object.values(SCREENING_STATUS).includes(v)) return v;
  // No legacy screening lifecycle stored currently; keep strict.
  return null;
}

module.exports = {
  normalizeAppointmentStatus,
  normalizeReferralStatus,
  normalizeTherapyStatus,
  normalizeEvaluationStatus,
  normalizeScreeningStatus,
};

