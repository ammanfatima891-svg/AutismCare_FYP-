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

const SHORT_TERM_GOAL_STATUS = ['Active', 'Achieved', 'Modified', 'OnHold', 'Retired'];

const MEASUREMENT_TYPES = ['accuracy_trials', 'frequency', 'duration', 'latency', 'rating_1_5', 'score'];

const MASTERY_RULE_TYPES = ['threshold_consecutive_sessions', 'threshold_out_of_n_sessions'];

const PLAN_APPROVAL_STATUS = ['none', 'pending', 'approved', 'rejected'];

/** Canonical plan lifecycle (author → validator → in-use). */
const PLAN_LIFECYCLE_STATUSES = ['draft', 'final', 'approved', 'active', 'archived'];

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

const MeasurementSchema = new Schema(
  {
    type: {
      type: String,
      enum: MEASUREMENT_TYPES,
      default: 'rating_1_5',
    },
    unit: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const BaselineSchema = new Schema(
  {
    value: { type: Number, default: null },
    date: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const TargetSchema = new Schema(
  {
    value: { type: Number, default: null },
    notes: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const MasteryRuleSchema = new Schema(
  {
    ruleType: {
      type: String,
      enum: MASTERY_RULE_TYPES,
      default: 'threshold_out_of_n_sessions',
    },
    /** For accuracy: percent 0–100; for rating_1_5 mapped to percent elsewhere */
    threshold: { type: Number, default: 80 },
    window: { type: Number, default: 5 },
    minSessions: { type: Number, default: 3 },
  },
  { _id: false }
);

const ShortTermGoalSchema = new Schema(
  {
    /** Optional external-stable id (mirrors session goalData.goalId when set). */
    goalId: { type: String, trim: true, default: '' },
    /** Stable key for session goalData linkage (UUID). */
    goalKey: { type: String, trim: true, default: '' },
    title: { type: String, required: true, trim: true },
    measurableCriteria: { type: String, trim: true, default: '' },
    /** Human-readable mastery / success criteria (may mirror measurableCriteria). */
    masteryCriteria: { type: String, trim: true, default: '' },
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
    measurement: { type: MeasurementSchema, default: () => ({}) },
    baseline: { type: BaselineSchema, default: () => ({}) },
    target: { type: TargetSchema, default: () => ({}) },
    masteryRule: { type: MasteryRuleSchema, default: () => ({}) },
    /** easy | moderate | strict — resolves default mastery thresholds when set */
    masteryPreset: { type: String, trim: true, default: '' },
  },
  { _id: true }
);

const PlanApprovalSchema = new Schema(
  {
    status: { type: String, enum: PLAN_APPROVAL_STATUS, default: 'none', index: true },
    requestedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
    rejectionReason: { type: String, trim: true, default: '' },
  },
  { _id: false }
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
    /** Explicit lifecycle (authority: therapist authors; clinician validates; active = session-eligible). */
    planStatus: {
      type: String,
      enum: PLAN_LIFECYCLE_STATUSES,
      default: 'draft',
      index: true,
    },
    /** When therapist submitted plan for clinician review. */
    submittedAt: { type: Date, default: null },
    /** Top-level mirror of clinician sign-off (also stored under `approval`). */
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
    /** Increments on explicit publish / major revision (analytics versioning). */
    planVersion: { type: Number, default: 1, min: 1 },
    /** Clinician (supervisor) approval workflow for the active plan document. */
    approval: { type: PlanApprovalSchema, default: () => ({}) },
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
    /** Once true, short-term goal baselines are frozen (set after first session log). */
    baselineLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

TherapyPlanSchema.index({ caseId: 1, therapistId: 1 });

const TherapyPlan = mongoose.model('TherapyPlan', TherapyPlanSchema);
TherapyPlan.THERAPY_DOMAIN_OPTIONS = THERAPY_DOMAIN_OPTIONS;
TherapyPlan.SHORT_TERM_GOAL_STATUS = SHORT_TERM_GOAL_STATUS;
TherapyPlan.MEASUREMENT_TYPES = MEASUREMENT_TYPES;
TherapyPlan.MASTERY_RULE_TYPES = MASTERY_RULE_TYPES;
TherapyPlan.PLAN_APPROVAL_STATUS = PLAN_APPROVAL_STATUS;
TherapyPlan.PLAN_LIFECYCLE_STATUSES = PLAN_LIFECYCLE_STATUSES;
module.exports = TherapyPlan;
