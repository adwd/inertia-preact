import { defineConfig, devices } from '@playwright/test'

const port = 3100

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The production build, with a fresh in-memory database
  webServer: {
    command: 'pnpm build && node dist/server/main.js',
    url: `http://localhost:${port}`,
    env: { PORT: String(port) },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
