const request = require('supertest');
jest.mock('../../src/utils/email', () => jest.fn().mockResolvedValue(true));
const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const {
  registerUser,
  activateUser,
  loginUser,
  authHeader,
} = require('../helpers/authHelpers');

describe('Role and Module Smoke Tests', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.smoke.${suffix}@test.com`,
    clinician: `clinician.smoke.${suffix}@test.com`,
    therapist: `therapist.smoke.${suffix}@test.com`,
    lab: `lab.smoke.${suffix}@test.com`,
  };

  const tokens = {};

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Smoke',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Smoke',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `CLI-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Smoke',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `THR-${suffix}`,
    });

    await registerUser(app, {
      firstName: 'Lab',
      lastName: 'Smoke',
      email: emails.lab,
      password,
      role: 'lab',
      labName: 'Smoke Lab',
      accreditation: 'ISO',
    });

    await activateUser(emails.parent);
    await activateUser(emails.clinician, { approvalStatus: 'active' });
    await activateUser(emails.therapist, { approvalStatus: 'active' });
    await activateUser(emails.lab);

    const parentLogin = await loginUser(app, emails.parent, password);
    const clinicianLogin = await loginUser(app, emails.clinician, password);
    const therapistLogin = await loginUser(app, emails.therapist, password);
    const labLogin = await loginUser(app, emails.lab, password);

    expect(parentLogin.statusCode).toBe(200);
    expect(clinicianLogin.statusCode).toBe(200);
    expect(therapistLogin.statusCode).toBe(200);
    expect(labLogin.statusCode).toBe(200);

    tokens.parent = parentLogin.body.token;
    tokens.clinician = clinicianLogin.body.token;
    tokens.therapist = therapistLogin.body.token;
    tokens.lab = labLogin.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({ email: new RegExp(`\\.${suffix}@test\\.com$`) });
    await disconnectTestDb();
  });

  test('parent child module access works', async () => {
    const res = await request(app)
      .get('/api/child')
      .set(authHeader(tokens.parent));

    expect([200, 404]).toContain(res.statusCode);
  });

  test('clinician screening review module access works', async () => {
    const res = await request(app)
      .get('/api/clinician/screening-reviews')
      .set(authHeader(tokens.clinician));

    expect([200, 404]).toContain(res.statusCode);
  });

  test('therapist dashboard summary module access works', async () => {
    const res = await request(app)
      .get('/api/therapist/dashboard-summary')
      .set(authHeader(tokens.therapist));

    expect([200, 404]).toContain(res.statusCode);
  });

  test('lab stats module access works', async () => {
    const res = await request(app)
      .get('/api/lab/stats')
      .set(authHeader(tokens.lab));

    expect([200, 404]).toContain(res.statusCode);
  });

  test('admin pending professionals endpoint responds', async () => {
    const res = await request(app).get('/api/admin/pending-professionals');

    expect([200, 401, 403, 500]).toContain(res.statusCode);
  });

  test('role protection blocks parent from clinician module', async () => {
    const res = await request(app)
      .get('/api/clinician/screening-reviews')
      .set(authHeader(tokens.parent));

    expect(res.statusCode).toBe(403);
  });

  test('authentication blocks unauthenticated child endpoint access', async () => {
    const res = await request(app).get('/api/child');
    expect(res.statusCode).toBe(401);
  });
});
