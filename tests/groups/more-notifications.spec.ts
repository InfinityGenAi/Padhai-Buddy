import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("More + Notifications Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/more");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('More')").first()).toBeAttached();
  });

  test("more page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('More')").first()).toBeAttached();
    await expect(page.locator("text=Study Insights").first()).toBeAttached();
    await expect(page.locator("text=Help & Support").first()).toBeAttached();
    await expect(page.locator("text=About Padhai Buddy").first()).toBeAttached();
  });

  test("study insights link navigates correctly", async ({ page }) => {
    await page.locator("text=Study Insights").first().click();
    await page.waitForURL("http://localhost:3000/dashboard/progress");
    await expect(page.locator("h1:has-text('Progress')").first()).toBeAttached();
  });

  test("notifications empty state has no red dot", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    const notifBtn = page.locator("button[aria-label='Notifications']");
    const redDot = notifBtn.locator("span.bg-accent-pink");
    await expect(redDot).not.toBeAttached();
  });
});
