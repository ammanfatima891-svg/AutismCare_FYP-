// models/User.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const userSchema = new Schema({
  // Common
  fullName: { type: String, required: [true, 'Full name is required'], trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, 'Please provide a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[0-9]{7,15}$/, 'Please provide a valid phone number']
  },
  password: { type: String, required: [true, 'Password is required'], minlength: [8, 'Password must be at least 8 characters'] },

  // Roles
  roles: [{
    type: String,
    enum: ['parent', 'doctor', 'therapist', 'laboratory', 'admin']
  }],
  primaryRole: {
    type: String,
    enum: ['parent', 'doctor', 'therapist', 'laboratory', 'admin'],
    default: function () { return this.roles?.length ? this.roles[0] : 'parent'; }
  },

  // Role-specific professional info
  organization: {
    type: String,
    required: function () { return ['doctor', 'therapist', 'laboratory'].includes(this.primaryRole); }
  },
  licenseNumber: {
    type: String,
    unique: true,
    sparse: true,
    required: function () { return ['doctor', 'therapist', 'laboratory'].includes(this.primaryRole); }
  },

  medicalRegistrationNo: { type: String, unique: true, sparse: true },
  department: { type: String },
  experienceYears: { type: Number, min: 0 },
  qualification: { type: String },

  specialty: {
    type: String,
    required: function () { return ['doctor', 'therapist'].includes(this.primaryRole); }
  },
  therapyType: { type: String }, // e.g., ABA, SLP, OT
  certification: { type: String },

  labAddress: {
    type: String,
    required: function () { return this.primaryRole === 'laboratory'; }
  },
  labType: {
    type: String,
    enum: ['general', 'audiometrist', 'pathology', 'other'],
    default: 'general',
    required: function () { return this.primaryRole === 'laboratory'; }
  },
  availableTests: [{ type: String }],
  labRegistrationNo: { type: String, unique: true, sparse: true },

  // Parent-specific
  children: [{ type: Schema.Types.ObjectId, ref: 'Child' }],
  address: { type: String },
  CNIC: { type: String, unique: true, sparse: true },

  // Operational relationships
  assignedPatients: [{ type: Schema.Types.ObjectId, ref: 'Child' }], // doctors
  assignedSessions: [{ type: Schema.Types.ObjectId, ref: 'Session' }], // therapists
  labTests: [{ type: Schema.Types.ObjectId, ref: 'TestOrder' }], // labs

  // Admin
  permissions: [{ type: String }],

  // Workflow
  accountStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },

  // Verification & activity
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },

  // Soft-delete
  deletedAt: { type: Date, default: null },

  // Audit logs
  auditLogs: [{
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now }
  }],

  // Documents
  documents: [{
    docType: { type: String, required: true }, // license, certificate, CNIC, accreditation
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});



// Pre-save hook (not strictly necessary due to timestamps, but kept for compatibility)
userSchema.pre('save', function (next) {
  // ensure primaryRole defaults to roles[0] if not set
  if (!this.primaryRole && Array.isArray(this.roles) && this.roles.length) {
    this.primaryRole = this.roles[0];
  }
  next();
});

module.exports = model('User', userSchema);
