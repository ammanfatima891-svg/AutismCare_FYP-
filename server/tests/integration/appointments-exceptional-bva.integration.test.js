const request = require('supertest');

jest.mock('../../src/utils/email', () => jest.fn().mockResolvedValue(true));

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { ChildCase } = require('../../src/models/ChildCase');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Appointments Exceptional and BVA Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    parentA: `parent.a.appt.${suffix}@test.com`,
    parentB: `parent.b.appt.${suffix}@test.com`,
    clinician: `clinician.appt.${suffix}@test.com`,
    therapist: `therapist.appt.${suffix}@test.com`,
  };

  let parentAToken;
  let parentBToken;
  let clinicianToken;
  let therapistToken;
  let clinicianId;
  let therapistId;
  let childAId;
  let caseId;
  let appointmentId;

  const futureDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'A',
      email: emails.parentA,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'B',
      email: emails.parentB,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Appt',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `APC-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Appt',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `APT-${suffix}`,
    });

    await activateUser(emails.parentA);
    await activateUser(emails.parentB);
    await activateUser(emails.clinician, { approvalStatus: 'active' });
    await activateUser(emails.therapist, { approvalStatus: 'active' });

    const pA = await loginUser(app, emails.parentA, password);
    const pB = await loginUser(app, emails.parentB, password);
    const c = await loginUser(app, emails.clinician, password);
    const t = await loginUser(app, emails.therapist, password);

    expect(pA.statusCode).toBe(200);
    expect(pB.statusCode).toBe(200);
    expect(c.statusCode).toBe(200);
    expect(t.statusCode).toBe(200);

    parentAToken = pA.body.token;
    parentBToken = pB.body.token;
    clinicianToken = c.body.token;
    therapistToken = t.body.token;

    const clinician = await User.findOne({ email: emails.clinician }).lean();
    const therapist = await User.findOne({ email: emails.therapist }).lean();
    clinicianId = String(clinician._id);
    therapistId = String(therapist._id);

    const childRes = await request(app)
      .post('/api/child')
      .set(authHeader(parentAToken))
      .send({
        firstName: 'Child',
        lastName: 'Appt',
        dateOfBirth: '2020-01-01',
        gender: 'male',
        emergencyContact: 'Parent A',
        emergencyPhone: '03001230000',
      });

    expect(childRes.statusCode).toBe(201);
    childAId = String(childRes.body.data.id || childRes.body.data._id);

    // Child creation should have created a NEW case; bump to REVIEW for appointment booking tests.
    const existingCase = await ChildCase.findOne({ parentId: (await User.findOne({ email: emails.parentA }))._id, childId: childAId })
      .select('_id status')
      .lean();
    if (!existingCase) throw new Error('Expected ChildCase to exist for created child');
    caseId = String(existingCase._id);
    await ChildCase.findByIdAndUpdate(caseId, { $set: { status: 'REVIEW' } });
  });

  afterAll(async () => {
    await User.deleteMany({ email: new RegExp(`\\.appt\\.${suffix}@test\\.com$`) });
    await disconnectTestDb();
  });

  test('Exceptional: create appointment fails on missing required fields', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set(authHeader(parentAToken))
      .send({ childId: childAId, caseId });

    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/missing required fields/i);
  });

  test('Exceptional: create appointment fails with invalid child id', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set(authHeader(parentAToken))
      .send({
        caseId,
        childId: 'bad-child-id',
        appointmentType: 'DIAGNOSTIC',
        professionalId: clinicianId,
        preferredDate: futureDate,
        preferredTime: '10:00',
        reason: 'Need assessment',
        mode: 'IN_PERSON',
      });

    expect(res.statusCode).toBe(400);
  });

  test('Exceptional: type-role mismatch is rejected', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set(authHeader(parentAToken))
      .send({
        caseId,
        childId: childAId,
        appointmentType: 'DIAGNOSTIC',
        professionalId: therapistId,
        preferredDate: futureDate,
        preferredTime: '10:00',
        reason: 'Need diagnostic visit',
        mode: 'IN_PERSON',
      });

    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/must be a clinician/i);
  });

  test('Exceptional: past preferred date is rejected', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);

    const res = await request(app)
      .post('/api/appointments')
      .set(authHeader(parentAToken))
      .send({
        caseId,
        childId: childAId,
        appointmentType: 'DIAGNOSTIC',
        professionalId: clinicianId,
        preferredDate: past.toISOString().slice(0, 10),
        preferredTime: '10:00',
        reason: 'Past date check',
        mode: 'ONLINE',
      });

    expect(res.statusCode).toBe(400);
    expect(String(res.body.message || '')).toMatch(/must be in the future/i);
  });

  test('BVA: reason length 2000 succeeds', async () => {
    const reason2000 = 'a'.repeat(2000);
    const res = await request(app)
      .post('/api/appointments')
      .set(authHeader(parentAToken))
      .send({
        caseId,
        childId: childAId,
        appointmentType: 'DIAGNOSTIC',
        professionalId: clinicianId,
        preferredDate: futureDate,
        preferredTime: '11:00',
        reason: reason2000,
        mode: 'ONLINE',
      });

    expect(res.statusCode).toBe(201);
    appointmentId = String(res.body.data._id);
    expect(appointmentId).toBeTruthy();
  });

  test('Exceptional: double booking conflict returns 409', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set(authHeader(parentAToken))
      .send({
        caseId,
        childId: childAId,
        appointmentType: 'DIAGNOSTIC',
        professionalId: clinicianId,
        preferredDate: futureDate,
        preferredTime: '11:00',
        reason: 'Try same slot again',
        mode: 'ONLINE',
      });

    expect(res.statusCode).toBe(409);
  });

  test('Exceptional: non-owner professional cannot approve appointment', async () => {
    const res = await request(app)
      .put(`/api/appointments/${appointmentId}/approve`)
      .set(authHeader(therapistToken))
      .send({ finalDate: futureDate, finalTime: '11:00' });

    expect(res.statusCode).toBe(403);
  });

  test('Flow: owner professional can approve appointment', async () => {
    const res = await request(app)
      .put(`/api/appointments/${appointmentId}/approve`)
      .set(authHeader(clinicianToken))
      .send({ finalDate: futureDate, finalTime: '11:30' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
  });

  test('Flow/BVA: parent can cancel approved appointment once', async () => {
    const res = await request(app)
      .put(`/api/appointments/${appointmentId}/cancel`)
      .set(authHeader(parentAToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  test('Exceptional: cannot cancel already cancelled appointment', async () => {
    const res = await request(app)
      .put(`/api/appointments/${appointmentId}/cancel`)
      .set(authHeader(parentAToken));

    expect(res.statusCode).toBe(400);
  });

  test('Exceptional: another parent cannot cancel appointment they do not own', async () => {
    const secondDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 8);
      return d.toISOString().slice(0, 10);
    })();

    const created = await request(app)
      .post('/api/appointments')
      .set(authHeader(parentAToken))
      .send({
        caseId,
        childId: childAId,
        appointmentType: 'DIAGNOSTIC',
        professionalId: clinicianId,
        preferredDate: secondDate,
        preferredTime: '15:00',
        reason: 'Ownership test',
        mode: 'IN_PERSON',
      });

    expect(created.statusCode).toBe(201);
    const apptId = String(created.body.data._id);

    const cancelByOtherParent = await request(app)
      .put(`/api/appointments/${apptId}/cancel`)
      .set(authHeader(parentBToken));

    expect(cancelByOtherParent.statusCode).toBe(403);
  });
});
