const mongoose = require('mongoose');
const { Schema } = mongoose;

/** Unified clinical intelligence stream — all modules emit on mutation. */
const CLINICAL_EVENT_TYPES = [
  'SESSION_COMPLETED',
  'HOME_ASSIGNMENT_SUBMITTED',
  'LAB_REPORT_UPLOADED',
  'SCREENING_COMPLETED',
  'PROGRESS_UPDATED',
  'THERAPY_PLAN_UPDATED',
  'APPOINTMENT_UPDATED',
];

const ClinicalEventSchema = new Schema(
  {
    eventType: {
      type: String,
      enum: CLINICAL_EVENT_TYPES,
      required: true,
      index: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'ChildCase',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    linkedModules: {
      type: [String],
      default: [],
    },
    /** Optional diff / audit for plan and recommendation changes */
    previousState: { type: Schema.Types.Mixed, default: undefined },
    newState: { type: Schema.Types.Mixed, default: undefined },
    /** Cross-module correlation hints (e.g. lab + therapy regression) */
    crossDomainInsight: {
      type: [String],
      default: [],
    },
    /** Who changed stored recommendation text + before/after (also exposed on timeline). */
    recommendationAudit: { type: Schema.Types.Mixed, default: undefined },
    /** Slim progressEngine snapshot stored with PROGRESS_UPDATED when available */
    progressEngineSnapshot: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: false }
);

ClinicalEventSchema.index({ caseId: 1, timestamp: -1 });

module.exports = {
  ClinicalEvent: mongoose.model('ClinicalEvent', ClinicalEventSchema),
  CLINICAL_EVENT_TYPES,
};
