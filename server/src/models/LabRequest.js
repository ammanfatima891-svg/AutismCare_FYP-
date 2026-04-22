const mongoose = require('mongoose');
const { Schema } = mongoose;

const LAB_REQUEST_STATUS = ['pending', 'in_progress', 'completed'];

const LabRequestSchema = new Schema(
  {
    child_id: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    clinician_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lab_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    test_id: {
      type: Schema.Types.ObjectId,
      ref: 'LabTest',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: LAB_REQUEST_STATUS,
      default: 'pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    report_url: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

LabRequestSchema.index({ child_id: 1, createdAt: -1 });
LabRequestSchema.index({ lab_id: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('LabRequest', LabRequestSchema);
module.exports.LAB_REQUEST_STATUS = LAB_REQUEST_STATUS;
