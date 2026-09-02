import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

// Set emulator environment variables for test execution
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    storageState: path.resolve(__dirname, "storageState.json"),
    trace: "on-first-retry",
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },
  expect: {
    timeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      timeout: 60000,
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
      },
      timeout: 60000,
    },
  ],
  webServer: {
    command: "node scripts/start-test-server.js",
    url: "http://localhost:3000",
    timeout: 300000,
    reuseExistingServer: true,
  },
  globalSetup: path.resolve(__dirname, "tests/global-setup"),
  globalTeardown: path.resolve(__dirname, "tests/global-teardown"),
});
