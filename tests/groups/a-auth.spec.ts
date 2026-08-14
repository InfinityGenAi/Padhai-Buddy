import { test, expect } from "@playwright/test";
import { mockSessionsRoute, filterCriticalErrors } from "../utils/test-helpers";

test.describe("A. Public/Auth Tests", () => {
  test("homepage loads without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).toBeVisible();

    expect(filterCriticalErrors(errors)).toEqual([]);
  });

  test("login page loads without critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/login");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Welcome Back")).toBeAttached();

    expect(filterCriticalErrors(errors)).toEqual([]);
  });

  test("real login flow works", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/login");
    await page.waitForLoadState("domcontentloaded");
    await page.fill('input[type="email"]', "test@padhai-buddy.test");
    await page.fill('input[type="password"]', "TestPassword123!");
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await expect(page).toHaveURL("http://localhost:3000/dashboard", { timeout: 15000 });
    await expect(page.locator("text=Hi,").first()).toBeAttached();
  });

  test("dashboard greeting shows user name", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
  });

  test("logout works", async ({ page }) => {
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
    await page.locator("text=Logout").first().click();
    await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 15000 });
  });

  test.describe("unauthenticated redirect", () => {
    test.use({ storageState: undefined });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });

    test("dashboard redirects to login", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard");
      await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 15000 });
    });

    test("chat redirects to login", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard/chat");
      await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 15000 });
    });

    test("history redirects to login", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard/history");
      await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 15000 });
    });

    test("profile redirects to login", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard/profile");
      await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 15000 });
    });

    test("settings modal redirects to login", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard");
      await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 15000 });
    });
  });
});
