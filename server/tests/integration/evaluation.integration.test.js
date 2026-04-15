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
const { ClinicalEvaluation } = require('../../src/models/ClinicalEvaluation');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Clinical Evaluation Lifecycle Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    parent: `parent.evaluation.${suffix}@test.com`,
    clinician: `clinician.evaluation.${suffix}@test.com`,
  };

  let parentToken;
  let clinicianToken;
  let parentId;
  let childId;
  let caseId;
  let initialEvaluationId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Evaluation',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Evaluation',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `EVAL-${suffix}`,
    });

    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.clinician, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    const clinicianLogin = await loginUser(app, emails.clinician, password);

    expect(parentLogin.statusCode).toBe(200);
    expect(clinicianLogin.statusCode).toBe(200);

    parentToken = parentLogin.body.token;
    clinicianToken = clinicianLogin.body.token;

    const parentDoc = await User.findOne({ email: emails.parent });
    const clinicianDoc = await User.findOne({ email: emails.clinician }).lean();
    parentId = String(parentDoc._id);

    parentDoc.children.push({
      firstName: 'Eval',
      lastName: 'Child',
      dateOfBirth: new Date('2023-06-15'),
      gender: 'female',
      emergencyContact: 'Parent Evaluation',
      emergencyPhone: '03001234567',
    });
    await parentDoc.save({ validateModifiedOnly: true });

    childId = String(parentDoc.children[parentDoc.children.length - 1]._id);

    const createdCase = await ChildCase.create({
      childId,
      parentId,
      clinicianId: new mongoose.Types.ObjectId(clinicianDoc._id),
    });
    caseId = String(createdCase._id);
  });

  afterAll(async () => {
    await ClinicalEvaluation.deleteMany({ caseId });
    await ChildCase.deleteMany({ _id: caseId });
    await User.deleteMany({ email: { $in: [emails.parent, emails.clinician] } });
    await disconnectTestDb();
  });

  test('creates, lists, fetches, and versions a clinical evaluation', async () => {
    const createRes = await request(app)
      .post('/api/evaluations')
      .set(authHeader(clinicianToken))
      .send({
        caseId,
        observations: 'Child engages well and follows prompts.',
        developmentalSummary: 'Mild speech delay noted.',
        diagnosis: '',
        comorbidConditions: ['Sleep disturbance'],
        recommendations: 'Continue therapy and reassess in 3 months.',
        status: 'draft',
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.status).toBe('draft');
    initialEvaluationId = String(createRes.body.data._id);

    const listRes = await request(app)
      .get(`/api/evaluations/${caseId}`)
      .set(authHeader(clinicianToken));

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.meta.total).toBe(1);
    expect(listRes.body.meta.hasFinalEvaluation).toBe(false);

    const fetchRes = await request(app)
      .get(`/api/evaluations/single/${initialEvaluationId}`)
      .set(authHeader(clinicianToken));

    expect(fetchRes.statusCode).toBe(200);
    expect(fetchRes.body.data.caseId).toBeTruthy();
    expect(fetchRes.body.data.status).toBe('draft');

    const versionRes = await request(app)
      .patch(`/api/evaluations/${initialEvaluationId}`)
      .set(authHeader(clinicianToken))
      .send({
        recommendations: 'Add parent coaching and monitor speech gains closely.',
        status: 'final',
      });

    expect(versionRes.statusCode).toBe(201);
    expect(versionRes.body.success).toBe(true);
    expect(versionRes.body.data.status).toBe('final');
    expect(String(versionRes.body.data.sourceEvaluationId)).toBe(initialEvaluationId);

    const relistRes = await request(app)
      .get(`/api/evaluations/${caseId}`)
      .set(authHeader(clinicianToken));

    expect(relistRes.statusCode).toBe(200);
    expect(relistRes.body.data).toHaveLength(2);
    expect(relistRes.body.meta.total).toBe(2);
    expect(relistRes.body.meta.hasFinalEvaluation).toBe(true);
  });

  test('blocks parent access to clinician evaluation routes', async () => {
    const res = await request(app)
      .get(`/api/evaluations/${caseId}`)
      .set(authHeader(parentToken));

    expect(res.statusCode).toBe(403);
  });
});