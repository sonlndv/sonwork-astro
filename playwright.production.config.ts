import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/production',
  forbidOnly: true,
  fullyParallel: true,
  use: { baseURL: process.env.PRODUCTION_BASE_URL, browserName: 'chromium' },
  reporter: [['list']],
});
