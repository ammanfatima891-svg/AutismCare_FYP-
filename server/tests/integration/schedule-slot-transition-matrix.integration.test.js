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
const { SessionSlot } = require('../../src/models/SessionSlot');
const { TherapySchedule } = require('../../src/models/TherapySchedule');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Session Slot Transition Matrix Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.slotmatrix.${suffix}@test.com`,
    clinician: `clinician.slotmatrix.${suffix}@test.com`,
    therapistOwner: `therapist.owner.slotmatrix.${suffix}@test.com`,
    therapistOther: `therapist.other.slotmatrix.${suffix}@test.com`,
  };

  let parentToken;
  let clinicianToken;
  let therapistOwnerToken;
  let therapistOtherToken;
  let caseId;

  function isoDate(daysAhead) {
    const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    date.setHours(12, 0, 0, 0);
    return date.toISOString();
  }

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'SlotMatrix',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'SlotMatrix',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `CSM-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Owner',
      lastName: 'Therapist',
      email: emails.therapistOwner,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `TSM-O-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Other',
      lastName: 'Therapist',
      email: emails.therapistOther,
      password,
      role: 'therapist',
      specialization: 'Occupational Therapist',
      licenseNumber: `TSM-X-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });
    await activateUser(emails.therapistOwner, { approvalStatus: 'active' });
    await activateUser(emails.therapistOther, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    const clinicianLogin = await loginUser(app, emails.clinician, password);
    const ownerLogin = await loginUser(app, emails.therapistOwner, password);
    const otherLogin = await loginUser(app, emails.therapistOther, password);

    expect(parentLogin.statusCode).toBe(200);
    expect(clinicianLogin.statusCode).toBe(200);
    expect(ownerLogin.statusCode).toBe(200);
    expect(otherLogin.statusCode).toBe(200);

    parentToken = parentLogin.body.token;
    clinicianToken = clinicianLogin.body.token;
    therapistOwnerToken = ownerLogin.body.token;
    therapistOtherToken = otherLogin.body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    const clinicianDoc = await User.findOne({ email: emails.clinician }).lean();
    const ownerDoc = await User.findOne({ email: emails.therapistOwner }).lean();

    parentDoc.children.push({
      firstName: 'Slot',
      lastName: 'Child',
      dateOfBirth: new Date('2020-01-12'),
      gender: 'male',
      emergencyContact: 'Parent SlotMatrix',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    const childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

    const createdCase = await ChildCase.create({
      childId,
      parentId: parentDoc._id,
      clinicianId: clinicianDoc._id,
    });
    caseId = String(createdCase._id);

    await TherapyCase.create({
      caseId,
      therapistId: ownerDoc._id,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
  });

  afterAll(async () => {
    await SessionSlot.deleteMany({ caseId });
    await TherapySchedule.deleteMany({ caseId });
    await TherapyCase.deleteMany({ caseId });
    await ChildCase.deleteMany({ _id: caseId });
    await User.deleteMany({ email: { $in: Object.values(emails) } });
    await disconnectTestDb();
  });

  test('covers generation and status transitions across therapist/parent/clinician/non-owner roles', async () => {
    const createScheduleRes = await request(app)
      .post('/api/schedules')
      .set(authHeader(therapistOwnerToken))
      .send({
        caseId,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        time: '09:30',
        duration: 45,
        startDate: isoDate(2),
        endDate: isoDate(31),
      });

    expect(createScheduleRes.statusCode).toBe(201);
    expect(createScheduleRes.body.slotsCreated).toBeGreaterThan(5);

    const ownerSchedulesRes = await request(app)
      .get(`/api/schedules/${caseId}`)
      .set(authHeader(therapistOwnerToken));
    expect(ownerSchedulesRes.statusCode).toBe(200);
    expect(ownerSchedulesRes.body.data.length).toBe(1);

    const slotsByOwnerRes = await request(app)
      .get(`/api/sessionslots/${caseId}`)
      .set(authHeader(therapistOwnerToken));
    expect(slotsByOwnerRes.statusCode).toBe(200);
    expect(slotsByOwnerRes.body.data.length).toBeGreaterThan(5);

    const slotsByParentRes = await request(app)
      .get(`/api/sessionslots/${caseId}`)
      .set(authHeader(parentToken));
    expect(slotsByParentRes.statusCode).toBe(200);

    const slotsByClinicianRes = await request(app)
      .get(`/api/sessionslots/${caseId}`)
      .set(authHeader(clinicianToken));
    expect(slotsByClinicianRes.statusCode).toBe(200);

    const firstThree = slotsByOwnerRes.body.data.slice(0, 3);
    expect(firstThree).toHaveLength(3);

    const completeRes = await request(app)
      .patch(`/api/sessionslots/${firstThree[0]._id}`)
      .set(authHeader(therapistOwnerToken))
      .send({ status: 'completed' });
    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.body.data.status).toBe('completed');

    const missedRes = await request(app)
      .patch(`/api/sessionslots/${firstThree[1]._id}`)
      .set(authHeader(therapistOwnerToken))
      .send({ status: 'missed' });
    expect(missedRes.statusCode).toBe(200);
    expect(missedRes.body.data.status).toBe('missed');

    const rescheduledRes = await request(app)
      .patch(`/api/sessionslots/${firstThree[2]._id}`)
      .set(authHeader(therapistOwnerToken))
      .send({ status: 'rescheduled' });
    expect(rescheduledRes.statusCode).toBe(200);
    expect(rescheduledRes.body.data.status).toBe('rescheduled');

    const invalidTransitionRes = await request(app)
      .patch(`/api/sessionslots/${firstThree[2]._id}`)
      .set(authHeader(therapistOwnerToken))
      .send({ status: 'scheduled' });
    expect(invalidTransitionRes.statusCode).toBe(400);

    const malformedIdRes = await request(app)
      .patch('/api/sessionslots/not-an-id')
      .set(authHeader(therapistOwnerToken))
      .send({ status: 'completed' });
    expect(malformedIdRes.statusCode).toBe(400);

    const parentPatchDeniedRes = await request(app)
      .patch(`/api/sessionslots/${firstThree[0]._id}`)
      .set(authHeader(parentToken))
      .send({ status: 'completed' });
    expect(parentPatchDeniedRes.statusCode).toBe(403);

    const clinicianPatchDeniedRes = await request(app)
      .patch(`/api/sessionslots/${firstThree[0]._id}`)
      .set(authHeader(clinicianToken))
      .send({ status: 'completed' });
    expect(clinicianPatchDeniedRes.statusCode).toBe(403);

    const nonOwnerScheduleDeniedRes = await request(app)
      .get(`/api/schedules/${caseId}`)
      .set(authHeader(therapistOtherToken));
    expect(nonOwnerScheduleDeniedRes.statusCode).toBe(403);

    const nonOwnerPatchDeniedRes = await request(app)
      .patch(`/api/sessionslots/${firstThree[0]._id}`)
      .set(authHeader(therapistOtherToken))
      .send({ status: 'completed' });
    expect(nonOwnerPatchDeniedRes.statusCode).toBe(403);
  });
});
