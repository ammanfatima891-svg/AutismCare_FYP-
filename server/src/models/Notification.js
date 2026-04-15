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
    APPOINTMENT_REMINDER: 'appointment_reminder',
    // Clinician event-based alerts
    CASE_CREATED: 'CASE_CREATED',
    REFERRAL_ACCEPTED: 'REFERRAL_ACCEPTED',
    PROGRESS_UPDATED: 'PROGRESS_UPDATED',
    LAB_UPLOADED: 'LAB_UPLOADED',
    FOLLOW_UP: 'FOLLOW_UP',
    /** Therapist / parent therapy workflow */
    THERAPIST_NEW_REFERRAL: 'THERAPIST_NEW_REFERRAL',
    THERAPIST_ASSIGNMENT_SUBMITTED: 'THERAPIST_ASSIGNMENT_SUBMITTED',
    THERAPIST_GOAL_REVIEW_DUE: 'THERAPIST_GOAL_REVIEW_DUE',
    PARENT_SESSION_MISSED: 'PARENT_SESSION_MISSED',
    PARENT_SCHEDULE_CREATED: 'PARENT_SCHEDULE_CREATED',
    /** Case-scoped thread: parent, therapist, and assigned clinician */
    CASE_MESSAGE: 'case_message',
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
    /** Optional ChildCase link for therapy-module alerts */
    relatedCaseId: {
        type: Schema.Types.ObjectId,
        ref: 'ChildCase',
        index: true,
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
