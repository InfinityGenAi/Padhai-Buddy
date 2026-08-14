import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("I. Timer Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
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
});
