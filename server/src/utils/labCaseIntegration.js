const LabTestRequest = require('../models/LabTestRequest');
const LabReport = require('../models/LabReport');

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
  if (!caseDoc?.childId || !caseDoc?.parentId || !caseDoc?.clinicianId) {
    return [];
  }

  const filter = {
    childId: caseDoc.childId,
    parentId: caseDoc.parentId,
    clinicianId: caseDoc.clinicianId,
  };

  const requests = await LabTestRequest.find(filter).sort({ createdAt: -1 }).lean();
  if (!requests.length) return [];

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

  const isClinician = role === 'clinician';

  return requests.map((r) => {
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
}

module.exports = { getLabRequestsForCase };
