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
    // On mobile, the Resources link might be in a scrollable section with Framer Motion animations
    const resourcesLink = page.locator("text=Resources").first();
    // Wait for Framer Motion animations to complete - the element exists but is hidden during animation
    await expect(resourcesLink).toBeAttached({ timeout: 15000 });
    // Wait longer for animations to finish and element to become visible
    await page.waitForTimeout(2000);
    // Click the Playwright Locator directly
    await resourcesLink.click();
    await page.waitForURL("http://localhost:3000/dashboard/resources/", { timeout: 15000 });
    await expect(page.locator("h1:has-text('Resources')").first()).toBeAttached({ timeout: 10000 });
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
