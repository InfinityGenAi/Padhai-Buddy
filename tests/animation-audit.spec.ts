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



async function getPbStates(page: Page) {
  return page.evaluate(() => {
    const selectors = [
      '[data-pb="ambient-light"]',
      '[data-pb="study-decoration"]',
      '[data-pb="scan-line"]',
    ];
    const states: { tag: string; opacity: string; transform: string }[] = [];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const style = window.getComputedStyle(el);
        states.push({
          tag: el.getAttribute("data-pb") || "",
          opacity: style.opacity || "",
          transform: style.transform || "none",
        });
      });
    });
    return states;
  });
}

async function getParallaxStates(page: Page) {
  return page.evaluate(() => {
    const layers = document.querySelectorAll('[data-pb="parallax"]');
    const states: string[] = [];
    layers.forEach((el) => {
      const style = window.getComputedStyle(el);
      states.push(style.transform || "none");
    });
    return states;
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
      await page.waitForSelector('[data-pb="background"]', { timeout: 10000 });

      // Check for critical console errors (ignore favicon)
      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes("favicon")
      );
      expect(criticalErrors).toEqual([]);

      // Check background container exists
      const bg = page.locator('[data-pb="background"]').first();
      await expect(bg).toBeAttached();

      // Check at least one animated element exists
      const t0 = await getPbStates(page);
      expect(t0.length).toBeGreaterThan(0);

      // Get element state at T=0
      const s0 = await getPbStates(page);

      // Wait ~6s and capture T=6
      await waitForIdle(page, 6000);
      const s6 = await getPbStates(page);

      // Verify something changed (opacity or transform)
      let changed = false;
      for (let i = 0; i < Math.min(s0.length, s6.length); i++) {
        if (s0[i].opacity !== s6[i].opacity || s0[i].transform !== s6[i].transform) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);

      // Wait 4 more seconds → T=10
      await waitForIdle(page, 4000);
      const s10 = await getPbStates(page);

      let changedAgain = false;
      for (let i = 0; i < Math.min(s6.length, s10.length); i++) {
        if (s6[i].opacity !== s10[i].opacity || s6[i].transform !== s10[i].transform) {
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
      await page.waitForSelector('[data-pb="background"]', { timeout: 10000 });

      // Wait for initial animation to settle
      await waitForIdle(page, 1000);

      const parallaxCount = await page.locator('[data-pb="parallax"]').count();
      expect(parallaxCount).toBeGreaterThan(0);

      // Get initial parallax transforms
      const initial = await getParallaxStates(page);
      expect(initial.length).toBeGreaterThan(0);

      // Move mouse to top-left
      await page.mouse.move(100, 100);
      await waitForIdle(page, 1500);
      const tl = await getParallaxStates(page);

      // Move mouse to bottom-right
      await page.mouse.move(1400, 800);
      await waitForIdle(page, 1500);
      const br = await getParallaxStates(page);

      // At least one parallax layer should have moved
      let moved = false;
      for (let i = 0; i < Math.min(initial.length, tl.length, br.length); i++) {
        if (initial[i] !== tl[i] || initial[i] !== br[i]) {
          moved = true;
          break;
        }
      }
      expect(moved).toBe(true);
    });

    test(`light/dark mode animation on ${route}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState("networkidle");
      await page.waitForSelector('[data-pb="background"]', { timeout: 10000 });

      // Light mode (default)
      const lightBg = page.locator('[data-pb="background"]').first();
      await expect(lightBg).toBeAttached();

      // Toggle dark mode via localStorage
      await page.evaluate(() => {
        localStorage.setItem("padhai-buddy-preferences", JSON.stringify({ theme: "dark" }));
        document.documentElement.classList.add("dark");
      });

      await waitForIdle(page, 1000);

      // Verify animation still works in dark mode
      const t0 = await getPbStates(page);
      await waitForIdle(page, 5000);
      const t5 = await getPbStates(page);

      let changed = false;
      for (let i = 0; i < Math.min(t0.length, t5.length); i++) {
        if (t0[i].opacity !== t5[i].opacity || t0[i].transform !== t5[i].transform) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);
    });
  }
});
