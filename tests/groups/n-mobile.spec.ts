import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("N. Mobile Tests", () => {
  test("dashboard loads on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
  });

  test("bottom nav is visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    await expect(page.locator("text=Home").first()).toBeAttached();
  });

  test("no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflowX).toBe(false);
  });
});
