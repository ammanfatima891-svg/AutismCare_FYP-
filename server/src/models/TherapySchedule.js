const mongoose = require('mongoose');
const { Schema } = mongoose;

/** Short English day names (Mon, Tue, …) — matches slot generator. */
const DAY_NAME_ENUM = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TherapyScheduleSchema = new Schema(
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
    days: {
      type: [String],
      required: true,
      validate: {
        validator(arr) {
          return Array.isArray(arr) && arr.length > 0 && arr.every((d) => DAY_NAME_ENUM.includes(d));
        },
        message: 'days must be non-empty and use Sun–Sat abbreviations',
      },
    },
    /** "HH:mm" 24h */
    time: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

TherapyScheduleSchema.index({ caseId: 1, startDate: 1, endDate: 1 });

module.exports = {
  TherapySchedule: mongoose.model('TherapySchedule', TherapyScheduleSchema),
  SCHEDULE_DAY_NAMES: DAY_NAME_ENUM,
};
