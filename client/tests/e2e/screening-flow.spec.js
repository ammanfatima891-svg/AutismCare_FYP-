const { test, expect } = require('@playwright/test');
const path = require('path');

const serverRoot = path.resolve(__dirname, '../../../server');
require(path.resolve(serverRoot, 'src/config/database.js'));
const mongoose = require(path.resolve(serverRoot, 'node_modules/mongoose'));
const { User } = require(path.resolve(serverRoot, 'src/models/User.js'));
const Questionnaire = require(path.resolve(serverRoot, 'src/models/Questionnaire.js'));
const mchatData = require(path.resolve(serverRoot, 'src/seeders/data/mchat.json'));

const API_BASE = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:4000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/asd_management';

const password = 'Password123!';

function buildSafeMchatResponses() {
  return mchatData.questions.map((question) => ({
    questionId: question.questionId,
    answer: question.reverseScored ? 'no' : 'yes',
  }));
}

test.describe('Critical screening flow', () => {
  const suffix = Date.now();
  const email = `e2e.screenflow.${suffix}@test.com`;
  let childId;

  test.beforeAll(async () => {
    await mongoose.connect(MONGO_URI);
    await Questionnaire.deleteMany({ name: 'MCHAT-R' });
    await Questionnaire.create({
      name: 'MCHAT-R',
      domains: ['MCHAT'],
      questions: mchatData.questions,
    });

    await User.deleteMany({ email });
    const u = await User.create({
      firstName: 'E2E',
      lastName: 'ScreenFlow',
      email,
      password,
      role: 'parent',
      isEmailVerified: true,
      approvalStatus: 'active',
    });
    const doc = await User.findById(u._id);
    doc.children.push({
      firstName: 'Screen',
      lastName: 'Child',
      dateOfBirth: new Date('2021-06-01'),
      gender: 'female',
      emergencyContact: 'E2E',
      emergencyPhone: '03001234567',
    });
    await doc.save({ validateModifiedOnly: true });
    childId = String(doc.children[doc.children.length - 1]._id);
  });

  test.afterAll(async () => {
    await User.deleteMany({ email });
    await mongoose.disconnect();
  });

  test('login in browser, submit M-CHAT-R via API, then history shows screening', async ({ page, request }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('form').getByRole('button', { name: /^login$/i }).click();
    await expect(page).toHaveURL(/parent-dashboard/, { timeout: 30000 });

    const token =
      await page.evaluate(() => sessionStorage.getItem('token') || localStorage.getItem('token'));
    expect(token).toBeTruthy();

    const calc = await request.post(`${API_BASE}/api/screening/calculate-screening`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        childId,
        questionnaireType: 'MCHAT-R',
        responses: buildSafeMchatResponses(),
        dob: '2021-06-01',
      },
    });
    expect(calc.ok()).toBeTruthy();
    const body = await calc.json();
    expect(body.success).toBeTruthy();
    expect(body.data?.result).toBeTruthy();

    const history = await request.get(`${API_BASE}/api/screening/screening-history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(history.ok()).toBeTruthy();
    const histJson = await history.json();
    expect(Array.isArray(histJson.data)).toBeTruthy();
    expect(histJson.data.length).toBeGreaterThan(0);
  });
});
