const mongoose = require('mongoose');
const request = require('supertest');

jest.mock('../../src/utils/email', () => {
  const sendEmail = jest.fn().mockResolvedValue(true);
  sendEmail.sendEmailWithAttachments = jest.fn().mockResolvedValue(true);
  return sendEmail;
});

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { ChildCase } = require('../../src/models/ChildCase');
const TherapyCase = require('../../src/models/TherapyCase');
const { Notification } = require('../../src/models/Notification');
const { Report } = require('../../src/models/Report');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Performance and Resilience Smoke Matrix', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.perf.${suffix}@test.com`,
    clinician: `clinician.perf.${suffix}@test.com`,
    therapist: `therapist.perf.${suffix}@test.com`,
  };

  let parentToken;
  let therapistToken;
  let parentId;
  let clinicianId;
  let therapistId;
  let caseId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Perf',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Perf',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `PERF-C-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Perf',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `PERF-T-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });
    await activateUser(emails.therapist, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    const therapistLogin = await loginUser(app, emails.therapist, password);

    expect(parentLogin.statusCode).toBe(200);
    expect(therapistLogin.statusCode).toBe(200);

    parentToken = parentLogin.body.token;
    therapistToken = therapistLogin.body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    const clinicianDoc = await User.findOne({ email: emails.clinician }).lean();
    const therapistDoc = await User.findOne({ email: emails.therapist }).lean();

    parentId = String(parentDoc._id);
    clinicianId = String(clinicianDoc._id);
    therapistId = String(therapistDoc._id);

    parentDoc.children.push({
      firstName: 'Perf',
      lastName: 'Child',
      dateOfBirth: new Date('2020-11-11'),
      gender: 'male',
      emergencyContact: 'Parent Perf',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    const childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

    const createdCase = await ChildCase.create({
      childId,
      parentId,
      clinicianId,
    });
    caseId = String(createdCase._id);

    await TherapyCase.create({
      caseId,
      therapistId,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });

    const bulkNotifications = Array.from({ length: 30 }).map((_, idx) => ({
      recipientId: parentId,
      type: 'system',
      title: `Perf notification ${idx}`,
      message: `Perf notification payload ${idx}`,
      isRead: false,
      createdAt: new Date(Date.now() - idx * 1000),
      updatedAt: new Date(Date.now() - idx * 1000),
    }));
    await Notification.insertMany(bulkNotifications);
  });

  afterAll(async () => {
    await Notification.deleteMany({ recipientId: parentId });
    await Report.deleteMany({ caseId });
    await TherapyCase.deleteMany({ caseId });
    await ChildCase.deleteMany({ _id: caseId });
    await User.deleteMany({ email: { $in: [emails.parent, emails.clinician, emails.therapist] } });
    await disconnectTestDb();
  });

  test('supports burst throughput, duplicate-safe concurrent report generation, and recovery after failures', async () => {
    const throughputStart = Date.now();

    const countResults = await Promise.all(
      Array.from({ length: 25 }).map(() =>
        request(app)
          .get('/api/notifications/count')
          .set(authHeader(parentToken))
      )
    );

    const throughputDurationMs = Date.now() - throughputStart;
    countResults.forEach((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body.data.count).toBeGreaterThanOrEqual(0);
    });
    expect(throughputDurationMs).toBeLessThan(8000);

    const malformedRes = await request(app)
      .post('/api/reports/generate')
      .set(authHeader(therapistToken))
      .send({ caseId: 'not-an-id', reportType: 'parent' });
    expect(malformedRes.statusCode).toBe(400);

    const concurrentReportResults = await Promise.all(
      Array.from({ length: 8 }).map(() =>
        request(app)
          .post('/api/reports/generate')
          .set(authHeader(therapistToken))
          .send({ caseId, reportType: 'parent' })
      )
    );

    concurrentReportResults.forEach((res) => {
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('parent');
    });

    const createdCount = concurrentReportResults.filter((r) => r.statusCode === 201).length;
    const duplicateCount = concurrentReportResults.filter(
      (r) => r.statusCode === 200 && r.body.data.duplicate === true
    ).length;

    expect(createdCount).toBeGreaterThanOrEqual(1);
    expect(duplicateCount).toBeGreaterThanOrEqual(1);

    const recoveryRes = await request(app)
      .post('/api/reports/generate')
      .set(authHeader(therapistToken))
      .send({ caseId, reportType: 'session-summary' });
    expect([200, 201]).toContain(recoveryRes.statusCode);
    expect(recoveryRes.body.success).toBe(true);
  });
});
