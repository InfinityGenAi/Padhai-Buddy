import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("I. Timer Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);

    await page.route("/api/timer", async (route) => {
      if (route.request().method() === "POST") {
        const postData = await route.request().postData();
        const body = JSON.parse(postData || "{}");
        if (body.action === "create") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              session: {
                id: "session-" + Date.now(),
                mode: body.mode,
                durationSeconds: body.durationSeconds,
                durationMinutes: Math.ceil(body.durationSeconds / 60),
                completed: false,
                createdAt: Date.now(),
              },
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessions: [] }),
      });
    });

    await page.goto("http://localhost:3000/dashboard/timer/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Timer')").first()).toBeAttached();
  });

  test("timer page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Timer')").first()).toBeAttached();
  });

  test("pomodoro mode is visible", async ({ page }) => {
    await expect(page.locator("text=Pomodoro").first()).toBeAttached();
  });

  test("start button is visible", async ({ page }) => {
    await expect(page.locator("text=Start").first()).toBeAttached();
  });

  test("start timer changes button to pause", async ({ page }) => {
    await page.click("text=Start");
    await expect(page.locator("text=Pause").first()).toBeAttached();
  });

  test("timer shows running state", async ({ page }) => {
    await page.click("text=Start");
    const timeDisplay = page.locator(".font-mono.font-bold").first();
    await expect(timeDisplay).toBeAttached();
    const text = await timeDisplay.textContent();
    expect(text).toMatch(/\d{2}:\d{2}/);
  });

  test("timer creates the session at start and saves it after the duration elapses", async ({ page }) => {
    await page.clock.install({ time: new Date() });
    await page.click("text=Custom");
    await page.fill('input[type="number"]', "1");
    await expect(page.locator(".font-mono.font-bold").first()).toHaveText("01:00");

    await page.click("text=Start");
    await expect(page.locator("text=Pause").first()).toBeAttached();
    await page.clock.runFor(65_000);
    await expect(page.locator("text=Recent Sessions").first()).toBeAttached({ timeout: 10000 });
  });
});
