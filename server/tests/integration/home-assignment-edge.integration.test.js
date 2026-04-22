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
const { HomeAssignment } = require('../../src/models/HomeAssignment');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Home Assignment Edge Matrix', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    parent: `parent.assignment.${suffix}@test.com`,
    therapist: `therapist.assignment.${suffix}@test.com`,
  };

  let parentToken;
  let therapistToken;
  let parentId;
  let therapistId;
  let caseId;
  let assignmentId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Assignment',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Assignment',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `ASSIGN-${suffix}`,
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

    parentDoc.children.push({
      firstName: 'Assignment',
      lastName: 'Child',
      dateOfBirth: new Date('2020-04-20'),
      gender: 'male',
      emergencyContact: 'Parent Assignment',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    const childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

    const createdCase = await ChildCase.create({
      childId,
      parentId,
      clinicianId: new mongoose.Types.ObjectId(),
      therapistId: new mongoose.Types.ObjectId(therapistDoc._id),
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
      await TherapyCase.deleteMany({ caseId });
      await ChildCase.deleteMany({ _id: caseId });
    }
    await User.deleteMany({ email: { $in: [emails.parent, emails.therapist] } });
    await disconnectTestDb();
  });

  test('rejects invalid uploads and enforces the assignment state machine', async () => {
    const createRes = await request(app)
      .post('/api/assignments')
      .set(authHeader(therapistToken))
      .send({
        caseId,
        title: 'Daily picture naming',
        instructions: 'Complete one worksheet each day',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(createRes.statusCode).toBe(201);
    assignmentId = String(createRes.body.data._id);

    const parentAssignmentsRes = await request(app)
      .get(`/api/parent/case/${caseId}/assignments`)
      .set(authHeader(parentToken));

    expect(parentAssignmentsRes.statusCode).toBe(200);
    expect(parentAssignmentsRes.body.data).toHaveLength(1);

    const invalidFileTypeRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/submit`)
      .set(authHeader(parentToken))
      .attach('file', Buffer.from('plain text evidence'), 'evidence.txt');

    expect(invalidFileTypeRes.statusCode).toBe(400);
    expect(invalidFileTypeRes.body.message).toMatch(/Only image or video files are allowed/i);

    const invalidPathRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/submit`)
      .set(authHeader(parentToken))
      .send({
        submissionUrl: 'not-a-valid-path',
        fileType: 'image',
      });

    expect(invalidPathRes.statusCode).toBe(400);

    const traversalPathRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/submit`)
      .set(authHeader(parentToken))
      .send({
        submissionUrl: '/../../windows/system32/drivers/etc/hosts',
        fileType: 'image',
      });

    expect(traversalPathRes.statusCode).toBe(400);

    const noEvidenceRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/submit`)
      .set(authHeader(parentToken))
      .set('Content-Type', 'application/json')
      .send({});

    expect(noEvidenceRes.statusCode).toBe(400);

    const oversizedUploadRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/submit`)
      .set(authHeader(parentToken))
      .attach('file', Buffer.alloc(46 * 1024 * 1024, 1), 'oversized.jpg');

    expect(oversizedUploadRes.statusCode).toBe(400);

    const completeTooEarlyRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/complete`)
      .set(authHeader(parentToken));

    expect(completeTooEarlyRes.statusCode).toBe(400);

    const reviewTooEarlyRes = await request(app)
      .patch(`/api/assignments/${assignmentId}/review`)
      .set(authHeader(therapistToken))
      .send({ comment: 'Needs work', rating: 3 });

    expect(reviewTooEarlyRes.statusCode).toBe(400);

    const submitRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/submit`)
      .set(authHeader(parentToken))
      .send({
        submissionUrl: 'https://example.com/evidence.jpg',
        fileType: 'image',
      });

    expect(submitRes.statusCode).toBe(200);
    expect(submitRes.body.data.status).toBe('submitted');

    const submitAgainRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/submit`)
      .set(authHeader(parentToken))
      .send({
        submissionUrl: 'https://example.com/evidence-2.jpg',
        fileType: 'image',
      });

    expect(submitAgainRes.statusCode).toBe(400);

    const reviewRes = await request(app)
      .patch(`/api/assignments/${assignmentId}/review`)
      .set(authHeader(therapistToken))
      .send({
        comment: 'Good effort, continue daily practice',
        rating: 4,
      });

    expect(reviewRes.statusCode).toBe(200);
    expect(reviewRes.body.data.status).toBe('reviewed');

    const completeRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/complete`)
      .set(authHeader(parentToken));

    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.body.data.status).toBe('completed');

    const reviewCompletedRes = await request(app)
      .patch(`/api/assignments/${assignmentId}/review`)
      .set(authHeader(therapistToken))
      .send({ comment: 'Late edit attempt', rating: 5 });

    expect(reviewCompletedRes.statusCode).toBe(400);

    const completeAgainRes = await request(app)
      .patch(`/api/parent/assignments/${assignmentId}/complete`)
      .set(authHeader(parentToken));

    expect(completeAgainRes.statusCode).toBe(400);
  });
});