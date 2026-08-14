import { type Page } from "@playwright/test";


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
