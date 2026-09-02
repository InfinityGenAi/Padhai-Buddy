import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
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
  ],
});
