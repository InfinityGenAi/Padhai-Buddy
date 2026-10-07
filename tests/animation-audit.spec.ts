import { test, expect, type Page } from "@playwright/test";

async function setupLandingPage(page: Page) {
  await page.context().clearPermissions();
}

test.describe("Landing Page Animation Audit", () => {
  test.use({ storageState: undefined });

  test.beforeEach(async ({ page }) => {
    await setupLandingPage(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });

  test("landing page renders static light background on /", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("domcontentloaded");

    // The landing page is intentionally a plain light background - no animated
    // background component (no data-pb="background", no canvas) is rendered.
    await expect(page.locator('[data-pb="background"]')).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);

    const content = page.locator("main, .relative.z-10, button").first();
    await expect(content).toBeAttached();

    const pageBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    expect(pageBg).not.toBe("rgba(0, 0, 0, 0)");

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("Session register error") && !e.includes("Sessions list error") && !e.includes("Quota exceeded") && !e.includes("Failed to load resource: the server responded with a status of 500") && !e.includes("WebGL"),
    );
    expect(criticalErrors).toEqual([]);
  });

  test("landing page stays light-only (no dark theme toggle)", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("domcontentloaded");

    const content = page.locator("main, .relative.z-10, button").first();
    await expect(content).toBeAttached();

    // App is light-only: no dark class, no theme preference applied.
    await page.evaluate(() => {
      localStorage.setItem("padhai-buddy-preferences", JSON.stringify({ theme: "dark" }));
    });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.classList.contains("dark")
        )
      )
      .toBe(false);

    await expect(content).toBeAttached();
  });

  test("landing page renders cleanly under reduced-motion", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("http://localhost:3000/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    await expect(page.locator('[data-pb="background"]')).toHaveCount(0);

    const content = page.locator("main, .relative.z-10, button").first();
    await expect(content).toBeAttached();

    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("Session register error") && !e.includes("Sessions list error") && !e.includes("Quota exceeded") && !e.includes("Failed to load resource: the server responded with a status of 500"),
    );
    expect(criticalErrors).toEqual([]);
  });
});