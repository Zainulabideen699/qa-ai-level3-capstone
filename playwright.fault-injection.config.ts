import { defineConfig, devices } from '@playwright/test';

/**
 * Isolated Playwright configuration for Controlled Fault Injection (FI-01 & FI-02).
 *
 * Guarantees:
 * - Scoped exclusively to tests in `./tools/fault-injection/`.
 * - Isolated from normal test discovery in `./tests/`.
 * - Reuses the existing deterministic RCA reporter (`./tools/rca/rcaReporter.ts`).
 * - Zero retries (`retries: 0`) so intentional failures are immediately analyzed on attempt 0.
 */
export default defineConfig({
  testDir: './tools/fault-injection',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['./tools/rca/rcaReporter.ts'],
  ],
  use: {
    baseURL: 'https://automationexercise.com',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],
});
