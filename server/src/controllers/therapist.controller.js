const { getCurrentTime, getCurrentTimeMs } = require('../utils/time.js');
const { Appointment, APPOINTMENT_TYPES, APPOINTMENT_STATUS } = require('../models/Appointment');
const mongoose = require('mongoose');
const { ChildCase } = require('../models/ChildCase');
const TherapyCase = require('../models/TherapyCase');
const ClinicianNotes = require('../models/ClinicianNotes');
const { getUnreadCount } = require('../utils/notification');

/**
 * Get high-level dashboard stats for the authenticated therapist.
 * Uses role-based access via auth middleware (restrictTo('therapist')).
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const therapistId = req.user._id;

    const today = getCurrentTime();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const baseFilter = {
      professional: therapistId,
      professionalRole: 'therapist',
      appointmentType: APPOINTMENT_TYPES.THERAPY,
    };

    const [
      assignedChildrenAgg,
      todaysSessionsCount,
      pendingProgressUpdates,
      unreadMessagesCount,
    ] = await Promise.all([
      // Unique children across this therapist's therapy appointments
      Appointment.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$child' } },
        { $count: 'count' },
      ]),
      // Today's sessions (approved / rescheduled / completed on today's date)
      Appointment.countDocuments({
        ...baseFilter,
        status: {
          $in: [
            APPOINTMENT_STATUS.APPROVED,
            APPOINTMENT_STATUS.RESCHEDULED,
            APPOINTMENT_STATUS.COMPLETED,
          ],
        },
        $or: [
          { finalDate: { $gte: startOfDay, $lt: endOfDay } },
          {
            finalDate: null,
            preferredDate: { $gte: startOfDay, $lt: endOfDay },
          },
        ],
      }),
      // Completed sessions with no completionNotes → pending progress updates
      Appointment.countDocuments({
        ...baseFilter,
        status: APPOINTMENT_STATUS.COMPLETED,
        $or: [
          { completionNotes: { $exists: false } },
          { completionNotes: { $eq: '' } },
        ],
      }),
      // Unread notifications for this therapist (used as "unread messages")
      getUnreadCount(therapistId.toString()),
    ]);

    const assignedChildrenCount =
      Array.isArray(assignedChildrenAgg) && assignedChildrenAgg.length > 0
        ? assignedChildrenAgg[0].count
        : 0;

    res.status(200).json({
      success: true,
      data: {
        assignedChildrenCount,
        todaysSessionsCount,
        pendingProgressUpdates,
        unreadMessagesCount,
      },
    });
  } catch (error) {
    console.error('Error fetching therapist dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch therapist dashboard stats',
    });
  }
};

/**
 * Allow therapist to record recommendation notes for a child they actively manage.
 * Stored in case notes so clinician and reporting flows can reuse the same source.
 */
exports.addTherapistRecommendation = async (req, res) => {
  try {
    const therapistId = req.user._id;
    const {
      childId,
      recommendation,
      therapyType,
      frequency,
      duration,
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(String(childId || ''))) {
      return res.status(400).json({ success: false, message: 'Invalid childId' });
    }

    const recText = String(recommendation || '').trim();
    if (!recText) {
      return res.status(400).json({ success: false, message: 'Recommendation text is required' });
    }

    const candidateCases = await ChildCase.find({ childId }).select('_id').lean();
    if (!candidateCases.length) {
      return res.status(404).json({ success: false, message: 'No case found for this child' });
    }

    const activeTherapyCase = await TherapyCase.findOne({
      therapistId,
      status: 'ACTIVE',
      caseId: { $in: candidateCases.map((c) => c._id) },
    })
      .select('caseId')
      .lean();

    if (!activeTherapyCase) {
      return res.status(403).json({
        success: false,
        message: 'You can only add recommendations for your active therapy cases',
      });
    }

    const segments = [
      therapyType ? `Therapy Type: ${String(therapyType).trim()}` : '',
      `Recommendation: ${recText}`,
      frequency ? `Frequency: ${String(frequency).trim()}` : '',
      duration ? `Duration: ${String(duration).trim()}` : '',
    ].filter(Boolean);

    const note = await ClinicianNotes.create({
      caseId: activeTherapyCase.caseId,
      note: `[Therapist Recommendation] ${segments.join(' | ')}`,
      createdBy: therapistId,
    });

    return res.status(201).json({
      success: true,
      message: 'Recommendation added successfully',
      data: note,
    });
  } catch (error) {
    console.error('Error adding therapist recommendation:', error);
    return res.status(500).json({ success: false, message: 'Failed to add recommendation' });
  }
};

