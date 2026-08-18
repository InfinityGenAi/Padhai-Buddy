import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("C. Chat Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/dashboard/chat");
    await page.waitForLoadState("domcontentloaded");
    await mockSessionsRoute(page);
  });

  test("chat page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Chat Doubt')").first()).toBeAttached();
  });

  test("new conversation can be started", async ({ page }) => {
    const newChatBtn = page.locator("button:has-text('New Chat'), button:has-text('New Conversation'), [data-testid='new-chat']").first();
    if (await newChatBtn.count() > 0) {
      await expect(newChatBtn).toBeAttached();
      await newChatBtn.click();
      await expect(page.locator("text=Start a New Conversation, text=Type your question")).toBeAttached();
    }
  });

  test("send question and receive response", async ({ page }) => {
    const answerText = "2 + 2 equals 4. This is a mocked AI response for testing.";
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

    const input = page.locator("textarea, input[type='text']").first();
    await expect(input).toBeAttached();
    await input.fill("What is 2+2?");
    await page.keyboard.press("Enter");
    await expect(page.locator("div.whitespace-pre-wrap", { hasText: "What is 2+2?" })).toBeVisible();
    await expect(page.locator(`text=${answerText}`).first()).toBeVisible({ timeout: 15000 });
  });
});
