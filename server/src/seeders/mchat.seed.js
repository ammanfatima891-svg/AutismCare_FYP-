require("dotenv").config();
const mongoose = require("mongoose");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const Questionnaire = require("../models/Questionnaire");
const mchatData = require("./data/mchat.json");

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for seeding');

    await Questionnaire.deleteMany({ name: "MCHAT-R" });

    await Questionnaire.create({
      name: "MCHAT-R",
      domains: ["MCHAT"],
      questions: mchatData.questions
    });

    console.log("✅ M-CHAT-R seeded successfully");
    process.exit(0);

  } catch (error) {
    console.error("❌ M-CHAT-R seed failed", error);
    process.exit(1);
  }
})();
