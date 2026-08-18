import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

async function expectedDarkMode(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem("padhai-buddy-preferences");
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.theme === "dark") return true;
        if (prefs.theme === "light") return false;
      }
    } catch {
      // ignore
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
}

test.describe("O. Dark/Light Tests", () => {
  test("dark mode class is applied", async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Hi,").first()).toBeAttached();
    const expected = await expectedDarkMode(page);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.classList.contains("dark"))
      )
      .toBe(expected);
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

    const darkBtn = page.getByRole("button", { name: "dark", exact: true });
    const lightBtn = page.getByRole("button", { name: "light", exact: true });
    await expect(darkBtn).toBeAttached();
    await expect(lightBtn).toBeAttached();

    await darkBtn.click();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.classList.contains("dark"))
      )
      .toBe(true);

    await lightBtn.click();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.classList.contains("dark"))
      )
      .toBe(false);
  });
});