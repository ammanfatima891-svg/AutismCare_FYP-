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
    RELEASE: 'RELEASE',
    APPROVE: 'APPROVE',
    REJECT: 'REJECT',
    RESCHEDULE: 'RESCHEDULE',
    CANCEL: 'CANCEL'
};

const RESOURCE_TYPES = {
    LAB_TEST_ORDER: 'LabTestOrder',
    LAB_REPORT: 'LabReport',
    NOTIFICATION: 'Notification',
    USER: 'User',
    APPOINTMENT: 'Appointment'
};


const AuditLogSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    action: {
        type: String,
        enum: Object.values(AUDIT_ACTIONS),
        required: [true, 'Action is required']
    },
    resourceType: {
        type: String,
        required: [true, 'Resource type is required']
    },
    resourceId: {
        type: String,
        required: [true, 'Resource ID is required']
    },
    details: {
        type: Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for querying audit trails efficiently
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = {
    AuditLog,
    AUDIT_ACTIONS,
    RESOURCE_TYPES
};
