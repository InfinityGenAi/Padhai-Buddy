import { test, expect, type Page } from "@playwright/test";
import { pixelDiffRatio } from "./utils/test-helpers";

type PbState = { tag: string; opacity: string; transform: string };

const AUTH_ROUTES = ["/login", "/signup", "/onboarding", "/forgot-password", "/reset-password"];
const DASHBOARD_ROUTES = ["/dashboard", "/dashboard/chat", "/dashboard/history", "/dashboard/photo-doubt"];

async function getPbStates(page: Page): Promise<PbState[]> {
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

async function waitForNavigationStable(page: Page, stableDuration = 2000) {
  let lastUrl = await page.url();
  let stableStart = Date.now();
  while (Date.now() - stableStart < stableDuration) {
    await page.waitForTimeout(500);
    const currentUrl = await page.url();
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      stableStart = Date.now();
    }
  }
}

async function waitForStatesStable(page: Page, stableChecks = 3, checkInterval = 500) {
  let lastStates: PbState[] | null = null;
  let stableCount = 0;
  while (stableCount < stableChecks) {
    await page.waitForTimeout(checkInterval);
    const currentStates = await getPbStates(page);
    if (currentStates.length === 0) {
      stableCount = 0;
      continue;
    }
    const currentJson = JSON.stringify(currentStates);
    if (currentJson === JSON.stringify(lastStates)) {
      stableCount++;
    } else {
      stableCount = 0;
      lastStates = currentStates;
    }
  }
}

async function waitForPbStatesChange(page: Page, initial: PbState[], timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(250);
    const current = await getPbStates(page);
    if (JSON.stringify(current) !== JSON.stringify(initial)) {
      return current;
    }
  }
  return await getPbStates(page);
}

async function waitForParallaxChange(page: Page, initial: string[], timeout = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(250);
    const current = await getParallaxStates(page);
    if (JSON.stringify(current) !== JSON.stringify(initial)) {
      return current;
    }
  }
  return await getParallaxStates(page);
}

async function setupAuthPage(page: Page) {
  await page.context().clearPermissions();
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function setupDashboardPage(page: Page) {
  await page.context().clearPermissions();
}

test.describe("Background Animation Audit", () => {
  test.describe.configure({ mode: "serial" });

  test.describe("auth pages", () => {
    test.use({ storageState: undefined });

    test.beforeEach(async ({ page }) => {
      await setupAuthPage(page);
    });

    for (const route of AUTH_ROUTES) {
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

        const initialStates = await getPbStates(page);
        expect(initialStates.length).toBeGreaterThan(0);

        const changedStates = await waitForPbStatesChange(page, initialStates);
        let changed = false;
        for (let i = 0; i < Math.min(initialStates.length, changedStates.length); i++) {
          if (initialStates[i].opacity !== changedStates[i].opacity || initialStates[i].transform !== changedStates[i].transform) {
            changed = true;
            break;
          }
        }
        expect(changed).toBe(true);

        const changedAgainStates = await waitForPbStatesChange(page, changedStates);
        let changedAgain = false;
        for (let i = 0; i < Math.min(changedStates.length, changedAgainStates.length); i++) {
          if (changedStates[i].opacity !== changedAgainStates[i].opacity || changedStates[i].transform !== changedAgainStates[i].transform) {
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

        await page.waitForTimeout(500);

        const parallaxCount = await page.locator('[data-pb="parallax"]').count();
        expect(parallaxCount).toBeGreaterThan(0);

        const initial = await getParallaxStates(page);
        expect(initial.length).toBeGreaterThan(0);

        await page.mouse.move(100, 100);
        const tl = await waitForParallaxChange(page, initial);

        await page.mouse.move(700, 450);
        const afterSecond = await waitForParallaxChange(page, tl);

        await page.mouse.move(1400, 800);
        const br = await waitForParallaxChange(page, afterSecond);

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

        await page.waitForTimeout(500);

        const t0 = await getPbStates(page);

        const t5 = await waitForPbStatesChange(page, t0);

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

        await page.evaluate(() => {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("padhai-buddy-preferences", JSON.stringify({ theme: "system" }));
        });

        await waitForNavigationStable(page);
        await waitForStatesStable(page);

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

        if (changed) {
          await page.waitForTimeout(2000);
          const s7 = await getPbStates(page);
          let stabilized = true;
          for (let i = 0; i < Math.min(s0.length, s7.length); i++) {
            if (s0[i].opacity !== s7[i].opacity || s0[i].transform !== s7[i].transform) {
              stabilized = false;
              break;
            }
          }
          if (stabilized) {
            changed = false;
          }
        }

        expect(changed).toBe(false);
      });
    }
  });

  test.describe("landing page", () => {
    test.use({ storageState: undefined });

    test.beforeEach(async ({ page }) => {
      await setupAuthPage(page);
    });

    test("vanta background canvas renders on /", async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.goto("http://localhost:3000/");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-pb="background"]', { timeout: 15000 });

      const bg = page.locator('[data-pb="background"]').first();
      await expect(bg).toBeAttached();

      const canvas = bg.locator("canvas").first();
      await expect(canvas).toBeAttached({ timeout: 30000 });

      const box = await canvas.boundingBox();
      expect(box?.width || 0).toBeGreaterThan(0);
      expect(box?.height || 0).toBeGreaterThan(0);

      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("Session register error") && !e.includes("Sessions list error") && !e.includes("Quota exceeded") && !e.includes("Failed to load resource: the server responded with a status of 500") && !e.includes("WebGL"),
      );
      expect(criticalErrors).toEqual([]);

      const content = page.locator("main, .relative.z-10, button").first();
      await expect(content).toBeAttached();
    });

    test("mouse movement changes vanta rendering on /", async ({ page }) => {
      await page.goto("http://localhost:3000/");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-pb="background"]', { timeout: 15000 });

      const bg = page.locator('[data-pb="background"]').first();
      const canvas = bg.locator("canvas").first();
      await expect(canvas).toBeAttached({ timeout: 30000 });

      const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
      const cx = Math.floor(viewport.width / 2);
      const cy = Math.floor(viewport.height / 2);

      await page.mouse.move(cx, cy);
      await page.waitForTimeout(3000);

      const parked: Buffer[] = [];
      for (let i = 0; i < 6; i++) {
        parked.push(await page.screenshot());
        await page.waitForTimeout(200);
      }
      const parkedDeltas: number[] = [];
      for (let i = 1; i < parked.length; i++) {
        parkedDeltas.push(await pixelDiffRatio(page, parked[i - 1], parked[i], 40));
      }
      const parkedAvg = parkedDeltas.reduce((a, b) => a + b, 0) / parkedDeltas.length;
      expect(parkedAvg).toBeLessThan(0.08);

      await page.waitForTimeout(1000);
      const pre = await page.screenshot();
      await page.mouse.move(viewport.width - 20, cy, { steps: 20 });
      const mid = await page.screenshot();
      await page.mouse.move(20, cy, { steps: 20 });
      const end = await page.screenshot();

      const motionMid = await pixelDiffRatio(page, pre, mid, 40);
      const motionEnd = await pixelDiffRatio(page, mid, end, 40);
      const motionAvg = (motionMid + motionEnd) / 2;

      expect(motionAvg).toBeGreaterThan(Math.max(parkedAvg, 0.015) * 1.5);
    });

    test("light/dark mode changes vanta rendering on /", async ({ page }) => {
      await page.goto("http://localhost:3000/");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-pb="background"]', { timeout: 15000 });

      const bg = page.locator('[data-pb="background"]').first();
      const canvas = bg.locator("canvas").first();
      await expect(canvas).toBeAttached({ timeout: 30000 });

      await page.waitForTimeout(1000);
      const lightShot = await bg.screenshot();

      await page.evaluate(() => {
        localStorage.setItem("padhai-buddy-preferences", JSON.stringify({ theme: "dark" }));
      });
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-pb="background"]', { timeout: 15000 });

      const darkBg = page.locator('[data-pb="background"]').first();
      const darkCanvas = darkBg.locator("canvas").first();
      await expect(darkCanvas).toBeAttached({ timeout: 30000 });
      await page.waitForTimeout(1000);

      const darkShot = await darkBg.screenshot();
      expect(darkShot.equals(lightShot)).toBe(false);
    });

    test("prefers-reduced-motion disables vanta on /", async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(err.message));

      await page.emulateMedia({ reducedMotion: "reduce" });

      await page.goto("http://localhost:3000/");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);

      await expect(page.locator('[data-pb="background"]')).toHaveCount(0);
      await expect(page.locator("canvas")).toHaveCount(0);

      const content = page.locator("main, .relative.z-10, button").first();
      await expect(content).toBeAttached();

      const criticalErrors = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("Session register error") && !e.includes("Sessions list error") && !e.includes("Quota exceeded") && !e.includes("Failed to load resource: the server responded with a status of 500"),
      );
      expect(criticalErrors).toEqual([]);
    });
  });

  test.describe("dashboard pages", () => {
    test.beforeEach(async ({ page }) => {
      await setupDashboardPage(page);
    });

    for (const route of DASHBOARD_ROUTES) {
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

        const initialStates = await getPbStates(page);
        expect(initialStates.length).toBeGreaterThan(0);

        const changedStates = await waitForPbStatesChange(page, initialStates);
        let changed = false;
        for (let i = 0; i < Math.min(initialStates.length, changedStates.length); i++) {
          if (initialStates[i].opacity !== changedStates[i].opacity || initialStates[i].transform !== changedStates[i].transform) {
            changed = true;
            break;
          }
        }
        expect(changed).toBe(true);

        const changedAgainStates = await waitForPbStatesChange(page, changedStates);
        let changedAgain = false;
        for (let i = 0; i < Math.min(changedStates.length, changedAgainStates.length); i++) {
          if (changedStates[i].opacity !== changedAgainStates[i].opacity || changedStates[i].transform !== changedAgainStates[i].transform) {
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

        await page.waitForTimeout(500);

        const parallaxCount = await page.locator('[data-pb="parallax"]').count();
        expect(parallaxCount).toBeGreaterThan(0);

        const initial = await getParallaxStates(page);
        expect(initial.length).toBeGreaterThan(0);

        await page.mouse.move(100, 100);
        const tl = await waitForParallaxChange(page, initial);

        await page.mouse.move(700, 450);
        const afterSecond = await waitForParallaxChange(page, tl);

        await page.mouse.move(1400, 800);
        const br = await waitForParallaxChange(page, afterSecond);

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

        await page.waitForTimeout(500);

        const t0 = await getPbStates(page);

        const t5 = await waitForPbStatesChange(page, t0);

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

        await page.evaluate(() => {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("padhai-buddy-preferences", JSON.stringify({ theme: "system" }));
        });

        await waitForNavigationStable(page);
        await waitForStatesStable(page);

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

        if (changed) {
          await page.waitForTimeout(2000);
          const s7 = await getPbStates(page);
          let stabilized = true;
          for (let i = 0; i < Math.min(s0.length, s7.length); i++) {
            if (s0[i].opacity !== s7[i].opacity || s0[i].transform !== s7[i].transform) {
              stabilized = false;
              break;
            }
          }
          if (stabilized) {
            changed = false;
          }
        }

        expect(changed).toBe(false);
      });
    }
  });
});
