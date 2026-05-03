const { User, APPROVAL_STATUS } = require('../models/User');
const mongoose = require('mongoose');
const { recordAuditEvent } = require('../utils/auditLog');
const LabApproval = require('../models/LabApproval');
const { Appointment } = require('../models/Appointment');
const { APPOINTMENT_STATUS } = require('../constants/workflowEnums');

// Get all pending professionals
exports.getPendingProfessionals = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      role: { $in: ['clinician', 'therapist'] },
      approvalStatus: APPROVAL_STATUS.PENDING
    }).select('firstName lastName email role specialization licenseNumber documents createdAt');

    const pendingLabs = await LabApproval.find({ status: APPROVAL_STATUS.PENDING })
      .populate({
        path: 'labUserId',
        select: 'firstName lastName email role labName accreditation createdAt',
        match: { role: 'lab' },
      })
      .lean();

    const labUsersFromApproval = pendingLabs
      .filter((row) => row.labUserId)
      .map((row) => ({
        _id: row.labUserId._id,
        firstName: row.labUserId.firstName,
        lastName: row.labUserId.lastName,
        email: row.labUserId.email,
        role: 'lab',
        labName: row.labUserId.labName || '',
        accreditation: row.labUserId.accreditation || '',
        createdAt: row.labUserId.createdAt || row.createdAt,
      }));

    const approvedLabIds = new Set(labUsersFromApproval.map((row) => String(row._id)));
    const untrackedLabs = await User.find({
      role: 'lab',
      _id: { $nin: [...approvedLabIds] },
    }).select('firstName lastName email role labName accreditation createdAt');
    const labUsers = [
      ...labUsersFromApproval,
      ...untrackedLabs.map((row) => ({
        _id: row._id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        role: 'lab',
        labName: row.labName || '',
        accreditation: row.accreditation || '',
        createdAt: row.createdAt,
      })),
    ];

    res.status(200).json({ users: [...pendingUsers, ...labUsers] });
  } catch (err) {
    console.error("Get pending professionals error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve or reject professional
exports.updateProfessionalStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
      return res.status(400).json({ message: 'Invalid userId' });
    }

    if (!Object.values(APPROVAL_STATUS).includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(userId);
    if (!user || !['clinician', 'therapist', 'lab'].includes(user.role)) {
      return res.status(404).json({ message: 'User not found or not an approvable professional' });
    }

    let before = {};
    let after = {};
    if (user.role === 'lab') {
      const existingBefore = await LabApproval.findOne({ labUserId: user._id }).lean();
      const existing = await LabApproval.findOneAndUpdate(
        { labUserId: user._id },
        {
          $set: {
            status,
            reviewedBy: req.user?._id || null,
            reviewedAt: new Date(),
          },
          $setOnInsert: { labUserId: user._id },
        },
        { upsert: true, new: true }
      );
      before = { approvalStatus: existingBefore?.status || APPROVAL_STATUS.PENDING };
      after = { approvalStatus: status };
    } else {
      before = { approvalStatus: user.approvalStatus };
      user.approvalStatus = status;
      await user.save({ validateBeforeSave: false });
      after = { approvalStatus: status };
    }

    try {
      await recordAuditEvent({
        req,
        actorId: req.user?._id,
        action: status === APPROVAL_STATUS.ACTIVE ? 'admin_approval' : 'admin_rejection',
        entityType: 'User',
        entityId: user._id,
        summary: `professional=${String(user.role)} status=${String(status)}`,
        before,
        after,
      });
    } catch (e) {
      console.error('audit admin professional approval:', e);
    }

    res.status(200).json({ message: `User ${status} successfully` });
  } catch (err) {
    console.error("Update professional status error:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/admin/dashboard-metrics
 * Lightweight counts for admin home cards (no mock UI data).
 */
exports.getDashboardMetrics = async (req, res) => {
  try {
    const [pendingClinicianTherapist, pendingLabApprovals, apptTotal, apptPending, apptCompleted, activeProfessionals] =
      await Promise.all([
        User.countDocuments({
          role: { $in: ['clinician', 'therapist'] },
          approvalStatus: APPROVAL_STATUS.PENDING,
        }),
        LabApproval.countDocuments({ status: APPROVAL_STATUS.PENDING }),
        Appointment.countDocuments(),
        Appointment.countDocuments({ status: APPOINTMENT_STATUS.PENDING }),
        Appointment.countDocuments({ status: APPOINTMENT_STATUS.COMPLETED }),
        User.countDocuments({
          role: { $in: ['clinician', 'therapist', 'lab'] },
          approvalStatus: APPROVAL_STATUS.ACTIVE,
        }),
      ]);

    const pendingApprovals = pendingClinicianTherapist + pendingLabApprovals;

    return res.status(200).json({
      success: true,
      data: {
        pendingApprovals,
        appointmentsTotal: apptTotal,
        appointmentsPending: apptPending,
        appointmentsCompleted: apptCompleted,
        activeProfessionals,
      },
    });
  } catch (err) {
    console.error('getDashboardMetrics:', err);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard metrics' });
  }
};
