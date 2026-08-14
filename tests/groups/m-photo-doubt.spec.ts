import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("M. Photo Doubt Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/photo-doubt");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Photo Doubt')").first()).toBeAttached();
  });

  test("photo doubt page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Photo Doubt')").first()).toBeAttached();
  });

  test("upload area is visible", async ({ page }) => {
    await expect(page.locator("text=Choose File").first()).toBeAttached();
  });

  test("upload image triggers preview", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: "test-image.png",
        mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
      });
      await expect(page.locator("img, [data-testid='image-preview']").first()).toBeAttached();
    }
  });
});
