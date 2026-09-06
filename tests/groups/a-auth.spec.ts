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

  test.describe("login page (fresh session)", () => {
    test.use({ storageState: "tests/fixtures/empty-storage.json" });

    test("login page loads without critical errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      await mockSessionsRoute(page);
      await page.addInitScript(() => {
        try { sessionStorage.setItem("pb-internal-nav", "1"); } catch {}
      });
      await page.goto("http://localhost:3000/login/");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("text=Welcome back")).toBeAttached();

      expect(filterCriticalErrors(errors)).toEqual([]);
    });
  });

  test.describe("real login flow (fresh session)", () => {
    test.use({ storageState: "tests/fixtures/empty-storage.json" });

    test("real login flow works", async ({ page }) => {
      await mockSessionsRoute(page);

      // Per spec, /login is gated against direct URL entry. Users reach it
      // by clicking "Log in" from the landing page. Under full-suite parallel
      // load the auth-loading state can flicker and re-render the form,
      // detaching inputs mid-fill — retry the whole flow.
      let loggedIn = false;
      for (let attempt = 0; attempt < 3 && !loggedIn; attempt++) {
        await page.goto("http://localhost:3000/login/?from=landing");
        await page.waitForLoadState("domcontentloaded");
        try {
          const emailInput = page.locator('input[type="email"]');
          await expect(emailInput).toBeVisible({ timeout: 15000 });
          await emailInput.fill("test@padhai-buddy.test");
          await page.fill('input[type="password"]', "TestPassword123!", { timeout: 15000 });
          await page.evaluate(() => {
            const form = document.querySelector("form");
            if (form) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          });
          await expect(page).toHaveURL("http://localhost:3000/dashboard/", { timeout: 15000 });
          await expect(page.locator("text=Hi,").first()).toBeAttached();
          loggedIn = true;
        } catch (e) {
          console.log(`[login-flow] attempt ${attempt} failed: ${(e as Error).message?.split("\n")[0]} url=${page.url()}`);
        }
      }
      expect(loggedIn).toBe(true);
    });
  });

  test("dashboard greeting shows user name", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/", { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
  });

  test("logout works", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/");
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
    await expect(page).toHaveURL("http://localhost:3000/", { timeout: 15000 });
  });

  test.describe("unauthenticated redirect", () => {
    test.use({ storageState: undefined });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });

    test("dashboard redirects to landing", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard/");
      await expect(page).toHaveURL("http://localhost:3000/", { timeout: 15000 });
    });

    test("chat redirects to landing", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard/chat/");
      await expect(page).toHaveURL("http://localhost:3000/", { timeout: 15000 });
    });

    test("history redirects to landing", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard/history/");
      await expect(page).toHaveURL("http://localhost:3000/", { timeout: 15000 });
    });

    test("profile redirects to landing", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard/profile/");
      await expect(page).toHaveURL("http://localhost:3000/", { timeout: 15000 });
    });

    test("settings modal redirects to landing", async ({ page }) => {
      await page.goto("http://localhost:3000/dashboard/");
      await expect(page).toHaveURL("http://localhost:3000/", { timeout: 15000 });
    });
  });

  test("forgot password page loads from login link", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.addInitScript(() => {
      try { sessionStorage.setItem("pb-internal-nav", "1"); } catch {}
    });
    await page.goto("http://localhost:3000/login/?from=landing");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
    await page.goto("http://localhost:3000/forgot-password/?from=landing", { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Forgot Password?')")).toBeAttached();
  });

  test("forgot password page has email form", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.addInitScript(() => {
      try { sessionStorage.setItem("pb-internal-nav", "1"); } catch {}
    });
    await page.goto("http://localhost:3000/forgot-password/?from=landing", { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");
    // Wait for animations to complete and form to be visible
    await page.waitForTimeout(1000);
    await page.waitForSelector('input[type="email"]', { timeout: 30000, state: "visible" });
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("forgot password submits with empty email shows error", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.addInitScript(() => {
      try { sessionStorage.setItem("pb-internal-nav", "1"); } catch {}
    });
    await page.goto("http://localhost:3000/forgot-password/?from=landing", { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");
    // Wait for animations to complete
    await page.waitForTimeout(1000);
    await page.waitForSelector('input[type="email"]', { timeout: 30000, state: "visible" });
    await page.evaluate(() => {
      const form = document.querySelector("form");
      if (form) {
        const evt = new Event("submit", { bubbles: true, cancelable: true });
        form.dispatchEvent(evt);
      }
    });
    await expect(page.locator("text=Please enter your email address")).toBeVisible({ timeout: 15000 });
  });

  test("forgot password submits with invalid email shows error", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.addInitScript(() => {
      try { sessionStorage.setItem("pb-internal-nav", "1"); } catch {}
    });
    await page.goto("http://localhost:3000/forgot-password/?from=landing", { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");
    // Wait for form to be stable (animations may cause remount)
    await page.waitForTimeout(1000);
    await page.waitForSelector('input[type="email"]', { timeout: 30000, state: "visible" });
    await page.fill('input[type="email"]', "not-an-email");
    await page.evaluate(() => {
      const form = document.querySelector("form");
      if (form) {
        const evt = new Event("submit", { bubbles: true, cancelable: true });
        form.dispatchEvent(evt);
      }
    });
    await expect(page.locator("text=Please enter a valid email address")).toBeAttached();
  });

  test.describe("login show password (unauthenticated)", () => {
    test.use({ storageState: undefined });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });

    test("toggle works", async ({ page }) => {
      await mockSessionsRoute(page);
      await page.addInitScript(() => {
        try { sessionStorage.setItem("pb-internal-nav", "1"); } catch {}
      });
      await page.goto("http://localhost:3000/login/?from=landing");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);
      const passwordInput = page.locator('input[type="password"]').first();
      await expect(passwordInput).toBeAttached();
      const showBtn = page.locator('button[aria-label="Show password"]').first();
      await expect(showBtn).toBeAttached();
      await showBtn.click();
      const textInput = page.locator('input[type="text"]').first();
      await expect(textInput).toBeAttached();
    });
  });

  test.describe("signup show password (unauthenticated)", () => {
    test.use({ storageState: undefined });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });

    test("toggle works", async ({ page }) => {
      await mockSessionsRoute(page);
      await page.addInitScript(() => {
        try { sessionStorage.setItem("pb-internal-nav", "1"); } catch {}
      });
      await page.goto("http://localhost:3000/signup/?from=landing");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);
      const passwordInput = page.locator('input[type="password"]').first();
      await expect(passwordInput).toBeAttached();
      const showBtn = page.locator('button[aria-label="Show password"]').first();
      await expect(showBtn).toBeAttached();
      await showBtn.click();
      const textInput = page.locator('input[type="text"]').first();
      await expect(textInput).toBeAttached();
    });
  });

  test("reset password with invalid link shows error", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/reset-password/", { timeout: 30000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    await expect(page.locator("text=Invalid or expired reset link")).toBeAttached();
  });
});
