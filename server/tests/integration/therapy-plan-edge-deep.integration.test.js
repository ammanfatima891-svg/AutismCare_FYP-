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
const TherapyPlan = require('../../src/models/TherapyPlan');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Therapy Plan Deep Edge Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.planedge.${suffix}@test.com`,
    therapist1: `therapist1.planedge.${suffix}@test.com`,
    therapist2: `therapist2.planedge.${suffix}@test.com`,
  };

  let therapist1Token;
  let therapist2Token;
  let caseAId;
  let caseBId;
  let caseCId;
  let childAId;
  let childCId;
  let planId;
  let therapist1Id;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'PlanEdge',
      email: emails.parent,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'One',
      email: emails.therapist1,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `PLAN-EDGE-1-${suffix}`,
    });
    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Two',
      email: emails.therapist2,
      password,
      role: 'therapist',
      specialization: 'OT',
      licenseNumber: `PLAN-EDGE-2-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.therapist1, { approvalStatus: 'active' });
    await activateUser(emails.therapist2, { approvalStatus: 'active' });

    const t1Login = await loginUser(app, emails.therapist1, password);
    const t2Login = await loginUser(app, emails.therapist2, password);
    expect(t1Login.statusCode).toBe(200);
    expect(t2Login.statusCode).toBe(200);
    therapist1Token = t1Login.body.token;
    therapist2Token = t2Login.body.token;

    const parent = await User.findOne({ email: emails.parent });
    const therapist1 = await User.findOne({ email: emails.therapist1 }).lean();
    therapist1Id = String(therapist1._id);

    parent.children.push(
      {
        firstName: 'Case',
        lastName: 'A',
        dateOfBirth: new Date('2020-06-01'),
        gender: 'male',
        emergencyContact: 'Parent PlanEdge',
        emergencyPhone: '03001234567',
      },
      {
        firstName: 'Case',
        lastName: 'B',
        dateOfBirth: new Date('2020-07-01'),
        gender: 'female',
        emergencyContact: 'Parent PlanEdge',
        emergencyPhone: '03001234567',
      },
      {
        firstName: 'Case',
        lastName: 'C',
        dateOfBirth: new Date('2020-08-01'),
        gender: 'female',
        emergencyContact: 'Parent PlanEdge',
        emergencyPhone: '03001234567',
      }
    );
    await parent.save({ validateModifiedOnly: true });

    childAId = String(parent.children[0]._id);
    const childBId = String(parent.children[1]._id);
    childCId = String(parent.children[2]._id);

    const caseA = await ChildCase.create({
      childId: childAId,
      parentId: parent._id,
      clinicianId: new mongoose.Types.ObjectId(),
    });
    const caseB = await ChildCase.create({
      childId: childBId,
      parentId: parent._id,
      clinicianId: new mongoose.Types.ObjectId(),
    });
    const caseC = await ChildCase.create({
      childId: childCId,
      parentId: parent._id,
      clinicianId: new mongoose.Types.ObjectId(),
    });
    caseAId = String(caseA._id);
    caseBId = String(caseB._id);
    caseCId = String(caseC._id);

    await TherapyCase.create({
      caseId: caseAId,
      therapistId: therapist1Id,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
    await TherapyCase.create({
      caseId: caseCId,
      therapistId: therapist1Id,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
  });

  afterAll(async () => {
    await TherapyPlan.deleteMany({ caseId: { $in: [caseAId, caseBId, caseCId] } });
    await TherapyCase.deleteMany({ caseId: { $in: [caseAId, caseBId, caseCId] } });
    await ChildCase.deleteMany({ _id: { $in: [caseAId, caseBId, caseCId] } });
    await User.deleteMany({ email: { $in: [emails.parent, emails.therapist1, emails.therapist2] } });
    await disconnectTestDb();
  });

  test('enforces deeper plan lifecycle and ownership edge cases', async () => {
    const inactiveCaseCreateRes = await request(app)
      .post('/api/therapy-plan')
      .set(authHeader(therapist1Token))
      .send({
        caseId: caseBId,
        status: 'draft',
      });
    expect(inactiveCaseCreateRes.statusCode).toBe(403);

    const invalidFinalCreateRes = await request(app)
      .post('/api/therapy-plan')
      .set(authHeader(therapist1Token))
      .send({
        caseId: caseAId,
        status: 'final',
        domains: ['Speech'],
        longTermGoal: { title: '' },
        shortTermGoals: [
          {
            title: 'Goal one',
            measurableCriteria: '4/5 trials',
            domain: 'Speech',
          },
        ],
      });
    expect(invalidFinalCreateRes.statusCode).toBe(400);

    const draftCreateRes = await request(app)
      .post('/api/therapy-plan')
      .set(authHeader(therapist1Token))
      .send({
        caseId: caseAId,
        status: 'draft',
        domains: ['Speech'],
        longTermGoal: { title: 'Improve communication' },
        shortTermGoals: [
          {
            title: 'Use 2-word requests',
            measurableCriteria: '4/5 trials',
            domain: 'Speech',
          },
        ],
      });
    expect(draftCreateRes.statusCode).toBe(201);
    planId = String(draftCreateRes.body.data._id);

    const assignMismatchCaseRes = await request(app)
      .post('/api/therapy-plan/assign')
      .set(authHeader(therapist1Token))
      .send({
        planId,
        childId: childCId,
        caseId: caseCId,
      });
    expect(assignMismatchCaseRes.statusCode).toBe(400);

    const firstAssignRes = await request(app)
      .post('/api/therapy-plan/assign')
      .set(authHeader(therapist1Token))
      .send({
        planId,
        childId: childAId,
        caseId: caseAId,
      });
    expect(firstAssignRes.statusCode).toBe(200);

    const duplicateAssignRes = await request(app)
      .post('/api/therapy-plan/assign')
      .set(authHeader(therapist1Token))
      .send({
        planId,
        childId: childAId,
        caseId: caseAId,
      });
    expect(duplicateAssignRes.statusCode).toBe(409);

    const duplicateChildMismatchRes = await request(app)
      .post('/api/therapy-plan/duplicate')
      .set(authHeader(therapist1Token))
      .send({
        originalPlanId: planId,
        caseId: caseCId,
        childId: childAId,
      });
    expect(duplicateChildMismatchRes.statusCode).toBe(400);

    const invalidFinalizePatchRes = await request(app)
      .patch(`/api/therapy-plan/${planId}`)
      .set(authHeader(therapist1Token))
      .send({
        status: 'final',
        domains: [],
      });
    expect(invalidFinalizePatchRes.statusCode).toBe(400);

    const otherTherapistPatchRes = await request(app)
      .patch(`/api/therapy-plan/${planId}`)
      .set(authHeader(therapist2Token))
      .send({ status: 'draft' });
    expect(otherTherapistPatchRes.statusCode).toBe(404);
  });
});