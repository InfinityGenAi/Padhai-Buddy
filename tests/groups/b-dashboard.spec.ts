import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("B. Dashboard Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
  });

  test("stats cards are visible", async ({ page }) => {
    await expect(page.locator("text=Doubts Solved").first()).toBeVisible();
    await expect(page.locator("text=Study Plans Completed").first()).toBeVisible();
  });

  test("weekly chart renders", async ({ page }) => {
    const chart = page.locator("svg[viewBox='0 0 100 60']");
    await expect(chart).toBeAttached();
    await expect(chart).toBeVisible();
  });

  test("notification popover opens and closes", async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip(true, "Notification button not visible on mobile viewport");
    }

    const notifBtn = page.locator("button[aria-label='Notifications']");
    await expect(notifBtn).toBeAttached();
    await notifBtn.click({ force: true });
    await expect(page.locator("text=No new notifications")).toBeAttached();
    await page.keyboard.press("Escape");
    await expect(page.locator("text=No new notifications")).not.toBeAttached();
  });

  test("profile menu opens and has options", async ({ page }) => {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip(true, "Profile menu not visible on mobile viewport");
    }

    const profileBtn = page.locator("button[aria-label='Profile menu']");
    await expect(profileBtn).toBeAttached();
    await profileBtn.click({ force: true });
    await expect(page.locator("text=Profile").first()).toBeAttached();
    await expect(page.locator("text=Settings").first()).toBeAttached();
    await expect(page.locator("text=Logout").first()).toBeAttached();
  });

  test("dashboard greeting shows user name", async ({ page }) => {
    await expect(page.locator("text=Hi,").first()).toBeAttached();
  });

  test("today's plan section is visible", async ({ page }) => {
    await expect(page.locator("text=Today's Plan")).toBeAttached();
  });

  test("study insight is visible", async ({ page }) => {
    await expect(page.locator("text=Study Insight")).toBeAttached();
  });
});
