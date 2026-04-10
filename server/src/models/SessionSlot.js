const mongoose = require('mongoose');
const { Schema } = mongoose;

const SLOT_STATUS = ['scheduled', 'completed', 'missed', 'rescheduled'];

const SessionSlotSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'ChildCase',
      required: true,
      index: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'TherapySchedule',
      required: true,
      index: true,
    },
    /** Calendar day (start of day stored; display with case-local formatting on client). */
    date: {
      type: Date,
      required: true,
      index: true,
    },
    /** "HH:mm" 24h */
    time: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: SLOT_STATUS,
      default: 'scheduled',
      index: true,
    },
  },
  { timestamps: true }
);

SessionSlotSchema.index({ caseId: 1, date: 1, time: 1 }, { unique: true });

module.exports = {
  SessionSlot: mongoose.model('SessionSlot', SessionSlotSchema),
  SLOT_STATUS,
};
