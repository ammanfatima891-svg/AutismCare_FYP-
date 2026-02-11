const mongoose = require('mongoose');
const { Schema } = mongoose;

// Allowed test types for lab requests
const TEST_TYPES = ['EEG', 'Genetic', 'Behavioral', 'Blood', 'Urine', 'Imaging', 'Other'];

// Status flow: PENDING → UPLOADED → RELEASED
const REQUEST_STATUS = ['PENDING', 'UPLOADED', 'RELEASED'];

const LabTestRequestSchema = new Schema({
  childId: {
    type: Schema.Types.ObjectId,
    required: [true, 'Child ID is required'],
    index: true
  },
  childName: {
    type: String,
    required: [true, 'Child name is required'],
    trim: true
  },
  childAge: {
    type: Number,
    required: [true, 'Child age is required']
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Parent ID is required']
  },
  clinicianId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Clinician ID is required']
  },
  testType: {
    type: String,
    enum: TEST_TYPES,
    required: [true, 'Test type is required']
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: REQUEST_STATUS,
    default: 'PENDING',
    index: true
  },
  // Clinician-controlled flag: whether the report is visible to parents
  releasedToParent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for common query patterns
LabTestRequestSchema.index({ clinicianId: 1, status: 1 });
LabTestRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LabTestRequest', LabTestRequestSchema);
module.exports.TEST_TYPES = TEST_TYPES;
module.exports.REQUEST_STATUS = REQUEST_STATUS;
