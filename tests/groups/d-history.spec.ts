import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("D. History Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/history");
    await page.waitForLoadState("domcontentloaded");
  });

  test("history page loads", async ({ page }) => {
    await expect(page.locator("text=Doubt History").first()).toBeAttached();
  });

  test("history shows empty state when no items", async ({ page }) => {
    await expect(page.locator("text=You haven't solved any doubts yet")).toBeAttached();
  });
});
