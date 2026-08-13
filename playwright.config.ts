import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html"]],
  use: {
    baseURL: "http://localhost:3000",
    storageState: path.resolve(__dirname, "storageState.json"),
    trace: "on-first-retry",
    actionTimeout: 30000,
  },
  expect: { timeout: 30000 },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      timeout: 120000,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    timeout: 120000,
    reuseExistingServer: true,
  },
  globalSetup: path.resolve(__dirname, "tests/global-setup"),
});
