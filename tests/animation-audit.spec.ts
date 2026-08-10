import { test, expect, type Page } from "@playwright/test";

const ROUTES = [
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/dashboard",
  "/dashboard/chat",
  "/dashboard/history",
  "/dashboard/photo-doubt",
];

async function getBlobTransforms(page: Page) {
  return page.evaluate(() => {
    const blobs = document.querySelectorAll(".blob-drift-1, .blob-drift-2, .blob-drift-3, .blob-drift-4");
    const transforms: string[] = [];
    blobs.forEach((blob) => {
      const style = window.getComputedStyle(blob);
      transforms.push(style.transform || "none");
    });
    return transforms;
  });
}

async function waitForIdle(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

test.describe("Background Animation Audit", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearPermissions();
  });

  for (const route of ROUTES) {
    test(`background animation runs on ${route}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState("networkidle");

      // Check for critical console errors
      const criticalErrors = consoleErrors.filter(
        (e) =>
          !e.includes("Database is closing") &&
          !e.includes("closing/hidden") &&
          !e.includes("favicon")
      );
      expect(criticalErrors).toEqual([]);

      // Check background exists
      const bg = page.locator(".blob-drift-1").first();
      await expect(bg).toBeAttached();

      // Get transforms at T=0
      const t0 = await getBlobTransforms(page);
      expect(t0.length).toBeGreaterThan(0);

      // Wait 6 seconds and get transforms at T=6
      await waitForIdle(page, 6000);
      const t6 = await getBlobTransforms(page);

      // Verify transforms changed
      let changed = false;
      for (let i = 0; i < t0.length; i++) {
        if (t0[i] !== t6[i]) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);

      // Wait another 4 seconds and get transforms at T=10
      await waitForIdle(page, 4000);
      const t10 = await getBlobTransforms(page);

      let changedAgain = false;
      for (let i = 0; i < t6.length; i++) {
        if (t6[i] !== t10[i]) {
          changedAgain = true;
          break;
        }
      }
      expect(changedAgain).toBe(true);

      // Verify content is above background
      const content = page.locator("main, .relative.z-10, button").first();
      await expect(content).toBeAttached();
    });

    test(`mouse movement produces parallax on ${route}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState("networkidle");

      const bg = page.locator(".blob-drift-1").first();
      await expect(bg).toBeAttached();

      // Get initial position
      const initialBox = await bg.boundingBox();
      expect(initialBox).not.toBeNull();

      // Move mouse to top-left
      await page.mouse.move(100, 100);
      await waitForIdle(page, 1500);

      const tlBox = await bg.boundingBox();

      // Move mouse to center
      await page.mouse.move(800, 450);
      await waitForIdle(page, 1500);

      const centerBox = await bg.boundingBox();

      // Move mouse to bottom-right
      await page.mouse.move(1400, 800);
      await waitForIdle(page, 1500);

      const brBox = await bg.boundingBox();

      // Verify position changed with mouse movement
      expect(tlBox).not.toBeNull();
      expect(centerBox).not.toBeNull();
      expect(brBox).not.toBeNull();

      // The blobs should have moved (at least one coordinate should differ)
      const positions = [tlBox, centerBox, brBox].filter(Boolean) as { x: number; y: number }[];
      const uniqueX = new Set(positions.map((p) => Math.round(p.x)));
      const uniqueY = new Set(positions.map((p) => Math.round(p.y)));
      expect(uniqueX.size).toBeGreaterThan(1);
      expect(uniqueY.size).toBeGreaterThan(1);
    });

    test(`light/dark mode animation on ${route}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState("networkidle");

      // Test light mode (default)
      const lightBg = page.locator(".blob-drift-1").first();
      await expect(lightBg).toBeAttached();

      // Toggle dark mode via localStorage
      await page.evaluate(() => {
        localStorage.setItem("padhai-buddy-preferences", JSON.stringify({ theme: "dark" }));
        document.documentElement.classList.add("dark");
      });

      await waitForIdle(page, 1000);

      // Verify animation still works in dark mode
      const t0 = await getBlobTransforms(page);
      await waitForIdle(page, 5000);
      const t5 = await getBlobTransforms(page);

      let changed = false;
      for (let i = 0; i < t0.length; i++) {
        if (t0[i] !== t5[i]) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);
    });
  }
});
