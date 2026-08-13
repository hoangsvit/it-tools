import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const baseUrl = process.env.BASE_URL || 'http://localhost:5050';
const useWebServer = process.env.NO_WEB_SERVER !== 'true';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './src',
  testMatch: /\.e2e\.(spec\.)?ts$/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Stop inside Playwright with useful output instead of waiting for the GitHub job hard timeout. */
  globalTimeout: isCI ? 9 * 60 * 1000 : 0,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Keep one retry on CI without tripling a slow shard. */
  retries: isCI ? 1 : 0,
  /* Two workers per shard keeps the cross-browser suite below the job timeout. */
  workers: isCI ? 2 : undefined,
  /* Stream progress in Actions while preserving an HTML report for diagnostics. */
  reporter: isCI
    ? [
        ['line'],
        ['html', { open: 'never' }],
      ]
    : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: baseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    testIdAttribute: 'data-test-id',
    locale: 'en-GB',
    timezoneId: 'Europe/Paris',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Run your local preview server before starting the tests. */
  ...(useWebServer
    && {
      webServer: {
        command: 'npm run preview',
        url: 'http://localhost:5050',
        reuseExistingServer: !isCI,
        timeout: 60 * 1000,
      },
    }
  ),
});
