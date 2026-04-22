const mongoose = require('mongoose');
const { Schema } = mongoose;

const GOAL_DATA_MEASUREMENT = ['accuracy_trials', 'frequency', 'duration', 'latency', 'rating_1_5', 'score'];
const GOAL_DATA_PROMPT = [
  'independent',
  'gestural',
  'verbal',
  'partial_physical',
  'full_physical',
  'other',
  '',
];
const GOAL_DATA_SETTING = ['clinic', 'home', 'tele', 'school', 'other', ''];
const GOAL_DATA_SOURCE = ['therapist', 'legacy_estimate'];

const SessionGoalDataSchema = new Schema(
  {
    /** Matches TherapyPlan shortTermGoals.goalId / goalKey when set. */
    goalId: { type: String, trim: true, default: '' },
    goalKey: { type: String, trim: true, default: '' },
    goalTitleMatch: { type: String, trim: true, default: '' },
    measurementType: { type: String, enum: GOAL_DATA_MEASUREMENT, default: 'rating_1_5' },
    /** Normalized 0–5 session score (optional shorthand when measurementType is `score`). */
    score: { type: Number, min: 0, max: 5, default: undefined },
    trials: { type: Number, default: undefined },
    correct: { type: Number, default: undefined },
    count: { type: Number, default: undefined },
    seconds: { type: Number, default: undefined },
    rating: { type: Number, min: 1, max: 5, default: undefined },
    promptLevel: { type: String, enum: GOAL_DATA_PROMPT, default: '' },
    setting: { type: String, enum: GOAL_DATA_SETTING, default: '' },
    notes: { type: String, trim: true, default: '' },
    source: { type: String, enum: GOAL_DATA_SOURCE, default: 'therapist' },
  },
  { _id: false }
);

const NOTE_STATES = ['draft', 'signed', 'locked'];

const ActivityUsageSchema = new Schema(
  {
    /** Original label as entered or from library */
    displayName: { type: String, trim: true, default: '' },
    normalizedName: { type: String, trim: true, lowercase: true, default: '' },
    /** Kept for backward compatibility — mirrors displayName when set. */
    name: { type: String, trim: true, default: '' },
    isCustomActivity: { type: Boolean, default: false },
  },
  { _id: false }
);

const SessionLogSchema = new Schema(
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
    sessionDate: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      default: 0, // minutes
    },
    goalsTargeted: {
      type: [String],
      default: [],
    },
    activitiesUsed: {
      type: [String],
      default: [],
    },
    /** Per-activity flag: true when name was not from plan or activity library at log time. */
    activityUsage: {
      type: [ActivityUsageSchema],
      default: [],
    },
    childResponse: {
      type: String,
      trim: true,
      default: '',
    },
    /** Per-goal clinical measurements (preferred for stakeholder-grade analytics). */
    goalData: {
      type: [SessionGoalDataSchema],
      default: [],
    },
    /** Therapy plan document this session was logged against (versioning). */
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'TherapyPlan',
      default: undefined,
      index: true,
    },
    planVersionNumber: {
      type: Number,
      default: undefined,
      min: 1,
    },
    /** Clinical note workflow */
    noteState: {
      type: String,
      enum: NOTE_STATES,
      default: 'draft',
      index: true,
    },
    signedAt: { type: Date, default: null },
    signedBy: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
    coSignedAt: { type: Date, default: null },
    coSignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
    lateEntry: { type: Boolean, default: false },
    lateEntryReason: { type: String, trim: true, default: '' },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    /** Shown to parent (home assignment / communication flows). Required field; may be empty string. */
    parentInstructions: {
      type: String,
      trim: true,
      default: '',
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'missed', 'rescheduled'],
      default: 'completed',
      index: true,
    },
    /** Optional link to Therapy Schedule SessionSlot — set when logging against a scheduled slot. */
    sessionSlotId: {
      type: Schema.Types.ObjectId,
      ref: 'SessionSlot',
      default: undefined,
    },
    /** Active therapy episode when session was logged. */
    episodeId: {
      type: Schema.Types.ObjectId,
      ref: 'TherapyEpisode',
      default: undefined,
      index: true,
    },
  },
  { timestamps: true }
);

SessionLogSchema.index({ caseId: 1, sessionDate: -1 });
/** At most one session log per scheduled slot (when linked). */
SessionLogSchema.index({ sessionSlotId: 1 }, { unique: true, sparse: true });

const SessionLog = mongoose.model('SessionLog', SessionLogSchema);
SessionLog.NOTE_STATES = NOTE_STATES;
SessionLog.GOAL_DATA_MEASUREMENT = GOAL_DATA_MEASUREMENT;
module.exports = SessionLog;
