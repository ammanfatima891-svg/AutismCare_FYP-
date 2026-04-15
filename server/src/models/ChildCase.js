const mongoose = require('mongoose');
const { Schema } = mongoose;

const CASE_STATUS = {
  ACTIVE: 'Active',
  UNDER_EVALUATION: 'Under Evaluation',
  REFERRED: 'Referred',
  ONGOING_THERAPY: 'Ongoing Therapy',
};

const RISK_LEVEL = ['low', 'medium', 'high', 'unknown'];

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
      required: true,
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
      enum: Object.values(CASE_STATUS),
      default: CASE_STATUS.UNDER_EVALUATION,
      index: true,
      set: (v) => {
        if (v == null) return v;
        const raw = String(v).trim();
        if (!raw) return raw;
        const key = raw.toLowerCase().replace(/\s+/g, '_');
        const map = {
          active: CASE_STATUS.ACTIVE,
          under_evaluation: CASE_STATUS.UNDER_EVALUATION,
          under__evaluation: CASE_STATUS.UNDER_EVALUATION,
          referred: CASE_STATUS.REFERRED,
          ongoing_therapy: CASE_STATUS.ONGOING_THERAPY,
        };
        return map[key] ?? raw;
      },
    },
  },
  { timestamps: true }
);

ChildCaseSchema.index({ clinicianId: 1, childId: 1 }, { unique: true });

module.exports = {
  ChildCase: mongoose.model('ChildCase', ChildCaseSchema),
  CASE_STATUS,
  CASE_RISK_LEVELS: RISK_LEVEL,
};
