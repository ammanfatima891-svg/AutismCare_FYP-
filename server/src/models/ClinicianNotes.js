const mongoose = require('mongoose');
const { Schema } = mongoose;

const ClinicianNotesSchema = new Schema(
  {
    caseId: {
      type: Schema.Types.ObjectId,
      ref: 'ChildCase',
      required: true,
      index: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

ClinicianNotesSchema.index({ caseId: 1, createdAt: -1 });

module.exports = mongoose.model('ClinicianNotes', ClinicianNotesSchema);
