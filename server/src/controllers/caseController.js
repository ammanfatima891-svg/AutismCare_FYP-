const mongoose = require('mongoose');
const { ChildCase, CASE_STATUS } = require('../models/ChildCase');
const { User } = require('../models/User');
const { Appointment } = require('../models/Appointment');
const {
  ensureCaseFromApprovedAppointment,
  createCaseForClinician,
  syncCasesForClinicianFromApprovedAppointments,
} = require('../services/childCase.service');

function childDisplayName(childSub) {
  if (!childSub) return 'Unknown child';
  const fn = childSub.firstName || '';
  const ln = childSub.lastName || '';
  return `${fn} ${ln}`.trim() || 'Child';
}

/**
 * GET /api/cases — list cases for logged-in clinician
 */
exports.getCases = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { riskLevel, status } = req.query;

    // Heal historical gaps: ensure approved clinician appointments have cases.
    await syncCasesForClinicianFromApprovedAppointments(clinicianId);

    const filter = { clinicianId };
    if (riskLevel && ['low', 'medium', 'high', 'unknown'].includes(String(riskLevel))) {
      filter.riskLevel = riskLevel;
    }
    if (status && Object.values(CASE_STATUS).includes(status)) {
      filter.status = status;
    }

    const cases = await ChildCase.find(filter).sort({ updatedAt: -1 }).lean();

    const parentIds = [...new Set(cases.map((c) => c.parentId.toString()))];
    const parents = await User.find({ _id: { $in: parentIds } })
      .select('firstName lastName email children')
      .lean();

    const parentMap = new Map(parents.map((p) => [p._id.toString(), p]));

    const data = cases.map((c) => {
      const p = parentMap.get(c.parentId.toString());
      let childName = 'Child';
      if (p && p.children && c.childId) {
        const sub = (p.children || []).find((ch) => ch._id && ch._id.toString() === c.childId.toString());
        if (sub) childName = childDisplayName(sub);
      }
      const parentName = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '—';

      return {
        _id: c._id,
        childId: c.childId,
        childName,
        parentName,
        parentEmail: p?.email || null,
        riskLevel: c.riskLevel,
        status: c.status,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getCases:', error);
    res.status(500).json({ success: false, message: 'Failed to load cases' });
  }
};

/**
 * GET /api/cases/:id — full case detail
 */
exports.getCaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicianId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid case id' });
    }

    const doc = await ChildCase.findOne({ _id: id, clinicianId }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const parent = await User.findById(doc.parentId)
      .select('firstName lastName email phoneNumber children')
      .lean();

    let childProfile = null;
    if (parent && parent.children && doc.childId) {
      const sub = parent.children.find((ch) => ch._id && ch._id.toString() === doc.childId.toString());
      if (sub) {
        childProfile = {
          id: sub._id,
          firstName: sub.firstName,
          lastName: sub.lastName,
          dateOfBirth: sub.dateOfBirth,
          gender: sub.gender,
          medicalHistory: sub.medicalHistory,
          allergies: sub.allergies,
        };
      }
    }

    const parentInfo = parent
      ? {
          id: parent._id,
          firstName: parent.firstName,
          lastName: parent.lastName,
          email: parent.email,
          phoneNumber: parent.phoneNumber,
        }
      : null;

    let appointment = null;
    if (doc.appointmentId) {
      const appt = await Appointment.findById(doc.appointmentId)
        .select('status appointmentType preferredDate preferredTime finalDate finalTime')
        .lean();
      if (appt) appointment = appt;
    }

    res.status(200).json({
      success: true,
      data: {
        ...doc,
        childProfile,
        parentInfo,
        appointment,
        statusOptions: Object.values(CASE_STATUS),
      },
    });
  } catch (error) {
    console.error('getCaseById:', error);
    res.status(500).json({ success: false, message: 'Failed to load case' });
  }
};

/**
 * PATCH /api/cases/:id/status
 */
exports.updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const clinicianId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid case id' });
    }
    if (!status || !Object.values(CASE_STATUS).includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updated = await ChildCase.findOneAndUpdate(
      { _id: id, clinicianId },
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    res.status(200).json({ success: true, message: 'Status updated', data: updated });
  } catch (error) {
    console.error('updateCaseStatus:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

/**
 * POST /api/cases/create — manual fallback
 */
exports.createCase = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { parentId, childId, appointmentId } = req.body;

    if (!parentId || !childId) {
      return res.status(400).json({ success: false, message: 'parentId and childId are required' });
    }

    try {
      const doc = await createCaseForClinician({
        clinicianId,
        parentId,
        childId,
        appointmentId: appointmentId || undefined,
      });
      res.status(201).json({ success: true, message: 'Case created', data: doc });
    } catch (e) {
      if (e.code === 'DUPLICATE_CASE') {
        return res.status(409).json({ success: false, message: e.message });
      }
      return res.status(400).json({ success: false, message: e.message || 'Could not create case' });
    }
  } catch (error) {
    console.error('createCase:', error);
    res.status(500).json({ success: false, message: 'Failed to create case' });
  }
};

/**
 * POST /api/cases/from-appointment — create from appointment id (same as auto logic)
 */
exports.createFromAppointment = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { appointmentId } = req.body;

    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Valid appointmentId is required' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    if (appointment.professional.toString() !== clinicianId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
    }
    if (String(appointment.professionalRole) !== 'clinician') {
      return res.status(400).json({
        success: false,
        message: 'Child cases are only created for clinician appointments',
      });
    }
    if (String(appointment.status) !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Appointment must be approved first' });
    }

    const existedBefore = await ChildCase.findOne({
      clinicianId,
      childId: appointment.child,
    });

    const doc = await ensureCaseFromApprovedAppointment(appointment);
    if (!doc) {
      return res.status(400).json({ success: false, message: 'Could not create case (check parent/child)' });
    }

    res.status(200).json({
      success: true,
      message: existedBefore ? 'Case already existed' : 'Case created',
      data: doc,
      alreadyExisted: !!existedBefore,
    });
  } catch (error) {
    console.error('createFromAppointment:', error);
    res.status(500).json({ success: false, message: 'Failed to create case from appointment' });
  }
};
