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
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Screening ASQ Edge Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.asqedge.${suffix}@test.com`,
    clinician: `clinician.asqedge.${suffix}@test.com`,
  };

  let parentToken;
  let clinicianToken;
  let childId;

  const asqQuestions = Array.from({ length: 6 }).map((_, idx) => ({
    questionId: `C${idx + 1}`,
    text: `Communication item ${idx + 1}`,
    domain: 'Communication',
  }));

  function buildAsqResponses(answers) {
    return answers.map((answer, idx) => ({
      questionId: `C${idx + 1}`,
      answer,
    }));
  }

  beforeAll(async () => {
    await connectTestDb();

    await Questionnaire.deleteMany({ name: 'ASQ-3' });
    await Questionnaire.create({
      name: 'ASQ-3',
      intervalMonths: 6,
      domains: ['Communication'],
      questions: asqQuestions,
    });

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'AsqEdge',
      email: emails.parent,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'AsqEdge',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `ASQ-EDGE-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    const clinicianLogin = await loginUser(app, emails.clinician, password);
    expect(parentLogin.statusCode).toBe(200);
    expect(clinicianLogin.statusCode).toBe(200);
    parentToken = parentLogin.body.token;
    clinicianToken = clinicianLogin.body.token;

    const parent = await User.findOne({ email: emails.parent });
    parent.children.push({
      firstName: 'ASQ',
      lastName: 'Child',
      dateOfBirth: new Date('2024-10-01'),
      gender: 'female',
      emergencyContact: 'Parent AsqEdge',
      emergencyPhone: '03001234567',
    });
    await parent.save({ validateModifiedOnly: true });
    childId = String(parent.children[parent.children.length - 1]._id);
  });

  afterAll(async () => {
    await Submission.deleteMany({ childId });
    await Questionnaire.deleteMany({ name: 'ASQ-3' });
    await User.deleteMany({ email: { $in: [emails.parent, emails.clinician] } });
    await disconnectTestDb();
  });

  test('validates ASQ interval boundaries and maps scores to low/medium/high risk', async () => {
    const unsupportedIntervalRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId,
        questionnaireType: 'ASQ-3',
        intervalMonths: 999,
        responses: buildAsqResponses(['yes', 'yes', 'yes', 'yes', 'yes', 'yes']),
      });
    expect(unsupportedIntervalRes.statusCode).toBe(400);

    const failRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId,
        questionnaireType: 'ASQ-3',
        intervalMonths: 6,
        responses: buildAsqResponses(['yes', 'yes', 'not-yet', 'not-yet', 'not-yet', 'not-yet']),
      });
    expect(failRes.statusCode).toBe(201);
    expect(failRes.body.data.result).toBe('Fail');
    expect(failRes.body.data.riskLevel).toBe('high');

    const monitorRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId,
        questionnaireType: 'ASQ-3',
        intervalMonths: 6,
        responses: buildAsqResponses(['yes', 'yes', 'yes', 'not-yet', 'not-yet', 'not-yet']),
      });
    expect(monitorRes.statusCode).toBe(201);
    expect(monitorRes.body.data.result).toBe('Monitor');
    expect(monitorRes.body.data.riskLevel).toBe('medium');

    const passRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId,
        questionnaireType: 'ASQ-3',
        intervalMonths: 6,
        responses: buildAsqResponses(['yes', 'yes', 'yes', 'yes', 'sometimes', 'sometimes']),
      });
    expect(passRes.statusCode).toBe(201);
    expect(passRes.body.data.result).toBe('Pass');
    expect(passRes.body.data.riskLevel).toBe('low');

    const reviewsRes = await request(app)
      .get('/api/clinician/screening-reviews')
      .set(authHeader(clinicianToken));
    expect(reviewsRes.statusCode).toBe(200);
    const highRiskReview = reviewsRes.body.data.find(
      (r) => r.questionnaireType === 'ASQ-3' && r.riskLevel === 'high'
    );
    expect(highRiskReview).toBeTruthy();
    expect(highRiskReview.status).toBe('needs_attention');
  });
});