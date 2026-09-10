import { test, expect, type Page } from "@playwright/test";
import { mockSessionsRoute, waitForPersistedMessages } from "../utils/test-helpers";

async function openChatPage(page: Page) {
  await page.goto("http://localhost:3000/dashboard/chat/");
  await page.waitForLoadState("domcontentloaded");
  await mockSessionsRoute(page);
}

function mockChatApi(page: Page, opts: { delayMs?: number; longAnswers?: boolean } = {}) {
  const { delayMs = 0, longAnswers = false } = opts;
  let requestCount = 0;
  return page.route("**/api/chat", async (route) => {
    if (route.request().method() === "POST") {
      requestCount++;
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      const answer = longAnswers
        ? `Mocked answer #${requestCount}. This is a longer line of mock response text used to make the conversation tall enough to scroll. The explanation continues across several sentences.`
        : `Mocked answer #${requestCount}`;

      // Mock SSE streaming response like the real API
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
        body: `data: ${JSON.stringify({ content: answer })}\n\ndata: [DONE]\n\n`,
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ conversations: [] }),
    });
  });
}

async function sendMessage(page: Page, text: string) {
  const input = page.locator("textarea, input[type='text']").first();
  await expect(input).toBeAttached();
  // The app clears the input synchronously when a send is processed. If a
  // Firestore-driven re-render swallows the Enter keypress, the input still
  // holds the text — retry the send until it lands.
  for (let attempt = 0; attempt < 3; attempt++) {
    await input.fill(text);
    await page.keyboard.press("Enter");
    try {
      await expect(input).not.toHaveValue(text, { timeout: 5000 });
      return;
    } catch {
      // send was swallowed — retry
    }
  }
  await expect(input).not.toHaveValue(text, { timeout: 5000 });
}

test.describe("C. Chat Tests", () => {
  test.beforeEach(async ({ page }) => {
    await openChatPage(page);
  });

  test("chat page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Padhai Buddy AI Tutor')").first()).toBeAttached();
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
    await mockChatApi(page);
    await sendMessage(page, "What is 2+2?");
    await expect(page.locator("div.whitespace-pre-wrap", { hasText: "What is 2+2?" })).toBeVisible();
    await expect(page.locator("text=Mocked answer #1").first()).toBeVisible({ timeout: 15000 });
  });

  test("messages render in chronological order after multiple exchanges", async ({ page }) => {
    await mockChatApi(page);

    await sendMessage(page, "Question one?");
    await expect(page.locator("text=Mocked answer #1").first()).toBeVisible({ timeout: 15000 });

    await sendMessage(page, "Question two?");
    await expect(page.locator("text=Mocked answer #2").first()).toBeVisible({ timeout: 15000 });

    const texts = await page.locator("div.space-y-3.overflow-y-auto div.whitespace-pre-wrap").allTextContents();
    expect(texts).toEqual([
      "Question one?",
      "Mocked answer #1",
      "Question two?",
      "Mocked answer #2",
    ]);
  });

  test("conversation persists in sidebar and after reload", async ({ page }) => {
    await mockChatApi(page);

    await sendMessage(page, "Persist me please");
    await expect(page.locator("text=Mocked answer #1").first()).toBeVisible({ timeout: 15000 });

// Conversation should appear in the sidebar (proves the Firestore writes landed
// before we reload). On mobile the sidebar is hidden until the overlay opens,
// so "attached" is the cross-project-safe check.
const sidebarItem = page.locator("div.cursor-pointer", { hasText: "Persist me please" }).first();
await expect(sidebarItem).toBeAttached({ timeout: 15000 });
// Also wait until BOTH message docs (user + AI) are persisted via the Admin
// SDK — the AI-save batch completes after the answer renders, and reloading
// before it lands would leave the conversation without the answer.
await waitForPersistedMessages("Persist me please", 2);

    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Wait for Firestore conversations to load into the sidebar (also confirms React
    // hydration finished so click handlers are attached before we interact).
    await expect(sidebarItem).toBeAttached({ timeout: 15000 });

    // Open the conversation from the sidebar (mobile needs the overlay toggle first).
    const hamburger = page.locator("button[aria-label='Open conversations']");
    if (await hamburger.isVisible()) {
      await hamburger.click();
    }
    // Re-resolve after opening the overlay: on mobile the overlay item now comes
    // first in the DOM; on desktop the visible aside item is the only match.
    // Retry the click: under parallel load a Firestore-driven re-render can
    // swallow a click between mousedown and mouseup.
    const conversationItem = page.locator("div.cursor-pointer", { hasText: "Persist me please" }).first();
    const messageVisible = page
      .locator("div.space-y-3.overflow-y-auto div.whitespace-pre-wrap", { hasText: "Persist me please" })
      .first();
    const overlay = page.locator("div.fixed.inset-0.bg-black/40");
    for (let attempt = 0; attempt < 5; attempt++) {
      await conversationItem.click({ timeout: 5000 }).catch(() => {});
      if (await messageVisible.isVisible().catch(() => false)) break;
      if (await overlay.isVisible().catch(() => false)) {
        // Overlay still open: the click was swallowed, retry.
        await page.waitForTimeout(500);
        continue;
      }
      break;
    }

    // Messages and the conversation survive a full reload.
    await expect(page.locator("div.space-y-3.overflow-y-auto div.whitespace-pre-wrap", { hasText: "Persist me please" })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Mocked answer #1").first()).toBeVisible({ timeout: 15000 });
    await expect(sidebarItem).toBeVisible({ timeout: 15000 });
  });

  test("auto-scrolls to bottom for new messages when at bottom", async ({ page }) => {
    await mockChatApi(page, { longAnswers: true });

    await sendMessage(page, "Fill the conversation one");
    await expect(page.locator("text=Mocked answer #1").first()).toBeVisible({ timeout: 15000 });
    await sendMessage(page, "Fill the conversation two");
    await expect(page.locator("text=Mocked answer #2").first()).toBeVisible({ timeout: 15000 });

    const container = page.locator("div.space-y-3.overflow-y-auto").first();
    await page.waitForTimeout(500);

    const nearBottom = await container.evaluate((el) => {
      return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    });
    expect(nearBottom).toBe(true);
  });

  test("does not yank scroll when user has scrolled up during generation", async ({ page }) => {
    test.setTimeout(90000);
    await mockChatApi(page, { delayMs: 2500, longAnswers: true });

    await sendMessage(page, "Fill one");
    await expect(page.locator("text=Mocked answer #1").first()).toBeVisible({ timeout: 20000 });
    await sendMessage(page, "Fill two");
    await expect(page.locator("text=Mocked answer #2").first()).toBeVisible({ timeout: 20000 });

    const container = page.locator("div.space-y-3.overflow-y-auto").first();
    await container.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(300);

    // Send a third message while reading at the top.
    await sendMessage(page, "While scrolled up");
    await container.evaluate((el) => {
      el.scrollTop = 0;
    });

    // The AI response arrives ~2.5s later; scroll must stay put.
    await expect(page.locator("text=Mocked answer #3").first()).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(1000);

    const scrollTop = await container.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeLessThan(100);
  });
});