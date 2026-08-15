import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("E. Quiz Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);

    await page.route("/api/quiz", async (route) => {
      if (route.request().method() === "POST") {
        const postData = await route.request().postData();
        const body = JSON.parse(postData || "{}");

        if (body.action === "submit") {
          const updatedQuestions = body.questions || [];
          let correctAnswers = 0;
          const serverQuestions = [
            {
              id: "q-0",
              question: "What is 2 + 2?",
              options: ["3", "4", "5", "6"],
              correctIndex: 1,
              explanation: "2 + 2 equals 4.",
            },
            {
              id: "q-1",
              question: "What is the capital of France?",
              options: ["London", "Berlin", "Paris", "Madrid"],
              correctIndex: 2,
              explanation: "Paris is the capital of France.",
            },
          ];

          for (let i = 0; i < serverQuestions.length && i < updatedQuestions.length; i++) {
            const q = updatedQuestions[i];
            if (q.selectedIndex === serverQuestions[i].correctIndex) {
              correctAnswers++;
            }
          }

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              attempt: {
                id: body.attemptId || "quiz-" + Date.now(),
                subject: body.subject || "Maths",
                class: body.class || 10,
                board: body.board || "CBSE",
                difficulty: body.difficulty || "medium",
                totalQuestions: serverQuestions.length,
                correctAnswers,
                score: Math.round((correctAnswers / serverQuestions.length) * 100),
                questions: serverQuestions.map((sq, idx) => ({
                  ...sq,
                  id: sq.id,
                  selectedIndex: updatedQuestions[idx]?.selectedIndex,
                })),
                createdAt: Date.now(),
                completedAt: Date.now(),
              },
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            attempt: {
              id: "quiz-" + Date.now(),
              subject: body.subject || "Maths",
              class: body.class || 10,
              board: body.board || "CBSE",
              difficulty: body.difficulty || "medium",
              totalQuestions: body.numberOfQuestions || 5,
              correctAnswers: 0,
              score: 0,
              questions: [
                {
                  id: "q-0",
                  question: "What is 2 + 2?",
                  options: ["3", "4", "5", "6"],
                  correctIndex: 1,
                  explanation: "2 + 2 equals 4.",
                  selectedIndex: undefined,
                },
                {
                  id: "q-1",
                  question: "What is the capital of France?",
                  options: ["London", "Berlin", "Paris", "Madrid"],
                  correctIndex: 2,
                  explanation: "Paris is the capital of France.",
                  selectedIndex: undefined,
                },
              ],
              createdAt: Date.now(),
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Not found" }),
      });
    });

    await page.goto("http://localhost:3000/dashboard/quiz");
    await page.waitForLoadState("domcontentloaded");
  });

  test("quiz page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Quick Quiz')").first()).toBeAttached();
  });

  test("quiz setup form is visible", async ({ page }) => {
    await expect(page.locator("text=Subject").first()).toBeAttached();
  });

  test("quiz setup form generates a quiz", async ({ page }) => {
    await expect(page.locator("text=Subject").first()).toBeAttached();
    await page.fill('input[type="text"]', "Physics");
    await page.click("button:has-text('Start Quiz')");
    await expect(page.locator("text=Question 1 of").first()).toBeVisible();
  });

  test("answering a question advances to next question", async ({ page }) => {
    await expect(page.locator("text=Subject").first()).toBeAttached();
    await page.fill('input[type="text"]', "Physics");
    await page.click("button:has-text('Start Quiz')");
    await expect(page.locator("text=Question 1 of").first()).toBeVisible();

    await page.click("text=4");
    await page.click("button:has-text('Next')");
    await expect(page.locator("text=Question 2 of").first()).toBeVisible();
  });

  test("quiz result shows score after submission", async ({ page }) => {
    await expect(page.locator("text=Subject").first()).toBeAttached();
    await page.fill('input[type="text"]', "Physics");
    await page.click("button:has-text('Start Quiz')");
    await expect(page.locator("text=Question 1 of").first()).toBeVisible();

    await page.click("text=4");
    await page.click("button:has-text('Next')");
    await expect(page.locator("text=Question 2 of").first()).toBeVisible();
    await page.click("text=Paris");
    await expect(page.locator("button:has-text('Submit Quiz')").first()).toBeVisible();
    await page.click("button:has-text('Submit Quiz')");
    await expect(page.locator("text=Quiz Complete!").first()).toBeVisible();
    await expect(page.locator("text=%").first()).toBeAttached();
  });
});
