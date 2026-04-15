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
const { TherapySchedule } = require('../../src/models/TherapySchedule');
const { SessionSlot } = require('../../src/models/SessionSlot');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Schedule and Session Slot Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    parent: `parent.schedule.${suffix}@test.com`,
    therapist: `therapist.schedule.${suffix}@test.com`,
  };

  let parentToken;
  let therapistToken;
  let parentId;
  let therapistId;
  let caseId;
  let childId;
  let createdScheduleId;

  const dayMs = 24 * 60 * 60 * 1000;

  function futureDate(daysAhead) {
    const date = new Date(Date.now() + daysAhead * dayMs);
    date.setHours(12, 0, 0, 0);
    return date.toISOString();
  }

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Schedule',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Schedule',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `SCH-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.therapist, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    const therapistLogin = await loginUser(app, emails.therapist, password);

    expect(parentLogin.statusCode).toBe(200);
    expect(therapistLogin.statusCode).toBe(200);

    parentToken = parentLogin.body.token;
    therapistToken = therapistLogin.body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    const therapistDoc = await User.findOne({ email: emails.therapist });
    parentId = String(parentDoc._id);
    therapistId = String(therapistDoc._id);

    parentDoc.children.push({
      firstName: 'Schedule',
      lastName: 'Child',
      dateOfBirth: new Date('2020-03-18'),
      gender: 'female',
      emergencyContact: 'Parent Schedule',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

    const createdCase = await ChildCase.create({
      childId,
      parentId,
      clinicianId: new mongoose.Types.ObjectId(),
    });
    caseId = String(createdCase._id);

    await TherapyCase.create({
      caseId,
      therapistId,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
  });

  afterAll(async () => {
    if (caseId) {
      await SessionSlot.deleteMany({ caseId });
      await TherapySchedule.deleteMany({ caseId });
      await TherapyCase.deleteMany({ caseId });
      await ChildCase.deleteMany({ _id: caseId });
    }
    await User.deleteMany({ email: { $in: [emails.parent, emails.therapist] } });
    await disconnectTestDb();
  });

  test('creates a schedule and manages slot status transitions', async () => {
    const scheduleRes = await request(app)
      .post('/api/schedules')
      .set(authHeader(therapistToken))
      .send({
        caseId,
        days: ['Mon', 'Wed', 'Fri'],
        time: '16:00',
        duration: 45,
        startDate: futureDate(2),
        endDate: futureDate(23),
      });

    expect(scheduleRes.statusCode).toBe(201);
    expect(scheduleRes.body.success).toBe(true);
    expect(scheduleRes.body.slotsCreated).toBeGreaterThan(0);

    createdScheduleId = String(scheduleRes.body.data._id);

    const duplicateScheduleRes = await request(app)
      .post('/api/schedules')
      .set(authHeader(therapistToken))
      .send({
        caseId,
        days: ['Mon', 'Wed', 'Fri'],
        time: '16:00',
        duration: 45,
        startDate: futureDate(2),
        endDate: futureDate(23),
      });

    expect(duplicateScheduleRes.statusCode).toBe(409);

    const schedulesRes = await request(app)
      .get(`/api/schedules/${caseId}`)
      .set(authHeader(therapistToken));

    expect(schedulesRes.statusCode).toBe(200);
    expect(schedulesRes.body.data.length).toBe(1);

    const slotsRes = await request(app)
      .get(`/api/sessionslots/${caseId}`)
      .set(authHeader(parentToken));

    expect(slotsRes.statusCode).toBe(200);
    expect(slotsRes.body.data.length).toBe(scheduleRes.body.slotsCreated);

    const slots = slotsRes.body.data;
    expect(slots.length).toBeGreaterThanOrEqual(3);

    const completedRes = await request(app)
      .patch(`/api/sessionslots/${slots[0]._id}`)
      .set(authHeader(therapistToken))
      .send({ status: 'completed' });

    expect(completedRes.statusCode).toBe(200);
    expect(completedRes.body.data.status).toBe('completed');

    const missedRes = await request(app)
      .patch(`/api/sessionslots/${slots[1]._id}`)
      .set(authHeader(therapistToken))
      .send({ status: 'missed' });

    expect(missedRes.statusCode).toBe(200);
    expect(missedRes.body.data.status).toBe('missed');

    const rescheduledRes = await request(app)
      .patch(`/api/sessionslots/${slots[2]._id}`)
      .set(authHeader(therapistToken))
      .send({ status: 'rescheduled' });

    expect(rescheduledRes.statusCode).toBe(200);
    expect(rescheduledRes.body.data.status).toBe('rescheduled');

    const invalidStatusRes = await request(app)
      .patch(`/api/sessionslots/${slots[0]._id}`)
      .set(authHeader(therapistToken))
      .send({ status: 'scheduled' });

    expect(invalidStatusRes.statusCode).toBe(400);

    const parentBlockedRes = await request(app)
      .patch(`/api/sessionslots/${slots[0]._id}`)
      .set(authHeader(parentToken))
      .send({ status: 'completed' });

    expect(parentBlockedRes.statusCode).toBe(403);

    const bundleRes = await request(app)
      .get(`/api/therapist/case/${caseId}/schedule-bundle`)
      .set(authHeader(therapistToken));

    expect(bundleRes.statusCode).toBe(200);
    expect(bundleRes.body.data.schedules.length).toBe(1);
    expect(bundleRes.body.data.slots.length).toBe(scheduleRes.body.slotsCreated);
  });

  test('blocks parent from therapist-only schedule listing', async () => {
    const res = await request(app)
      .get(`/api/schedules/${caseId}`)
      .set(authHeader(parentToken));

    expect(res.statusCode).toBe(403);
  });
});