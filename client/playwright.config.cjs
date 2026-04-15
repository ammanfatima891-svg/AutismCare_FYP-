const { defineConfig, devices } = require('@playwright/test');
const { resolve } = require('path');

const repoRoot = resolve(__dirname, '..');
const serverDir = resolve(repoRoot, 'server');
const clientDir = __dirname;

const ciWebServers = [
  {
    command: 'npm run start:ci',
    cwd: serverDir,
    url: 'http://127.0.0.1:4000/api/health',
    reuseExistingServer: false,
    timeout: 180000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    cwd: clientDir,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
];

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.CI
    ? ciWebServers
    : {
        command: 'npm run dev',
        cwd: repoRoot,
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: true,
        timeout: 120000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});