import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Read from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * E2E_USE_PRODUCTION=1: ใช้ production build + start แทน dev server เพื่อลด RAM
 * (next dev ใช้ ~1–2 GB; next start ใช้ ~200–400 MB)
 * ใช้เมื่อรัน e2e แล้วแรมไม่พอ: npm run test:e2e:low-memory
 */
const useProductionServer = process.env.E2E_USE_PRODUCTION === '1';

export default defineConfig({
  testDir: 'e2e',
  /* Temporarily disabled global setup - seeding happens in fixture */
  // globalSetup: require.resolve('./e2e/global-setup'),
  // globalTeardown: require.resolve('./e2e/global-teardown'),
  /* Test timeout */
  timeout: 60 * 1000,
  /* Use 1 worker to avoid race conditions with shared DB seeding (auth tests) */
  workers: 1,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter */
  reporter: [['html', { open: 'never' }]],
  use: {
    headless: true,
    baseURL: 'http://localhost:3006',
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* ลดการใช้ RAM ของ Chromium (headless) */
    launchOptions: {
      args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  webServer: {
    command: useProductionServer ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3006',
    reuseExistingServer: true,
    timeout: useProductionServer ? 360 * 1000 : 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
