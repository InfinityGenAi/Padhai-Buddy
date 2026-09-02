import { chromium } from "@playwright/test";
import { readFileSync, existsSync, unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";
import http from "http";

const TEST_EMAIL = "test@padhai-buddy.test";
const TEST_PASSWORD = "TestPassword123!";
const PROJECT_ID = "infinity-gen-ai";

function isPortInUse(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port: number, timeoutMs = 60000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const req = http.get(`http://localhost:${port}`, () => {
        clearInterval(interval);
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for port ${port}`));
        }
      });
      req.setTimeout(1000);
    }, 500);
  });
}

async function createTestUser(): Promise<{ uid: string; idToken: string }> {
  const authPort = 9099;
  await waitForPort(authPort, 120000);

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

async function ensureFirestoreUser(uid: string, idToken: string) {
  const firestorePort = 8080;
  await waitForPort(firestorePort, 120000);

  const body = JSON.stringify({
    name: `projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    fields: {
      uid: { stringValue: uid },
      name: { stringValue: "Test User" },
      email: { stringValue: TEST_EMAIL },
      class: { integerValue: 10 },
      board: { stringValue: "CBSE" },
      createdAt: { integerValue: Date.now() },
      preferences: {
        mapValue: {
          fields: {
            soundEnabled: { booleanValue: false },
            animationsEnabled: { booleanValue: true },
            theme: { stringValue: "system" },
            notificationsEnabled: { booleanValue: true },
            enterToSend: { booleanValue: true },
            autoScroll: { booleanValue: true },
            responseStyle: { stringValue: "balanced" },
            stepByStep: { booleanValue: true },
            language: { stringValue: "english" },
          },
        },
      },
    },
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: firestorePort,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
        "Content-Length": Buffer.byteLength(body),
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
    req.write(body);
    req.end();
  });
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

    await ensureFirestoreUser(testUid, testIdToken);
    console.log("Global setup - ensured Firestore user document");
  } catch (error) {
    console.error("Global setup - failed to ensure test user:", error);
    throw error;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Global setup - navigating to login page...");
    await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded", timeout: 60000 });

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
    await page.waitForURL("http://localhost:3000/dashboard", { timeout: 120000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 60000 });

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
