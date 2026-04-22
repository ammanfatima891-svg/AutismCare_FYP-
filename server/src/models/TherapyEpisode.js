const mongoose = require('mongoose');
const { Schema } = mongoose;

const TherapyEpisodeSchema = new Schema(
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
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'TherapyPlan',
      required: true,
      index: true,
    },
    planVersion: { type: Number, required: true, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

TherapyEpisodeSchema.index({ caseId: 1, therapistId: 1, isActive: 1 });

const TherapyEpisode = mongoose.model('TherapyEpisode', TherapyEpisodeSchema);
module.exports = TherapyEpisode;
