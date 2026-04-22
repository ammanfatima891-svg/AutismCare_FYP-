// models/Submission.js
const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema({
  childId: mongoose.Schema.Types.ObjectId,
  questionnaireType: {
    type: String,
    enum: ["MCHAT-R", "ASQ-3"]
  },

  dob: Date,
  weeksPreterm: Number,

  intervalMonths: Number,

  responses: [
    {
      questionId: String,
      answer: String // "yes" | "sometimes" | "not_yet"
    }
  ],

  scores: {
    totalScore: Number,
    domainScores: mongoose.Schema.Types.Mixed,
    domainStatuses: mongoose.Schema.Types.Mixed // Status for each domain: "normal development", "need monitoring", "referral for further evaluation"
  },


  result: {
  type: String,
  enum: ["Pass", "Monitor", "Fail"]
},
  resultDescription: String,
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'unknown'],
  },
  clinicianDecision: {
    decision: {
      type: String,
      enum: ['clear', 'monitor', 'refer'],
      default: undefined,
    },
    notes: {
      type: String,
      default: '',
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    decidedAt: {
      type: Date,
      default: undefined,
    },
  },
  /** Clinically Safe Decision Support Engine output (non-diagnostic). */
  decisionSupport: {
    autismRisk: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "INCOMPLETE", "IGNORED"],
      default: undefined,
    },
    developmentStatus: {
      type: String,
      enum: ["NORMAL", "MONITOR", "MILD_DELAY", "SIGNIFICANT_DELAY"],
      default: undefined,
    },
    recommendation: {
      type: String,
      default: "",
    },
    urgencyLevel: {
      type: String,
      enum: ["green", "orange", "red"],
      default: undefined,
    },
    inputsUsed: mongoose.Schema.Types.Mixed,
    safetyNote: {
      type: String,
      default: "",
    },
  },
}, { timestamps: true });

module.exports = mongoose.model("Submission", SubmissionSchema);
