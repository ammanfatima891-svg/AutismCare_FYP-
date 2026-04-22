const mongoose = require('mongoose');
const { ChildCase, CASE_LIFECYCLE_STATUS } = require('../models/ChildCase');
const { User } = require('../models/User');
const { Appointment } = require('../models/Appointment');
const { getLabRequestsForCase } = require('../utils/labCaseIntegration');

function normalizeCaseStatus(value) {
  if (value == null) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/\s+/g, '_');
  const legacyMap = {
    active: 'REVIEW',
    under_evaluation: 'REVIEW',
    referred: 'THERAPY',
    ongoing_therapy: 'THERAPY_ACTIVE',
  };
  const mapped = legacyMap[key] || raw;
  return String(mapped).trim().toUpperCase();
}

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

    // Clinicians can VIEW downstream cases for continuity (read-only),
    // but write actions remain state-gated elsewhere.
    const clinicianAllowed = ['REVIEW', 'DIAGNOSIS', 'DIAGNOSIS_READY', 'THERAPY', 'THERAPY_ACTIVE', 'MONITORING'];
    // IMPORTANT: do NOT filter by status in Mongo query.
    // Some legacy records can have non-enum casing (e.g., "Review"), which would disappear
    // if we use `$in` matching. We normalize in JS after fetch.
    const filter = { clinicianId };
    if (riskLevel && ['low', 'medium', 'high', 'unknown'].includes(String(riskLevel))) {
      filter.riskLevel = riskLevel;
    }

    const allCases = await ChildCase.find(filter).sort({ updatedAt: -1 }).lean();

    const requestedStatus = status ? normalizeCaseStatus(status) : null;
    const cases = allCases.filter((c) => {
      const st = normalizeCaseStatus(c.status);
      if (!clinicianAllowed.includes(st)) return false;
      if (requestedStatus && requestedStatus !== 'ALL' && st !== requestedStatus) return false;
      return true;
    });

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
        status: normalizeCaseStatus(c.status) || c.status,
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
    // Clinicians can view their assigned case across lifecycle states.
    // Any write operations remain protected by validateCaseState and service guards.

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

    const labRequests = await getLabRequestsForCase(doc, 'clinician');

    res.status(200).json({
      success: true,
      data: {
        ...doc,
        childProfile,
        parentInfo,
        appointment,
        labRequests,
        statusOptions: CASE_LIFECYCLE_STATUS,
      },
    });
  } catch (error) {
    console.error('getCaseById:', error);
    res.status(500).json({ success: false, message: 'Failed to load case' });
  }
};

/**
 * POST /api/cases/create — legacy compatibility.
 * Creates/assigns a clinician-visible case WITHOUT allowing manual status changes.
 * - If case exists (parentId+childId), assigns clinicianId if empty.
 * - If case does not exist, creates it in NEW state.
 */
exports.createCase = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { parentId, childId } = req.body || {};

    if (!parentId || !childId) {
      return res.status(400).json({ success: false, message: 'parentId and childId are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(parentId) || !mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ success: false, message: 'Invalid parentId or childId' });
    }

    let doc = await ChildCase.findOne({ parentId, childId });
    if (doc) {
      if (doc.clinicianId && String(doc.clinicianId) !== String(clinicianId)) {
        return res.status(403).json({ success: false, message: 'Case is assigned to another clinician' });
      }
      if (!doc.clinicianId) {
        doc.clinicianId = clinicianId;
        await doc.save();
        return res.status(201).json({ success: true, message: 'Case assigned', data: doc });
      }
      return res.status(409).json({ success: false, message: 'Case already exists', data: doc });
    }

    doc = await ChildCase.create({
      parentId,
      childId,
      clinicianId,
      status: 'NEW',
      caseHistory: [
        {
          fromStatus: null,
          toStatus: 'NEW',
          event: 'LEGACY_CASE_CREATED',
          timestamp: new Date(),
          triggeredBy: clinicianId,
        },
      ],
    });

    return res.status(201).json({ success: true, message: 'Case created', data: doc });
  } catch (error) {
    console.error('createCase:', error);
    return res.status(500).json({ success: false, message: 'Failed to create case' });
  }
};

/**
 * POST /api/cases/from-appointment — legacy compatibility.
 * Assigns clinicianId on the parent+child case linked to the appointment.
 */
exports.createFromAppointment = async (req, res) => {
  try {
    const clinicianId = req.user._id;
    const { appointmentId } = req.body || {};

    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ success: false, message: 'Valid appointmentId is required' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (String(appointment.professionalRole) !== 'clinician') {
      return res.status(400).json({ success: false, message: 'Only clinician appointments can link cases' });
    }
    if (String(appointment.professional) !== String(clinicianId)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
    }

    const parentId = appointment.parent;
    const childId = appointment.child;

    const doc = await ChildCase.findOneAndUpdate(
      { parentId, childId },
      { $set: { clinicianId, appointmentId: appointment._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, message: 'Case linked', data: doc });
  } catch (error) {
    console.error('createFromAppointment:', error);
    return res.status(500).json({ success: false, message: 'Failed to link case to appointment' });
  }
};
