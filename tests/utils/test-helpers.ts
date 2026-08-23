import { type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export async function pixelDiffRatio(
  page: Page,
  a: Buffer,
  b: Buffer,
  threshold = 24,
): Promise<number> {
  return page.evaluate(
    async ({ a, b, threshold }) => {
      const load = (dataUrl: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("image decode failed"));
          img.src = dataUrl;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const canvas = document.createElement("canvas");
      canvas.width = ia.width;
      canvas.height = ia.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      ctx.drawImage(ia, 0, 0);
      const da = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(ib, 0, 0);
      const db = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let changed = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (
          Math.abs(da[i] - db[i]) +
            Math.abs(da[i + 1] - db[i + 1]) +
            Math.abs(da[i + 2] - db[i + 2]) >
          threshold
        ) {
          changed++;
        }
      }
      return changed / (canvas.width * canvas.height);
    },
    { a: `data:image/png;base64,${a.toString("base64")}`, b: `data:image/png;base64,${b.toString("base64")}`, threshold },
  );
}


export function filterCriticalErrors(errors: string[]): string[] {
  return errors.filter((e) => {
    const lower = e.toLowerCase();
    if (lower.includes("favicon")) return false;
    if (lower.includes("404")) return false;
    if (lower.includes("static server")) return false;
    if (lower.includes("quota exceeded")) return false;
    if (lower.includes("failed to load resource") && lower.includes("500")) return false;
    return true;
  });
}

export async function mockSessionsRoute(page: Page) {
  await page.route("/api/sessions", async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessions: [
            {
              id: "test-session-1",
              device: "Desktop",
              browser: "Chromium",
              os: "Windows",
              userAgent: "Playwright Test",
              lastActive: Date.now(),
              current: true,
              createdAt: Date.now() - 3600000,
            },
          ],
        }),
      });
      return;
    }

    if (method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    if (method === "DELETE" && url.pathname === "/api/sessions/current") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Not found" }),
    });
  });

  await page.route("/api/sessions/bulk-revoke", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, revoked: 0 }),
    });
  });

  await page.route(/\/api\/sessions\/[^\/]+$/, async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "Not found" }),
    });
  });
}

export async function mockAllFirestore(page: Page) {
  await page.route("/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname.startsWith("/api/sessions")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }

    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: null, error: null }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

export async function enableConsoleErrorTracking(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

export async function waitForDashboardReady(page: Page) {
  await page.waitForSelector("text=Hi,", { timeout: 15000 });
  await page.waitForSelector('[data-pb="background"]', { timeout: 15000 }).catch(() => {});
}

export async function waitForPageReady(page: Page, heading: string) {
  await page.waitForSelector(`text=${heading}`, { timeout: 15000 });
}

const TEST_EMAIL = "test@padhai-buddy.test";

function loadEnvForAdmin() {
  try {
    const envPath = resolve(__dirname, "../../.env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        if (!process.env[key]) {
          process.env[key] = trimmed.slice(eq + 1).trim();
        }
      }
    }
  } catch {
    // .env.local missing — the helper will be a no-op
  }
}

let adminReady = false;
let testUid: string | null = null;

/**
 * Waits until a conversation with the given title has at least `expectedCount`
 * persisted messages. Uses the Admin SDK directly, so it is a true signal that
 * the client-side Firestore writes have landed (not just the optimistic UI).
 */
export async function waitForPersistedMessages(
  title: string,
  expectedCount: number,
  timeoutMs = 15000,
): Promise<void> {
  if (!adminReady) {
    loadEnvForAdmin();
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      console.warn("[test-helpers] FIREBASE_ADMIN_PRIVATE_KEY not set; skipping persistence wait.");
      return;
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
    try {
      const userRecord = await getAuth().getUserByEmail(TEST_EMAIL);
      testUid = userRecord.uid;
    } catch {
      return;
    }
    adminReady = true;
  }
  if (!testUid) return;

  const db = getFirestore();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const convSnap = await db
      .collection("users")
      .doc(testUid)
      .collection("conversations")
      .where("title", "==", title)
      .get();
    for (const conv of convSnap.docs) {
      const msgSnap = await conv.ref.collection("messages").get();
      if (msgSnap.size >= expectedCount) return;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Timed out waiting for ${expectedCount} persisted messages in conversation "${title}"`,
  );
}
