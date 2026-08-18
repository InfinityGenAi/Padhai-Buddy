import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("L. Profile/Settings Tests", () => {
  let lastPostedBody: Record<string, unknown> | null = null;

  test.beforeEach(async ({ page }) => {
    lastPostedBody = null;
    await mockSessionsRoute(page);
    await page.route("/api/profile", async (route) => {
      if (route.request().method() === "POST") {
        lastPostedBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto("http://localhost:3000/dashboard/profile");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Profile')").first()).toBeAttached();
  });

  test("profile page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Profile')").first()).toBeAttached();
  });

  test("profile form fields are visible", async ({ page }) => {
    await expect(page.locator("text=Display Name").first()).toBeAttached();
    await expect(page.locator("text=Class").first()).toBeAttached();
    await expect(page.locator("text=Board").first()).toBeAttached();
  });

  test("save profile updates user name", async ({ page }) => {
    const nameInput = page.locator("input[type='text']").first();
    await expect(nameInput).toBeAttached();
    await nameInput.fill("Updated Test User");
    await page.click("button:has-text('Save Profile')");

    await expect(page.locator("text=Profile").first()).toBeAttached();
    await expect.poll(() => lastPostedBody?.name ?? null).toBe("Updated Test User");
  });

  test("settings modal opens from profile menu", async ({ page }) => {
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

  test("profile save button exists", async ({ page }) => {
    await expect(page.locator("text=Save Profile").first()).toBeAttached();
  });
});
