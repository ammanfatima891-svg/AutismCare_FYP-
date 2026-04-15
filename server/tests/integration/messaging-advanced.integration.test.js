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
const Conversation = require('../../src/models/Conversation');
const Message = require('../../src/models/Message');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Messaging Advanced Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent1: `parent1.msg.${suffix}@test.com`,
    parent2: `parent2.msg.${suffix}@test.com`,
    therapist: `therapist.msg.${suffix}@test.com`,
  };

  let parent1Token;
  let parent2Token;
  let therapistToken;
  let parent1Id;
  let parent2Id;
  let therapistId;
  let case1Id;
  let case2Id;
  let conversation1Id;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'One',
      email: emails.parent1,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Two',
      email: emails.parent2,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Msg',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `MSG-${suffix}`,
    });

    await activateUser(emails.parent1, { approvalStatus: 'active' });
    await activateUser(emails.parent2, { approvalStatus: 'active' });
    await activateUser(emails.therapist, { approvalStatus: 'active' });

    const p1Login = await loginUser(app, emails.parent1, password);
    const p2Login = await loginUser(app, emails.parent2, password);
    const tLogin = await loginUser(app, emails.therapist, password);
    expect(p1Login.statusCode).toBe(200);
    expect(p2Login.statusCode).toBe(200);
    expect(tLogin.statusCode).toBe(200);
    parent1Token = p1Login.body.token;
    parent2Token = p2Login.body.token;
    therapistToken = tLogin.body.token;

    const p1 = await User.findOne({ email: emails.parent1 });
    const p2 = await User.findOne({ email: emails.parent2 });
    const t = await User.findOne({ email: emails.therapist });
    parent1Id = String(p1._id);
    parent2Id = String(p2._id);
    therapistId = String(t._id);

    p1.children.push({
      firstName: 'Child',
      lastName: 'One',
      dateOfBirth: new Date('2020-07-01'),
      gender: 'male',
      emergencyContact: 'Parent One',
      emergencyPhone: '03001234567',
    });
    p2.children.push({
      firstName: 'Child',
      lastName: 'Two',
      dateOfBirth: new Date('2020-08-01'),
      gender: 'female',
      emergencyContact: 'Parent Two',
      emergencyPhone: '03007654321',
    });
    await p1.save({ validateModifiedOnly: true });
    await p2.save({ validateModifiedOnly: true });

    const child1Id = String(p1.children[p1.children.length - 1]._id);
    const child2Id = String(p2.children[p2.children.length - 1]._id);

    const c1 = await ChildCase.create({
      childId: child1Id,
      parentId: parent1Id,
      clinicianId: new mongoose.Types.ObjectId(),
    });
    const c2 = await ChildCase.create({
      childId: child2Id,
      parentId: parent2Id,
      clinicianId: new mongoose.Types.ObjectId(),
    });
    case1Id = String(c1._id);
    case2Id = String(c2._id);

    await TherapyCase.create({
      caseId: case1Id,
      therapistId,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
    await TherapyCase.create({
      caseId: case2Id,
      therapistId,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
  });

  afterAll(async () => {
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    await TherapyCase.deleteMany({ caseId: { $in: [case1Id, case2Id] } });
    await ChildCase.deleteMany({ _id: { $in: [case1Id, case2Id] } });
    await User.deleteMany({ email: { $in: [emails.parent1, emails.parent2, emails.therapist] } });
    await disconnectTestDb();
  });

  test('handles long/high-volume messages and blocks cross-case access', async () => {
    const conv1Res = await request(app)
      .get(`/api/messaging/conversations/${case1Id}`)
      .set(authHeader(parent1Token));
    expect(conv1Res.statusCode).toBe(200);
    conversation1Id = String(conv1Res.body.data._id);

    const conv2Res = await request(app)
      .get(`/api/messaging/conversations/${case2Id}`)
      .set(authHeader(parent2Token));
    expect(conv2Res.statusCode).toBe(200);

    const malformedMessagesRes = await request(app)
      .get('/api/messaging/messages/not-an-id')
      .set(authHeader(parent1Token));
    expect(malformedMessagesRes.statusCode).toBe(400);

    const malformedSendRes = await request(app)
      .post('/api/messaging/messages')
      .set(authHeader(parent1Token))
      .send({ conversationId: 'bad-id', text: 'hello' });
    expect(malformedSendRes.statusCode).toBe(400);

    const emptyTextRes = await request(app)
      .post('/api/messaging/messages')
      .set(authHeader(parent1Token))
      .send({ conversationId: conversation1Id, text: '   ' });
    expect(emptyTextRes.statusCode).toBe(400);

    const longText = 'x'.repeat(5000);
    const longMsgRes = await request(app)
      .post('/api/messaging/messages')
      .set(authHeader(parent1Token))
      .send({ conversationId: conversation1Id, text: longText });
    expect(longMsgRes.statusCode).toBe(201);

    for (let i = 0; i < 24; i += 1) {
      const token = i % 2 === 0 ? parent1Token : therapistToken;
      const sendRes = await request(app)
        .post('/api/messaging/messages')
        .set(authHeader(token))
        .send({ conversationId: conversation1Id, text: `bulk message ${i}` });
      expect(sendRes.statusCode).toBe(201);
    }

    const listRes = await request(app)
      .get(`/api/messaging/messages/${conversation1Id}`)
      .set(authHeader(parent1Token));
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data.length).toBe(25);
    expect(listRes.body.data[0].text.length).toBe(5000);

    const page1Res = await request(app)
      .get(`/api/messaging/messages/${conversation1Id}?page=1&limit=10`)
      .set(authHeader(parent1Token));
    expect(page1Res.statusCode).toBe(200);
    expect(page1Res.body.data).toHaveLength(10);
    expect(page1Res.body.pagination.total).toBe(25);
    expect(page1Res.body.pagination.hasMore).toBe(true);

    const page3Res = await request(app)
      .get(`/api/messaging/messages/${conversation1Id}?page=3&limit=10`)
      .set(authHeader(parent1Token));
    expect(page3Res.statusCode).toBe(200);
    expect(page3Res.body.data).toHaveLength(5);
    expect(page3Res.body.pagination.hasMore).toBe(false);

    const badPaginationRes = await request(app)
      .get(`/api/messaging/messages/${conversation1Id}?page=0&limit=10`)
      .set(authHeader(parent1Token));
    expect(badPaginationRes.statusCode).toBe(400);

    const inbox1Res = await request(app)
      .get('/api/messaging/conversations')
      .set(authHeader(parent1Token));
    expect(inbox1Res.statusCode).toBe(200);
    expect(inbox1Res.body.data.length).toBe(1);
    expect(String(inbox1Res.body.data[0].caseId)).toBe(case1Id);

    const inboxPagedRes = await request(app)
      .get('/api/messaging/conversations?page=1&limit=1')
      .set(authHeader(therapistToken));
    expect(inboxPagedRes.statusCode).toBe(200);
    expect(inboxPagedRes.body.data).toHaveLength(1);
    expect(inboxPagedRes.body.pagination.total).toBeGreaterThanOrEqual(2);

    const crossCaseRes = await request(app)
      .get(`/api/messaging/messages/${conversation1Id}`)
      .set(authHeader(parent2Token));
    expect(crossCaseRes.statusCode).toBe(403);
  });
});