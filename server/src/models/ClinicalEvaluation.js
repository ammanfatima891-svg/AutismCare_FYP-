const mongoose = require('mongoose');
const { Schema } = mongoose;

const EVALUATION_STATUS = {
  DRAFT: 'draft',
  FINAL: 'final',
};

const ClinicalEvaluationSchema = new Schema(
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
    observations: {
      type: String,
      trim: true,
      default: '',
    },
    developmentalSummary: {
      type: String,
      trim: true,
      default: '',
    },
    diagnosis: {
      type: String,
      trim: true,
      default: '',
    },
    comorbidConditions: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(EVALUATION_STATUS),
      required: true,
      default: EVALUATION_STATUS.DRAFT,
      index: true,
    },
    // Versioning metadata: updates produce a new document linked to previous version.
    sourceEvaluationId: {
      type: Schema.Types.ObjectId,
      ref: 'ClinicalEvaluation',
      default: null,
    },
  },
  { timestamps: true }
);

ClinicalEvaluationSchema.index({ caseId: 1, clinicianId: 1, createdAt: -1 });

module.exports = {
  ClinicalEvaluation: mongoose.model('ClinicalEvaluation', ClinicalEvaluationSchema),
  EVALUATION_STATUS,
};
