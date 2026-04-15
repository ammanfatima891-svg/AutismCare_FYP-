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

describe('Screening Clinician Decision Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.scdecision.${suffix}@test.com`,
    clinician: `clinician.scdecision.${suffix}@test.com`,
  };

  let parentToken;
  let clinicianToken;
  let childId;
  let submissionId;

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
      lastName: 'Decision',
      email: emails.parent,
      password,
      role: 'parent',
    });
    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Decision',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `SC-DEC-${suffix}`,
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
      firstName: 'Decision',
      lastName: 'Child',
      dateOfBirth: new Date('2024-10-01'),
      gender: 'male',
      emergencyContact: 'Parent Decision',
      emergencyPhone: '03001234567',
    });
    await parent.save({ validateModifiedOnly: true });
    childId = String(parent.children[parent.children.length - 1]._id);

    const screenRes = await request(app)
      .post('/api/screening/calculate-screening')
      .set(authHeader(parentToken))
      .send({
        childId,
        questionnaireType: 'MCHAT-R',
        responses: buildMonitorResponses(),
      });
    expect(screenRes.statusCode).toBe(201);
    submissionId = String(screenRes.body.data.submissionId);
  });

  afterAll(async () => {
    await Submission.deleteMany({ childId });
    await Questionnaire.deleteMany({ name: 'MCHAT-R' });
    await User.deleteMany({ email: { $in: [emails.parent, emails.clinician] } });
    await disconnectTestDb();
  });

  test('records clinician decision with validation and reflects decision in review list', async () => {
    const invalidIdRes = await request(app)
      .patch('/api/clinician/screening-reviews/not-an-id/decision')
      .set(authHeader(clinicianToken))
      .send({ decision: 'refer' });
    expect(invalidIdRes.statusCode).toBe(400);

    const invalidDecisionRes = await request(app)
      .patch(`/api/clinician/screening-reviews/${submissionId}/decision`)
      .set(authHeader(clinicianToken))
      .send({ decision: 'escalate' });
    expect(invalidDecisionRes.statusCode).toBe(400);

    const decisionRes = await request(app)
      .patch(`/api/clinician/screening-reviews/${submissionId}/decision`)
      .set(authHeader(clinicianToken))
      .send({
        decision: 'refer',
        notes: 'Refer for full diagnostic evaluation and early intervention.',
      });
    expect(decisionRes.statusCode).toBe(200);
    expect(decisionRes.body.data.clinicianDecision.decision).toBe('refer');

    const listRes = await request(app)
      .get('/api/clinician/screening-reviews')
      .set(authHeader(clinicianToken));
    expect(listRes.statusCode).toBe(200);
    const decided = listRes.body.data.find((r) => String(r.id) === submissionId);
    expect(decided).toBeTruthy();
    expect(decided.status).toBe('reviewed');
    expect(decided.clinicianDecision).toBeTruthy();
    expect(decided.clinicianDecision.decision).toBe('refer');
  });
});