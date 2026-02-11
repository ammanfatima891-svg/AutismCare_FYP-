const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');

const AUDIT_ACTIONS = {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    VIEW: 'VIEW',
    UPLOAD: 'UPLOAD',
    ASSIGN: 'ASSIGN',
    COMPLETE: 'COMPLETE',
    RELEASE: 'RELEASE'
};

const RESOURCE_TYPES = {
    LAB_TEST_ORDER: 'LabTestOrder',
    LAB_REPORT: 'LabReport',
    NOTIFICATION: 'Notification',
    USER: 'User'
};

const AuditLogSchema = new Schema({
    uuid: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    action: {
        type: String,
        enum: Object.values(AUDIT_ACTIONS),
        required: true
    },
    resourceType: {
        type: String,
        enum: Object.values(RESOURCE_TYPES),
        required: true
    },
    resourceId: {
        type: String,
        required: true,
        index: true
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    details: {
        type: Schema.Types.Mixed
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false
});

// TTL index: automatically delete logs after 90 days
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Compound index for querying by user and action
AuditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = { AuditLog, AUDIT_ACTIONS, RESOURCE_TYPES };
