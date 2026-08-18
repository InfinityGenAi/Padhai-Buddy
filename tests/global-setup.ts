import { chromium } from "@playwright/test";
import { readFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      process.env[key] = val;
    }
  }
}

loadEnv();

const TEST_EMAIL = "test@padhai-buddy.test";
const TEST_PASSWORD = "TestPassword123!";

async function ensureTestUser(): Promise<string> {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("FIREBASE_ADMIN_PRIVATE_KEY is not set in environment");
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }
  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  try {
    const userRecord = await auth.getUserByEmail(TEST_EMAIL);
    uid = userRecord.uid;
    if (!userRecord.emailVerified) {
      await auth.updateUser(uid, { emailVerified: true });
    }
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "auth/user-not-found") {
      const userRecord = await auth.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        displayName: "Test User",
        emailVerified: true,
      });
      uid = userRecord.uid;
    } else {
      throw e;
    }
  }

  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        uid,
        name: "Test User",
        email: TEST_EMAIL,
        class: 10,
        board: "CBSE",
        createdAt: Date.now(),
        preferences: {
          soundEnabled: false,
          animationsEnabled: true,
          theme: "system",
          notificationsEnabled: true,
          enterToSend: true,
          autoScroll: true,
          responseStyle: "balanced",
          stepByStep: true,
          language: "english",
        },
      },
      { merge: true },
    );

  return uid;
}

export default async function globalSetup() {
  const storageStatePath = resolve(__dirname, "../storageState.json");

  if (existsSync(storageStatePath)) {
    unlinkSync(storageStatePath);
  }

  await ensureTestUser();

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });

    const currentUrl = page.url();
    console.log("Global setup - current URL after navigation:", currentUrl);
    console.log("Global setup - page title:", await page.title());

    const bodyContent = await page.locator("body").innerText();
    console.log("Global setup - body content (first 200 chars):", bodyContent.substring(0, 200));

    const emailInput = page.locator('input[type="email"]');
    const count = await emailInput.count();
    console.log("Global setup - email input count:", count);

    await emailInput.waitFor({ timeout: 120000, state: "attached" });

    await emailInput.fill(TEST_EMAIL, { force: true });
    await page.fill('input[type="password"]', TEST_PASSWORD, { force: true });
    await page.click('button[type="submit"]', { force: true });

    await page.waitForURL("http://localhost:3000/dashboard", { timeout: 120000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("text=Hi,", { timeout: 120000 });

    await context.storageState({ path: storageStatePath });
  } catch (error) {
    console.error("Global setup failed:", error);
    await page.screenshot({ path: "test-results/global-setup-failure.png" });
    throw error;
  } finally {
    await browser.close();
  }

  return { storageState: storageStatePath };
}
