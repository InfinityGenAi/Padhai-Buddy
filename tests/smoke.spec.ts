import { test, expect } from "@playwright/test";
import { mockSessionsRoute, filterCriticalErrors } from "./utils/test-helpers";

test.describe("Quick Smoke Tests", () => {
  test("homepage loads without critical console errors", async ({ page }) => {
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

  test("login page loads without critical console errors", async ({ page }) => {
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

  test.describe("unauthenticated redirect tests", () => {
    test.use({ storageState: undefined });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });

    test("dashboard requires auth and redirects", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard");
      await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 15000 });
    });

    test("chat page requires auth and redirects", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard/chat");
      await expect(page).toHaveURL("http://localhost:3000/login", { timeout: 15000 });
    });
  });
});
