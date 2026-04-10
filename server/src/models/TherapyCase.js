const mongoose = require('mongoose');
const { Schema } = mongoose;

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
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active'],
      default: 'active',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

TherapyCaseSchema.index({ caseId: 1, therapistId: 1 }, { unique: true });

module.exports = mongoose.model('TherapyCase', TherapyCaseSchema);
