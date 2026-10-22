import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the static web export of the app.
// Build it first: `npm run build:web`. Port 4173 avoids Metro's 8081.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'he-IL',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'phone-light', use: { ...devices['Pixel 7'], colorScheme: 'light' } },
    { name: 'phone-dark', use: { ...devices['Pixel 7'], colorScheme: 'dark' } },
  ],
  webServer: {
    command: 'npx serve dist-web -l 4173 -s',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
