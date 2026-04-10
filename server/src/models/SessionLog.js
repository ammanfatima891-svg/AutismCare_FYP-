const mongoose = require('mongoose');
const { Schema } = mongoose;

const SessionLogSchema = new Schema(
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
    sessionDate: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      default: 0, // minutes
    },
    goalsTargeted: {
      type: [String],
      default: [],
    },
    activitiesUsed: {
      type: [String],
      default: [],
    },
    childResponse: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    /** Shown to parent (home assignment / communication flows). Required field; may be empty string. */
    parentInstructions: {
      type: String,
      trim: true,
      default: '',
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'missed', 'rescheduled'],
      default: 'completed',
      index: true,
    },
    /** Optional link to Therapy Schedule SessionSlot — set when logging against a scheduled slot. */
    sessionSlotId: {
      type: Schema.Types.ObjectId,
      ref: 'SessionSlot',
      default: undefined,
      sparse: true,
      index: true,
    },
  },
  { timestamps: true }
);

SessionLogSchema.index({ caseId: 1, sessionDate: -1 });
/** At most one session log per scheduled slot (when linked). */
SessionLogSchema.index({ sessionSlotId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('SessionLog', SessionLogSchema);
