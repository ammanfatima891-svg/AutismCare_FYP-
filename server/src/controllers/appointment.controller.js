const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const mongoose = require('mongoose');
const { Appointment, APPOINTMENT_STATUS, APPOINTMENT_TYPES, TYPE_TO_ROLE } = require('../models/Appointment');
const { normalizeAppointmentStatus } = require('../utils/normalizeWorkflowStatus');
const { User, ROLES } = require('../models/User');
const { createNotification, createNotificationIfNotExists } = require('../utils/notification');
const { NOTIFICATION_TYPES } = require('../models/Notification');
const { logAction, AUDIT_ACTIONS, RESOURCE_TYPES } = require('../utils/audit');
const { ChildCase } = require('../models/ChildCase');

// ─── Helper: get professional display name ───────────────────────────────────

const getProfessionalName = (prof) => {
    if (prof.labName) return prof.labName;
    return `${prof.firstName} ${prof.lastName}`;
};

// ─── Helper: get child name from parent ──────────────────────────────────────

const getChildFromParent = async (parentId, childId) => {
    const parent = await User.findById(parentId);
    if (!parent || parent.role !== ROLES.PARENT) return null;
    const child = parent.children ? parent.children.id(childId) : null;
    return child;
};

// ─── 1. Create Appointment (Parent only) ─────────────────────────────────────

exports.createAppointment = async (req, res) => {
    try {
        const parentId = req.user._id;
        const {
            childId,
            appointmentType,
            professionalId,
            preferredDate,
            preferredTime,
            reason,
            mode,
            additionalNotes
        } = req.body;

        // Validate required fields
        if (!childId || !appointmentType || !professionalId || !preferredDate || !preferredTime || !reason || !mode) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: childId, appointmentType, professionalId, preferredDate, preferredTime, reason, mode'
            });
        }

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(childId)) {
            return res.status(400).json({ success: false, message: 'Invalid child ID' });
        }
        if (!mongoose.Types.ObjectId.isValid(professionalId)) {
            return res.status(400).json({ success: false, message: 'Invalid professional ID' });
        }

        // Validate appointment type
        if (!Object.values(APPOINTMENT_TYPES).includes(appointmentType)) {
            return res.status(400).json({ success: false, message: 'Invalid appointment type' });
        }

        // Validate date is in the future
        const appointmentDate = new Date(preferredDate);
        if (isNaN(appointmentDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date format' });
        }
        const today = getCurrentTime();
        today.setHours(0, 0, 0, 0);
        if (appointmentDate < today) {
            return res.status(400).json({ success: false, message: 'Preferred date must be in the future' });
        }

        // Validate child belongs to parent
        const child = await getChildFromParent(parentId, childId);
        if (!child) {
            return res.status(403).json({
                success: false,
                message: 'Child not found or does not belong to you'
            });
        }

        // Validate professional exists and has the correct role
        const requiredRole = TYPE_TO_ROLE[appointmentType];
        const professional = await User.findById(professionalId);
        if (!professional) {
            return res.status(404).json({ success: false, message: 'Professional not found' });
        }
        if (professional.role !== requiredRole) {
            return res.status(400).json({
                success: false,
                message: `For ${appointmentType} appointments, professional must be a ${requiredRole}`
            });
        }

        // Validate professional is approved (clinician/therapist have approvalStatus, lab does not)
        if (professional.approvalStatus && professional.approvalStatus !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Selected professional is not yet approved by admin'
            });
        }

        // Prevent double booking for same professional + same date + same time
        const existingAppointment = await Appointment.findOne({
            professional: professionalId,
            preferredDate: appointmentDate,
            preferredTime: preferredTime,
            status: {
                $nin: [
                    APPOINTMENT_STATUS.REJECTED,
                    APPOINTMENT_STATUS.CANCELLED,
                    APPOINTMENT_STATUS.COMPLETED
                ]
            }
        }).lean();

        if (existingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'This professional already has an appointment at the selected date and time'
            });
        }

        // Handle document uploads
        const documents = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                documents.push(`/uploads/appointment-documents/${file.filename}`);
            });
        }

        // Create appointment
        const appointment = new Appointment({
            parent: parentId,
            child: childId,
            professional: professionalId,
            professionalRole: requiredRole,
            appointmentType,
            preferredDate: appointmentDate,
            preferredTime,
            mode,
            reason,
            documents,
            additionalNotes: additionalNotes || '',
            auditTrail: [{
                action: 'CREATED',
                user: parentId,
                details: `Appointment created by parent for ${child.firstName} ${child.lastName}`
            }]
        });

        await appointment.save();

        // Log audit
        await logAction({
            userId: parentId,
            action: AUDIT_ACTIONS.CREATE,
            resourceType: RESOURCE_TYPES.APPOINTMENT,
            resourceId: appointment._id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: { appointmentType, professionalId, childId }
        });

        // Notify professional
        await createNotification({
            recipientId: professionalId,
            type: NOTIFICATION_TYPES.APPOINTMENT_REQUESTED,
            title: 'New Appointment Request',
            message: `New ${appointmentType.toLowerCase()} appointment request for ${child.firstName} ${child.lastName} on ${appointmentDate.toLocaleDateString()}`,
            relatedResourceType: 'Appointment',
            relatedResourceId: appointment._id
        });

        res.status(201).json({
            success: true,
            message: 'Appointment request created successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ success: false, message: 'Failed to create appointment' });
    }
};

// ─── 2. Get Parent Appointments ──────────────────────────────────────────────

exports.getParentAppointments = async (req, res) => {
    try {
        const parentId = req.user._id;
        const { status, type, page = 1, limit = 10 } = req.query;

        const filter = { parent: parentId };
        if (status) filter.status = normalizeAppointmentStatus(status) || status;
        if (type) filter.appointmentType = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [appointments, total] = await Promise.all([
            Appointment.find(filter)
                .populate('professional', 'firstName lastName email labName specialization role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Appointment.countDocuments(filter)
        ]);

        // Enrich with child info
        const parent = await User.findById(parentId).lean();
        const enriched = appointments.map(apt => {
            const child = parent.children ? parent.children.find(c => c._id.toString() === apt.child.toString()) : null;
            return {
                ...apt,
                childInfo: child ? { firstName: child.firstName, lastName: child.lastName, dateOfBirth: child.dateOfBirth } : null
            };
        });

        res.status(200).json({
            success: true,
            data: enriched,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching parent appointments:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
};

// ─── 3. Get Professional Appointments ────────────────────────────────────────

exports.getProfessionalAppointments = async (req, res) => {
    try {
        const professionalId = req.user._id;
        const { status, type, page = 1, limit = 10 } = req.query;

        const filter = { professional: professionalId };
        if (status) filter.status = normalizeAppointmentStatus(status) || status;
        if (type) filter.appointmentType = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [appointments, total] = await Promise.all([
            Appointment.find(filter)
                .populate('parent', 'firstName lastName email phoneNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Appointment.countDocuments(filter)
        ]);

        // Enrich with child info
        const parentIds = [...new Set(appointments.map(a => a.parent._id || a.parent))];
        const parents = await User.find({ _id: { $in: parentIds } }).lean();
        const parentMap = {};
        parents.forEach(p => { parentMap[p._id.toString()] = p; });

        const enriched = appointments.map(apt => {
            const parentDoc = parentMap[(apt.parent._id || apt.parent).toString()];
            const child = parentDoc && parentDoc.children
                ? parentDoc.children.find(c => c._id.toString() === apt.child.toString())
                : null;
            return {
                ...apt,
                childInfo: child ? { firstName: child.firstName, lastName: child.lastName, dateOfBirth: child.dateOfBirth, gender: child.gender } : null
            };
        });

        res.status(200).json({
            success: true,
            data: enriched,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching professional appointments:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
};

// ─── 4. Approve Appointment ──────────────────────────────────────────────────

exports.approveAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const professionalId = req.user._id;
        const { finalDate, finalTime } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        // Verify this professional owns the appointment
        if (appointment.professional.toString() !== professionalId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this appointment' });
        }

        // Validate status transition
        if (!Appointment.validateTransition(appointment.status, APPOINTMENT_STATUS.APPROVED)) {
            return res.status(400).json({
                success: false,
                message: `Cannot approve appointment with status: ${appointment.status}`
            });
        }

        appointment.status = APPOINTMENT_STATUS.APPROVED;
        appointment.finalDate = finalDate ? new Date(finalDate) : appointment.preferredDate;
        appointment.finalTime = finalTime || appointment.preferredTime;
        appointment.auditTrail.push({
            action: 'APPROVED',
            user: professionalId,
            details: 'Appointment approved by professional'
        });

        await appointment.save();

        let childCaseSyncWarning = null;
        // Auto-create/sync child case when a clinician approves (idempotent per child + clinician)
        if (String(appointment.professionalRole) === 'clinician') {
            try {
                const { ensureCaseFromApprovedAppointment } = require('../services/childCase.service');
                await ensureCaseFromApprovedAppointment(appointment);
            } catch (caseErr) {
                console.error('Child case auto-create failed:', caseErr);
                childCaseSyncWarning = 'Appointment approved, but child case sync failed.';
            }
        }

        // Log audit
        await logAction({
            userId: professionalId,
            action: AUDIT_ACTIONS.APPROVE,
            resourceType: RESOURCE_TYPES.APPOINTMENT,
            resourceId: appointment._id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: { previousStatus: APPOINTMENT_STATUS.PENDING }
        });

        // Notify parent
        await createNotification({
            recipientId: appointment.parent,
            type: NOTIFICATION_TYPES.APPOINTMENT_APPROVED,
            title: 'Appointment Approved',
            message: `Your ${appointment.appointmentType.toLowerCase()} appointment has been approved for ${(appointment.finalDate || appointment.preferredDate).toLocaleDateString()} at ${appointment.finalTime || appointment.preferredTime}`,
            relatedResourceType: 'Appointment',
            relatedResourceId: appointment._id
        });

        res.status(200).json({
            success: true,
            message: 'Appointment approved successfully',
            childCaseSyncWarning,
            data: appointment
        });
    } catch (error) {
        console.error('Error approving appointment:', error);
        res.status(500).json({ success: false, message: 'Failed to approve appointment' });
    }
};

// ─── 5. Reject Appointment ───────────────────────────────────────────────────

exports.rejectAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const professionalId = req.user._id;
        const { rejectionReason } = req.body;

        if (!rejectionReason || rejectionReason.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        if (appointment.professional.toString() !== professionalId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this appointment' });
        }

        if (!Appointment.validateTransition(appointment.status, APPOINTMENT_STATUS.REJECTED)) {
            return res.status(400).json({
                success: false,
                message: `Cannot reject appointment with status: ${appointment.status}`
            });
        }

        appointment.status = APPOINTMENT_STATUS.REJECTED;
        appointment.rejectionReason = rejectionReason.trim();
        appointment.auditTrail.push({
            action: 'REJECTED',
            user: professionalId,
            details: `Rejected: ${rejectionReason.trim()}`
        });

        await appointment.save();

        await logAction({
            userId: professionalId,
            action: AUDIT_ACTIONS.REJECT,
            resourceType: RESOURCE_TYPES.APPOINTMENT,
            resourceId: appointment._id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: { rejectionReason }
        });

        await createNotification({
            recipientId: appointment.parent,
            type: NOTIFICATION_TYPES.APPOINTMENT_REJECTED,
            title: 'Appointment Rejected',
            message: `Your ${appointment.appointmentType.toLowerCase()} appointment has been rejected. Reason: ${rejectionReason.trim()}`,
            relatedResourceType: 'Appointment',
            relatedResourceId: appointment._id
        });

        res.status(200).json({
            success: true,
            message: 'Appointment rejected',
            data: appointment
        });
    } catch (error) {
        console.error('Error rejecting appointment:', error);
        res.status(500).json({ success: false, message: 'Failed to reject appointment' });
    }
};

// ─── 6. Reschedule Appointment ───────────────────────────────────────────────

exports.rescheduleAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const professionalId = req.user._id;
        const { newDate, newTime } = req.body;

        if (!newDate || !newTime) {
            return res.status(400).json({ success: false, message: 'New date and time are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
        }

        const parsedNewDate = new Date(newDate);
        if (isNaN(parsedNewDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date format' });
        }

        const today = getCurrentTime();
        today.setHours(0, 0, 0, 0);
        if (parsedNewDate < today) {
            return res.status(400).json({ success: false, message: 'New date must be in the future' });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        if (appointment.professional.toString() !== professionalId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this appointment' });
        }

        // Reschedule does not introduce a separate status in the canonical workflow.
        // We allow rescheduling when appointment is still actionable.
        if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.APPROVED].includes(appointment.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot reschedule appointment with status: ${appointment.status}`
            });
        }

        // Check for double booking at the new time
        const conflict = await Appointment.findOne({
            _id: { $ne: appointment._id },
            professional: professionalId,
            preferredDate: parsedNewDate,
            preferredTime: newTime,
            status: { $nin: [APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.COMPLETED] }
        }).lean();

        if (conflict) {
            return res.status(409).json({
                success: false,
                message: 'You already have an appointment at the new date and time'
            });
        }

        // Push reschedule history
        appointment.rescheduleHistory.push({
            oldDate: appointment.preferredDate,
            oldTime: appointment.preferredTime,
            newDate: parsedNewDate,
            newTime: newTime,
            changedBy: professionalId
        });

        appointment.preferredDate = parsedNewDate;
        appointment.preferredTime = newTime;
        appointment.finalDate = parsedNewDate;
        appointment.finalTime = newTime;
        // Keep status as-is (PENDING stays PENDING, APPROVED stays APPROVED).
        appointment.auditTrail.push({
            action: 'RESCHEDULED',
            user: professionalId,
            details: `Rescheduled to ${parsedNewDate.toLocaleDateString()} at ${newTime}`
        });

        await appointment.save();

        await logAction({
            userId: professionalId,
            action: AUDIT_ACTIONS.RESCHEDULE,
            resourceType: RESOURCE_TYPES.APPOINTMENT,
            resourceId: appointment._id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: { newDate, newTime }
        });

        await createNotification({
            recipientId: appointment.parent,
            type: NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED,
            title: 'Appointment Rescheduled',
            message: `Your ${appointment.appointmentType.toLowerCase()} appointment has been rescheduled to ${parsedNewDate.toLocaleDateString()} at ${newTime}`,
            relatedResourceType: 'Appointment',
            relatedResourceId: appointment._id
        });

        res.status(200).json({
            success: true,
            message: 'Appointment rescheduled successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        res.status(500).json({ success: false, message: 'Failed to reschedule appointment' });
    }
};

// ─── 7. Complete Appointment ─────────────────────────────────────────────────

exports.completeAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const professionalId = req.user._id;
        const { completionNotes } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        if (appointment.professional.toString() !== professionalId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this appointment' });
        }

        if (!Appointment.validateTransition(appointment.status, APPOINTMENT_STATUS.COMPLETED)) {
            return res.status(400).json({
                success: false,
                message: `Cannot complete appointment with status: ${appointment.status}`
            });
        }

        appointment.status = APPOINTMENT_STATUS.COMPLETED;
        appointment.completionNotes = completionNotes || '';
        appointment.auditTrail.push({
            action: 'COMPLETED',
            user: professionalId,
            details: completionNotes ? `Completed with notes: ${completionNotes}` : 'Appointment completed'
        });

        await appointment.save();

        await logAction({
            userId: professionalId,
            action: AUDIT_ACTIONS.COMPLETE,
            resourceType: RESOURCE_TYPES.APPOINTMENT,
            resourceId: appointment._id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: { completionNotes }
        });

        await createNotification({
            recipientId: appointment.parent,
            type: NOTIFICATION_TYPES.APPOINTMENT_COMPLETED,
            title: 'Appointment Completed',
            message: `Your ${appointment.appointmentType.toLowerCase()} appointment has been marked as completed`,
            relatedResourceType: 'Appointment',
            relatedResourceId: appointment._id
        });

        // Therapist session completion acts as a therapy progress update signal for clinicians.
        if (
            String(appointment.professionalRole) === 'therapist' &&
            String(appointment.appointmentType) === APPOINTMENT_TYPES.THERAPY
        ) {
            const childCases = await ChildCase.find({ childId: appointment.child }).select('_id clinicianId').lean();
            for (const childCase of childCases) {
                if (!childCase?.clinicianId) continue;
                await createNotificationIfNotExists({
                    recipientId: childCase.clinicianId,
                    type: NOTIFICATION_TYPES.PROGRESS_UPDATED,
                    title: 'Therapy Progress Updated',
                    message: 'New therapy session logged for child',
                    relatedResourceType: 'Appointment',
                    relatedResourceId: appointment._id
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Appointment completed',
            data: appointment
        });
    } catch (error) {
        console.error('Error completing appointment:', error);
        res.status(500).json({ success: false, message: 'Failed to complete appointment' });
    }
};

// ─── 8. Cancel Appointment (Parent) ──────────────────────────────────────────

exports.cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const parentId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        if (appointment.parent.toString() !== parentId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment' });
        }

        // Parents can only cancel before approval (PENDING_APPROVAL) or if APPROVED
        if (!Appointment.validateTransition(appointment.status, APPOINTMENT_STATUS.CANCELLED)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel appointment with status: ${appointment.status}. Cancellation is only allowed for pending or approved appointments.`
            });
        }

        appointment.status = APPOINTMENT_STATUS.CANCELLED;
        appointment.auditTrail.push({
            action: 'CANCELLED',
            user: parentId,
            details: 'Appointment cancelled by parent'
        });

        await appointment.save();

        await logAction({
            userId: parentId,
            action: AUDIT_ACTIONS.CANCEL,
            resourceType: RESOURCE_TYPES.APPOINTMENT,
            resourceId: appointment._id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: { previousStatus: appointment.status }
        });

        await createNotification({
            recipientId: appointment.professional,
            type: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED,
            title: 'Appointment Cancelled',
            message: `An appointment has been cancelled by the parent`,
            relatedResourceType: 'Appointment',
            relatedResourceId: appointment._id
        });

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled',
            data: appointment
        });
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel appointment' });
    }
};

// ─── 9. Get All Appointments (Admin) ─────────────────────────────────────────

exports.getAllAppointments = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 20 } = req.query;

        const filter = {};
        if (status) filter.status = normalizeAppointmentStatus(status) || status;
        if (type) filter.appointmentType = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [appointments, total] = await Promise.all([
            Appointment.find(filter)
                .populate('parent', 'firstName lastName email')
                .populate('professional', 'firstName lastName email labName role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Appointment.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching all appointments:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
};

// ─── 10. Get Appointment Stats (Admin) ───────────────────────────────────────

exports.getAppointmentStats = async (req, res) => {
    try {
        // Basic counts
        const [total, statusCounts, typeCounts, monthlyDistribution] = await Promise.all([
            Appointment.countDocuments(),
            Appointment.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Appointment.aggregate([
                { $group: { _id: '$appointmentType', count: { $sum: 1 } } }
            ]),
            Appointment.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } },
                { $limit: 12 }
            ])
        ]);

        // Appointments per role
        const perRole = await Appointment.aggregate([
            { $group: { _id: '$professionalRole', count: { $sum: 1 } } }
        ]);

        // Format status counts
        const statusMap = {};
        statusCounts.forEach(s => { statusMap[s._id] = s.count; });

        const typeMap = {};
        typeCounts.forEach(t => { typeMap[t._id] = t.count; });

        const roleMap = {};
        perRole.forEach(r => { roleMap[r._id] = r.count; });

        res.status(200).json({
            success: true,
            data: {
                total,
                byStatus: {
                    pending: statusMap[APPOINTMENT_STATUS.PENDING] || 0,
                    approved: statusMap[APPOINTMENT_STATUS.APPROVED] || 0,
                    rejected: statusMap[APPOINTMENT_STATUS.REJECTED] || 0,
                    completed: statusMap[APPOINTMENT_STATUS.COMPLETED] || 0,
                    cancelled: statusMap[APPOINTMENT_STATUS.CANCELLED] || 0
                },
                byType: typeMap,
                byRole: roleMap,
                monthlyDistribution: monthlyDistribution.map(m => ({
                    year: m._id.year,
                    month: m._id.month,
                    count: m.count
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching appointment stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};

// ─── 11. Get Available Professionals (Helper for Parent form) ────────────────

exports.getAvailableProfessionals = async (req, res) => {
    try {
        const { type } = req.params;

        if (!Object.values(APPOINTMENT_TYPES).includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid appointment type' });
        }

        const requiredRole = TYPE_TO_ROLE[type];

        // Build filter: role matches and approved
        const filter = { role: requiredRole };
        if (requiredRole !== 'lab') {
            filter.approvalStatus = 'active';
        }

        const professionals = await User.find(filter)
            .select('firstName lastName email specialization labName role')
            .lean();

        res.status(200).json({
            success: true,
            data: professionals.map(p => ({
                _id: p._id,
                name: p.labName || `${p.firstName} ${p.lastName}`,
                email: p.email,
                specialization: p.specialization || null,
                role: p.role
            }))
        });
    } catch (error) {
        console.error('Error fetching professionals:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch professionals' });
    }
};
