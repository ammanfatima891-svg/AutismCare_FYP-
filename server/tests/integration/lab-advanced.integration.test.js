const request = require('supertest');

jest.mock('../../src/utils/email', () => {
  const sendEmail = jest.fn().mockResolvedValue(true);
  sendEmail.sendEmailWithAttachments = jest.fn().mockResolvedValue(true);
  return sendEmail;
});

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const LabTestRequest = require('../../src/models/LabTestRequest');
const LabReport = require('../../src/models/LabReport');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Lab Advanced Lifecycle Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.lab.${suffix}@test.com`,
    clinician: `clinician.lab.${suffix}@test.com`,
    lab: `lab.lab.${suffix}@test.com`,
  };

  let parentToken;
  let clinicianToken;
  let labToken;
  let parentId;
  let testRequestId;
  let uploadedReportId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Lab',
      email: emails.parent,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Lab',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `LAB-C-${suffix}`,
    });
    await registerUser(app, {
      firstName: 'Lab',
      lastName: 'Tech',
      email: emails.lab,
      password,
      role: 'lab',
      labName: 'Test Diagnostics',
      accreditation: 'ISO-1234',
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });
    await activateUser(emails.lab, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    const clinicianLogin = await loginUser(app, emails.clinician, password);
    const labLogin = await loginUser(app, emails.lab, password);
    expect(parentLogin.statusCode).toBe(200);
    expect(clinicianLogin.statusCode).toBe(200);
    expect(labLogin.statusCode).toBe(200);
    parentToken = parentLogin.body.token;
    clinicianToken = clinicianLogin.body.token;
    labToken = labLogin.body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    parentId = String(parentDoc._id);
    parentDoc.children.push({
      firstName: 'Lab',
      lastName: 'Child',
      dateOfBirth: new Date('2020-09-01'),
      gender: 'female',
      emergencyContact: 'Parent Lab',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });
  });

  afterAll(async () => {
    if (testRequestId) {
      await LabReport.deleteMany({ testRequestId });
      await LabTestRequest.deleteMany({ _id: testRequestId });
    }
    await User.deleteMany({ email: { $in: [emails.parent, emails.clinician, emails.lab] } });
    await disconnectTestDb();
  });

  test('enforces transitions and role access across clinician/lab/parent endpoints', async () => {
    const parentDoc = await User.findById(parentId).lean();
    const child = parentDoc.children[parentDoc.children.length - 1];

    const createReqRes = await request(app)
      .post('/api/lab/clinician/requests')
      .set(authHeader(clinicianToken))
      .send({
        parentId,
        childId: String(child._id),
        childName: `${child.firstName} ${child.lastName}`,
        childAge: 5,
        testType: 'EEG',
        notes: 'Assess baseline neural activity',
      });
    expect(createReqRes.statusCode).toBe(201);
    testRequestId = String(createReqRes.body.data._id);

    const releaseTooEarlyRes = await request(app)
      .patch(`/api/lab/clinician/requests/${testRequestId}/release`)
      .set(authHeader(clinicianToken));
    expect(releaseTooEarlyRes.statusCode).toBe(400);

    const parentReleasedBeforeReviewRes = await request(app)
      .get('/api/lab/parent/reports')
      .set(authHeader(parentToken));
    expect(parentReleasedBeforeReviewRes.statusCode).toBe(200);
    expect(parentReleasedBeforeReviewRes.body.data).toHaveLength(0);

    const parentBlockedClinicianRouteRes = await request(app)
      .get('/api/lab/clinician/requests')
      .set(authHeader(parentToken));
    expect(parentBlockedClinicianRouteRes.statusCode).toBe(403);

    const clinicianBlockedLabRouteRes = await request(app)
      .get('/api/lab/requests')
      .set(authHeader(clinicianToken));
    expect(clinicianBlockedLabRouteRes.statusCode).toBe(403);

    const labBlockedClinicianRouteRes = await request(app)
      .get('/api/lab/clinician/requests')
      .set(authHeader(labToken));
    expect(labBlockedClinicianRouteRes.statusCode).toBe(403);

    const invalidStatusTransitionRes = await request(app)
      .patch(`/api/lab/requests/${testRequestId}/status`)
      .set(authHeader(labToken))
      .send({ status: 'RELEASED' });
    expect(invalidStatusTransitionRes.statusCode).toBe(400);

    const invalidStatusEnumRes = await request(app)
      .patch(`/api/lab/requests/${testRequestId}/status`)
      .set(authHeader(labToken))
      .send({ status: 'NOT_A_STATUS' });
    expect(invalidStatusEnumRes.statusCode).toBe(400);

    const uploadRes = await request(app)
      .post('/api/lab/reports/upload')
      .set(authHeader(labToken))
      .field('testRequestId', testRequestId)
      .attach('report', Buffer.from('%PDF-1.4 lab report fixture'), 'fixture-report.pdf');
    expect(uploadRes.statusCode).toBe(201);
    expect(uploadRes.body.data.fileUrl).toMatch(/\/uploads\/lab-reports\//);
    expect(uploadRes.body.data.fileType).toBe('application/pdf');
    expect(uploadRes.body.data.fileName).toBe('fixture-report.pdf');
    expect(uploadRes.body.data.fileSize).toBeGreaterThan(0);
    uploadedReportId = String(uploadRes.body.data._id);

    const reportMetaRes = await request(app)
      .get(`/api/lab/reports/${uploadedReportId}`)
      .set(authHeader(labToken));
    expect(reportMetaRes.statusCode).toBe(200);
    expect(String(reportMetaRes.body.data.testRequestId)).toBe(testRequestId);
    expect(reportMetaRes.body.data.fileName).toBe('fixture-report.pdf');

    const clinicianBlockedReportMetaRes = await request(app)
      .get(`/api/lab/reports/${uploadedReportId}`)
      .set(authHeader(clinicianToken));
    expect(clinicianBlockedReportMetaRes.statusCode).toBe(403);

    const parentBlockedReportMetaRes = await request(app)
      .get(`/api/lab/reports/${uploadedReportId}`)
      .set(authHeader(parentToken));
    expect(parentBlockedReportMetaRes.statusCode).toBe(403);

    const releaseRes = await request(app)
      .patch(`/api/lab/clinician/requests/${testRequestId}/release`)
      .set(authHeader(clinicianToken));
    expect(releaseRes.statusCode).toBe(200);

    const releaseAgainRes = await request(app)
      .patch(`/api/lab/clinician/requests/${testRequestId}/release`)
      .set(authHeader(clinicianToken));
    expect(releaseAgainRes.statusCode).toBe(400);

    const labDowngradeReleasedRes = await request(app)
      .patch(`/api/lab/requests/${testRequestId}/status`)
      .set(authHeader(labToken))
      .send({ status: 'UPLOADED' });
    expect(labDowngradeReleasedRes.statusCode).toBe(400);

    const parentReportsRes = await request(app)
      .get('/api/lab/parent/reports')
      .set(authHeader(parentToken));
    expect(parentReportsRes.statusCode).toBe(200);
    expect(parentReportsRes.body.data.some((r) => String(r._id) === testRequestId)).toBe(true);
    const releasedReq = parentReportsRes.body.data.find((r) => String(r._id) === testRequestId);
    expect(Array.isArray(releasedReq.reports)).toBe(true);
    expect(releasedReq.reports.length).toBeGreaterThanOrEqual(1);
    expect(releasedReq.reports[0].fileName).toBe('fixture-report.pdf');

    const parentBlockedLabReportsRes = await request(app)
      .get('/api/lab/reports')
      .set(authHeader(parentToken));
    expect(parentBlockedLabReportsRes.statusCode).toBe(403);
  });
});