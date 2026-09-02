import { test, expect } from "@playwright/test";
import { mockSessionsRoute, waitForPersistedMessages } from "../utils/test-helpers";

test.describe("D. History Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    await page.goto("http://localhost:3000/dashboard/history/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("history page loads", async ({ page }) => {
    await expect(page.locator("text=History").first()).toBeAttached();
    await expect(page.locator("text=Doubts (").first()).toBeAttached();
    await expect(page.locator("text=Chats (").first()).toBeAttached();
  });

  test("history shows empty state when no items", async ({ page }) => {
    await expect(page.locator("text=You haven't solved any doubts yet")).toBeAttached();
  });

  test("chat conversation appears in history after chatting", async ({ page }) => {
    const answerText = "Mocked history answer for a persisted chat.";
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ answer: answerText, userId: "mock-user" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ conversations: [] }),
      });
    });

    await page.goto("http://localhost:3000/dashboard/chat/");
    await page.waitForLoadState("domcontentloaded");

    const input = page.locator("textarea, input[type='text']").first();
    await expect(input).toBeAttached();
    // The app clears the input synchronously when a send is processed. If a
    // Firestore-driven re-render swallows the Enter keypress, retry the send.
    for (let attempt = 0; attempt < 3; attempt++) {
      await input.fill("Persist me in history please");
      await page.keyboard.press("Enter");
      try {
        await expect(input).not.toHaveValue("Persist me in history please", { timeout: 5000 });
        break;
      } catch {
        // send was swallowed — retry
      }
    }
    await expect(page.locator("div.whitespace-pre-wrap", { hasText: "Persist me in history please" })).toBeVisible();
    await expect(page.locator(`text=${answerText}`).first()).toBeVisible({ timeout: 15000 });

    // Wait for the conversation doc to be committed to Firestore (sidebar renders
    // from the live query) before leaving the page, and for BOTH message docs
    // (user + AI) via the Admin SDK — the AI-save batch lands after the answer
    // renders, and leaving before it lands would lose the answer.
    await expect(
      page.locator("div.cursor-pointer", { hasText: "Persist me in history please" }).first(),
    ).toBeAttached({ timeout: 15000 });
    await waitForPersistedMessages("Persist me in history please", 2);

    await page.goto("http://localhost:3000/dashboard/history/");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("button:has-text('Chats (')").first().click();

    const convCard = page.locator("text=Persist me in history please").first();
    await expect(convCard).toBeVisible({ timeout: 15000 });
  });
});