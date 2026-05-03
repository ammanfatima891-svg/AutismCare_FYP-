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

describe('Therapy Plan Stress + Race + Long-Horizon Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.planrace.${suffix}@test.com`,
    therapist: `therapist.planrace.${suffix}@test.com`,
  };

  let therapistToken;
  let caseId;
  let childId;
  let planId;

  function buildShortTermGoals(total = 36) {
    const domains = ['Speech', 'OT', 'Sensory', 'Behavioral', 'AAC', 'PECS'];
    return Array.from({ length: total }).map((_, idx) => ({
      title: `Goal ${idx + 1}`,
      measurableCriteria: `Target completion ${idx + 1} in 4/5 sessions`,
      domain: domains[idx % domains.length],
      status: idx % 5 === 0 ? 'Achieved' : 'Active',
      reviewDate: new Date(Date.now() + idx * 24 * 60 * 60 * 1000).toISOString(),
    }));
  }

  function buildActivities(total = 30) {
    return Array.from({ length: total }).map((_, idx) => ({
      title: `Activity ${idx + 1}`,
      description: `Structured practice block ${idx + 1}`,
      linkedGoal: `Goal ${((idx % 12) + 1)}`,
    }));
  }

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'PlanRace',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'PlanRace',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `TPR-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.therapist, { approvalStatus: 'active' });

    const therapistLogin = await loginUser(app, emails.therapist, password);
    expect(therapistLogin.statusCode).toBe(200);
    therapistToken = therapistLogin.body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    const therapistDoc = await User.findOne({ email: emails.therapist }).lean();

    parentDoc.children.push({
      firstName: 'Stress',
      lastName: 'Child',
      dateOfBirth: new Date('2020-04-10'),
      gender: 'male',
      emergencyContact: 'Parent PlanRace',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

    const createdCase = await ChildCase.create({
      childId,
      parentId: parentDoc._id,
      clinicianId: new mongoose.Types.ObjectId(),
    });
    caseId = String(createdCase._id);

    await TherapyCase.create({
      caseId,
      therapistId: therapistDoc._id,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });
  });

  afterAll(async () => {
    await TherapyPlan.deleteMany({ caseId });
    await TherapyCase.deleteMany({ caseId });
    await ChildCase.deleteMany({ _id: caseId });
    await User.deleteMany({ email: { $in: [emails.parent, emails.therapist] } });
    await disconnectTestDb();
  });

  test('handles multi-domain high-volume payloads and concurrent update races safely', async () => {
    const createRes = await request(app)
      .post('/api/therapy-plan')
      .set(authHeader(therapistToken))
      .send({
        caseId,
        status: 'final',
        domains: ['Speech', 'OT', 'Sensory', 'Behavioral', 'AAC', 'PECS'],
        longTermGoal: {
          title: 'Generalize communication and adaptive participation',
          description: 'Sustain communication, sensory regulation, and behavior supports across settings',
          timeline: '52 weeks',
        },
        shortTermGoals: buildShortTermGoals(36),
        activities: buildActivities(30),
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.data.status).toBe('final');
    expect(createRes.body.data.shortTermGoals.length).toBe(36);
    expect(createRes.body.data.activities.length).toBe(30);

    planId = String(createRes.body.data._id);

    const patchA = request(app)
      .patch(`/api/therapy-plan/${planId}`)
      .set(authHeader(therapistToken))
      .send({
        status: 'final',
        longTermGoal: {
          title: 'Generalize communication and adaptive participation',
          description: 'Race update A',
          timeline: '60 weeks',
        },
        domains: ['Speech', 'OT', 'Sensory', 'Behavioral'],
        shortTermGoals: buildShortTermGoals(36),
      });

    const patchB = request(app)
      .patch(`/api/therapy-plan/${planId}`)
      .set(authHeader(therapistToken))
      .send({
        status: 'final',
        longTermGoal: {
          title: 'Generalize communication and adaptive participation',
          description: 'Race update B',
          timeline: '64 weeks',
        },
        domains: ['Speech', 'OT', 'AAC', 'PECS'],
        shortTermGoals: buildShortTermGoals(36).map((goal, idx) => ({
          ...goal,
          status: idx % 3 === 0 ? 'Achieved' : 'Active',
        })),
      });

    const [aRes, bRes] = await Promise.all([patchA, patchB]);

    expect([200]).toContain(aRes.statusCode);
    expect([200]).toContain(bRes.statusCode);

    const casePlanRes = await request(app)
      .get(`/api/therapy-plan/${caseId}`)
      .set(authHeader(therapistToken));

    expect(casePlanRes.statusCode).toBe(200);
    expect(casePlanRes.body.data).toBeTruthy();
    expect(casePlanRes.body.data.status).toBe('final');
    expect(casePlanRes.body.data.shortTermGoals.length).toBe(36);
    expect(Array.isArray(casePlanRes.body.data.domains)).toBe(true);
    expect(casePlanRes.body.data.domains.length).toBeGreaterThan(0);
  });

  test('supports long-horizon iterative lifecycle updates without data regression', async () => {
    const timelinePatches = ['72 weeks', '84 weeks', '96 weeks', '108 weeks', '120 weeks', '132 weeks'];

    for (let i = 0; i < timelinePatches.length; i += 1) {
      const patchRes = await request(app)
        .patch(`/api/therapy-plan/${planId}`)
        .set(authHeader(therapistToken))
        .send({
          status: 'final',
          longTermGoal: {
            title: `Long-horizon therapy cycle ${i + 1}`,
            description: `Quarterly revision ${i + 1}`,
            timeline: timelinePatches[i],
          },
          shortTermGoals: buildShortTermGoals(36).map((goal, idx) => ({
            ...goal,
            status: (idx + i) % 4 === 0 ? 'Achieved' : 'Active',
          })),
          activities: buildActivities(30),
        });

      expect(patchRes.statusCode).toBe(200);
      expect(patchRes.body.data.status).toBe('final');
      expect(patchRes.body.data.shortTermGoals.length).toBe(36);
      expect(patchRes.body.data.activities.length).toBe(30);
    }

    const listRes = await request(app)
      .get('/api/therapy-plan')
      .set(authHeader(therapistToken));

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const row = listRes.body.data.find((item) => String(item.caseId) === caseId);
    expect(row).toBeTruthy();
    expect(row.goalsCount).toBe(36);
    expect(row).not.toHaveProperty('progressPercent');
    expect(typeof row.achievedGoalsCount).toBe('number');
    expect(row.childName).toMatch(/Stress Child/i);
    expect(row.status).toBe('final');
  });
});
