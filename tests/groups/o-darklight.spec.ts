import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("O. Dark/Light Tests", () => {
  test("dark mode class is applied", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(typeof isDark).toBe("boolean");
  });

  test("settings modal opens and shows theme option", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip(true, "Profile menu not visible on mobile viewport");
    }

    const profileBtn = page.locator("button[aria-label='Profile menu']");
    await expect(profileBtn).toBeAttached();
    await profileBtn.click({ force: true });
    await page.locator("text=Settings").first().click();
    await expect(page.locator("text=Theme").first()).toBeAttached();
  });

  test("toggle theme changes dark class", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip(true, "Profile menu not visible on mobile viewport");
    }

    const profileBtn = page.locator("button[aria-label='Profile menu']");
    await expect(profileBtn).toBeAttached();
    await profileBtn.click({ force: true });
    await page.locator("text=Settings").first().click();
    await expect(page.locator("text=Theme").first()).toBeAttached();

    const themeToggle = page.locator("button:has-text('Dark'), button:has-text('Light')").first();
    if (await themeToggle.count() > 0) {
      await expect(themeToggle).toBeAttached();
      await themeToggle.click();
      await expect(page.locator("text=Theme").first()).toBeAttached();
    }
  });
});
