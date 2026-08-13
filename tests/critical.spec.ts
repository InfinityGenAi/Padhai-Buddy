import { test, expect } from "@playwright/test";

const ROUTES = [
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/dashboard",
  "/dashboard/chat",
  "/dashboard/history",
  "/dashboard/photo-doubt",
];

test.describe("Critical UI/UX Tests", () => {
  for (const route of ROUTES) {
    test(`page loads without console errors: ${route}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2500);

      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("Static Server")
      );
      expect(criticalErrors).toEqual([]);
    });
  }

  test("dashboard shows stats cards", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await page.waitForSelector("text=Doubts Solved", { timeout: 15000 });
    await page.waitForSelector("text=Study Plans Completed", { timeout: 15000 });
  });

  test("dashboard chart renders", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const chart = page.locator("svg[viewBox='0 0 100 60']");
    await expect(chart).toBeAttached();
  });

  test("notification button opens popover", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const notifBtn = page.locator("button[aria-label='Notifications']");
    await expect(notifBtn).toBeAttached();
    await notifBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=No new notifications")).toBeAttached();
  });

  test("profile button opens menu", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const profileBtn = page.locator("button[aria-label='Profile menu']");
    await expect(profileBtn).toBeAttached();
    await profileBtn.click();
    await page.waitForTimeout(300);
    const header = page.locator("header");
    await expect(header.locator("text=Profile")).toBeAttached();
    await expect(header.locator("text=Settings")).toBeAttached();
    await expect(header.locator("text=Logout")).toBeAttached();
  });

  test("chat page loads", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard/chat");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await page.waitForSelector("text=Chat Doubt", { timeout: 15000 });
  });

  test("history page loads", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard/history");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await page.waitForSelector("text=Doubt History", { timeout: 15000 });
  });
});
