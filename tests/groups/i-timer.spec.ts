import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("I. Timer Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);

    await page.route("/api/timer", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session: {
              id: "session-" + Date.now(),
              mode: "custom",
              durationMinutes: 1,
              completed: true,
              createdAt: Date.now(),
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessions: [] }),
      });
    });

    await page.goto("http://localhost:3000/dashboard/timer");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Study Timer')").first()).toBeAttached();
  });

  test("timer page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Study Timer')").first()).toBeAttached();
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

  test("complete button saves a study session", async ({ page }) => {
    await page.click("text=Start");
    await page.click("text=Pause");
    const completeBtn = page.locator("button:has-text('Complete')").first();
    await expect(completeBtn).toBeAttached();
    await completeBtn.click();
    await expect(page.locator("text=Recent Sessions").first()).toBeAttached();
  });
});
