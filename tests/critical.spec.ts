import { test, expect } from "@playwright/test";
import { mockSessionsRoute, filterCriticalErrors } from "./utils/test-helpers";

const ROUTES = [
  "/",
  "/login/",
  "/signup/",
  "/onboarding/",
  "/forgot-password/",
  "/reset-password/",
  "/dashboard/",
  "/dashboard/chat/",
  "/dashboard/history/",
  "/dashboard/photo-doubt/",
];

test.describe("Critical UI/UX Tests", () => {
  for (const route of ROUTES) {
    test(`page loads without console errors: ${route}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await mockSessionsRoute(page);
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("body")).toBeVisible();

      expect(filterCriticalErrors(consoleErrors)).toEqual([]);
    });
  }

  test("dashboard shows stats cards", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    await expect(page.locator("text=Doubts Solved").first()).toBeVisible();
    await expect(page.locator("text=Study Time").first()).toBeVisible();
  });

  test("dashboard shows this week overview", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    await expect(page.locator("text=This Week Overview").first()).toBeAttached();
  });

  test("notification button opens popover", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip(true, "Notification button not visible on mobile viewport");
    }

    const notifBtn = page.locator("button[aria-label='Notifications']");
    await expect(notifBtn).toBeAttached();
    await notifBtn.click({ force: true });
    await expect(page.locator("text=No new notifications")).toBeAttached();
  });

  test("profile button opens menu", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip(true, "Profile menu not visible on mobile viewport");
    }

    const profileBtn = page.locator("button[aria-label='Profile menu']");
    await expect(profileBtn).toBeAttached();
    await profileBtn.click({ force: true });
    const header = page.locator("header");
    await expect(header.locator("text=Profile")).toBeAttached();
    await expect(header.locator("text=Settings")).toBeAttached();
    await expect(header.locator("text=Logout")).toBeAttached();
  });

  test("chat page loads", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/chat/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    await expect(page.locator("text=Padhai Buddy AI Tutor").first()).toBeAttached();
  });

  test("history page loads", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/history/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    await expect(page.locator("text=History").first()).toBeAttached();
    await expect(page.locator("text=Doubts (").first()).toBeAttached();
    await expect(page.locator("text=Chats (").first()).toBeAttached();
  });
});
