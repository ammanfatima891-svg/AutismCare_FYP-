const mongoose = require('mongoose');
const { Schema } = mongoose;

/** Canonical domains for multi-select (saved on plan). */
const THERAPY_DOMAIN_OPTIONS = [
  'Speech',
  'OT',
  'Sensory',
  'Behavioral',
  'Behavioral (ABA)',
  'AAC',
  'PECS',
];

const SHORT_TERM_GOAL_STATUS = ['Active', 'Achieved', 'Modified'];

/** Legacy goal subdocument (kept for backward compatibility). */
const GoalSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['long-term', 'short-term'], default: 'short-term' },
    description: { type: String, trim: true, default: '' },
    domain: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const LongTermGoalSchema = new Schema(
  {
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    timeline: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const ShortTermGoalSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    measurableCriteria: { type: String, trim: true, default: '' },
    reviewDate: { type: Date, default: null },
    status: {
      type: String,
      enum: SHORT_TERM_GOAL_STATUS,
      default: 'Active',
    },
    domain: {
      type: String,
      enum: THERAPY_DOMAIN_OPTIONS,
      required: true,
    },
  },
  { _id: true }
);

const ActivitySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    linkedGoal: { type: String, trim: true, default: '' },
    /** Optional link to a reusable library activity (Activity collection) */
    libraryActivityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      default: undefined,
    },
  },
  { _id: false }
);

const TherapyPlanSchema = new Schema(
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
    /** Multi-select therapy domains */
    domains: {
      type: [String],
      default: [],
    },
    /** Legacy goals array — retained for existing plans / clinician tools */
    goals: {
      type: [GoalSchema],
      default: [],
    },
    /** Single long-term goal (new structure) */
    longTermGoal: {
      type: LongTermGoalSchema,
      default: undefined,
    },
    /** Structured short-term goals with domain + status (clinician analytics) */
    shortTermGoals: {
      type: [ShortTermGoalSchema],
      default: [],
    },
    activities: {
      type: [ActivitySchema],
      default: [],
    },
    /** Plan lifecycle: draft = partial OK; final = submitted therapy plan */
    status: {
      type: String,
      enum: ['draft', 'final'],
      default: 'draft',
      index: true,
    },
    /** Kept for backward compatibility — mirrors status === 'draft' */
    draft: {
      type: Boolean,
      default: true,
    },
    /** Therapist who last assigned this plan to the case child (Therapy Plans → Assign flow). */
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    /** Child this plan is assigned to (must match ChildCase.childId for the plan’s case). */
    assignedChildId: {
      type: Schema.Types.ObjectId,
      default: undefined,
      index: true,
    },
  },
  { timestamps: true }
);

TherapyPlanSchema.index({ caseId: 1, therapistId: 1 });

const TherapyPlan = mongoose.model('TherapyPlan', TherapyPlanSchema);
TherapyPlan.THERAPY_DOMAIN_OPTIONS = THERAPY_DOMAIN_OPTIONS;
TherapyPlan.SHORT_TERM_GOAL_STATUS = SHORT_TERM_GOAL_STATUS;
module.exports = TherapyPlan;
