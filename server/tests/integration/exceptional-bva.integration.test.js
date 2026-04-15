const mongoose = require('mongoose');
const request = require('supertest');

jest.mock('../../src/utils/email', () => jest.fn().mockResolvedValue(true));

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Exceptional and BVA Integration', () => {
  const suffix = Date.now();
  const validPassword = 'Password123!';
  const emails = {
    parent: `parent.bva.${suffix}@test.com`,
    therapist: `therapist.bva.${suffix}@test.com`,
    weak: `weakpass.bva.${suffix}@test.com`,
    boundary8: `boundary8.bva.${suffix}@test.com`,
  };

  let parentToken;
  let therapistToken;
  let createdChildId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'BVA',
      email: emails.parent,
      password: validPassword,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'BVA',
      email: emails.therapist,
      password: validPassword,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `TBVA-${suffix}`,
    });

    await activateUser(emails.parent);
    await activateUser(emails.therapist, { approvalStatus: 'active' });

    const p = await loginUser(app, emails.parent, validPassword);
    const t = await loginUser(app, emails.therapist, validPassword);

    expect(p.statusCode).toBe(200);
    expect(t.statusCode).toBe(200);

    parentToken = p.body.token;
    therapistToken = t.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: new RegExp(`\\.bva\\.${suffix}@test\\.com$`) });
    await disconnectTestDb();
  });

  test('BVA: registration fails with 7-char password', async () => {
    const res = await registerUser(app, {
      firstName: 'Weak',
      lastName: 'Pass',
      email: emails.weak,
      password: 'Pass123',
      role: 'parent',
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).not.toBe(201);
  });

  test('BVA: registration succeeds with 8-char password', async () => {
    const res = await registerUser(app, {
      firstName: 'Edge',
      lastName: 'Eight',
      email: emails.boundary8,
      password: 'Abc12345',
      role: 'parent',
    });

    expect(res.statusCode).toBe(201);
  });

  test('Exceptional: login rejects missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: emails.parent });

    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/provide email and password/i);
  });

  test('Exceptional: malformed token rejected by protect middleware', async () => {
    const res = await request(app)
      .get('/api/child')
      .set({ Authorization: 'Bearer not-a-jwt' });

    expect(res.statusCode).toBe(401);
  });

  test('Exceptional: child create fails when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/child')
      .set(authHeader(parentToken))
      .send({ firstName: 'OnlyName' });

    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/missing required fields/i);
  });

  test('Exceptional: child create fails for invalid gender enum', async () => {
    const res = await request(app)
      .post('/api/child')
      .set(authHeader(parentToken))
      .send({
        firstName: 'Child',
        lastName: 'Enum',
        dateOfBirth: '2020-01-01',
        gender: 'invalid-gender',
        emergencyContact: 'Parent',
        emergencyPhone: '03001234567',
      });

    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/invalid gender/i);
  });

  test('Boundary/flow: child create succeeds with minimum valid payload', async () => {
    const res = await request(app)
      .post('/api/child')
      .set(authHeader(parentToken))
      .send({
        firstName: 'Child',
        lastName: 'Valid',
        dateOfBirth: '2020-02-02',
        gender: 'male',
        emergencyContact: 'Parent BVA',
        emergencyPhone: '03001112222',
      });

    expect(res.statusCode).toBe(201);
    createdChildId = String(res.body.data.id || res.body.data._id);
    expect(createdChildId).toBeTruthy();
  });

  test('Exceptional: update unknown child id returns 404', async () => {
    const ghostId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/api/child/${ghostId}`)
      .set(authHeader(parentToken))
      .send({ firstName: 'Updated' });

    expect(res.statusCode).toBe(404);
  });

  test('Exceptional: delete unknown child id returns 404', async () => {
    const ghostId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/api/child/${ghostId}`)
      .set(authHeader(parentToken));

    expect(res.statusCode).toBe(404);
  });

  test('Exceptional: schedule create rejects invalid caseId', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set(authHeader(therapistToken))
      .send({
        caseId: 'bad-case-id',
        days: ['Mon'],
        time: '10:00',
        duration: 45,
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      });

    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/valid caseid/i);
  });

  test('Exceptional: session slot patch rejects invalid slot id', async () => {
    const res = await request(app)
      .patch('/api/sessionslots/not-an-id')
      .set(authHeader(therapistToken))
      .send({ status: 'completed' });

    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/invalid slot id/i);
  });

  test('BVA: session slot patch rejects status at forbidden boundary (scheduled)', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/sessionslots/${fakeId}`)
      .set(authHeader(therapistToken))
      .send({ status: 'scheduled' });

    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/completed, missed, rescheduled/i);
  });
});
