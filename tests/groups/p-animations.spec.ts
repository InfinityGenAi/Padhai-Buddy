import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("P. Animation Tests", () => {
  test("animations toggle in settings", async ({ page }) => {
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
    await expect(page.locator("text=Animations").first()).toBeAttached();
  });

  test("dashboard loads with animations", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    await expect(page.locator('[data-pb="background"]').first()).toBeAttached();
  });

  test("animations disabled removes motion", async ({ page }) => {
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

    const animToggle = page.locator('button[role="switch"][aria-label="Animations"]');
    await expect(animToggle).toBeAttached();

    if ((await animToggle.getAttribute("aria-checked")) === "true") {
      await animToggle.click();
    }
    await expect(animToggle).toHaveAttribute("aria-checked", "false");

    const ambientLight = page.locator('[data-pb="ambient-light"]').first();
    await expect(ambientLight).toBeAttached();
    await expect
      .poll(() =>
        ambientLight.evaluate((el) => getComputedStyle(el).animationName)
      )
      .toBe("none");
  });
});