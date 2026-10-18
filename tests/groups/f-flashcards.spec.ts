import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("F. Flashcards Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/flashcards/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("flashcards page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Flashcards')").first()).toBeAttached();
  });

  test("create deck button is visible", async ({ page }) => {
    await expect(page.locator("text=New Deck").first()).toBeAttached();
  });

  test("create deck and see it in list", async ({ page }) => {
    await expect(page.locator("text=No flashcard decks yet").first()).toBeAttached();

    await page.click("text=New Deck");
    await expect(page.locator("text=Create Deck").first()).toBeAttached();

    await page.fill('input[placeholder="Deck title"]', "My Test Deck");
    await page.fill('input[placeholder="Subject"]', "Physics");
    await page.click("button:has-text('Create')");

    await expect(page.locator("text=My Test Deck").first()).toBeVisible();
    await expect(page.locator("text=Physics").first()).toBeVisible();
  });

  test("study deck flips card and marks known", async ({ page }) => {
    await page.click("text=New Deck");
    await page.fill('input[placeholder="Deck title"]', "Study Deck");
    await page.fill('input[placeholder="Subject"]', "Physics");
    await page.click("button:has-text('Create')");
    await expect(page.locator("text=Study Deck").first()).toBeVisible();

    await page.click("button:has-text('Study')");
    await expect(page.locator("text=Studying").first()).toBeAttached();
    await expect(page.locator("text=What is physics?").first()).toBeVisible();

    await page.click("text=Known");
    await expect(page.locator("text=Card 2 of").first()).toBeAttached();
  });
});