const request = require('supertest');
jest.mock('../../src/utils/email', () => jest.fn().mockResolvedValue(true));
const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Cross-Role Workflow Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const parentEmail = `parent.workflow.${suffix}@test.com`;
  const clinicianEmail = `clinician.workflow.${suffix}@test.com`;

  let parentToken;
  let clinicianToken;
  let parentId;
  let childId;
  let caseId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Workflow',
      email: parentEmail,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Workflow',
      email: clinicianEmail,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `WF-${suffix}`,
    });

    await activateUser(parentEmail);
    await activateUser(clinicianEmail, { approvalStatus: 'active' });

    const p = await loginUser(app, parentEmail, password);
    const c = await loginUser(app, clinicianEmail, password);

    expect(p.statusCode).toBe(200);
    expect(c.statusCode).toBe(200);

    parentToken = p.body.token;
    clinicianToken = c.body.token;

    const parentDoc = await User.findOne({ email: parentEmail }).lean();
    parentId = String(parentDoc._id);
  });

  afterAll(async () => {
    await User.deleteMany({ email: new RegExp(`\\.${suffix}@test\\.com$`) });
    await disconnectTestDb();
  });

  test('parent creates child profile', async () => {
    const res = await request(app)
      .post('/api/child')
      .set(authHeader(parentToken))
      .send({
        firstName: 'Child',
        lastName: 'Workflow',
        dateOfBirth: '2020-01-15',
        gender: 'male',
        emergencyContact: 'Parent Workflow',
        emergencyPhone: '03001234567',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    childId = String(res.body.data.id || res.body.data._id);
    expect(childId).toBeTruthy();
  });

  test('clinician creates a case for that child', async () => {
    const res = await request(app)
      .post('/api/cases/create')
      .set(authHeader(clinicianToken))
      .send({
        parentId,
        childId,
      });

    expect([201, 409]).toContain(res.statusCode);

    if (res.statusCode === 201) {
      caseId = String(res.body.data._id);
    } else {
      const list = await request(app)
        .get('/api/cases')
        .set(authHeader(clinicianToken));
      const found = (list.body.data || []).find((c) => String(c.childId) === String(childId));
      caseId = found ? String(found._id) : null;
    }

    expect(caseId).toBeTruthy();
  });

  test('clinician can fetch created case list', async () => {
    const res = await request(app)
      .get('/api/cases')
      .set(authHeader(clinicianToken));

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('parent cannot access clinician-only case module', async () => {
    const res = await request(app)
      .get('/api/cases')
      .set(authHeader(parentToken));

    expect(res.statusCode).toBe(403);
  });
});
