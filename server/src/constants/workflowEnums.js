// Canonical workflow enums for the whole system (backend).
// These values are mandated by the system rules. Do not add ad-hoc status strings elsewhere.

const APPOINTMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

const REFERRAL_STATUS = Object.freeze({
  CREATED: 'CREATED',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
});

const THERAPY_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
});

const EVALUATION_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  FINALIZED: 'FINALIZED',
});

const SCREENING_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  REVIEWED: 'REVIEWED',
  FLAGGED: 'FLAGGED',
});

module.exports = {
  APPOINTMENT_STATUS,
  REFERRAL_STATUS,
  THERAPY_STATUS,
  EVALUATION_STATUS,
  SCREENING_STATUS,
};

