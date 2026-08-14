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
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-pb="background"]', { timeout: 15000 });

      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("Session register error") && !e.includes("Sessions list error") && !e.includes("Quota exceeded") && !e.includes("Failed to load resource: the server responded with a status of 500"),
      );
      expect(criticalErrors).toEqual([]);

      const bg = page.locator('[data-pb="background"]').first();
      await expect(bg).toBeAttached();

      const t0 = await getPbStates(page);
      expect(t0.length).toBeGreaterThan(0);

      const s0 = await getPbStates(page);
      await page.waitForTimeout(5000);
      const s5 = await getPbStates(page);

      let changed = false;
      for (let i = 0; i < Math.min(s0.length, s5.length); i++) {
        if (s0[i].opacity !== s5[i].opacity || s0[i].transform !== s5[i].transform) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(true);

      await page.waitForTimeout(5000);
      const s10 = await getPbStates(page);

      let changedAgain = false;
      for (let i = 0; i < Math.min(s5.length, s10.length); i++) {
        if (s5[i].opacity !== s10[i].opacity || s5[i].transform !== s10[i].transform) {
          changedAgain = true;
          break;
        }
      }
      expect(changedAgain).toBe(true);

      const content = page.locator("main, .relative.z-10, button").first();
      await expect(content).toBeAttached();
    });

    test(`mouse movement produces parallax on ${route}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-pb="background"]', { timeout: 15000 });

      await page.waitForTimeout(1000);

      const parallaxCount = await page.locator('[data-pb="parallax"]').count();
      expect(parallaxCount).toBeGreaterThan(0);

      const initial = await getParallaxStates(page);
      expect(initial.length).toBeGreaterThan(0);

      await page.mouse.move(100, 100);
      await page.waitForTimeout(1500);
      const tl = await getParallaxStates(page);

      await page.mouse.move(700, 450);
      await page.waitForTimeout(1500);

      await page.mouse.move(1400, 800);
      await page.waitForTimeout(1500);
      const br = await getParallaxStates(page);

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
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-pb="background"]', { timeout: 15000 });

      const lightBg = page.locator('[data-pb="background"]').first();
      await expect(lightBg).toBeAttached();

      await page.evaluate(() => {
        localStorage.setItem("padhai-buddy-preferences", JSON.stringify({ theme: "dark" }));
        document.documentElement.classList.add("dark");
      });

      await page.waitForTimeout(1000);

      const t0 = await getPbStates(page);
      await page.waitForTimeout(5000);
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

    test(`prefers-reduced-motion freezes background on ${route}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.emulateMedia({ reducedMotion: "reduce" });

      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-pb="background"]', { timeout: 15000 });
      await page.waitForTimeout(2000);

      const bg = page.locator('[data-pb="background"]').first();
      await expect(bg).toBeAttached();

      const s0 = await getPbStates(page);
      expect(s0.length).toBeGreaterThan(0);

      await page.waitForTimeout(5000);
      const s5 = await getPbStates(page);

      let changed = false;
      for (let i = 0; i < Math.min(s0.length, s5.length); i++) {
        if (s0[i].opacity !== s5[i].opacity || s0[i].transform !== s5[i].transform) {
          changed = true;
          break;
        }
      }
      expect(changed).toBe(false);
    });
  }
});
