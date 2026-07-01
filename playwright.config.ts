import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3101", trace: "on-first-retry" },
  webServer: {
    command: "AUTH_BACKEND=mock DATA_BACKEND=mock npm run dev:e2e",
    url: "http://127.0.0.1:3101/login",
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } }
  ]
})
