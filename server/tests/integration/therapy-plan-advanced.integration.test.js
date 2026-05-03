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

describe('Therapy Plan Advanced Lifecycle Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    parent: `parent.therapy-plan.${suffix}@test.com`,
    therapist: `therapist.therapy-plan.${suffix}@test.com`,
  };

  let parentToken;
  let therapistToken;
  let parentId;
  let therapistId;
  let sourceCaseId;
  let targetCaseId;
  let targetChildId;
  let duplicatedPlanId;

  const basePlanPayload = {
    status: 'final',
    domains: ['Speech', 'OT'],
    longTermGoal: {
      title: 'Improve functional communication',
      description: 'Child uses words and gestures to express needs',
      timeline: '12 weeks',
    },
    shortTermGoals: [
      {
        title: 'Use 2-word requests',
        measurableCriteria: 'Uses 2-word requests in 4/5 trials',
        domain: 'Speech',
        status: 'Active',
      },
      {
        title: 'Maintain seated attention',
        measurableCriteria: 'Stays seated for 5 minutes',
        domain: 'OT',
        status: 'Active',
      },
    ],
    activities: [
      {
        title: 'Mirror Practice',
        description: 'Imitation game',
        linkedGoal: 'Use 2-word requests',
      },
    ],
  };

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Plan',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Plan',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `TPLAN-${suffix}`,
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

    parentDoc.children.push(
      {
        firstName: 'Source',
        lastName: 'Child',
        dateOfBirth: new Date('2020-02-10'),
        gender: 'male',
        emergencyContact: 'Parent Plan',
        emergencyPhone: '03001234567',
      },
      {
        firstName: 'Target',
        lastName: 'Child',
        dateOfBirth: new Date('2020-06-15'),
        gender: 'female',
        emergencyContact: 'Parent Plan',
        emergencyPhone: '03007654321',
      }
    );
    await parentDoc.save({ validateModifiedOnly: true });

    const sourceChildId = String(parentDoc.children[0]._id);
    targetChildId = String(parentDoc.children[1]._id);

    const sourceCase = await ChildCase.create({
      childId: sourceChildId,
      parentId,
      clinicianId: new mongoose.Types.ObjectId(),
      status: 'THERAPY',
    });
    const targetCase = await ChildCase.create({
      childId: targetChildId,
      parentId,
      clinicianId: new mongoose.Types.ObjectId(),
      status: 'THERAPY',
    });

    sourceCaseId = String(sourceCase._id);
    targetCaseId = String(targetCase._id);

    await TherapyCase.create({
      caseId: sourceCaseId,
      therapistId,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });

    await TherapyCase.create({
      caseId: targetCaseId,
      therapistId,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
  });

  afterAll(async () => {
    await TherapyPlan.deleteMany({ caseId: { $in: [sourceCaseId, targetCaseId] } });
    await TherapyCase.deleteMany({ caseId: { $in: [sourceCaseId, targetCaseId] } });
    await ChildCase.deleteMany({ _id: { $in: [sourceCaseId, targetCaseId] } });
    await User.deleteMany({ email: { $in: [emails.parent, emails.therapist] } });
    await disconnectTestDb();
  });

  test('creates a final plan, duplicates it, assigns it, and blocks invalid final updates', async () => {
    const createRes = await request(app)
      .post('/api/therapy-plan')
      .set(authHeader(therapistToken))
      .send({
        caseId: sourceCaseId,
        ...basePlanPayload,
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.status).toBe('final');

    const sourcePlanId = String(createRes.body.data._id);

    const duplicateRes = await request(app)
      .post(`/api/therapy-plan/${sourcePlanId}/duplicate`)
      .set(authHeader(therapistToken))
      .send({ targetCaseId: targetCaseId });

    expect(duplicateRes.statusCode).toBe(201);
    expect(duplicateRes.body.success).toBe(true);
    duplicatedPlanId = String(duplicateRes.body.data._id);
    expect(duplicateRes.body.data.status).toBe('draft');

    const duplicateAgainRes = await request(app)
      .post(`/api/therapy-plan/${sourcePlanId}/duplicate`)
      .set(authHeader(therapistToken))
      .send({ targetCaseId: targetCaseId });

    expect(duplicateAgainRes.statusCode).toBe(409);

    const assignContextRes = await request(app)
      .get(`/api/therapy-plan/case/${targetCaseId}/assign-context`)
      .set(authHeader(therapistToken));

    expect(assignContextRes.statusCode).toBe(200);
    expect(assignContextRes.body.data.caseId).toBe(targetCaseId);
    expect(assignContextRes.body.data.children.some((child) => String(child.childId) === targetChildId)).toBe(true);

    const assignRes = await request(app)
      .post('/api/therapy-plan/assign')
      .set(authHeader(therapistToken))
      .send({
        planId: duplicatedPlanId,
        childId: targetChildId,
        caseId: targetCaseId,
      });

    expect(assignRes.statusCode).toBe(200);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.therapyPlan.status).toBe('Active');

    const planAfterAssign = await TherapyPlan.findById(duplicatedPlanId).lean();
    expect(String(planAfterAssign.assignedChildId)).toBe(targetChildId);

    const invalidFinalizeRes = await request(app)
      .patch(`/api/therapy-plan/${duplicatedPlanId}`)
      .set(authHeader(therapistToken))
      .send({
        status: 'final',
        shortTermGoals: [],
      });

    expect(invalidFinalizeRes.statusCode).toBe(400);
    expect(invalidFinalizeRes.body.message).toMatch(/short-term goal/i);

    const validFinalizeRes = await request(app)
      .patch(`/api/therapy-plan/${duplicatedPlanId}`)
      .set(authHeader(therapistToken))
      .send({
        status: 'final',
        shortTermGoals: basePlanPayload.shortTermGoals,
      });

    expect(validFinalizeRes.statusCode).toBe(200);
    expect(validFinalizeRes.body.data.status).toBe('final');
  });

  test('blocks parent access to therapist therapy plan routes', async () => {
    const res = await request(app)
      .get('/api/therapy-plan')
      .set(authHeader(parentToken));

    expect(res.statusCode).toBe(403);
  });
});