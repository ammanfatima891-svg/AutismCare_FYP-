const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditLogSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    action: {
        type: String,
        enum: ['UPLOAD', 'UPDATE', 'DELETE'],
        required: [true, 'Action is required']
    },
    resource: {
        type: String,
        required: [true, 'Resource type is required']
    },
    resourceId: {
        type: Schema.Types.ObjectId,
        required: [true, 'Resource ID is required']
    },
    details: {
        type: String,
        default: ''
    },
    ipAddress: {
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
AuditLogSchema.index({ resource: 1, resourceId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
