import { test, expect } from "@playwright/test";

test("simple smoke test with emulator", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page.locator("body")).toBeAttached();
  await expect(page.title()).not.toBe("");
});
