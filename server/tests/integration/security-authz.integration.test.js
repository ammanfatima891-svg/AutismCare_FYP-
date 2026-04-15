const jwt = require('jsonwebtoken');
const request = require('supertest');

jest.mock('../../src/utils/email', () => {
  const sendEmail = jest.fn().mockResolvedValue(true);
  sendEmail.sendEmailWithAttachments = jest.fn().mockResolvedValue(true);
  return sendEmail;
});

const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser, authHeader } = require('../helpers/authHelpers');

describe('Security AuthZ Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const emails = {
    parent: `parent.security.${suffix}@test.com`,
  };

  let parentToken;
  let parentId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Security',
      email: emails.parent,
      password,
      role: 'parent',
    });
    await activateUser(emails.parent, { approvalStatus: 'active' });

    const parentLogin = await loginUser(app, emails.parent, password);
    expect(parentLogin.statusCode).toBe(200);
    parentToken = parentLogin.body.token;

    const parent = await User.findOne({ email: emails.parent }).lean();
    parentId = String(parent._id);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [emails.parent] } });
    await disconnectTestDb();
  });

  test('rejects missing and malformed auth headers on protected route', async () => {
    const missingAuthRes = await request(app).get('/api/child');
    expect(missingAuthRes.statusCode).toBe(401);

    const malformedAuthRes = await request(app)
      .get('/api/child')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(malformedAuthRes.statusCode).toBe(401);
  });

  test('does not allow role escalation by forging JWT role claim', async () => {
    const genuineParentAccessRes = await request(app)
      .get('/api/admin/pending-professionals')
      .set(authHeader(parentToken));
    expect(genuineParentAccessRes.statusCode).toBe(403);

    const forgedAdminToken = jwt.sign(
      { id: parentId, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const forgedAccessRes = await request(app)
      .get('/api/admin/pending-professionals')
      .set(authHeader(forgedAdminToken));

    expect(forgedAccessRes.statusCode).toBe(403);
  });
});