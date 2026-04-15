const mongoose = require('mongoose');
const request = require('supertest');

jest.mock('../../src/utils/email', () => jest.fn().mockResolvedValue(true));

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { ChildCase } = require('../../src/models/ChildCase');
const TherapyCase = require('../../src/models/TherapyCase');
const TherapyPlan = require('../../src/models/TherapyPlan');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Therapy plan clinician approval', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    parent: `parent.tpappr.${suffix}@test.com`,
    therapist: `therapist.tpappr.${suffix}@test.com`,
    clinician: `clinician.tpappr.${suffix}@test.com`,
  };

  let parentToken;
  let therapistToken;
  let clinicianToken;
  let parentId;
  let therapistId;
  let clinicianId;
  let childId;
  let caseId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Appr',
      email: emails.parent,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Appr',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `TPAPR-T-${suffix}`,
    });
    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Appr',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Developmental Pediatrician',
      licenseNumber: `TPAPR-C-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.therapist, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });

    parentToken = (await loginUser(app, emails.parent, password)).body.token;
    therapistToken = (await loginUser(app, emails.therapist, password)).body.token;
    clinicianToken = (await loginUser(app, emails.clinician, password)).body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    const therapistDoc = await User.findOne({ email: emails.therapist }).lean();
    const clinicianDoc = await User.findOne({ email: emails.clinician }).lean();

    parentId = String(parentDoc._id);
    therapistId = String(therapistDoc._id);
    clinicianId = String(clinicianDoc._id);

    parentDoc.children.push({
      firstName: 'Appr',
      lastName: 'Child',
      dateOfBirth: new Date('2020-01-15'),
      gender: 'male',
      emergencyContact: 'Parent',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });
    childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

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
  });

  afterAll(async () => {
    if (caseId) {
      await TherapyPlan.deleteMany({ caseId });
      await TherapyCase.deleteMany({ caseId });
      await ChildCase.deleteMany({ _id: caseId });
    }
    await User.deleteMany({ email: new RegExp(`\\.tpappr\\.${suffix}@test\\.com$`) });
    await disconnectTestDb();
  });

  test('therapist submits plan for approval and clinician approves', async () => {
    const planPayload = {
      caseId,
      status: 'final',
      domains: ['Speech'],
      longTermGoal: {
        title: 'LT goal',
        description: 'd',
        timeline: '12w',
      },
      shortTermGoals: [
        {
          title: 'ST goal',
          measurableCriteria: 'Criteria text here',
          reviewDate: null,
          status: 'Active',
          domain: 'Speech',
        },
      ],
      activities: [],
    };

    const createRes = await request(app)
      .post('/api/therapy-plan')
      .set(authHeader(therapistToken))
      .send(planPayload);

    expect(createRes.statusCode).toBe(201);
    const planId = String(createRes.body.data._id);

    const submitRes = await request(app)
      .post(`/api/therapy-plan/submit-for-approval/${planId}`)
      .set(authHeader(therapistToken));

    expect(submitRes.statusCode).toBe(200);
    expect(submitRes.body.data.approval.status).toBe('pending');

    const approveRes = await request(app)
      .patch(`/api/clinician/therapy-plans/${planId}/approve`)
      .set(authHeader(clinicianToken));

    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.body.data.approval.status).toBe('approved');
    expect(String(approveRes.body.data.approval.approvedBy)).toBe(clinicianId);
  });
});
