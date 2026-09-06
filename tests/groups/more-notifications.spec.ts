import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("More + Notifications Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/more/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('More')").first()).toBeAttached();
  });

  test("more page loads with navigation sections", async ({ page }) => {
    await expect(page.locator("h1:has-text('More')").first()).toBeAttached();
    await expect(page.locator("text=LEARN").first()).toBeAttached();
    await expect(page.locator("text=ORGANIZE").first()).toBeAttached();
    await expect(page.locator("text=ACCOUNT").first()).toBeAttached();
    await expect(page.locator("text=AI Tutor").first()).toBeAttached();
    await expect(page.locator("text=Resources").first()).toBeAttached();
    await expect(page.locator("text=Profile").first()).toBeAttached();
  });

  test("resources link navigates correctly", async ({ page }) => {
    await page.locator("text=Resources").first().click();
    await page.waitForURL("http://localhost:3000/dashboard/resources/");
    await expect(page.locator("h1:has-text('Resources')").first()).toBeAttached();
  });

  test("notifications empty state has no red dot", async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    const notifBtn = page.locator("button[aria-label='Notifications']");
    const redDot = notifBtn.locator("span.bg-accent-pink");
    await expect(redDot).not.toBeAttached();
  });
});
