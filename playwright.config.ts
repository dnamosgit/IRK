import { defineConfig, devices } from '@playwright/test';

// Runs against an already running server (npm run dev / npm start).
// BASE_URL defaults to http://localhost:3000.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'off',
    launchOptions: { executablePath: process.env.PW_CHROMIUM ?? undefined },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
