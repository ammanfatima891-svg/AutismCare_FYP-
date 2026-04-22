const mongoose = require('mongoose');
const { Schema } = mongoose;

const RISK_LEVEL = ['low', 'medium', 'high', 'unknown'];

const CASE_LIFECYCLE_STATUS = [
  'NEW',
  'SCREENING',
  'REVIEW',
  'DIAGNOSIS',
  'DIAGNOSIS_READY',
  'THERAPY',
  'THERAPY_ACTIVE',
  'MONITORING',
];

const ChildCaseSchema = new Schema(
  {
    childId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clinicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    screeningSummary: {
      type: Schema.Types.Mixed,
      default: {},
    },
    riskLevel: {
      type: String,
      enum: RISK_LEVEL,
      default: 'unknown',
      index: true,
    },
    status: {
      type: String,
      enum: CASE_LIFECYCLE_STATUS,
      default: 'NEW',
      index: true,
      set: (v) => {
        if (v == null) return v;
        const raw = String(v).trim();
        if (!raw) return raw;
        // Backward-compatible mapping from legacy status labels to lifecycle states.
        const key = raw.toLowerCase().replace(/\s+/g, '_');
        const legacyMap = {
          active: 'REVIEW',
          under_evaluation: 'REVIEW',
          referred: 'THERAPY',
          ongoing_therapy: 'THERAPY_ACTIVE',
        };
        return legacyMap[key] || raw;
      },
    },
    caseHistory: {
      type: [
        {
          fromStatus: { type: String, default: null },
          toStatus: { type: String, required: true },
          event: { type: String, required: true },
          context: { type: Schema.Types.Mixed, default: undefined },
          timestamp: { type: Date, default: Date.now },
          triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        },
      ],
      default: [],
    },
    screeningProgress: {
      mchatCompleted: { type: Boolean, default: false },
      asqCompleted: { type: Boolean, default: false },
      skippedMchat: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

ChildCaseSchema.index({ parentId: 1, childId: 1 }, { unique: true });

module.exports = {
  ChildCase: mongoose.model('ChildCase', ChildCaseSchema),
  CASE_LIFECYCLE_STATUS,
  CASE_RISK_LEVELS: RISK_LEVEL,
};
