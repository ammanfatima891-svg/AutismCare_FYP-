// models/Questionnaire.js
const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  questionId: String,          // e.g. "Q1"
  text: String,
  domain: String,              // ASQ domain OR "MCHAT"
  reverseScored: { type: Boolean, default: false } // for M-CHAT-R
});

const QuestionnaireSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ["MCHAT-R", "ASQ-3"],
    required: true
  },
  intervalMonths: Number,      // ASQ only (2–60)
  minAgeDays: Number,
  maxAgeDays: Number,
  domains: [String],           // ASQ domains
  questions: [QuestionSchema]
});

module.exports = mongoose.model("Questionnaire", QuestionnaireSchema);
