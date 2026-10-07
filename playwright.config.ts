import { defineConfig, devices } from "@playwright/test";
import * as path from "path";

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
    timeout: 600000,
    reuseExistingServer: false,
    env: {
      FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
      FIRESTORE_EMULATOR_HOST: "localhost:8080",
      FIREBASE_ADMIN_PROJECT_ID: "test-project",
      NEXT_PUBLIC_USE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
      NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: "localhost:8080",
      NEXT_PUBLIC_FIREBASE_API_KEY: "test",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test-project.appspot.com",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123456789",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789:web:abcdef",
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-XXXXXXXXXX",
      GROQ_API_KEY: "test-groq-key",
    },
  },
  globalSetup: path.resolve(__dirname, "tests/global-setup"),
  globalTeardown: path.resolve(__dirname, "tests/global-teardown"),
});
