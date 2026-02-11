const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');

const TEST_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const TEST_TYPES = {
  BLOOD: 'blood',
  GENETIC: 'genetic',
  METABOLIC: 'metabolic',
  IMAGING: 'imaging',
  EEG: 'eeg',
  BEHAVIORAL: 'behavioral',
  OTHER: 'other'
};

const LabTestOrderSchema = new Schema({
  uuid: {
    type: String,
    default: () => crypto.randomUUID(),
    unique: true,
    index: true
  },
  childId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  childName: {
    type: String,
    required: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clinicianId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  labTechnicianId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  testType: {
    type: String,
    enum: Object.values(TEST_TYPES),
    required: true
  },
  testName: {
    type: String,
    required: true
  },
  testDetails: {
    type: String
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: Object.values(TEST_STATUS),
    default: TEST_STATUS.PENDING
  },
  reportUrl: {
    type: String
  },
  reportEncrypted: {
    type: Boolean,
    default: false
  },
  results: {
    type: String
  },
  notes: {
    type: String
  },
  isReleasedToParent: {
    type: Boolean,
    default: false
  },
  releasedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
LabTestOrderSchema.index({ labTechnicianId: 1, status: 1 });
LabTestOrderSchema.index({ parentId: 1, isReleasedToParent: 1 });
LabTestOrderSchema.index({ clinicianId: 1, status: 1 });

const LabTestOrder = mongoose.model('LabTestOrder', LabTestOrderSchema);

module.exports = { LabTestOrder, TEST_STATUS, TEST_TYPES };

