const mongoose = require('mongoose');
const { Schema } = mongoose;

// Allowed test types for lab requests
const TEST_TYPES = ['EEG', 'Genetic', 'Behavioral', 'Blood', 'Urine', 'Imaging', 'Other'];

// Status flow: PENDING → UPLOADED → RELEASED
const REQUEST_STATUS = ['PENDING', 'UPLOADED', 'RELEASED'];

/**
 * World-standard reality check:
 * - Autism diagnosis is primarily clinical/behavioral (DSM/ICD based).
 * - "Investigations" are usually indication-driven (hearing/vision; genetics in many settings; EEG/MRI/metabolic only if indicated).
 * This schema supports structured, multi-item requests while keeping legacy `testType` working.
 */
const REQUEST_ITEM_CATEGORIES = [
  // Core medical investigations (as applicable)
  'Audiology',
  'Vision',
  'Genetics',
  'Laboratory',
  'Neurology',
  'Imaging',
  // Co-occurring conditions screening (often non-lab, but tracked here for coordination)
  'Sleep',
  'GI',
  'Nutrition',
  'Psychiatry',
  'Developmental',
  'Other',
];

const LabTestRequestItemSchema = new Schema(
  {
    category: { type: String, enum: REQUEST_ITEM_CATEGORIES, required: true },
    code: { type: String, trim: true, default: '' }, // optional (LOINC / local code)
    name: { type: String, trim: true, required: true },
    whenIndicatedOnly: { type: Boolean, default: true },
    typicalForASDWorkup: { type: Boolean, default: false },
    indications: { type: [String], default: [] }, // short, clinician-facing cues
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

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
  /** Optional link to ChildCase when the request is created from a known case. */
  caseId: {
    type: Schema.Types.ObjectId,
    ref: 'ChildCase',
    default: null,
    index: true,
  },
  /**
   * New structured items model. For legacy records, this may be empty.
   * For new records, `testType` becomes an optional summary field.
   */
  requestPurpose: {
    type: String,
    enum: ['ASD_DIAGNOSTIC_WORKUP', 'CO_OCCURRING_CONDITIONS', 'OTHER'],
    default: 'ASD_DIAGNOSTIC_WORKUP',
    index: true,
  },
  priority: {
    type: String,
    enum: ['ROUTINE', 'URGENT'],
    default: 'ROUTINE',
    index: true,
  },
  requestedItems: {
    type: [LabTestRequestItemSchema],
    default: [],
  },
  requestSummary: {
    type: String,
    trim: true,
    default: '',
  },
  testType: {
    type: String,
    enum: TEST_TYPES,
    /**
     * Legacy single-select type. Still accepted for older clients / records.
     * New clients should send `requestedItems` and can omit `testType`.
     */
    required: false,
    default: 'Other',
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
LabTestRequestSchema.index({ requestPurpose: 1, status: 1 });

module.exports = mongoose.model('LabTestRequest', LabTestRequestSchema);
module.exports.TEST_TYPES = TEST_TYPES;
module.exports.REQUEST_STATUS = REQUEST_STATUS;
module.exports.REQUEST_ITEM_CATEGORIES = REQUEST_ITEM_CATEGORIES;