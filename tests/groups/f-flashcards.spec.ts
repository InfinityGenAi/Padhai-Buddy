import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("F. Flashcards Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/flashcards/");
    await expect(page.getByRole("heading", { name: "Flashcards", exact: true })).toBeVisible();
  });

  test("flashcards page loads", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Flashcards", exact: true })).toBeVisible();
  });

  test("create deck button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "New Deck" })).toBeVisible();
  });

  test("create deck and see it in list", async ({ page }) => {
    const deckTitle = `My Test Deck ${Date.now()}`;

    await page.getByRole("button", { name: "New Deck" }).click();
    await expect(page.getByRole("heading", { name: "Create Deck", exact: true })).toBeVisible();

    await page.getByPlaceholder("Deck title").fill(deckTitle);
    await page.getByPlaceholder("Subject").fill("Physics");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    await expect(page.getByRole("heading", { name: deckTitle, exact: true })).toBeVisible();
    await expect(page.getByText("Physics", { exact: true }).last()).toBeVisible();
  });

  test("study deck flips a card and marks it known", async ({ page }) => {
    const deckTitle = `Study Deck ${Date.now()}`;

    await page.getByRole("button", { name: "New Deck" }).click();
    await page.getByPlaceholder("Deck title").fill(deckTitle);
    await page.getByPlaceholder("Subject").fill("Physics");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("heading", { name: deckTitle, exact: true })).toBeVisible();

    // Open this specific deck, then create real cards before starting study mode.
    const deckRow = page.locator(".subtle-card").filter({
      has: page.getByRole("heading", { name: deckTitle, exact: true }),
    });
    await deckRow.getByRole("button", { name: "Manage" }).click();
    await expect(page.getByRole("button", { name: "Add Card" })).toBeVisible();

    await page.getByRole("button", { name: "Add Card" }).click();
    await page.getByPlaceholder("Front (question)").fill("What is physics?");
    await page.getByPlaceholder("Back (answer)").fill("The study of matter, energy, and their interactions.");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("What is physics?", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add Card" }).click();
    await page.getByPlaceholder("Front (question)").fill("What is force?");
    await page.getByPlaceholder("Back (answer)").fill("A push or pull that can change motion.");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("What is force?", { exact: true })).toBeVisible();

    await page.locator('button[title="Study"]').click();
    await expect(page.getByRole("heading", { name: "Studying", exact: true })).toBeVisible();
    await expect(page.getByText("What is physics?", { exact: true })).toBeVisible();

    // The card face is clickable; verify the answer is revealed before marking it known.
    await page.locator(".subtle-card").last().click();
    await expect(page.getByText("The study of matter, energy, and their interactions.", { exact: true })).toBeAttached();

    await page.getByRole("button", { name: "Known", exact: true }).click();
    await expect(page.getByText(/Card 2 of 2/)).toBeVisible();
    await expect(page.getByText("What is force?", { exact: true })).toBeVisible();
  });
});
