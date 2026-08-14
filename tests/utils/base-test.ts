import { expect, type Page } from "@playwright/test";
import { mockSessionsRoute, enableConsoleErrorTracking, filterCriticalErrors, waitForDashboardReady, waitForPageReady } from "../utils/test-helpers";

export { mockSessionsRoute, enableConsoleErrorTracking, filterCriticalErrors, waitForDashboardReady, waitForPageReady };

export async function setupDashboard(page: Page) {
  await page.goto("http://localhost:3000/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await waitForDashboardReady(page);
}

export async function setupWithMockedSessions(page: Page) {
  await mockSessionsRoute(page);
  await page.goto("http://localhost:3000/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await waitForDashboardReady(page);
}

export async function assertNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  const critical = filterCriticalErrors(errors);
  expect(critical).toEqual([]);
}

export async function openSettings(page: Page) {
  const profileBtn = page.locator("button[aria-label='Profile menu']");
  await expect(profileBtn).toBeAttached();
  await profileBtn.click();
  await page.locator("text=Settings").first().click();
  await expect(page.locator("text=Theme").first()).toBeAttached();
}
