const mongoose = require('mongoose');
const { Schema } = mongoose;

/** Align with therapy plan filters; "Behavioral" filter on API maps to Behavioral + Behavioral (ABA) */
const ACTIVITY_DOMAIN_OPTIONS = [
  'Speech',
  'OT',
  'Sensory',
  'Behavioral',
  'Behavioral (ABA)',
  'AAC',
  'PECS',
];

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

const ActivitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    /** Legacy field — kept for backward compatibility; prefer objective/procedure for new templates */
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    objective: {
      type: String,
      trim: true,
      default: '',
    },
    procedure: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    materials: {
      type: String,
      trim: true,
      default: '',
    },
    frequency: {
      type: String,
      trim: true,
      default: '',
    },
    difficulty: {
      type: String,
      enum: DIFFICULTY_OPTIONS,
      default: 'Medium',
    },
    parentInvolvement: {
      type: Boolean,
      default: false,
    },
    domain: {
      type: String,
      enum: ACTIVITY_DOMAIN_OPTIONS,
      required: true,
    },
    /**
     * null = platform / system template (seeded, read-only for therapists).
     * ObjectId = therapist-owned custom or cloned template.
     */
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    /** Library templates are the reusable source; plans/assignments reference activityId */
    isTemplate: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/** Unique name per owner: one row per (name, therapist) and one platform row per (name, null) */
ActivitySchema.index({ name: 1, createdBy: 1 }, { unique: true });

const Activity = mongoose.model('Activity', ActivitySchema);
Activity.ACTIVITY_DOMAIN_OPTIONS = ACTIVITY_DOMAIN_OPTIONS;
Activity.DIFFICULTY_OPTIONS = DIFFICULTY_OPTIONS;

module.exports = Activity;
