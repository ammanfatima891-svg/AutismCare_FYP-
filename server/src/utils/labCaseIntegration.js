const LabTestRequest = require('../models/LabTestRequest');
const LabReport = require('../models/LabReport');
const LabRequest = require('../models/LabRequest');

function mapReportForClinician(rep) {
  const tech = rep.labTechnicianId;
  return {
    _id: rep._id,
    fileUrl: rep.fileUrl,
    fileName: rep.fileName,
    fileType: rep.fileType,
    fileSize: rep.fileSize,
    uploadedAt: rep.uploadedAt,
    labTechnician:
      tech && typeof tech === 'object'
        ? { firstName: tech.firstName || '', lastName: tech.lastName || '' }
        : null,
  };
}

function mapReportForParent(rep) {
  return {
    _id: rep._id,
    fileUrl: rep.fileUrl,
    fileName: rep.fileName,
    fileType: rep.fileType,
    fileSize: rep.fileSize,
    uploadedAt: rep.uploadedAt,
  };
}

/**
 * Lab orders tied to a ChildCase (same child, parent, and managing clinician).
 * Clinicians see full files; parents and therapists only see files after clinician release.
 *
 * @param {import('mongoose').LeanDocument<any>} caseDoc
 * @param {'clinician'|'parent'|'therapist'} role
 * @returns {Promise<object[]>}
 */
async function getLabRequestsForCase(caseDoc, role) {
  if (!caseDoc?.childId || !caseDoc?.parentId) {
    return [];
  }

  const isClinician = role === 'clinician';
  const filter = {
    childId: caseDoc.childId,
    parentId: caseDoc.parentId,
  };
  // Parent/therapist views should include all rows for this child in this family, even across clinician handovers.
  if (isClinician && caseDoc?.clinicianId) filter.clinicianId = caseDoc.clinicianId;

  const requests = await LabTestRequest.find(filter).sort({ createdAt: -1 }).lean();

  const requestIds = requests.map((r) => r._id);
  const reports = await LabReport.find({ testRequestId: { $in: requestIds } })
    .populate('labTechnicianId', 'firstName lastName')
    .sort({ uploadedAt: -1 })
    .lean();

  const reportsByRequest = {};
  for (const rep of reports) {
    const key = String(rep.testRequestId);
    if (!reportsByRequest[key]) reportsByRequest[key] = [];
    reportsByRequest[key].push(rep);
  }

  const legacyRows = requests.map((r) => {
    const key = String(r._id);
    const rowReports = reportsByRequest[key] || [];

    if (isClinician) {
      return {
        _id: r._id,
        testType: r.testType,
        requestPurpose: r.requestPurpose,
        priority: r.priority,
        requestSummary: r.requestSummary || '',
        requestedItems: Array.isArray(r.requestedItems) ? r.requestedItems : [],
        status: r.status,
        notes: r.notes || '',
        releasedToParent: !!r.releasedToParent,
        childName: r.childName,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        reports: rowReports.map(mapReportForClinician),
      };
    }

    const released = r.status === 'RELEASED' && r.releasedToParent;
    return {
      _id: r._id,
      testType: r.testType,
      status: r.status,
      releasedToParent: !!r.releasedToParent,
      childName: r.childName,
      createdAt: r.createdAt,
      requestPurpose: released ? r.requestPurpose : undefined,
      priority: released ? r.priority : undefined,
      requestSummary: released ? (r.requestSummary || '') : undefined,
      requestedItems: released && Array.isArray(r.requestedItems) ? r.requestedItems : [],
      notes: released ? r.notes || '' : undefined,
      reports: released ? rowReports.map(mapReportForParent) : [],
    };
  });

  // New LabRequest workflow rows (test catalog -> lab assignment flow)
  const modernFilter = { child_id: caseDoc.childId };
  if (isClinician && caseDoc?.clinicianId) modernFilter.clinician_id = caseDoc.clinicianId;
  const newRequests = await LabRequest.find(modernFilter)
    .populate('test_id', 'test_name category')
    .populate('lab_id', 'labName accreditation')
    .sort({ createdAt: -1 })
    .lean();

  const modernRows = newRequests.map((r) => {
    const base = {
      _id: r._id,
      testType: r.test_id?.test_name || 'Lab test',
      status: String(r.status || '').toUpperCase(),
      releasedToParent: r.status === 'completed',
      childName: null,
      createdAt: r.createdAt,
      requestPurpose: undefined,
      priority: undefined,
      requestSummary: '',
      requestedItems: [],
      notes: r.notes || '',
      reports: r.report_url
        ? [
            {
              _id: `${r._id}-report`,
              fileUrl: r.report_url,
              fileName: `${r.test_id?.test_name || 'Lab test'} report`,
              fileType: 'link',
              fileSize: 0,
              uploadedAt: r.updatedAt || r.createdAt,
              labTechnician: null,
            },
          ]
        : [],
    };

    if (isClinician) {
      return {
        ...base,
        requestSummary: [r.lab_id?.labName, r.test_id?.category].filter(Boolean).join(' · '),
      };
    }

    return {
      ...base,
      notes: r.status === 'completed' ? base.notes : undefined,
      reports: r.status === 'completed' ? base.reports : [],
    };
  });

  return [...modernRows, ...legacyRows].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

module.exports = { getLabRequestsForCase };
