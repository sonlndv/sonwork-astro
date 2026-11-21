import { defineConfig } from '@playwright/test';

// Tests run against the built site in dist/ (build it first: `npm run build:preview`).
const baseURL = process.env.TEST_BASE_URL;
if (!baseURL) throw new Error('Use npm run test:e2e to start an isolated, identity-checked server');
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  workers: 2,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
});
