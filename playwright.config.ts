import { defineConfig, devices } from '@playwright/test'

// BASE_URL runs the suite against a deployed site instead of a local build.
const remote = process.env.BASE_URL

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: remote ?? 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: remote
    ? undefined
    : {
        command: 'npx vite build && npx vite preview --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    // Safari's engine, where an iPhone's video and speech quirks live.
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testMatch: /install|offline/ }
  ]
})
