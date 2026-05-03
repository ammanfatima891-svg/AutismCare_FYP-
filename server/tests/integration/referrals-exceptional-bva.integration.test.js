const mongoose = require('mongoose');
const request = require('supertest');

jest.mock('../../src/utils/email', () => jest.fn().mockResolvedValue(true));

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { Referral } = require('../../src/models/Referral');
const { ChildCase } = require('../../src/models/ChildCase');
const { ClinicalEvaluation } = require('../../src/models/ClinicalEvaluation');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Referrals Exceptional and BVA Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';

  const emails = {
    clinician: `clinician.ref.${suffix}@test.com`,
    speechTherapist: `speech.ref.${suffix}@test.com`,
    occupationalTherapist: `ot.ref.${suffix}@test.com`,
  };

  let clinicianToken;
  let speechTherapistToken;
  let clinicianId;
  let fakeCaseId;
  let validCaseId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Ref',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `RCL-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Speech',
      lastName: 'Therapist',
      email: emails.speechTherapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `RST-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Occupational',
      lastName: 'Therapist',
      email: emails.occupationalTherapist,
      password,
      role: 'therapist',
      specialization: 'Occupational Therapist',
      licenseNumber: `ROT-${suffix}`,
    });

    await activateUser(emails.clinician, { approvalStatus: 'active' });
    await activateUser(emails.speechTherapist, { approvalStatus: 'active' });
    await activateUser(emails.occupationalTherapist, { approvalStatus: 'active' });

    const clinicianLogin = await loginUser(app, emails.clinician, password);
    const speechLogin = await loginUser(app, emails.speechTherapist, password);

    expect(clinicianLogin.statusCode).toBe(200);
    expect(speechLogin.statusCode).toBe(200);

    clinicianToken = clinicianLogin.body.token;
    speechTherapistToken = speechLogin.body.token;

    const clinicianDoc = await User.findOne({ email: emails.clinician }).lean();
    clinicianId = String(clinicianDoc._id);

    fakeCaseId = new mongoose.Types.ObjectId().toString();

    const caseDoc = await ChildCase.create({
      childId: new mongoose.Types.ObjectId(),
      parentId: new mongoose.Types.ObjectId(),
      clinicianId,
      status: 'DIAGNOSIS_READY',
    });
    validCaseId = String(caseDoc._id);

    await ClinicalEvaluation.create({
      caseId: caseDoc._id,
      clinicianId,
      observations: 'final eval for referral validation cases',
      status: 'FINALIZED',
    });
  });

  afterAll(async () => {
    await Referral.deleteMany({ notes: new RegExp(`ref-test-${suffix}`) });
    await ClinicalEvaluation.deleteMany({ clinicianId });
    await ChildCase.deleteMany({ clinicianId });
    await User.deleteMany({ email: new RegExp(`\\.ref\\.${suffix}@test\\.com$`) });
    await disconnectTestDb();
  });

  test('Exceptional: therapist cannot create referrals (route guard)', async () => {
    const res = await request(app)
      .post('/api/referrals')
      .set(authHeader(speechTherapistToken))
      .send({
        caseId: fakeCaseId,
        therapistType: 'Speech Therapist',
        priority: 'high',
      });

    expect(res.statusCode).toBe(403);
  });

  test('Exceptional: create referral fails when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/referrals')
      .set(authHeader(clinicianToken))
      .send({});

    expect(res.statusCode).toBe(400);
  });

  test('Exceptional: create referral rejects invalid case id', async () => {
    const res = await request(app)
      .post('/api/referrals')
      .set(authHeader(clinicianToken))
      .send({
        caseId: 'bad-case-id',
        therapistType: 'Speech Therapist',
        priority: 'high',
      });

    expect(res.statusCode).toBe(400);
  });

  test('BVA: create referral rejects invalid therapistType enum', async () => {
    const res = await request(app)
      .post('/api/referrals')
      .set(authHeader(clinicianToken))
      .send({
        caseId: validCaseId,
        therapistType: 'Invalid Type',
        priority: 'high',
      });

    expect(res.statusCode).toBe(400);
  });

  test('BVA: create referral rejects invalid priority enum', async () => {
    const res = await request(app)
      .post('/api/referrals')
      .set(authHeader(clinicianToken))
      .send({
        caseId: validCaseId,
        therapistType: 'Speech Therapist',
        priority: 'urgent',
      });

    expect(res.statusCode).toBe(400);
  });

  test('Exceptional: create referral rejects duplicate active referral for same case/type', async () => {
    const caseId = new mongoose.Types.ObjectId();

    await ChildCase.create({
      _id: caseId,
      childId: new mongoose.Types.ObjectId(),
      parentId: new mongoose.Types.ObjectId(),
      clinicianId,
      status: 'DIAGNOSIS_READY',
    });

    await ClinicalEvaluation.create({
      caseId,
      clinicianId,
      observations: 'final eval present for duplicate check',
      status: 'final',
    });

    await Referral.create({
      caseId,
      clinicianId,
      therapistType: 'Speech Therapist',
      priority: 'high',
      status: 'pending',
      notes: `ref-test-${suffix}-dup-active-existing`,
    });

    const res = await request(app)
      .post('/api/referrals')
      .set(authHeader(clinicianToken))
      .send({
        caseId,
        therapistType: 'Speech Therapist',
        priority: 'medium',
        notes: `ref-test-${suffix}-dup-active-request`,
      });

    expect(res.statusCode).toBe(409);
  });

  test('Exceptional: accept referral rejects invalid referral id', async () => {
    const res = await request(app)
      .patch('/api/referrals/not-an-id/accept')
      .set(authHeader(speechTherapistToken));

    expect(res.statusCode).toBe(400);
  });

  test('Exceptional: clinician cannot accept referral (route guard)', async () => {
    const referral = await Referral.create({
      caseId: new mongoose.Types.ObjectId(),
      clinicianId: new mongoose.Types.ObjectId(),
      therapistType: 'Speech Therapist',
      priority: 'medium',
      status: 'pending',
      notes: `ref-test-${suffix}-guard-accept`,
    });

    const res = await request(app)
      .patch(`/api/referrals/${referral._id}/accept`)
      .set(authHeader(clinicianToken));

    expect(res.statusCode).toBe(403);
  });

  test('Exceptional: therapist cannot accept non-matching referral type', async () => {
    const referral = await Referral.create({
      caseId: new mongoose.Types.ObjectId(),
      clinicianId: new mongoose.Types.ObjectId(),
      therapistType: 'Occupational Therapist',
      priority: 'medium',
      status: 'pending',
      notes: `ref-test-${suffix}-no-match`,
    });

    const res = await request(app)
      .patch(`/api/referrals/${referral._id}/accept`)
      .set(authHeader(speechTherapistToken));

    expect(res.statusCode).toBe(403);
  });

  test('Flow/BVA: matching therapist can accept pending referral', async () => {
    const referral = await Referral.create({
      caseId: new mongoose.Types.ObjectId(),
      clinicianId: new mongoose.Types.ObjectId(),
      therapistType: 'Speech Therapist',
      priority: 'low',
      status: 'pending',
      notes: `ref-test-${suffix}-accept-ok`,
    });

    const res = await request(app)
      .patch(`/api/referrals/${referral._id}/accept`)
      .set(authHeader(speechTherapistToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });

  test('Exceptional: cannot accept referral already accepted', async () => {
    const referral = await Referral.create({
      caseId: new mongoose.Types.ObjectId(),
      clinicianId: new mongoose.Types.ObjectId(),
      therapistType: 'Speech Therapist',
      priority: 'high',
      status: 'accepted',
      notes: `ref-test-${suffix}-accept-again`,
    });

    const res = await request(app)
      .patch(`/api/referrals/${referral._id}/accept`)
      .set(authHeader(speechTherapistToken));

    expect(res.statusCode).toBe(400);
  });

  test('Exceptional: start referral rejects invalid referral id', async () => {
    const res = await request(app)
      .patch('/api/referrals/not-an-id/start')
      .set(authHeader(speechTherapistToken));

    expect(res.statusCode).toBe(400);
  });

  test('Exceptional: clinician cannot start referral (route guard)', async () => {
    const referral = await Referral.create({
      caseId: new mongoose.Types.ObjectId(),
      clinicianId: new mongoose.Types.ObjectId(),
      therapistType: 'Speech Therapist',
      priority: 'medium',
      status: 'accepted',
      notes: `ref-test-${suffix}-guard-start`,
    });

    const res = await request(app)
      .patch(`/api/referrals/${referral._id}/start`)
      .set(authHeader(clinicianToken));

    expect(res.statusCode).toBe(403);
  });

  test('Exceptional: cannot start referral in pending state', async () => {
    const caseDoc = await ChildCase.create({
      childId: new mongoose.Types.ObjectId(),
      parentId: new mongoose.Types.ObjectId(),
      clinicianId,
      status: 'THERAPY',
    });
    const referral = await Referral.create({
      caseId: caseDoc._id,
      clinicianId: new mongoose.Types.ObjectId(),
      therapistType: 'Speech Therapist',
      priority: 'medium',
      status: 'pending',
      notes: `ref-test-${suffix}-start-pending`,
    });

    const res = await request(app)
      .patch(`/api/referrals/${referral._id}/start`)
      .set(authHeader(speechTherapistToken));

    expect(res.statusCode).toBe(400);
  });

  test('Flow: can start referral in accepted state', async () => {
    const caseDoc = await ChildCase.create({
      childId: new mongoose.Types.ObjectId(),
      parentId: new mongoose.Types.ObjectId(),
      clinicianId,
      status: 'THERAPY',
    });
    const referral = await Referral.create({
      caseId: caseDoc._id,
      clinicianId: new mongoose.Types.ObjectId(),
      therapistType: 'Speech Therapist',
      priority: 'high',
      status: 'accepted',
      notes: `ref-test-${suffix}-start-ok`,
    });

    const res = await request(app)
      .patch(`/api/referrals/${referral._id}/start`)
      .set(authHeader(speechTherapistToken));

    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('in-progress');
    expect(String(res.body.caseId)).toBe(String(referral.caseId));
    expect(res.body.therapyCase).toBeTruthy();
  });
});
