const mongoose = require('mongoose');
const { Schema } = mongoose;

const TrendPointSchema = new Schema(
  {
    date: { type: String, required: true },
    value: { type: Number, default: 0 },
  },
  { _id: false }
);

const ProgressSnapshotSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'ChildCase',
      required: true,
      index: true,
    },
    domain: {
      type: String,
      enum: ['Speech', 'Occupational Therapy', 'Behavioral', 'Sensory'],
      required: true,
      index: true,
    },
    progressPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    trendData: {
      type: [TrendPointSchema],
      default: [],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

ProgressSnapshotSchema.index({ caseId: 1, domain: 1 }, { unique: true });

module.exports = mongoose.model('ProgressSnapshot', ProgressSnapshotSchema);
