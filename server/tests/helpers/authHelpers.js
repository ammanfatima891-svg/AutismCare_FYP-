const request = require('supertest');
const { User } = require('../../src/models/User');

async function registerUser(app, payload) {
  return request(app).post('/api/auth/register').send(payload);
}

async function activateUser(email, extra = {}) {
  await User.collection.updateOne(
    { email },
    { $set: { isEmailVerified: true, ...extra } }
  );
}

async function loginUser(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  registerUser,
  activateUser,
  loginUser,
  authHeader,
};
