import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("J. Progress Tests", () => {
  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    await page.route("/api/progress", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          stats: {
            totalDoubts: 5,
            totalQuizzes: 3,
            avgQuizScore: 85,
            totalFlashcards: 10,
            totalNotes: 4,
            totalStudySessions: 8,
            totalStudyMinutes: 120,
            plansCompleted: 2,
            plansTotal: 5,
            flashcardsReviewed: 15,
            dailyActivity: [
              { day: "Mon", value: 2 },
              { day: "Tue", value: 4 },
              { day: "Wed", value: 3 },
              { day: "Thu", value: 5 },
              { day: "Fri", value: 1 },
              { day: "Sat", value: 3 },
              { day: "Sun", value: 2 },
            ],
          },
        }),
      });
    });

    await page.goto("http://localhost:3000/dashboard/progress");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Progress')").first()).toBeAttached();
  });

  test("progress page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Progress')").first()).toBeAttached();
  });

  test("metrics section is visible", async ({ page }) => {
    await expect(page.locator("text=Total Study Time").first()).toBeAttached();
  });

  test("weekly chart renders", async ({ page }) => {
    const chart = page.locator(".bg-gradient-to-t.from-purple-500.to-indigo-500").first();
    await expect(chart).toBeAttached();
  });

  test("study summary is visible", async ({ page }) => {
    await expect(page.locator("text=Study Summary").first()).toBeAttached();
  });
});
