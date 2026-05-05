import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "./e2e-report" }],
    ["json", { outputFile: "./e2e-report/results.json" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: process.env.CI ? 60000 : undefined,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(!process.env.CI ? [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }] : []),
  ],
  webServer: {
    command: "pnpm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
