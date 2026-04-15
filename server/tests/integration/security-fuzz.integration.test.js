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

describe('Security Fuzz Integration', () => {
  const suffix = Date.now();
  const password = 'Password123!';
  const email = `parent.fuzz.${suffix}@test.com`;

  let parentToken;
  let parentId;

  beforeAll(async () => {
    await connectTestDb();

    await registerUser(app, {
      firstName: 'Parent',
      lastName: 'Fuzz',
      email,
      password,
      role: 'parent',
    });
    await activateUser(email, { approvalStatus: 'active' });

    const login = await loginUser(app, email, password);
    expect(login.statusCode).toBe(200);
    parentToken = login.body.token;

    const parent = await User.findOne({ email }).lean();
    parentId = String(parent._id);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [email] } });
    await disconnectTestDb();
  });

  test('rejects injection-style login payloads and suspicious credential strings', async () => {
    const nosqlInjectionRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $ne: null },
        password: { $ne: null },
      });
    expect(nosqlInjectionRes.statusCode).not.toBe(200);

    const sqlLikeRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: "' OR 1=1 --",
        password: "' OR 'a'='a",
      });
    expect(sqlLikeRes.statusCode).not.toBe(200);
    expect([400, 401, 403]).toContain(sqlLikeRes.statusCode);
  });

  test('blocks expired token abuse and malformed-token bursts', async () => {
    const expiredToken = jwt.sign(
      { id: parentId, role: 'parent' },
      process.env.JWT_SECRET,
      { expiresIn: -10 }
    );

    const expiredRes = await request(app)
      .get('/api/child')
      .set(authHeader(expiredToken));
    expect(expiredRes.statusCode).toBe(401);

    const malformedResults = await Promise.all(
      Array.from({ length: 12 }).map((_, i) =>
        request(app)
          .get('/api/child')
          .set('Authorization', `Bearer malformed-token-${i}`)
      )
    );

    malformedResults.forEach((res) => {
      expect(res.statusCode).toBe(401);
    });
  });

  test('does not crash on invalid-id probes for protected resources', async () => {
    const invalidIdRes = await request(app)
      .get('/api/child/%7B%22$gt%22:%22%22%7D')
      .set(authHeader(parentToken));

    expect([400, 404]).toContain(invalidIdRes.statusCode);
  });

  test('handles wider endpoint fuzz corpus and confirms no refresh-token rotation surface', async () => {
    const noRefreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'fake-refresh-token' });
    expect([401, 404]).toContain(noRefreshRes.statusCode);

    const noRotateRes = await request(app)
      .post('/api/auth/session/rotate')
      .set(authHeader(parentToken));
    expect([401, 404]).toContain(noRotateRes.statusCode);

    const malformedTokenCorpus = [
      '/api/notifications',
      '/api/lab/requests',
      '/api/reports',
      '/api/messaging/conversations',
      '/api/activities/templates',
    ];

    const malformedTokenResults = await Promise.all(
      malformedTokenCorpus.map((endpoint) =>
        request(app)
          .get(endpoint)
          .set('Authorization', 'Bearer ###.###.###')
      )
    );

    malformedTokenResults.forEach((res) => {
      expect(res.statusCode).toBe(401);
    });

    const invalidIdEndpoints = [
      '/api/notifications/not-an-id/read',
      '/api/reports/view/not-an-id',
      '/api/sessionslots/not-an-id',
    ];

    const invalidIdResults = await Promise.all(
      invalidIdEndpoints.map((endpoint) =>
        endpoint.endsWith('/read')
          ? request(app).patch(endpoint).set(authHeader(parentToken))
          : request(app).get(endpoint).set(authHeader(parentToken))
      )
    );

    invalidIdResults.forEach((res) => {
      expect(res.statusCode).not.toBe(500);
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});