const mongoose = require('mongoose');
const { Schema } = mongoose;
const { THERAPY_STATUS } = require('../constants/workflowEnums');
const { normalizeTherapyStatus } = require('../utils/normalizeWorkflowStatus');

const TherapyCaseSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'ChildCase',
      required: true,
      index: true,
    },
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referralId: {
      type: Schema.Types.ObjectId,
      ref: 'Referral',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(THERAPY_STATUS),
      default: THERAPY_STATUS.ACTIVE,
      index: true,
      set: (v) => normalizeTherapyStatus(v) || v,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

TherapyCaseSchema.index({ caseId: 1, therapistId: 1 }, { unique: true });

// Normalize BEFORE validation so lowercase inputs like "active" don't fail enum validation.
TherapyCaseSchema.pre('validate', function (next) {
  const norm = normalizeTherapyStatus(this.status);
  if (norm) this.status = norm;
  next();
});

function toApiStatus(value) {
  const v = String(value || '').trim().toUpperCase();
  if (v === THERAPY_STATUS.ACTIVE) return 'active';
  if (v === THERAPY_STATUS.DRAFT) return 'draft';
  if (v === THERAPY_STATUS.COMPLETED) return 'completed';
  return String(value || '');
}

TherapyCaseSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    if (ret && ret.status != null) ret.status = toApiStatus(ret.status);
    return ret;
  },
});
TherapyCaseSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret) => {
    if (ret && ret.status != null) ret.status = toApiStatus(ret.status);
    return ret;
  },
});

module.exports = mongoose.model('TherapyCase', TherapyCaseSchema);
