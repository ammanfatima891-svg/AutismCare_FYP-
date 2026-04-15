const mongoose = require('mongoose');
const { Schema } = mongoose;
const { REFERRAL_STATUS: CANON_REFERRAL_STATUS } = require('../constants/workflowEnums');
const { normalizeReferralStatus } = require('../utils/normalizeWorkflowStatus');

const THERAPIST_TYPES = [
  'Speech Therapist',
  'Occupational Therapist',
  'Behavioral Therapist',
  'AAC Specialist',
  'PECS Specialist',
];

const REFERRAL_PRIORITY = ['high', 'medium', 'low'];
const REFERRAL_STATUS = Object.values(CANON_REFERRAL_STATUS);

const ReferralSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'ChildCase',
      required: true,
      index: true,
    },
    clinicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    therapistType: {
      type: String,
      enum: THERAPIST_TYPES,
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: REFERRAL_PRIORITY,
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: REFERRAL_STATUS,
      default: CANON_REFERRAL_STATUS.CREATED,
      index: true,
      set: (v) => normalizeReferralStatus(v) || v,
    },
  },
  { timestamps: true }
);

ReferralSchema.index({ caseId: 1, therapistType: 1, status: 1 });

// Normalize BEFORE validation so lowercase inputs like "pending"/"accepted" don't fail enum validation.
ReferralSchema.pre('validate', function (next) {
  const norm = normalizeReferralStatus(this.status);
  if (norm) this.status = norm;
  next();
});

function toApiStatus(value) {
  const v = String(value || '').trim().toUpperCase();
  // Legacy/UI name: "pending" maps to CREATED
  if (v === CANON_REFERRAL_STATUS.CREATED) return 'pending';
  if (v === CANON_REFERRAL_STATUS.SENT) return 'sent';
  if (v === CANON_REFERRAL_STATUS.ACCEPTED) return 'accepted';
  if (v === CANON_REFERRAL_STATUS.REJECTED) return 'rejected';
  return String(value || '');
}

ReferralSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    if (ret && ret.status != null) ret.status = toApiStatus(ret.status);
    return ret;
  },
});
ReferralSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret) => {
    if (ret && ret.status != null) ret.status = toApiStatus(ret.status);
    return ret;
  },
});

module.exports = {
  Referral: mongoose.model('Referral', ReferralSchema),
  THERAPIST_TYPES,
  REFERRAL_PRIORITY,
  REFERRAL_STATUS,
};
