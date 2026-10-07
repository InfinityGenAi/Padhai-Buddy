import { chromium } from "@playwright/test";
import { readFileSync, existsSync, unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";
import http from "http";
import net from "net";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Set emulator environment variables BEFORE initializing Firebase Admin
// These must be set before any Firebase Admin SDK initialization
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
// Use test-project for token audience verification (emulator issues tokens with this audience)
process.env.FIREBASE_ADMIN_PROJECT_ID = "test-project";

const TEST_EMAIL = "test@padhai-buddy.test";
const TEST_PASSWORD = "TestPassword123!";
// Use test-project for Admin SDK initialization (matches token audience from emulator)
const PROJECT_ID = "test-project";

// Initialize Firebase Admin for emulator
function initializeFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({ projectId: PROJECT_ID });
}

const adminApp = initializeFirebaseAdmin();
const adminAuth = getAdminAuth(adminApp);
const adminDb = getFirestore(adminApp);

function isPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function waitForPort(port: number, host = "127.0.0.1", timeoutMs = 60000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(async () => {
      const open = await isPortOpen(port, host);
      if (open) {
        clearInterval(interval);
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timeout waiting for port ${port} on ${host}`));
      }
    }, 500);
  });
}

async function createTestUser(): Promise<{ uid: string; idToken: string }> {
  const authPort = 9099;
  await waitForPort(authPort, "127.0.0.1", 120000);

  const signupBody = JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    displayName: "Test User",
    returnSecureToken: true,
  });

  const signupResult = await new Promise<any>((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: authPort,
      path: "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(signupBody),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on("error", reject);
    req.write(signupBody);
    req.end();
  });

  if (signupResult.localId) {
    return { uid: signupResult.localId, idToken: signupResult.idToken };
  }

  if (signupResult.error && signupResult.error.message === "EMAIL_EXISTS") {
    const signinResult = await new Promise<any>((resolve, reject) => {
      const signinBody = JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        returnSecureToken: true,
      });
      const options = {
        hostname: "localhost",
        port: authPort,
        path: "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(signinBody),
        },
      };
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });
      req.on("error", reject);
      req.write(signinBody);
      req.end();
    });

    if (signinResult.localId && signinResult.idToken) {
      return { uid: signinResult.localId, idToken: signinResult.idToken };
    }

    if (signinResult.idToken) {
      const lookupResult = await new Promise<any>((resolve, reject) => {
        const options = {
          hostname: "localhost",
          port: authPort,
          path: "/identitytoolkit.googleapis.com/v1/accounts:lookup?key=test",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${signinResult.idToken}`,
          },
        };
        const lookupBody = JSON.stringify({ idToken: signinResult.idToken });
        const req = http.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          });
        });
        req.on("error", reject);
        req.write(lookupBody);
        req.end();
      });

      if (lookupResult.users && lookupResult.users.length > 0) {
        return { uid: lookupResult.users[0].localId, idToken: signinResult.idToken };
      }
    }
  }

  throw new Error(`Auth signup failed: ${JSON.stringify(signupResult)}`);
}

async function ensureFirestoreUser(uid: string) {
  console.log(`[global-setup] Creating Firestore user document for uid: ${uid}`);

  const userData = {
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
  };

  try {
    await adminDb.collection("users").doc(uid).set(userData);
    console.log("[global-setup] Firestore user document created successfully");

    // Verify the document exists
    const docSnap = await adminDb.collection("users").doc(uid).get();
    if (!docSnap.exists) {
      throw new Error("User document was not created");
    }
    console.log("[global-setup] User document verified:", docSnap.data());
  } catch (error) {
    console.error("[global-setup] Failed to create Firestore user document:", error);
    throw error;
  }
}

export default async function globalSetup() {
  const storageStatePath = resolve(__dirname, "../storageState.json");

  console.log("Global setup - ensuring test user exists...");

  let testUid: string;
  let testIdToken: string;
  try {
    const result = await createTestUser();
    testUid = result.uid;
    testIdToken = result.idToken;
    console.log("Global setup - test user ready with uid:", testUid);

    await ensureFirestoreUser(testUid);
    console.log("Global setup - ensured Firestore user document");
  } catch (error) {
    console.error("Global setup - failed to ensure test user:", error);
    throw error;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages and network failures for diagnostics
  page.on("console", msg => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", error => {
    console.log(`[Browser Page Error] ${error.message}`);
  });
  page.on("requestfailed", request => {
    console.log(`[Network Failed] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });
  page.on("response", response => {
    if (response.status() >= 400) {
      console.log(`[Network Error ${response.status()}] ${response.url()}`);
    }
  });

  try {
    console.log("Global setup - navigating to login page...");
    await page.addInitScript(() => {
      try { sessionStorage.setItem("pb-internal-nav", "1"); } catch {}
    });
    await page.goto("http://localhost:3000/login?from=landing", { waitUntil: "domcontentloaded", timeout: 60000 });

    const currentUrl = page.url();
    console.log("Global setup - current URL:", currentUrl);
    console.log("Global setup - page title:", await page.title());

    const bodyContent = await page.locator("body").innerText();
    console.log("Global setup - body content (first 200 chars):", bodyContent.substring(0, 200));

    await page.waitForSelector('input[type="email"]', { timeout: 120000, state: "attached" });

    const emailInput = page.locator('input[type="email"]');
    const count = await emailInput.count();
    console.log("Global setup - email input count:", count);

    if (count === 0) {
      throw new Error("Email input not found on login page");
    }

    console.log("Global setup - filling credentials...");
    await emailInput.fill(TEST_EMAIL, { force: true });
    await page.fill('input[type="password"]', TEST_PASSWORD, { force: true });
    await page.click('button[type="submit"]', { force: true });

    console.log("Global setup - waiting for dashboard...");
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 120000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
    } catch (e) {
      const finalUrl = page.url();
      console.error("Global setup - failed to reach dashboard. Current URL:", finalUrl);
      const finalBody = await page.locator("body").innerText();
      console.error("Global setup - page content:", finalBody.substring(0, 500));
      throw e;
    }

    const dashboardText = await page.locator("body").innerText();
    console.log("Global setup - dashboard loaded, first 200 chars:", dashboardText.substring(0, 200));

    await context.storageState({ path: storageStatePath });
    console.log("Global setup - storage state saved to:", storageStatePath);

    const metaPath = resolve(__dirname, "../test-user-meta.json");
    writeFileSync(metaPath, JSON.stringify({ uid: testUid, idToken: testIdToken }, null, 2));
    console.log("Global setup - test user metadata saved to:", metaPath);
  } catch (error) {
    console.error("Global setup failed:", error);
    try {
      await page.screenshot({ path: "test-results/global-setup-failure.png" });
    } catch {
      // ignore screenshot errors
    }
    throw error;
  } finally {
    await browser.close();
  }

  return { storageState: storageStatePath };
}