import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("G. Notes Tests", () => {
  const createdNotes: Array<{ id: string; title: string; subject: string; body: string; updatedAt: number }> = [];

  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    createdNotes.length = 0;

    await page.goto("http://localhost:3000/dashboard/notes/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Notes')").first()).toBeAttached();
  });

  test("notes page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Notes')").first()).toBeAttached();
  });

  test("create note button is visible", async ({ page }) => {
    await expect(page.locator("text=New Note").first()).toBeAttached();
  });

  test("create note and see it in list", async ({ page }) => {
    await page.click("text=New Note");
    await expect(page.locator("text=New Note").first()).toBeAttached();

    await page.fill('input[placeholder="Note title"]', "My Test Note");
    await page.fill('input[placeholder="Subject"]', "General");
    await page.fill('textarea[placeholder="Write your note here..."]', "This is test note content.");
    await page.click("button:has-text('Save Note')");

    await expect(page.locator("text=My Test Note").first()).toBeVisible();
    await expect(page.locator("text=This is test note content.").first()).toBeVisible();
  });

  test("create then delete note", async ({ page }) => {
    await page.click("text=New Note");
    await page.fill('input[placeholder="Note title"]', "Note to Delete");
    await page.fill('input[placeholder="Subject"]', "General");
    await page.fill('textarea[placeholder="Write your note here..."]', "Delete me.");
    await page.click("button:has-text('Save Note')");
    await expect(page.locator("text=Note to Delete").first()).toBeVisible();

    const card = page.locator(".subtle-card").filter({ hasText: "Note to Delete" });
    const deleteBtn = card.locator("button").last();

    await deleteBtn.click();
    await expect(page.locator("text=Delete Note").first()).toBeAttached();
    await page.click("button:has-text('Delete')");
    await expect(page.locator("text=Note to Delete")).not.toBeVisible();
  });
});