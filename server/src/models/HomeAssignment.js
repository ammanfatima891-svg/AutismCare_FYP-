const mongoose = require('mongoose');
const { Schema } = mongoose;

/** Full workflow: pending → submitted → reviewed → completed */
const HOME_ASSIGNMENT_STATUS = ['pending', 'submitted', 'reviewed', 'completed'];

/** Stored as fileUrl; API responses may also expose submissionUrl (same value). */
const ParentSubmissionSchema = new Schema(
  {
    fileUrl: { type: String, default: '' },
    fileType: { type: String, enum: ['image', 'video', ''], default: '' },
    submittedAt: { type: Date, default: null },
  },
  { _id: false }
);

/** Stored as comment; API responses may also expose feedback (same value). */
const TherapistFeedbackSchema = new Schema(
  {
    comment: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { _id: false }
);

const HomeAssignmentSchema = new Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    materials: {
      type: String,
      trim: true,
      default: '',
    },
    /** How often the family should practice (e.g. "3x per week") */
    frequency: {
      type: String,
      trim: true,
      default: '',
    },
    /** Expected length per practice (e.g. "10 minutes") */
    duration: {
      type: String,
      trim: true,
      default: '',
    },
    /** Primary ref to Activity library item */
    activityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      default: undefined,
      index: true,
    },
    /** @deprecated use activityId — kept for existing documents */
    sourceActivityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      default: undefined,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: HOME_ASSIGNMENT_STATUS,
      default: 'pending',
      index: true,
    },
    /** Optional link to TherapyPlan shortTermGoals[].goalKey for per-goal analytics. */
    goalKey: { type: String, trim: true, default: '' },
    /** Optional therapy domain label (mirrors plan domain when goal-linked). */
    domain: { type: String, trim: true, default: '' },
    parentSubmission: {
      type: ParentSubmissionSchema,
      default: () => ({}),
    },
    therapistFeedback: {
      type: TherapistFeedbackSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

HomeAssignmentSchema.index({ therapistId: 1, status: 1, dueDate: 1 });
HomeAssignmentSchema.index({ caseId: 1, status: 1 });

module.exports = {
  HomeAssignment: mongoose.model('HomeAssignment', HomeAssignmentSchema),
  HOME_ASSIGNMENT_STATUS,
};
