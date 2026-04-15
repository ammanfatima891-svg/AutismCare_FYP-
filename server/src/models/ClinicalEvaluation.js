const mongoose = require('mongoose');
const { Schema } = mongoose;

const { EVALUATION_STATUS } = require('../constants/workflowEnums');
const { normalizeEvaluationStatus } = require('../utils/normalizeWorkflowStatus');

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
    /**
     * CDSS upgrade note:
     * These fields historically stored free-text strings. They are now "mixed" to support
     * both legacy string documents and the new structured CDSS payload without breaking reads.
     */
    observations: {
      type: Schema.Types.Mixed,
      default: { tags: [], severity: '', notes: '' },
    },
    developmentalSummary: {
      type: Schema.Types.Mixed,
      default: {},
    },
    diagnosis: {
      type: Schema.Types.Mixed,
      default: { primary: '', confidence: '', severityLevel: '', rationale: '' },
    },
    comorbidConditions: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: Schema.Types.Mixed,
      default: { therapies: [], followUp: '' },
    },
    decision: {
      referralRequired: { type: Boolean, default: false },
      suggestedSpecialists: { type: [String], default: [] },
      suggestFurtherTesting: { type: Boolean, default: false },
    },
    referralCreated: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(EVALUATION_STATUS),
      required: true,
      default: EVALUATION_STATUS.DRAFT,
      index: true,
      set: (v) => normalizeEvaluationStatus(v) || v,
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

// Normalize BEFORE validation so lowercase inputs like "draft"/"final" don't fail enum validation.
ClinicalEvaluationSchema.pre('validate', function (next) {
  const norm = normalizeEvaluationStatus(this.status);
  if (norm) this.status = norm;
  next();
});

function toApiStatus(value) {
  const v = String(value || '').trim().toUpperCase();
  if (v === EVALUATION_STATUS.DRAFT) return 'draft';
  if (v === EVALUATION_STATUS.FINALIZED) return 'final';
  return String(value || '');
}

ClinicalEvaluationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    if (ret && ret.status != null) ret.status = toApiStatus(ret.status);
    return ret;
  },
});
ClinicalEvaluationSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret) => {
    if (ret && ret.status != null) ret.status = toApiStatus(ret.status);
    return ret;
  },
});

module.exports = {
  ClinicalEvaluation: mongoose.model('ClinicalEvaluation', ClinicalEvaluationSchema),
  EVALUATION_STATUS,
};
