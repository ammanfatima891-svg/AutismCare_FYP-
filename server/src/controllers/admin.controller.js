const { User, APPROVAL_STATUS } = require('../models/User');
const mongoose = require('mongoose');
const { recordAuditEvent } = require('../utils/auditLog');

// Get all pending professionals
exports.getPendingProfessionals = async (req, res) => {
  try {
    const pendingUsers = await User.find({
      role: { $in: ['clinician', 'therapist'] },
      approvalStatus: APPROVAL_STATUS.PENDING
    }).select('firstName lastName email role specialization licenseNumber documents createdAt');

    res.status(200).json({ users: pendingUsers });
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
    if (!user || !['clinician', 'therapist'].includes(user.role)) {
      return res.status(404).json({ message: 'User not found or not a professional' });
    }

    const before = { approvalStatus: user.approvalStatus };
    user.approvalStatus = status;
    await user.save({ validateBeforeSave: false });

    try {
      await recordAuditEvent({
        req,
        actorId: req.user?._id,
        action: status === APPROVAL_STATUS.ACTIVE ? 'admin_approval' : 'admin_rejection',
        entityType: 'User',
        entityId: user._id,
        summary: `professional=${String(user.role)} status=${String(status)}`,
        before,
        after: { approvalStatus: status },
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
