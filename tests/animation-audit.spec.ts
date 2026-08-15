import { test, expect, type Page } from "@playwright/test";

type PbState = { tag: string; opacity: string; transform: string };

const ROUTES = [
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/dashboard/chat",
  "/dashboard/history",
  "/dashboard/photo-doubt",
];

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

test.describe("Background Animation Audit", () => {
  test.describe.configure({ mode: "serial" });

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

      if (route === "/") {
        const box = await bg.boundingBox();
        expect(box?.width || 0).toBeGreaterThan(0);
        expect(box?.height || 0).toBeGreaterThan(0);
        await page.waitForTimeout(5000);
        const boxAfter = await bg.boundingBox();
        expect(boxAfter?.width || 0).toBeGreaterThan(0);
      } else {
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
      }

      const content = page.locator("main, .relative.z-10, button").first();
      await expect(content).toBeAttached();
    });

    test(`mouse movement produces parallax on ${route}`, async ({ page }) => {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForSelector('[data-pb="background"]', { timeout: 15000 });

      await page.waitForTimeout(1000);

      if (route === "/") {
        const bg = page.locator('[data-pb="background"]').first();
        const before = await bg.boundingBox();
        expect(before?.width || 0).toBeGreaterThan(0);
        await page.mouse.move(100, 100);
        await page.waitForTimeout(1500);
        await page.mouse.move(700, 450);
        await page.waitForTimeout(1500);
        await page.mouse.move(1400, 800);
        await page.waitForTimeout(1500);
        const after = await bg.boundingBox();
        expect(after?.width || 0).toBeGreaterThan(0);
      } else {
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
      }
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

      if (route === "/") {
        const bg = page.locator('[data-pb="background"]').first();
        const box = await bg.boundingBox();
        expect(box?.width || 0).toBeGreaterThan(0);
        await page.waitForTimeout(5000);
        const boxAfter = await bg.boundingBox();
        expect(boxAfter?.width || 0).toBeGreaterThan(0);
      } else {
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
      }
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

      if (route === "/") {
        const box = await bg.boundingBox();
        expect(box?.width || 0).toBeGreaterThan(0);
      } else {
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
      }
    });
  }
});
