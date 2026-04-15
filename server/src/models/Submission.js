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
}, { timestamps: true });

module.exports = mongoose.model("Submission", SubmissionSchema);
