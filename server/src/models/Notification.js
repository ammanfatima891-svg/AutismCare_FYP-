const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');

const NOTIFICATION_TYPES = {
    NEW_TEST_ORDER: 'new_test_order',
    ORDER_ASSIGNED: 'order_assigned',
    REPORT_UPLOADED: 'report_uploaded',
    ORDER_COMPLETED: 'order_completed',
    REPORT_RELEASED: 'report_released',
    URGENT_ORDER: 'urgent_order',
    SYSTEM: 'system',
    // Appointment notification types
    APPOINTMENT_REQUESTED: 'appointment_requested',
    APPOINTMENT_APPROVED: 'appointment_approved',
    APPOINTMENT_REJECTED: 'appointment_rejected',
    APPOINTMENT_RESCHEDULED: 'appointment_rescheduled',
    APPOINTMENT_COMPLETED: 'appointment_completed',
    APPOINTMENT_CANCELLED: 'appointment_cancelled',
    APPOINTMENT_REMINDER: 'appointment_reminder'
};

const NotificationSchema = new Schema({
    uuid: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true,
        index: true
    },
    recipientId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: Object.values(NOTIFICATION_TYPES),
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedResourceType: {
        type: String
    },
    relatedResourceId: {
        type: Schema.Types.ObjectId
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Compound index for fetching unread notifications
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES };
