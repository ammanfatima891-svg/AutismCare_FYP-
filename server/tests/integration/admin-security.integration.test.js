const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../../src/utils/email', () => {
  const sendEmail = jest.fn().mockResolvedValue(true);
  sendEmail.sendEmailWithAttachments = jest.fn().mockResolvedValue(true);
  return sendEmail;
});

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Admin Security Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    admin: `admin.security.${suffix}@test.com`,
    parent: `parent.security.${suffix}@test.com`,
    clinician: `clinician.security.${suffix}@test.com`,
    therapist: `therapist.security.${suffix}@test.com`,
    lab: `lab.security.${suffix}@test.com`,
  };

  let adminToken;
  let parentToken;
  let therapistToken;
  let labToken;
  let clinicianId;

  beforeAll(async () => {
    await connectTestDb();

    const adminPasswordHash = await bcrypt.hash(password, 12);
    await User.collection.insertOne({
      firstName: 'Admin',
      lastName: 'Security',
      email: emails.admin,
      password: adminPasswordHash,
      role: 'admin',
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Security',
      email: emails.parent,
      password,
      role: 'parent',
    });

    await registerUser(app, {
      firstName: 'Clinician',
      lastName: 'Pending',
      email: emails.clinician,
      password,
      role: 'clinician',
      specialization: 'Pediatrics',
      licenseNumber: `SEC-${suffix}`,
    });
    await registerUser(app, {
      firstName: 'Therapist',
      lastName: 'Security',
      email: emails.therapist,
      password,
      role: 'therapist',
      specialization: 'Speech Therapist',
      licenseNumber: `SEC-T-${suffix}`,
    });
    await registerUser(app, {
      firstName: 'Lab',
      lastName: 'Security',
      email: emails.lab,
      password,
      role: 'lab',
      labName: 'Secure Lab',
      accreditation: 'ISO-9999',
    });

    await activateUser(emails.admin, { approvalStatus: 'active' });
    await activateUser(emails.parent, { approvalStatus: 'active' });
    await activateUser(emails.clinician); // keep pending for moderation flow
    await activateUser(emails.therapist, { approvalStatus: 'active' });
    await activateUser(emails.lab, { approvalStatus: 'active' });

    const adminLogin = await loginUser(app, emails.admin, password);
    const parentLogin = await loginUser(app, emails.parent, password);
    const therapistLogin = await loginUser(app, emails.therapist, password);
    const labLogin = await loginUser(app, emails.lab, password);
    expect(adminLogin.statusCode).toBe(200);
    expect(parentLogin.statusCode).toBe(200);
    expect(therapistLogin.statusCode).toBe(200);
    expect(labLogin.statusCode).toBe(200);

    adminToken = adminLogin.body.token;
    parentToken = parentLogin.body.token;
    therapistToken = therapistLogin.body.token;
    labToken = labLogin.body.token;

    const clinician = await User.findOne({ email: emails.clinician }).lean();
    clinicianId = String(clinician._id);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [emails.admin, emails.parent, emails.clinician, emails.therapist, emails.lab] } });
    await disconnectTestDb();
  });

  test('blocks unauthenticated and non-admin users, allows admin moderation', async () => {
    const unauthRes = await request(app).get('/api/admin/pending-professionals');
    expect(unauthRes.statusCode).toBe(401);

    const parentRes = await request(app)
      .get('/api/admin/pending-professionals')
      .set(authHeader(parentToken));
    expect(parentRes.statusCode).toBe(403);

    const therapistRes = await request(app)
      .get('/api/admin/pending-professionals')
      .set(authHeader(therapistToken));
    expect(therapistRes.statusCode).toBe(403);

    const labRes = await request(app)
      .get('/api/admin/pending-professionals')
      .set(authHeader(labToken));
    expect(labRes.statusCode).toBe(403);

    const adminPendingRes = await request(app)
      .get('/api/admin/pending-professionals')
      .set(authHeader(adminToken));
    expect(adminPendingRes.statusCode).toBe(200);
    expect(Array.isArray(adminPendingRes.body.users)).toBe(true);
    expect(adminPendingRes.body.users.some((u) => String(u._id) === clinicianId)).toBe(true);

    const approveRes = await request(app)
      .post('/api/admin/update-professional-status')
      .set(authHeader(adminToken))
      .send({
        userId: clinicianId,
        status: 'active',
      });
    expect(approveRes.statusCode).toBe(200);

    const parentUpdateBlockedRes = await request(app)
      .post('/api/admin/update-professional-status')
      .set(authHeader(parentToken))
      .send({ userId: clinicianId, status: 'rejected' });
    expect(parentUpdateBlockedRes.statusCode).toBe(403);

    const malformedIdRes = await request(app)
      .post('/api/admin/update-professional-status')
      .set(authHeader(adminToken))
      .send({ userId: 'not-an-id', status: 'active' });
    expect(malformedIdRes.statusCode).toBe(400);

    const invalidStatusRes = await request(app)
      .post('/api/admin/update-professional-status')
      .set(authHeader(adminToken))
      .send({ userId: clinicianId, status: 'wrong' });
    expect(invalidStatusRes.statusCode).toBe(400);

    let throttled = false;
    for (let i = 0; i < 12; i += 1) {
      const abuseRes = await request(app)
        .post('/api/admin/update-professional-status')
        .set(authHeader(adminToken))
        .send({ userId: clinicianId, status: 'active' });
      if (abuseRes.statusCode === 429) {
        throttled = true;
        break;
      }
    }
    expect(throttled).toBe(true);

    const pendingAfterRes = await request(app)
      .get('/api/admin/pending-professionals')
      .set(authHeader(adminToken));
    expect(pendingAfterRes.statusCode).toBe(200);
    expect(pendingAfterRes.body.users.some((u) => String(u._id) === clinicianId)).toBe(false);
  });
});