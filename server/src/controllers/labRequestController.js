const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LabTest = require('../models/LabTest');
const LabRequest = require('../models/LabRequest');
const LabApproval = require('../models/LabApproval');
const { ChildCase } = require('../models/ChildCase');
const { User } = require('../models/User');
const { assertTherapistCaseAccess } = require('../utils/therapistCaseAccess');
const { createNotification, NOTIFICATION_TYPES } = require('../utils/notification');
const { validateFileStrict, wrapMulter } = require('../middleware/uploadValidation');
const { scheduleEmitClinicalEvent, actorFromReq } = require('../services/clinicalEventService');

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

const uploadsDir = path.join(process.cwd(), 'uploads/lab-reports');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `lab-request-report-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const labRequestUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const v = validateFileStrict({ ...file, size: 0 }, ['image', 'pdf']);
    if (v.ok) return cb(null, true);
    return cb(new Error('Only jpeg/png/webp images or PDFs are allowed'));
  },
});

const uploadLabRequestReportSingle = wrapMulter(labRequestUpload.single('report'));

async function loadChildBasic(childId) {
  const parent = await User.findOne(
    { role: 'parent', 'children._id': childId },
    { firstName: 1, lastName: 1, children: { $elemMatch: { _id: childId } } }
  ).lean();
  const child = parent?.children?.[0] || null;
  return {
    childName: child ? `${child.firstName || ''} ${child.lastName || ''}`.trim() : 'Child',
    parentId: parent?._id || null,
  };
}

async function canAccessChildRequests(req, childId) {
  const role = normalizeRole(req.user?.role ?? req.jwtRole);
  const uid = req.user?._id;

  if (!uid) return false;
  if (role === 'clinician') {
    const found = await ChildCase.findOne({ childId, clinicianId: uid }).select('_id').lean();
    return Boolean(found);
  }
  if (role === 'parent') {
    const found = await User.findOne({ _id: uid, role: 'parent', 'children._id': childId })
      .select('_id')
      .lean();
    return Boolean(found);
  }
  if (role === 'therapist') {
    const caseDocs = await ChildCase.find({ childId }).select('_id').lean();
    for (const c of caseDocs) {
      // Match therapist case access gate used in therapist module.
      // eslint-disable-next-line no-await-in-loop
      const access = await assertTherapistCaseAccess(req, String(c._id), uid);
      if (access.ok) return true;
    }
    return false;
  }
  return false;
}

exports.createLabRequest = async (req, res) => {
  try {
    const { child_id, lab_id, test_id, notes } = req.body || {};
    if (!child_id || !lab_id || !test_id) {
      return res.status(400).json({ success: false, message: 'child_id, lab_id, and test_id are required' });
    }
    if (
      !mongoose.Types.ObjectId.isValid(String(child_id)) ||
      !mongoose.Types.ObjectId.isValid(String(lab_id)) ||
      !mongoose.Types.ObjectId.isValid(String(test_id))
    ) {
      return res.status(400).json({ success: false, message: 'Invalid identifiers provided' });
    }

    const ownedCase = await ChildCase.findOne({
      childId: child_id,
      clinicianId: req.user._id,
    })
      .select('_id')
      .lean();
    if (!ownedCase) {
      return res.status(403).json({ success: false, message: 'You are not allowed to request tests for this child' });
    }

    const [labUser, test, labApproval] = await Promise.all([
      User.findOne({ _id: lab_id, role: 'lab' }).select('_id firstName lastName labName').lean(),
      LabTest.findById(test_id).select('_id lab_id test_name category').lean(),
      LabApproval.findOne({ labUserId: lab_id }).select('status').lean(),
    ]);

    if (!test) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }
    if (!labUser || String(labApproval?.status || '').toLowerCase() !== 'active') {
      return res.status(400).json({ success: false, message: 'Selected lab is not active or not found' });
    }
    if (String(test.lab_id) !== String(lab_id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Selected lab does not offer the selected test' });
    }

    const created = await LabRequest.create({
      child_id,
      clinician_id: req.user._id,
      lab_id,
      test_id,
      notes: String(notes || '').trim(),
      status: 'pending',
    });

    // Notification hook: request created -> notify lab
    await createNotification({
      recipientId: lab_id,
      type: NOTIFICATION_TYPES.NEW_TEST_ORDER,
      title: 'New lab test request',
      message: `A clinician requested "${test.test_name}" for a child case.`,
      relatedResourceType: 'LabRequest',
      relatedResourceId: created._id,
      relatedCaseId: ownedCase._id,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('createLabRequest:', error);
    return res.status(500).json({ success: false, message: 'Failed to create lab request' });
  }
};

exports.getLabRequestsByChild = async (req, res) => {
  try {
    const { childId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ success: false, message: 'Invalid childId' });
    }

    const allowed = await canAccessChildRequests(req, childId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const requests = await LabRequest.find({ child_id: childId })
      .populate('test_id', 'test_name category')
      .populate('lab_id', 'labName accreditation')
      .populate('clinician_id', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const data = requests.map((row) => ({
      _id: row._id,
      child_id: row.child_id,
      clinician_id: row.clinician_id?._id || null,
      clinicianName: row.clinician_id
        ? `${row.clinician_id.firstName || ''} ${row.clinician_id.lastName || ''}`.trim()
        : '',
      lab_id: row.lab_id?._id || null,
      labName: row.lab_id?.labName || 'Lab',
      accreditation: row.lab_id?.accreditation || '',
      test_id: row.test_id?._id || null,
      test_name: row.test_id?.test_name || 'Test',
      category: row.test_id?.category || '',
      status: row.status,
      notes: row.notes || '',
      report_url: row.report_url || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getLabRequestsByChild:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch lab requests' });
  }
};

exports.getMyLabRequests = async (req, res) => {
  try {
    const requests = await LabRequest.find({ lab_id: req.user._id })
      .populate('test_id', 'test_name category')
      .populate('clinician_id', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    const childInfoMap = new Map();
    const uniqueChildIds = [...new Set(requests.map((r) => String(r.child_id)))];
    await Promise.all(
      uniqueChildIds.map(async (childId) => {
        const child = await loadChildBasic(childId);
        childInfoMap.set(childId, child);
      })
    );

    const data = requests.map((row) => {
      const childInfo = childInfoMap.get(String(row.child_id)) || { childName: 'Child' };
      return {
        _id: row._id,
        child_id: row.child_id,
        childName: childInfo.childName,
        clinicianName: row.clinician_id
          ? `${row.clinician_id.firstName || ''} ${row.clinician_id.lastName || ''}`.trim()
          : '',
        test_name: row.test_id?.test_name || 'Test',
        category: row.test_id?.category || '',
        status: row.status,
        notes: row.notes || '',
        report_url: row.report_url || '',
        createdAt: row.createdAt,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getMyLabRequests:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch lab requests' });
  }
};

exports.acceptLabRequest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request id' });
    }

    const request = await LabRequest.findOne({ _id: id, lab_id: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Lab request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending requests can be accepted' });
    }

    // State gate: lab actions only during DIAGNOSIS
    const caseDoc = await ChildCase.findOne({ childId: request.child_id }).select('_id status').lean();
    const st = String(caseDoc?.status || '').toUpperCase();
    if (st !== 'DIAGNOSIS') {
      return res.status(403).json({
        success: false,
        message: 'Action not allowed in current case state',
        errorCode: 'CASE_STATE_FORBIDDEN',
        meta: { action: 'ACCEPT_LAB_REQUEST', currentStatus: st, requiredStatuses: ['DIAGNOSIS'] },
      });
    }

    request.status = 'in_progress';
    await request.save();
    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error('acceptLabRequest:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept request' });
  }
};

exports.uploadLabReport = [
  uploadLabRequestReportSingle,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, message: 'Invalid request id' });
      }

      let finalReportUrl = '';
      if (req.file) {
        const strict = validateFileStrict(req.file, ['image', 'pdf']);
        if (!strict.ok) {
          if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(400).json({ success: false, message: strict.message, errorCode: strict.errorCode });
        }
        finalReportUrl = `/uploads/lab-reports/${req.file.filename}`;
      } else if (req.body?.report_url && String(req.body.report_url).trim()) {
        // Backward-compatible path for existing clients.
        finalReportUrl = String(req.body.report_url).trim();
      }

      if (!finalReportUrl) {
        return res.status(400).json({ success: false, message: 'Upload a report file (PDF/image) or provide report_url' });
      }

      const request = await LabRequest.findOne({ _id: id, lab_id: req.user._id })
        .populate('test_id', 'test_name')
        .lean();
      if (!request) {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: 'Lab request not found' });
      }

      // State gate: lab actions only during DIAGNOSIS
      const caseDoc = await ChildCase.findOne({ childId: request.child_id }).select('_id status').lean();
      const st = String(caseDoc?.status || '').toUpperCase();
      if (st !== 'DIAGNOSIS') {
        if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(403).json({
          success: false,
          message: 'Action not allowed in current case state',
          errorCode: 'CASE_STATE_FORBIDDEN',
          meta: { action: 'UPLOAD_LAB_REPORT', currentStatus: st, requiredStatuses: ['DIAGNOSIS'] },
        });
      }

      const updated = await LabRequest.findByIdAndUpdate(
        id,
        {
          $set: {
            report_url: finalReportUrl,
            status: 'completed',
          },
        },
        { new: true }
      );

      const childMeta = await loadChildBasic(request.child_id);

      // Notification hook: report uploaded -> notify clinician + parent
      await Promise.all([
        createNotification({
          recipientId: request.clinician_id,
          type: NOTIFICATION_TYPES.REPORT_UPLOADED,
          title: 'Lab report uploaded',
          message: `Lab uploaded report for "${request.test_id?.test_name || 'requested test'}".`,
          relatedResourceType: 'LabRequest',
          relatedResourceId: request._id,
        }),
        childMeta.parentId
          ? createNotification({
              recipientId: childMeta.parentId,
              type: NOTIFICATION_TYPES.REPORT_UPLOADED,
              title: 'Lab report available',
              message: `Lab report is available for ${childMeta.childName || 'your child'}.`,
              relatedResourceType: 'LabRequest',
              relatedResourceId: request._id,
            })
          : Promise.resolve(null),
      ]);

      try {
        if (caseDoc?._id) {
          const act = actorFromReq(req);
          scheduleEmitClinicalEvent({
            eventType: 'LAB_REPORT_UPLOADED',
            caseId: caseDoc._id,
            actorRole: act.actorRole,
            actorId: act.actorId,
            linkedModules: ['lab'],
            payload: {
              labRequestId: String(request._id),
              reportUrl: finalReportUrl,
              legacyFlow: true,
            },
          });
        }
      } catch (evErr) {
        console.error('clinical event legacy lab upload:', evErr);
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('uploadLabReport:', error);
      return res.status(500).json({ success: false, message: 'Failed to upload report' });
    }
  },
];
