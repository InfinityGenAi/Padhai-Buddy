import { test, expect } from "@playwright/test";

test.describe("Quick Smoke Tests", () => {
  test("homepage loads without critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const critical = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("Static Server")
    );
    expect(critical).toEqual([]);
  });

  test("login page loads without critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("http://localhost:3000/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    const critical = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("Static Server")
    );
    expect(critical).toEqual([]);
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
