const mongoose = require('mongoose');
const { Schema } = mongoose;

const ENTITY_TYPES = [
  'TherapyPlan',
  'SessionLog',
  'HomeAssignment',
  'Referral',
  'TherapyCase',
  'ChildCase',
  'ClinicalEvaluation',
  'Appointment',
  'LabTestRequest',
  'LabReport',
  'User',
];

const AuditEventSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorRole: { type: String, trim: true, default: '' },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, enum: ENTITY_TYPES, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    caseId: { type: Schema.Types.ObjectId, ref: 'ChildCase', default: undefined, index: true },
    /** Canonical timestamp field required by system rules (mirrors createdAt). */
    timestamp: { type: Date, default: Date.now, index: true },
    summary: { type: String, trim: true, default: '' },
    before: { type: Schema.Types.Mixed, default: undefined },
    after: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true, collection: 'audit_logs' }
);

AuditEventSchema.index({ caseId: 1, createdAt: -1 });
AuditEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditEventSchema.index({ timestamp: -1 });

AuditEventSchema.pre('save', function (next) {
  // Keep timestamp in sync for legacy readers.
  if (!this.timestamp) this.timestamp = this.createdAt || new Date();
  next();
});

const AuditEvent = mongoose.model('AuditEvent', AuditEventSchema);

module.exports = { AuditEvent, AUDIT_ENTITY_TYPES: ENTITY_TYPES };
