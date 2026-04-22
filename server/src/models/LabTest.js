const mongoose = require('mongoose');
const { Schema } = mongoose;

const LabTestSchema = new Schema(
  {
    lab_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    test_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    duration: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

LabTestSchema.index({ lab_id: 1, test_name: 1 }, { unique: true });

module.exports = mongoose.model('LabTest', LabTestSchema);
