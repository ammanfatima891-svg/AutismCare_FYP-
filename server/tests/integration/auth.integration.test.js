const request = require('supertest');
jest.mock('../../src/utils/email', () => jest.fn().mockResolvedValue(true));
const { app } = require('../../src/server');
const { User } = require('../../src/models/User');
const { connectTestDb, disconnectTestDb } = require('../helpers/testDb');
const { registerUser, activateUser, loginUser } = require('../helpers/authHelpers');

describe('Auth Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const parentEmail = `parent.auth.${suffix}@test.com`;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await User.deleteMany({ email: new RegExp(`\\.${suffix}@test\\.com$`) });
    await disconnectTestDb();
  });

  test('registers a parent', async () => {
    const res = await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Auth',
      email: parentEmail,
      password,
      role: 'parent',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/registered/i);
  });

  test('blocks login before email verification', async () => {
    const res = await loginUser(app, parentEmail, password);
    expect(res.statusCode).toBe(403);
    expect(String(res.body.message || '')).toMatch(/verify/i);
  });

  test('allows login after verification', async () => {
    await activateUser(parentEmail);
    const res = await loginUser(app, parentEmail, password);

    expect(res.statusCode).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.role).toBe('parent');
  });

  test('rejects public admin registration', async () => {
    const res = await registerUser(app, {
      firstName: 'Admin',
      lastName: 'Blocked',
      email: `admin.blocked.${suffix}@test.com`,
      password,
      role: 'admin',
    });

    expect(res.statusCode).toBe(403);
  });

  test('returns invalid token response for verify-email with bad token', async () => {
    const res = await request(app).get('/api/auth/verify-email/bad-token-value');
    expect([400, 500]).toContain(res.statusCode);
  });
});
