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
const SessionLog = require('../../src/models/SessionLog');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Progress Analytics Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    parent: `parent.progress.${suffix}@test.com`,
    clinician: `clinician.progress.${suffix}@test.com`,
    clinicianOther: `clinician.other.progress.${suffix}@test.com`,
    therapist: `therapist.progress.${suffix}@test.com`,
  };

  let parentToken;
  let clinicianToken;
  let clinicianOtherToken;
  let therapistToken;
  let parentId;
  let clinicianId;
  let therapistId;
  let caseId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Progress',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Progress',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `PROG-C-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Other',
      lastName: 'Clinician',
      email: emails.clinicianOther,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `PROG-C2-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Progress',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `PROG-T-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });
    await activateUser(emails.clinicianOther, { approvalStatus: 'active' });
    await activateUser(emails.therapist, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    const clinicianLogin = await loginUser(app, emails.clinician, password);
    const clinicianOtherLogin = await loginUser(app, emails.clinicianOther, password);
    const therapistLogin = await loginUser(app, emails.therapist, password);

    expect(parentLogin.statusCode).toBe(200);
    expect(clinicianLogin.statusCode).toBe(200);
    expect(clinicianOtherLogin.statusCode).toBe(200);
    expect(therapistLogin.statusCode).toBe(200);

    parentToken = parentLogin.body.token;
    clinicianToken = clinicianLogin.body.token;
    clinicianOtherToken = clinicianOtherLogin.body.token;
    therapistToken = therapistLogin.body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    const clinicianDoc = await User.findOne({ email: emails.clinician });
    const therapistDoc = await User.findOne({ email: emails.therapist });
    parentId = String(parentDoc._id);
    clinicianId = String(clinicianDoc._id);
    therapistId = String(therapistDoc._id);

    parentDoc.children.push({
      firstName: 'Progress',
      lastName: 'Child',
      dateOfBirth: new Date('2020-05-05'),
      gender: 'female',
      emergencyContact: 'Parent Progress',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    const childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

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
      startedAt: new Date('2026-04-15T12:00:00.000Z'),
    });

    await TherapyPlan.create({
      caseId,
      therapistId,
      domains: ['Speech', 'OT'],
      longTermGoal: {
        title: 'Improve communication and motor participation',
        description: 'Support daily communication and fine motor skills',
        timeline: '16 weeks',
      },
      shortTermGoals: [
        {
          title: 'Use 2-word requests',
          measurableCriteria: 'Uses 2-word requests in 4/5 trials',
          domain: 'Speech',
          status: 'Achieved',
        },
        {
          title: 'Copy tracing lines',
          measurableCriteria: 'Traces lines with 80% accuracy',
          domain: 'OT',
          status: 'Active',
        },
      ],
      activities: [
        {
          title: 'Speech request drill',
          description: 'Prompted two-word requests',
          linkedGoal: 'Use 2-word requests',
        },
        {
          title: 'Fine motor tracing',
          description: 'Trace simple shapes',
          linkedGoal: 'Copy tracing lines',
        },
      ],
      status: 'final',
      draft: false,
    });

    /** Fixed UTC calendar days so trend aggregation is stable across CI timezones. */
    await SessionLog.create([
      {
        caseId,
        therapistId,
        sessionDate: new Date('2026-04-13T12:00:00.000Z'),
        duration: 45,
        goalsTargeted: ['Speech request drill'],
        activitiesUsed: ['Speech request drill'],
        childResponse: 'scale:4',
        notes: 'Good speech participation',
        parentInstructions: 'Practice two-word requests daily',
        status: 'completed',
      },
      {
        caseId,
        therapistId,
        sessionDate: new Date('2026-04-14T10:00:00.000Z'),
        duration: 40,
        goalsTargeted: ['Fine motor tracing'],
        activitiesUsed: ['Fine motor tracing'],
        childResponse: 'good',
        notes: 'Steady effort on tracing task',
        parentInstructions: 'Use tracing sheets three times this week',
        status: 'completed',
      },
      {
        caseId,
        therapistId,
        sessionDate: new Date('2026-04-14T14:00:00.000Z'),
        duration: 35,
        goalsTargeted: ['Speech request drill'],
        activitiesUsed: ['Speech request drill'],
        childResponse: 'scale:2',
        notes: 'Lower performance in late follow-up session',
        parentInstructions: 'Continue prompts with visual cues',
        status: 'completed',
      },
    ]);
  });

  afterAll(async () => {
    if (caseId) {
      await SessionLog.deleteMany({ caseId });
      await TherapyPlan.deleteMany({ caseId });
      await TherapyCase.deleteMany({ caseId });
      await ChildCase.deleteMany({ _id: caseId });
    }
    await User.deleteMany({ email: { $in: [emails.parent, emails.clinician, emails.clinicianOther, emails.therapist] } });
    await disconnectTestDb();
  });

  test('returns deterministic clinician progress analytics', async () => {
    const overviewRes = await request(app)
      .get(`/api/progress/${caseId}/overview`)
      .set(authHeader(clinicianToken));

    expect(overviewRes.statusCode).toBe(200);
    expect(overviewRes.body.data.progressEngine).toBeDefined();
    expect(typeof overviewRes.body.data.overallProgressPercent).toBe('number');
    expect(overviewRes.body.data.overallProgressPercent).toBeGreaterThanOrEqual(0);
    expect(overviewRes.body.data.overallProgressPercent).toBeLessThanOrEqual(100);
    expect(overviewRes.body.data.totalGoals).toBe(2);
    expect(overviewRes.body.data.achievedGoals).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(overviewRes.body.data.trendData)).toBe(true);
    expect(overviewRes.body.data.trendData.length).toBeGreaterThanOrEqual(1);

    const speechDomain = overviewRes.body.data.domains.find((item) => item.domain === 'Speech');
    const otDomain = overviewRes.body.data.domains.find((item) => item.domain === 'Occupational Therapy');
    expect(speechDomain).toBeDefined();
    expect(otDomain).toBeDefined();
    expect(typeof speechDomain.progressPercent).toBe('number');
    expect(typeof otDomain.progressPercent).toBe('number');

    const domainRes = await request(app)
      .get(`/api/progress/${caseId}/domain/Speech`)
      .set(authHeader(clinicianToken));

    expect(domainRes.statusCode).toBe(200);
    expect(domainRes.body.data.domain).toBe('Speech');
    expect(typeof domainRes.body.data.progressPercent).toBe('number');
    expect(domainRes.body.data.totalGoals).toBe(1);
    expect(domainRes.body.data.trendData.length).toBeGreaterThanOrEqual(1);

    const otAliasRes = await request(app)
      .get(`/api/progress/${caseId}/domain/OT`)
      .set(authHeader(clinicianToken));

    expect(otAliasRes.statusCode).toBe(200);
    expect(otAliasRes.body.data.domain).toBe('Occupational Therapy');
    expect(typeof otAliasRes.body.data.progressPercent).toBe('number');
    expect(otAliasRes.body.data.trendData.length).toBeGreaterThanOrEqual(1);

    const sessionsRes = await request(app)
      .get(`/api/progress/${caseId}/sessions`)
      .set(authHeader(clinicianToken));

    expect(sessionsRes.statusCode).toBe(200);
    expect(sessionsRes.body.data.totalSessions).toBe(3);
    expect(typeof sessionsRes.body.data.averageResponseScore).toBe('number');
    expect(sessionsRes.body.data.recentActivity).toHaveLength(3);

    const invalidDomainRes = await request(app)
      .get(`/api/progress/${caseId}/domain/Swim`)
      .set(authHeader(clinicianToken));

    expect(invalidDomainRes.statusCode).toBe(400);

    const parentBlockedRes = await request(app)
      .get(`/api/progress/${caseId}/overview`)
      .set(authHeader(parentToken));

    expect(parentBlockedRes.statusCode).toBe(403);

    const otherClinicianBlockedRes = await request(app)
      .get(`/api/progress/${caseId}/overview`)
      .set(authHeader(clinicianOtherToken));

    expect(otherClinicianBlockedRes.statusCode).toBe(404);
  });
});