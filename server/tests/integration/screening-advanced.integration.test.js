const request = require('supertest');

jest.mock('../../src/utils/email', () => {
  const sendEmail = jest.fn().mockResolvedValue(true);
  sendEmail.sendEmailWithAttachments = jest.fn().mockResolvedValue(true);
  return sendEmail;
});

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const Questionnaire = require('../../src/models/Questionnaire');
const Submission = require('../../src/models/Submission');
const mchatData = require('../../src/seeders/data/mchat.json');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Screening Advanced Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.screenadv.${suffix}@test.com`,
    otherParent: `otherparent.screenadv.${suffix}@test.com`,
    clinician: `clinician.screenadv.${suffix}@test.com`,
  };

  let parentToken;
  let clinicianToken;
  let childId;
  let otherChildId;

  function buildMonitorResponses() {
    return mchatData.questions.map((q, idx) => {
      const elevated = idx < 3;
      return {
        questionId: q.questionId,
        answer: elevated ? (q.reverseScored ? 'yes' : 'no') : (q.reverseScored ? 'no' : 'yes'),
      };
    });
  }

  beforeAll(async () => {
    await connectTestDb();

    await Questionnaire.deleteMany({ name: 'MCHAT-R' });
    await Questionnaire.create({
      name: 'MCHAT-R',
      domains: ['MCHAT'],
      questions: mchatData.questions,
    });

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'ScreenAdv',
      email: emails.parent,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Other',
      lastName: 'Parent',
      email: emails.otherParent,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'ScreenAdv',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `SC-ADV-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.otherParent, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    const clinicianLogin = await loginUser(app, emails.clinician, password);
    expect(parentLogin.statusCode).toBe(200);
    expect(clinicianLogin.statusCode).toBe(200);
    parentToken = parentLogin.body.token;
    clinicianToken = clinicianLogin.body.token;

    const p = await User.findOne({ email: emails.parent });
    const op = await User.findOne({ email: emails.otherParent });
    p.children.push({
      firstName: 'Screen',
      lastName: 'Child',
      dateOfBirth: new Date('2024-10-10'),
      gender: 'male',
      emergencyContact: 'Parent Screen',
      emergencyPhone: '03001234567',
    });
    op.children.push({
      firstName: 'Other',
      lastName: 'Child',
      dateOfBirth: new Date('2024-11-10'),
      gender: 'female',
      emergencyContact: 'Other Parent',
      emergencyPhone: '03007654321',
    });
    await p.save({ validateModifiedOnly: true });
    await op.save({ validateModifiedOnly: true });
    childId = String(p.children[p.children.length - 1]._id);
    otherChildId = String(op.children[op.children.length - 1]._id);
  });

  afterAll(async () => {
    await Submission.deleteMany({ childId: { $in: [childId, otherChildId] } });
    await Questionnaire.deleteMany({ name: 'MCHAT-R' });
    await User.deleteMany({ email: { $in: [emails.parent, emails.otherParent, emails.clinician] } });
    await disconnectTestDb();
  });

  test('rejects invalid inputs and exposes needs-attention screening reviews for clinicians', async () => {
    const invalidTypeRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId,
        questionnaireType: 'UNKNOWN',
        responses: [{ questionId: 'Q1', answer: 'yes' }],
      });
    expect(invalidTypeRes.statusCode).toBe(400);

    const missingResponsesRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId,
        questionnaireType: 'MCHAT-R',
      });
    expect(missingResponsesRes.statusCode).toBe(400);

    const foreignChildRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId: otherChildId,
        questionnaireType: 'MCHAT-R',
        responses: buildMonitorResponses(),
      });
    expect(foreignChildRes.statusCode).toBe(404);

    const monitorRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId,
        questionnaireType: 'MCHAT-R',
        responses: buildMonitorResponses(),
      });
    expect(monitorRes.statusCode).toBe(201);
    expect(monitorRes.body.data.result).toBe('Monitor');
    expect(monitorRes.body.data.riskLevel).toBe('medium');

    const clinicianReviewsRes = await request(app)
      .get('/api/clinician/screening-reviews')
      .set(authHeader(clinicianToken));
    expect(clinicianReviewsRes.statusCode).toBe(200);
    const review = clinicianReviewsRes.body.data.find(
      (r) => r.questionnaireType === 'MCHAT-R' && r.riskLevel === 'medium'
    );
    expect(review).toBeTruthy();
    expect(review.status).toBe('needs_attention');
  });
});