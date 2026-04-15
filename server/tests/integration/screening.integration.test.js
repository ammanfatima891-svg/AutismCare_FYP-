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

describe('Screening Workflow Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const parentEmail = `parent.screening.${suffix}@test.com`;

  let parentToken;
  let childId;

  const questionnaireQuestions = mchatData.questions;

  function buildSafeResponses() {
    return questionnaireQuestions.map((question) => ({
      questionId: question.questionId,
      answer: question.reverseScored ? 'no' : 'yes',
    }));
  }

  beforeAll(async () => {
    await connectTestDb();

    await Questionnaire.deleteMany({ name: 'MCHAT-R' });
    await Questionnaire.create({
      name: 'MCHAT-R',
      domains: ['MCHAT'],
      questions: questionnaireQuestions,
    });

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Screening',
      email: parentEmail,
      password,
      role: 'parent',
    });

    await activateUser(parentEmail, { approvalStatus: 'active' });

    const loginRes = await loginUser(app, parentEmail, password);
    expect(loginRes.statusCode).toBe(200);
    parentToken = loginRes.body.token;

    const parentDoc = await User.findOne({ email: parentEmail });

    parentDoc.children.push({
      firstName: 'Screened',
      lastName: 'Child',
      dateOfBirth: new Date('2024-09-11'),
      gender: 'male',
      emergencyContact: 'Parent Screening',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    childId = String(parentDoc.children[parentDoc.children.length - 1]._id);
  });

  afterAll(async () => {
    await Submission.deleteMany({ childId });
    await Questionnaire.deleteMany({ name: 'MCHAT-R' });
    await User.deleteMany({ email: parentEmail });
    await disconnectTestDb();
  });

  test('returns the seeded questionnaire by type', async () => {
    const res = await request(app)
      .get('/api/screening/questionnaires/MCHAT-R')
      .set(authHeader(parentToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('MCHAT-R');
    expect(res.body.data.questions).toHaveLength(20);
  });

  test('exposes available questionnaires for the child age range', async () => {
    const res = await request(app)
      .get('/api/screening/available-questionnaires')
      .set(authHeader(parentToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((item) => item.type === 'MCHAT-R' && String(item.childId) === childId)).toBe(true);
  });

  test('calculates screening and updates downstream screening views', async () => {
    const calculateRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId,
        questionnaireType: 'MCHAT-R',
        responses: buildSafeResponses(),
        dob: '2024-09-11',
      });

    expect(calculateRes.statusCode).toBe(201);
    expect(calculateRes.body.success).toBe(true);
    expect(calculateRes.body.data.result).toBe('Pass');
    expect(calculateRes.body.data.riskLevel).toBe('low');

    const submissionId = String(calculateRes.body.data.submissionId);

    const historyRes = await request(app)
      .get('/api/screening/screening-history')
      .set(authHeader(parentToken));

    expect(historyRes.statusCode).toBe(200);
    expect(historyRes.body.data).toHaveLength(1);
    expect(String(historyRes.body.data[0]._id)).toBe(submissionId);

    const statusRes = await request(app)
      .get(`/api/screening/child/${childId}/screening-status`)
      .set(authHeader(parentToken));

    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.body.data.totalScreenings).toBe(1);
    expect(statusRes.body.data.overallStatus).toBe('Low Risk');
    expect(statusRes.body.data.latestRiskLevel).toBe('low');
    expect(statusRes.body.data.screeningsByType['MCHAT-R']).toHaveLength(1);

    const statsRes = await request(app)
      .get('/api/screening/stats')
      .set(authHeader(parentToken));

    expect(statsRes.statusCode).toBe(200);
    expect(statsRes.body.data.totalScreenings).toBe(1);
    expect(statsRes.body.data.thisMonth).toBeGreaterThanOrEqual(1);

    const downloadRes = await request(app)
      .get(`/api/screening/submission/${submissionId}/download`)
      .set(authHeader(parentToken));

    expect(downloadRes.statusCode).toBe(200);
    expect(downloadRes.headers['content-type']).toContain('application/pdf');
  });
});