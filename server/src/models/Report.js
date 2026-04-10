const mongoose = require('mongoose');
const { Schema } = mongoose;

const REPORT_TYPES = ['monthly', 'iep', 'clinician', 'parent', 'progress', 'session', 'therapy'];

const ReportSchema = new Schema(
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
    type: {
      type: String,
      enum: REPORT_TYPES,
      required: true,
      index: true,
    },
    /** Full structured payload: { type, generatedAt, insufficientData?, ...sections } */
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

ReportSchema.index({ caseId: 1, type: 1, createdAt: -1 });
ReportSchema.index({ caseId: 1, therapistId: 1, type: 1, createdAt: -1 });

const Report = mongoose.model('Report', ReportSchema);

module.exports = { Report, REPORT_TYPES };
