import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
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
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120000,
    reuseExistingServer: true,
  },
  globalSetup: path.resolve(__dirname, "tests/global-setup"),
  globalTeardown: path.resolve(__dirname, "tests/global-teardown"),
});
