const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Enums ───────────────────────────────────────────────────────────────────

const APPOINTMENT_TYPES = {
  DIAGNOSTIC: 'DIAGNOSTIC',
  THERAPY: 'THERAPY',
  LAB_TEST: 'LAB_TEST'
};

const APPOINTMENT_STATUS = {
  REQUESTED: 'REQUESTED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESCHEDULED: 'RESCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

const APPOINTMENT_MODES = {
  ONLINE: 'ONLINE',
  IN_PERSON: 'IN_PERSON'
};

// Maps appointment type → required professional role
const TYPE_TO_ROLE = {
  [APPOINTMENT_TYPES.DIAGNOSTIC]: 'clinician',
  [APPOINTMENT_TYPES.THERAPY]: 'therapist',
  [APPOINTMENT_TYPES.LAB_TEST]: 'lab'
};

// ─── Allowed status transitions ──────────────────────────────────────────────

const ALLOWED_TRANSITIONS = {
  [APPOINTMENT_STATUS.REQUESTED]: [APPOINTMENT_STATUS.PENDING_APPROVAL],
  [APPOINTMENT_STATUS.PENDING_APPROVAL]: [
    APPOINTMENT_STATUS.APPROVED,
    APPOINTMENT_STATUS.REJECTED
  ],
  [APPOINTMENT_STATUS.APPROVED]: [
    APPOINTMENT_STATUS.RESCHEDULED,
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED
  ],
  [APPOINTMENT_STATUS.REJECTED]: [],
  [APPOINTMENT_STATUS.RESCHEDULED]: [
    APPOINTMENT_STATUS.APPROVED,
    APPOINTMENT_STATUS.CANCELLED
  ],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: []
};

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const RescheduleEntrySchema = new Schema({
  oldDate: { type: Date, required: true },
  oldTime: { type: String, required: true },
  newDate: { type: Date, required: true },
  newTime: { type: String, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  changedAt: { type: Date, default: Date.now }
}, { _id: false });

const AuditEntrySchema = new Schema({
  action: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: String }
}, { _id: false });

// ─── Main Schema ─────────────────────────────────────────────────────────────

const AppointmentSchema = new Schema({
  parent: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Parent is required'],
    index: true
  },
  child: {
    type: Schema.Types.ObjectId,
    required: [true, 'Child is required']
  },
  professional: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Professional is required'],
    index: true
  },
  professionalRole: {
    type: String,
    enum: ['clinician', 'therapist', 'lab'],
    required: true
  },
  appointmentType: {
    type: String,
    enum: Object.values(APPOINTMENT_TYPES),
    required: [true, 'Appointment type is required']
  },
  preferredDate: {
    type: Date,
    required: [true, 'Preferred date is required'],
    index: true
  },
  preferredTime: {
    type: String,
    required: [true, 'Preferred time is required']
  },
  finalDate: {
    type: Date
  },
  finalTime: {
    type: String
  },
  mode: {
    type: String,
    enum: Object.values(APPOINTMENT_MODES),
    required: [true, 'Appointment mode is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    maxlength: [2000, 'Reason cannot exceed 2000 characters']
  },
  documents: [{
    type: String
  }],
  additionalNotes: {
    type: String,
    maxlength: [1000, 'Additional notes cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: Object.values(APPOINTMENT_STATUS),
    default: APPOINTMENT_STATUS.REQUESTED,
    index: true
  },
  rejectionReason: {
    type: String
  },
  completionNotes: {
    type: String
  },
  rescheduleHistory: [RescheduleEntrySchema],
  auditTrail: [AuditEntrySchema]
}, {
  timestamps: true
});

// ─── Compound indexes for performance ────────────────────────────────────────

AppointmentSchema.index({ professional: 1, status: 1 });
AppointmentSchema.index({ parent: 1, status: 1 });
AppointmentSchema.index({ professional: 1, preferredDate: 1, preferredTime: 1 });

// ─── Pre-save hook: auto-transition REQUESTED → PENDING_APPROVAL on create ──

AppointmentSchema.pre('save', function (next) {
  if (this.isNew && this.status === APPOINTMENT_STATUS.REQUESTED) {
    this.status = APPOINTMENT_STATUS.PENDING_APPROVAL;
    this.auditTrail.push({
      action: 'STATUS_CHANGE',
      user: this.parent,
      details: `Status changed from ${APPOINTMENT_STATUS.REQUESTED} to ${APPOINTMENT_STATUS.PENDING_APPROVAL}`
    });
  }
  next();
});

// ─── Static: validate status transition ──────────────────────────────────────

AppointmentSchema.statics.validateTransition = function (currentStatus, newStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
};

// ─── Model ───────────────────────────────────────────────────────────────────

const Appointment = mongoose.model('Appointment', AppointmentSchema);

module.exports = {
  Appointment,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUS,
  APPOINTMENT_MODES,
  TYPE_TO_ROLE,
  ALLOWED_TRANSITIONS
};
