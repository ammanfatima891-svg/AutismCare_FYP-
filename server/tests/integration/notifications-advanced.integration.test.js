const request = require('supertest');

jest.mock('../../src/utils/email', () => {
  const sendEmail = jest.fn().mockResolvedValue(true);
  sendEmail.sendEmailWithAttachments = jest.fn().mockResolvedValue(true);
  return sendEmail;
});

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { Notification, NOTIFICATION_TYPES } = require('../../src/models/Notification');
const { ClinicalEvaluation } = require('../../src/models/ClinicalEvaluation');
const { createFollowUpDueNotifications } = require('../../src/utils/notification');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Notifications Advanced Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    user1: `parent.notify1.${suffix}@test.com`,
    user2: `parent.notify2.${suffix}@test.com`,
    clinician: `clinician.notify.${suffix}@test.com`,
  };

  let token1;
  let token2;
  let clinicianToken;
  let user1Id;
  let user2Id;
  let clinicianId;
  let user2NotificationId;
  let staleEvaluationId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Notify',
      lastName: 'One',
      email: emails.user1,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Notify',
      lastName: 'Two',
      email: emails.user2,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Notify',
      lastName: 'Clinician',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `N-C-${suffix}`,
    });

    await activateUser(emails.user1, { approvalStatus: 'active' });
    await activateUser(emails.user2, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });

    const login1 = await loginUser(app, emails.user1, password);
    const login2 = await loginUser(app, emails.user2, password);
    const clinicianLogin = await loginUser(app, emails.clinician, password);
    expect(login1.statusCode).toBe(200);
    expect(login2.statusCode).toBe(200);
    expect(clinicianLogin.statusCode).toBe(200);
    token1 = login1.body.token;
    token2 = login2.body.token;
    clinicianToken = clinicianLogin.body.token;

    const user1 = await User.findOne({ email: emails.user1 }).lean();
    const user2 = await User.findOne({ email: emails.user2 }).lean();
    const clinician = await User.findOne({ email: emails.clinician }).lean();
    user1Id = String(user1._id);
    user2Id = String(user2._id);
    clinicianId = String(clinician._id);

    const notifications = [];
    const now = Date.now();
    for (let i = 0; i < 30; i += 1) {
      notifications.push({
        recipientId: user1Id,
        type: NOTIFICATION_TYPES.SYSTEM,
        title: `System notice ${i}`,
        message: `Message ${i}`,
        isRead: i < 10,
        createdAt: new Date(now - i * 1000),
        updatedAt: new Date(now - i * 1000),
      });
    }
    notifications.push({
      recipientId: user2Id,
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'Other user note',
      message: 'Should not be editable by user1',
      isRead: false,
    });

    const inserted = await Notification.insertMany(notifications);
    user2NotificationId = String(inserted[inserted.length - 1]._id);

    const staleEvaluation = await ClinicalEvaluation.create({
      caseId: new (require('mongoose').Types.ObjectId)(),
      clinicianId,
      observations: 'Follow-up pending',
      developmentalSummary: 'Delayed review',
      diagnosis: 'Needs reassessment',
      recommendations: 'Schedule follow-up',
      status: 'final',
    });
    staleEvaluationId = String(staleEvaluation._id);
    await ClinicalEvaluation.collection.updateOne(
      { _id: staleEvaluationId },
      { $set: { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } }
    );
  });

  afterAll(async () => {
    await Notification.deleteMany({ recipientId: { $in: [user1Id, user2Id] } });
    await Notification.deleteMany({ recipientId: clinicianId });
    await ClinicalEvaluation.deleteMany({ _id: staleEvaluationId });
    await User.deleteMany({ email: { $in: [emails.user1, emails.user2, emails.clinician] } });
    await disconnectTestDb();
  });

  test('supports unread filters/pagination and enforces ownership for mutations', async () => {
    const pageRes = await request(app)
      .get('/api/notifications?limit=5&page=2')
      .set(authHeader(token1));
    expect(pageRes.statusCode).toBe(200);
    expect(pageRes.body.data.notifications).toHaveLength(5);
    expect(pageRes.body.data.pagination.page).toBe(2);
    expect(pageRes.body.data.unreadCount).toBe(20);

    const unreadOnlyRes = await request(app)
      .get('/api/notifications?unreadOnly=true&limit=7&page=1')
      .set(authHeader(token1));
    expect(unreadOnlyRes.statusCode).toBe(200);
    expect(unreadOnlyRes.body.data.notifications).toHaveLength(7);
    expect(unreadOnlyRes.body.data.notifications.every((n) => n.isRead === false)).toBe(true);

    const countRes = await request(app)
      .get('/api/notifications/count')
      .set(authHeader(token1));
    expect(countRes.statusCode).toBe(200);
    expect(countRes.body.data.count).toBe(20);

    const foreignReadRes = await request(app)
      .patch(`/api/notifications/${user2NotificationId}/read`)
      .set(authHeader(token1));
    expect(foreignReadRes.statusCode).toBe(404);

    const foreignDeleteRes = await request(app)
      .delete(`/api/notifications/${user2NotificationId}`)
      .set(authHeader(token1));
    expect(foreignDeleteRes.statusCode).toBe(404);

    const malformedReadRes = await request(app)
      .patch('/api/notifications/not-an-id/read')
      .set(authHeader(token1));
    expect(malformedReadRes.statusCode).toBe(400);

    const readAllRes = await request(app)
      .patch('/api/notifications/read-all')
      .set(authHeader(token1));
    expect(readAllRes.statusCode).toBe(200);
    expect(readAllRes.body.data.modifiedCount).toBeGreaterThanOrEqual(20);

    const countAfterRes = await request(app)
      .get('/api/notifications/count')
      .set(authHeader(token1));
    expect(countAfterRes.statusCode).toBe(200);
    expect(countAfterRes.body.data.count).toBe(0);

    const user2CountRes = await request(app)
      .get('/api/notifications/count')
      .set(authHeader(token2));
    expect(user2CountRes.statusCode).toBe(200);
    expect(user2CountRes.body.data.count).toBe(1);
  });

  test('creates clinician follow-up notifications idempotently and surfaces all notification types', async () => {
    await createFollowUpDueNotifications(clinicianId, 0);

    const firstCountRes = await request(app)
      .get('/api/notifications/count')
      .set(authHeader(clinicianToken));
    expect(firstCountRes.statusCode).toBe(200);
    expect(firstCountRes.body.data.count).toBeGreaterThanOrEqual(1);

    const followUpListRes = await request(app)
      .get('/api/notifications?unreadOnly=true&limit=50&page=1')
      .set(authHeader(clinicianToken));
    expect(followUpListRes.statusCode).toBe(200);
    expect(followUpListRes.body.data.notifications.some((n) => n.type === NOTIFICATION_TYPES.FOLLOW_UP)).toBe(true);

    const secondCountRes = await request(app)
      .get('/api/notifications/count')
      .set(authHeader(clinicianToken));
    expect(secondCountRes.statusCode).toBe(200);
    expect(secondCountRes.body.data.count).toBe(firstCountRes.body.data.count);

    const remainingTypes = Object.values(NOTIFICATION_TYPES).filter((t) => t !== NOTIFICATION_TYPES.FOLLOW_UP);
    await Notification.insertMany(
      remainingTypes.map((type, index) => ({
        recipientId: clinicianId,
        type,
        title: `Type ${type}`,
        message: `Notification type coverage ${index}`,
        isRead: false,
      }))
    );

    const allTypesRes = await request(app)
      .get('/api/notifications?unreadOnly=true&limit=100&page=1')
      .set(authHeader(clinicianToken));
    expect(allTypesRes.statusCode).toBe(200);

    const clinicianTypes = new Set(allTypesRes.body.data.notifications.map((n) => n.type));
    Object.values(NOTIFICATION_TYPES).forEach((type) => {
      expect(clinicianTypes.has(type)).toBe(true);
    });

    const highPageRes = await request(app)
      .get('/api/notifications?unreadOnly=true&limit=10&page=99')
      .set(authHeader(clinicianToken));
    expect(highPageRes.statusCode).toBe(200);
    expect(Array.isArray(highPageRes.body.data.notifications)).toBe(true);
  });
});