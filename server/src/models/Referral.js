const mongoose = require('mongoose');
const { Schema } = mongoose;

const THERAPIST_TYPES = [
  'Speech Therapist',
  'Occupational Therapist',
  'Behavioral Therapist',
  'AAC Specialist',
  'PECS Specialist',
];

const REFERRAL_PRIORITY = ['high', 'medium', 'low'];
const REFERRAL_STATUS = ['pending', 'accepted', 'in-progress'];

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
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

ReferralSchema.index({ caseId: 1, therapistType: 1, status: 1 });

module.exports = {
  Referral: mongoose.model('Referral', ReferralSchema),
  THERAPIST_TYPES,
  REFERRAL_PRIORITY,
  REFERRAL_STATUS,
};
