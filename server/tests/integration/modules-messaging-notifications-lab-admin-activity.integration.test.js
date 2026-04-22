const mongoose = require('mongoose');
const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../../src/utils/email', () => jest.fn().mockResolvedValue(true));

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { ChildCase } = require('../../src/models/ChildCase');
const TherapyCase = require('../../src/models/TherapyCase');
const Conversation = require('../../src/models/Conversation');
const Message = require('../../src/models/Message');
const { Notification } = require('../../src/models/Notification');
const LabTestRequest = require('../../src/models/LabTestRequest');
const LabReport = require('../../src/models/LabReport');
const Activity = require('../../src/models/Activity');
const { HomeAssignment } = require('../../src/models/HomeAssignment');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Messaging, Notifications, Lab, Admin, Activity Library Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    admin: `admin.mods.${suffix}@test.com`,
    parent: `parent.mods.${suffix}@test.com`,
    therapist: `therapist.mods.${suffix}@test.com`,
    clinician: `clinician.mods.${suffix}@test.com`,
    lab: `lab.mods.${suffix}@test.com`,
    pendingProfessional: `pending.mods.${suffix}@test.com`,
  };

  const tokens = {};
  let parentId;
  let therapistId;
  let clinicianId;
  let labId;
  let pendingProfessionalId;
  let childId;
  let caseId;
  let conversationId;
  let labRequestId;
  let activityId;

  beforeAll(async () => {
    await connectTestDb();

    const adminPasswordHash = await bcrypt.hash(password, 12);
    await User.collection.insertOne({
      firstName: 'Admin',
      lastName: 'Module',
      email: emails.admin,
      password: adminPasswordHash,
      role: 'admin',
      isEmailVerified: true,
      approvalStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Module',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Module',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `TMOD-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Module',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `CMOD-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Lab',
      lastName: 'Module',
      email: emails.lab,
      password,
      role: 'lab',
      labName: 'Module Lab',
      accreditation: 'ISO',
    });

    await registerUser(app, {
      firstName: 'Pending',
      lastName: 'Therapist',
      email: emails.pendingProfessional,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `PMOD-${suffix}`,
    });

    await activateUser(emails.parent);
    await activateUser(emails.therapist, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });
    await activateUser(emails.lab);
    await activateUser(emails.pendingProfessional);

    const adminLogin = await loginUser(app, emails.admin, password);
    const parentLogin = await loginUser(app, emails.parent, password);
    const therapistLogin = await loginUser(app, emails.therapist, password);
    const clinicianLogin = await loginUser(app, emails.clinician, password);
    const labLogin = await loginUser(app, emails.lab, password);

    expect(adminLogin.statusCode).toBe(200);
    expect(parentLogin.statusCode).toBe(200);
    expect(therapistLogin.statusCode).toBe(200);
    expect(clinicianLogin.statusCode).toBe(200);
    expect(labLogin.statusCode).toBe(200);

    tokens.admin = adminLogin.body.token;
    tokens.parent = parentLogin.body.token;
    tokens.therapist = therapistLogin.body.token;
    tokens.clinician = clinicianLogin.body.token;
    tokens.lab = labLogin.body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    const therapistDoc = await User.findOne({ email: emails.therapist }).lean();
    const clinicianDoc = await User.findOne({ email: emails.clinician }).lean();
    const labDoc = await User.findOne({ email: emails.lab }).lean();
    const pendingDoc = await User.findOne({ email: emails.pendingProfessional }).lean();

    parentId = String(parentDoc._id);
    therapistId = String(therapistDoc._id);
    clinicianId = String(clinicianDoc._id);
    labId = String(labDoc._id);
    pendingProfessionalId = String(pendingDoc._id);

    parentDoc.children.push({
      firstName: 'Module',
      lastName: 'Child',
      dateOfBirth: new Date('2020-02-01'),
      gender: 'female',
      emergencyContact: 'Parent Module',
      emergencyPhone: '03001112222',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

    const c = await ChildCase.create({
      childId,
      parentId,
      clinicianId,
      status: 'DIAGNOSIS',
    });
    caseId = String(c._id);

    await TherapyCase.create({
      caseId,
      therapistId,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
  });

  afterAll(async () => {
    if (conversationId) {
      await Message.deleteMany({ conversationId });
      await Conversation.deleteMany({ _id: conversationId });
    }

    if (labRequestId) {
      await LabReport.deleteMany({ testRequestId: labRequestId });
      await LabTestRequest.deleteMany({ _id: labRequestId });
    }

    if (activityId) {
      await Activity.deleteMany({ _id: activityId });
    }

    await HomeAssignment.deleteMany({ caseId });
    await Notification.deleteMany({ recipientId: { $in: [parentId, therapistId, clinicianId, labId] } });
    await TherapyCase.deleteMany({ caseId });
    await ChildCase.deleteMany({ _id: caseId });
    await User.deleteMany({ email: new RegExp(`\\.mods\\.${suffix}@test\\.com$`) });

    await disconnectTestDb();
  });

  test('Messaging: parent and therapist can create conversation and exchange messages; clinician on case can read', async () => {
    const convRes = await request(app)
      .get(`/api/messaging/conversations/${caseId}`)
      .set(authHeader(tokens.parent));

    expect(convRes.statusCode).toBe(200);
    expect(convRes.body.success).toBe(true);
    conversationId = String(convRes.body.data._id);

    const sendRes = await request(app)
      .post('/api/messaging/messages')
      .set(authHeader(tokens.parent))
      .send({ conversationId, text: 'Hello therapist, we completed exercises today.' });

    expect(sendRes.statusCode).toBe(201);

    const therapistInbox = await request(app)
      .get('/api/messaging/conversations')
      .set(authHeader(tokens.therapist));

    expect(therapistInbox.statusCode).toBe(200);
    expect(Array.isArray(therapistInbox.body.data)).toBe(true);
    expect(therapistInbox.body.data.some((c) => String(c._id) === conversationId)).toBe(true);

    const listMessagesRes = await request(app)
      .get(`/api/messaging/messages/${conversationId}`)
      .set(authHeader(tokens.therapist));

    expect(listMessagesRes.statusCode).toBe(200);
    expect(listMessagesRes.body.data.length).toBeGreaterThan(0);

    const clinicianRead = await request(app)
      .get(`/api/messaging/messages/${conversationId}`)
      .set(authHeader(tokens.clinician));

    expect(clinicianRead.statusCode).toBe(200);
    expect(Array.isArray(clinicianRead.body.data)).toBe(true);
  });

  test('Notifications: count, mark read, mark all read, delete', async () => {
    const [n1, n2] = await Notification.create([
      {
        recipientId: parentId,
        type: 'system',
        title: 'Test notification 1',
        message: 'First test notification',
      },
      {
        recipientId: parentId,
        type: 'system',
        title: 'Test notification 2',
        message: 'Second test notification',
      },
    ]);

    const countRes = await request(app)
      .get('/api/notifications/count')
      .set(authHeader(tokens.parent));

    expect(countRes.statusCode).toBe(200);
    expect(countRes.body.data.count).toBeGreaterThanOrEqual(2);

    const markOneRes = await request(app)
      .patch(`/api/notifications/${n1._id}/read`)
      .set(authHeader(tokens.parent));

    expect(markOneRes.statusCode).toBe(200);

    const markAllRes = await request(app)
      .patch('/api/notifications/read-all')
      .set(authHeader(tokens.parent));

    expect(markAllRes.statusCode).toBe(200);

    const unreadAfter = await request(app)
      .get('/api/notifications/count')
      .set(authHeader(tokens.parent));

    expect(unreadAfter.statusCode).toBe(200);
    expect(unreadAfter.body.data.count).toBe(0);

    const deleteRes = await request(app)
      .delete(`/api/notifications/${n2._id}`)
      .set(authHeader(tokens.parent));

    expect(deleteRes.statusCode).toBe(200);
  });

  test('Lab workflow: clinician request -> lab upload state -> clinician release -> parent access; parent forbidden on clinician route', async () => {
    const parentForbidden = await request(app)
      .post('/api/lab/clinician/requests')
      .set(authHeader(tokens.parent))
      .send({});

    expect(parentForbidden.statusCode).toBe(403);

    const createReqRes = await request(app)
      .post('/api/lab/clinician/requests')
      .set(authHeader(tokens.clinician))
      .send({
        caseId,
        parentId,
        childId,
        childName: 'Module Child',
        childAge: 6,
        testType: 'Behavioral',
        notes: 'Lab workflow integration test',
      });

    expect(createReqRes.statusCode).toBe(201);
    labRequestId = String(createReqRes.body.data._id);

    const labQueueRes = await request(app)
      .get('/api/lab/requests')
      .set(authHeader(tokens.lab));

    expect(labQueueRes.statusCode).toBe(200);

    const markUploadedRes = await request(app)
      .patch(`/api/lab/requests/${labRequestId}/status`)
      .set(authHeader(tokens.lab))
      .send({ status: 'UPLOADED' });

    expect(markUploadedRes.statusCode).toBe(200);

    await LabReport.create({
      testRequestId: labRequestId,
      childId,
      clinicianId,
      labTechnicianId: labId,
      fileUrl: '/uploads/lab-reports/integration-test-report.pdf',
      fileType: 'application/pdf',
      fileName: 'integration-test-report.pdf',
      fileSize: 2048,
    });

    const releaseRes = await request(app)
      .patch(`/api/lab/clinician/requests/${labRequestId}/release`)
      .set(authHeader(tokens.clinician));

    expect(releaseRes.statusCode).toBe(200);
    expect(releaseRes.body.data.status).toBe('RELEASED');

    const parentReportsRes = await request(app)
      .get('/api/lab/parent/reports')
      .set(authHeader(tokens.parent));

    expect(parentReportsRes.statusCode).toBe(200);
    expect(Array.isArray(parentReportsRes.body.data)).toBe(true);
    expect(parentReportsRes.body.data.some((r) => String(r._id) === labRequestId)).toBe(true);
  });

  test('Admin workflows: list pending professionals and approve one', async () => {
    const pendingRes = await request(app)
      .get('/api/admin/pending-professionals')
      .set(authHeader(tokens.admin));

    expect(pendingRes.statusCode).toBe(200);
    const pendingEmails = (pendingRes.body.users || []).map((u) => u.email);
    expect(pendingEmails).toContain(emails.pendingProfessional);

    const badStatusRes = await request(app)
      .post('/api/admin/update-professional-status')
      .set(authHeader(tokens.admin))
      .send({ userId: pendingProfessionalId, status: 'bad-status' });

    expect(badStatusRes.statusCode).toBe(400);

    const approveRes = await request(app)
      .post('/api/admin/update-professional-status')
      .set(authHeader(tokens.admin))
      .send({ userId: pendingProfessionalId, status: 'active' });

    expect(approveRes.statusCode).toBe(200);

    const pendingAfter = await request(app)
      .get('/api/admin/pending-professionals')
      .set(authHeader(tokens.admin));
    const afterEmails = (pendingAfter.body.users || []).map((u) => u.email);
    expect(afterEmails).not.toContain(emails.pendingProfessional);
  });

  test('Activity library: therapist template CRUD path and assignment; parent forbidden', async () => {
    const parentForbidden = await request(app)
      .get('/api/activities/templates')
      .set(authHeader(tokens.parent));

    expect(parentForbidden.statusCode).toBe(403);

    const createTemplateRes = await request(app)
      .post('/api/activities/templates')
      .set(authHeader(tokens.therapist))
      .send({
        name: `Speech Drill ${suffix}`,
        domain: 'Speech',
        objective: 'Improve articulation',
        procedure: 'Repeat structured word sets',
        materials: 'Flash cards',
      });

    expect(createTemplateRes.statusCode).toBe(201);
    activityId = String(createTemplateRes.body.data._id);

    const listTemplatesRes = await request(app)
      .get('/api/activities/templates')
      .set(authHeader(tokens.therapist));

    expect(listTemplatesRes.statusCode).toBe(200);
    expect(Array.isArray(listTemplatesRes.body.data)).toBe(true);
    expect(listTemplatesRes.body.data.some((a) => String(a._id) === activityId)).toBe(true);

    const cloneRes = await request(app)
      .post(`/api/activities/templates/${activityId}/clone`)
      .set(authHeader(tokens.therapist));

    expect(cloneRes.statusCode).toBe(201);

    const assignHomeRes = await request(app)
      .post(`/api/activities/${activityId}/assign`)
      .set(authHeader(tokens.therapist))
      .send({ caseId, assignTo: 'home' });

    expect(assignHomeRes.statusCode).toBe(201);
    expect(assignHomeRes.body.assignTo).toBe('home');
  });
});
