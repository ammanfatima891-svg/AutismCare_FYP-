require("dotenv").config();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const connectDB = require("../config/database");
const Questionnaire = require("../models/Questionnaire");
const asqData = require("./data/asq.json");

(async () => {
  try {
    // Connect to DB
    await connectDB();

    // Delete existing ASQ-3 documents
    await Questionnaire.deleteMany({ name: "ASQ-3" });

    // Insert each interval as a separate document
    for (const interval of asqData) {
      await Questionnaire.create({
        name: "ASQ-3",
        intervalMonths: interval.intervalMonths,
        minAgeDays: interval.minAgeDays,
        maxAgeDays: interval.maxAgeDays,
        domains: interval.domains,
        questions: interval.questions
      });
    }

    console.log("✅ ASQ-3 all intervals seeded successfully");
    process.exit(0);

  } catch (error) {
    console.error("❌ ASQ-3 seed failed", error);
    process.exit(1);
  }
})();
