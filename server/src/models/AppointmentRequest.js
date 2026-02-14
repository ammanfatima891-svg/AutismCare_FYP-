const mongoose = require('mongoose');

const AppointmentRequestSchema = new mongoose.Schema({
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  child: {
    type: mongoose.Schema.Types.ObjectId,
    required: true // Refers to child _id in parent's children array
  },
  clinician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentType: {
    type: String,
    required: true,
    enum: ['initial-consultation', 'follow-up', 'screening-review', 'therapy-session']
  },
  preferred_date: {
    type: Date,
    required: true
  },
  preferred_time: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  clinicalNotes: [{
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  recommendations: {
    furtherEvaluation: Boolean,
    therapyReferral: String, // text only
    labTest: String // label only
  }
}, { timestamps: true });

module.exports = mongoose.model('AppointmentRequest', AppointmentRequestSchema);
