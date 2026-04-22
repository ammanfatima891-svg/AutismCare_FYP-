const mongoose = require('mongoose');
const request = require('supertest');

jest.mock('../../src/utils/email', () => jest.fn().mockResolvedValue(true));

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { ChildCase } = require('../../src/models/ChildCase');
const TherapyCase = require('../../src/models/TherapyCase');
const TherapyPlan = require('../../src/models/TherapyPlan');
const { startNewEpisode } = require('../../src/services/therapyEpisodeService');
const SessionLog = require('../../src/models/SessionLog');
const { HomeAssignment } = require('../../src/models/HomeAssignment');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Therapy Plan -> Session -> Home Assignment Chain', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    parent: `parent.chain.${suffix}@test.com`,
    therapist: `therapist.chain.${suffix}@test.com`,
  };

  let parentToken;
  let therapistToken;
  let parentId;
  let therapistId;
  let childId;
  let caseId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Chain',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Chain',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `TCHAIN-${suffix}`,
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
    const therapistDoc = await User.findOne({ email: emails.therapist }).lean();

    parentId = String(parentDoc._id);
    therapistId = String(therapistDoc._id);

    parentDoc.children.push({
      firstName: 'Chain',
      lastName: 'Child',
      dateOfBirth: new Date('2020-01-15'),
      gender: 'male',
      emergencyContact: 'Parent Chain',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

    const createdCase = await ChildCase.create({
      childId,
      parentId,
      clinicianId: new mongoose.Types.ObjectId(),
      status: 'THERAPY_ACTIVE',
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
      await HomeAssignment.deleteMany({ caseId });
      await SessionLog.deleteMany({ caseId });
      await TherapyPlan.deleteMany({ caseId });
      await TherapyCase.deleteMany({ caseId });
      await ChildCase.deleteMany({ _id: caseId });
    }
    await User.deleteMany({ email: new RegExp(`\\.chain\\.${suffix}@test\\.com$`) });
    await disconnectTestDb();
  });

  test('therapist and parent complete therapy chain end-to-end', async () => {
    const planPayload = {
      caseId,
      status: 'final',
      domains: ['Speech'],
      longTermGoal: {
        title: 'Improve expressive communication',
        description: 'Child should communicate basic needs',
        timeline: '12 weeks',
      },
      shortTermGoals: [
        {
          title: 'Use 2-word requests',
          measurableCriteria: 'Uses 2-word requests in 4/5 trials',
          domain: 'Speech',
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

    const createPlanRes = await request(app)
      .post('/api/therapy-plan')
      .set(authHeader(therapistToken))
      .send(planPayload);

    expect(createPlanRes.statusCode).toBe(201);
    expect(createPlanRes.body.success).toBe(true);
    expect(createPlanRes.body.data.status).toBe('final');

    /** Session logging requires planStatus `active` (therapy already started in this fixture). */
    await TherapyPlan.updateOne(
      { caseId, therapistId },
      {
        $set: {
          planStatus: 'active',
          approval: {
            status: 'approved',
            requestedAt: new Date(),
            approvedAt: new Date(),
            approvedBy: new mongoose.Types.ObjectId(),
            rejectionReason: '',
          },
        },
      }
    );

    const planRow = await TherapyPlan.findOne({ caseId, therapistId }).lean();
    await startNewEpisode({
      caseId,
      therapistId: planRow.therapistId,
      planId: planRow._id,
      planVersion: planRow.planVersion || 1,
    });

    const createSessionRes = await request(app)
      .post('/api/sessions')
      .set(authHeader(therapistToken))
      .send({
        caseId,
        sessionDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        duration: 45,
        goalsTargeted: ['Use 2-word requests'],
        activitiesUsed: ['Mirror Practice'],
        childResponse: 'scale:4',
        notes: 'Good engagement throughout the session',
        parentInstructions: 'Practice 10 minutes daily with visual prompts.',
        status: 'completed',
      });

    expect(createSessionRes.statusCode).toBe(201);
    expect(createSessionRes.body.success).toBe(true);

    const parentSessionsRes = await request(app)
      .get(`/api/parent/case/${caseId}/sessions`)
      .set(authHeader(parentToken));

    expect(parentSessionsRes.statusCode).toBe(200);
    expect(parentSessionsRes.body.data.length).toBeGreaterThan(0);
    expect(parentSessionsRes.body.data[0].parentInstructions).toMatch(/Practice 10 minutes daily/i);

    const createAssignmentRes = await request(app)
      .post('/api/assignments')
      .set(authHeader(therapistToken))
      .send({
        caseId,
        title: 'Picture naming worksheet',
        instructions: 'Complete one worksheet per day',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(createAssignmentRes.statusCode).toBe(201);
    expect(createAssignmentRes.body.success).toBe(true);
    expect(createAssignmentRes.body.data.status).toBe('pending');

    const assignmentId = String(createAssignmentRes.body.data._id);

    const parentAssignmentsRes = await request(app)
      .get(`/api/parent/case/${caseId}/assignments`)
      .set(authHeader(parentToken));

    expect(parentAssignmentsRes.statusCode).toBe(200);
    expect(parentAssignmentsRes.body.data.length).toBeGreaterThan(0);

    const parentSubmitRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/submit`)
      .set(authHeader(parentToken))
      .send({
        submissionUrl: 'https://example.com/evidence.jpg',
        fileType: 'image',
      });

    expect(parentSubmitRes.statusCode).toBe(200);
    expect(parentSubmitRes.body.data.status).toBe('submitted');

    const therapistReviewRes = await request(app)
      .patch(`/api/assignments/${assignmentId}/review`)
      .set(authHeader(therapistToken))
      .send({
        comment: 'Good progress, continue same routine',
        rating: 4,
      });

    expect(therapistReviewRes.statusCode).toBe(200);
    expect(therapistReviewRes.body.data.status).toBe('reviewed');

    const parentCompleteRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/complete`)
      .set(authHeader(parentToken));

    expect(parentCompleteRes.statusCode).toBe(200);
    expect(parentCompleteRes.body.data.status).toBe('completed');
  });
});
