const mongoose = require('mongoose');
const request = require('supertest');

jest.mock('../../src/utils/email', () => {
  const sendEmail = jest.fn().mockResolvedValue(true);
  sendEmail.sendEmailWithAttachments = jest.fn().mockResolvedValue(true);
  return sendEmail;
});

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const Activity = require('../../src/models/Activity');
const { ChildCase } = require('../../src/models/ChildCase');
const TherapyCase = require('../../src/models/TherapyCase');
const TherapyPlan = require('../../src/models/TherapyPlan');
const { HomeAssignment } = require('../../src/models/HomeAssignment');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Activity Library Advanced Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.activity.${suffix}@test.com`,
    therapist1: `therapist1.activity.${suffix}@test.com`,
    therapist2: `therapist2.activity.${suffix}@test.com`,
  };

  let therapist1Token;
  let therapist2Token;
  let parentToken;
  let therapist1Id;
  let caseId;
  let ownedTemplateId;
  let platformTemplateId;
  let secondOwnedTemplateId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Activity',
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
      licenseNumber: `ACT-1-${suffix}`,
    });
    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Two',
      email: emails.therapist2,
      password,
      role: 'therapist',
      specialization: 'OT',
      licenseNumber: `ACT-2-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.therapist1, { approvalStatus: 'active' });
    await activateUser(emails.therapist2, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    const t1Login = await loginUser(app, emails.therapist1, password);
    const t2Login = await loginUser(app, emails.therapist2, password);
    expect(parentLogin.statusCode).toBe(200);
    expect(t1Login.statusCode).toBe(200);
    expect(t2Login.statusCode).toBe(200);

    parentToken = parentLogin.body.token;
    therapist1Token = t1Login.body.token;
    therapist2Token = t2Login.body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    const therapist1Doc = await User.findOne({ email: emails.therapist1 });
    therapist1Id = String(therapist1Doc._id);

    parentDoc.children.push({
      firstName: 'Activity',
      lastName: 'Child',
      dateOfBirth: new Date('2020-10-10'),
      gender: 'male',
      emergencyContact: 'Parent Activity',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    const childId = String(parentDoc.children[parentDoc.children.length - 1]._id);
    const c = await ChildCase.create({
      childId,
      parentId: parentDoc._id,
      clinicianId: new mongoose.Types.ObjectId(),
    });
    caseId = String(c._id);

    await TherapyCase.create({
      caseId,
      therapistId: therapist1Id,
      referralId: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: new Date(),
    });

    const platformTemplate = await Activity.create({
      name: `Platform Sensory ${suffix}`,
      objective: 'Platform template objective',
      procedure: 'Platform procedure',
      domain: 'Sensory',
      createdBy: null,
      isTemplate: true,
    });
    platformTemplateId = String(platformTemplate._id);
  });

  afterAll(async () => {
    await HomeAssignment.deleteMany({ caseId });
    await TherapyPlan.deleteMany({ caseId });
    await Activity.deleteMany({
      $or: [
        { _id: { $in: [ownedTemplateId, secondOwnedTemplateId, platformTemplateId] } },
        { name: new RegExp(`activity\.${suffix}|Platform Sensory ${suffix}`, 'i') },
      ],
    });
    await TherapyCase.deleteMany({ caseId });
    await ChildCase.deleteMany({ _id: caseId });
    await User.deleteMany({ email: { $in: [emails.parent, emails.therapist1, emails.therapist2] } });
    await disconnectTestDb();
  });

  test('enforces template ownership and advanced activity conflict/filter paths', async () => {
    const createOwnTemplateRes = await request(app)
      .post('/api/activities/templates')
      .set(authHeader(therapist1Token))
      .send({
        name: `activity.${suffix}.behavioral`,
        objective: 'Reduce disruptive behavior',
        procedure: 'Token board routine',
        domain: 'Behavioral',
      });
    expect(createOwnTemplateRes.statusCode).toBe(201);
    ownedTemplateId = String(createOwnTemplateRes.body.data._id);

    const duplicateNameRes = await request(app)
      .post('/api/activities/templates')
      .set(authHeader(therapist1Token))
      .send({
        name: `activity.${suffix}.behavioral`,
        objective: 'Duplicate objective',
        procedure: 'Duplicate procedure',
        domain: 'Behavioral',
      });
    expect(duplicateNameRes.statusCode).toBe(409);

    const createSecondTemplateRes = await request(app)
      .post('/api/activities/templates')
      .set(authHeader(therapist1Token))
      .send({
        name: `activity.${suffix}.conflict`,
        objective: 'Conflict target objective',
        procedure: 'Conflict target procedure',
        domain: 'Speech',
      });
    expect(createSecondTemplateRes.statusCode).toBe(201);
    secondOwnedTemplateId = String(createSecondTemplateRes.body.data._id);

    const updateConflictRes = await request(app)
      .patch(`/api/activities/templates/${ownedTemplateId}`)
      .set(authHeader(therapist1Token))
      .send({ name: `activity.${suffix}.conflict` });
    expect(updateConflictRes.statusCode).toBe(409);

    const invalidTemplateIdRes = await request(app)
      .patch('/api/activities/templates/not-an-id')
      .set(authHeader(therapist1Token))
      .send({ objective: 'bad id update' });
    expect(invalidTemplateIdRes.statusCode).toBe(400);

    const platformEditRes = await request(app)
      .patch(`/api/activities/templates/${platformTemplateId}`)
      .set(authHeader(therapist1Token))
      .send({ objective: 'Attempted platform edit' });
    expect(platformEditRes.statusCode).toBe(403);

    const otherTherapistEditRes = await request(app)
      .patch(`/api/activities/templates/${ownedTemplateId}`)
      .set(authHeader(therapist2Token))
      .send({ objective: 'Not owner edit attempt' });
    expect(otherTherapistEditRes.statusCode).toBe(404);

    const otherTherapistAssignRes = await request(app)
      .post(`/api/activities/${ownedTemplateId}/assign`)
      .set(authHeader(therapist2Token))
      .send({ caseId, assignTo: 'plan' });
    expect(otherTherapistAssignRes.statusCode).toBe(400);

    const createAbaRes = await request(app)
      .post('/api/activities')
      .set(authHeader(therapist1Token))
      .send({
        name: `activity.${suffix}.aba`,
        instructions: 'ABA prompt hierarchy',
        domain: 'Behavioral (ABA)',
      });
    expect(createAbaRes.statusCode).toBe(201);

    const behavioralFilterRes = await request(app)
      .get('/api/activities?domain=Behavioral')
      .set(authHeader(therapist1Token));
    expect(behavioralFilterRes.statusCode).toBe(200);
    const filteredNames = behavioralFilterRes.body.data.map((a) => a.name);
    expect(filteredNames).toContain(`activity.${suffix}.behavioral`);
    expect(filteredNames).toContain(`activity.${suffix}.aba`);

    const searchRes = await request(app)
      .get(`/api/activities?search=${encodeURIComponent(`activity.${suffix}.aba`)}`)
      .set(authHeader(therapist1Token));
    expect(searchRes.statusCode).toBe(200);
    expect(searchRes.body.data).toHaveLength(1);

    const assignWithoutPlanRes = await request(app)
      .post(`/api/activities/${ownedTemplateId}/assign`)
      .set(authHeader(therapist1Token))
      .send({ caseId, assignTo: 'plan' });
    expect(assignWithoutPlanRes.statusCode).toBe(400);

    const invalidHomeDueDateRes = await request(app)
      .post(`/api/activities/${ownedTemplateId}/assign`)
      .set(authHeader(therapist1Token))
      .send({ caseId, assignTo: 'home', dueDate: 'not-a-date' });
    expect(invalidHomeDueDateRes.statusCode).toBe(400);

    const validHomeAssignRes = await request(app)
      .post(`/api/activities/${ownedTemplateId}/assign`)
      .set(authHeader(therapist1Token))
      .send({ caseId, assignTo: 'home' });
    expect(validHomeAssignRes.statusCode).toBe(201);
    expect(String(validHomeAssignRes.body.data.activityId)).toBe(ownedTemplateId);

    await TherapyPlan.create({
      caseId,
      therapistId: therapist1Id,
      domains: ['Speech'],
      shortTermGoals: [
        {
          title: 'Baseline',
          measurableCriteria: 'Track baseline performance',
          domain: 'Speech',
          status: 'Active',
        },
      ],
      status: 'draft',
      draft: true,
    });

    const firstAssignRes = await request(app)
      .post(`/api/activities/${ownedTemplateId}/assign`)
      .set(authHeader(therapist1Token))
      .send({ caseId, assignTo: 'plan' });
    expect(firstAssignRes.statusCode).toBe(200);

    const duplicateAssignRes = await request(app)
      .post(`/api/activities/${ownedTemplateId}/assign`)
      .set(authHeader(therapist1Token))
      .send({ caseId, assignTo: 'plan' });
    expect(duplicateAssignRes.statusCode).toBe(409);

    const parentBlockedRes = await request(app)
      .get('/api/activities/templates')
      .set(authHeader(parentToken));
    expect(parentBlockedRes.statusCode).toBe(403);
  });
});