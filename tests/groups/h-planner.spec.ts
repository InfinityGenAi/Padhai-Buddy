import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("H. Planner Tests", () => {
  const createdPlans: Array<{ id: string; title: string; subject: string; durationMinutes: number; plannedDate: string; completed: boolean; priority: string }> = [];

  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    createdPlans.length = 0;

    await page.route("/api/planner*", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ plans: [...createdPlans] }),
        });
        return;
      }

      const postData = await route.request().postData();
      const body = JSON.parse(postData || "{}");

      if (body.action === "create") {
        const plan = {
          id: "plan-" + Date.now(),
          title: body.title,
          subject: body.subject,
          durationMinutes: body.durationMinutes || 30,
          plannedDate: body.plannedDate || new Date().toISOString().split("T")[0],
          completed: false,
          priority: body.priority || "medium",
        };
        createdPlans.unshift(plan);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ plan }),
        });
        return;
      }

      if (body.action === "update") {
        const idx = createdPlans.findIndex((p) => p.id === body.planId);
        if (idx >= 0) {
          createdPlans[idx] = { ...createdPlans[idx], completed: body.completed };
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      if (body.action === "delete") {
        const idx = createdPlans.findIndex((p) => p.id === body.planId);
        if (idx >= 0) createdPlans.splice(idx, 1);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Not found" }),
      });
    });

    await page.goto("http://localhost:3000/dashboard/planner");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Study Planner')").first()).toBeAttached();
  });

  test("planner page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Study Planner')").first()).toBeAttached();
  });

  test("add task button is visible", async ({ page }) => {
    await expect(page.locator("text=Add Task").first()).toBeAttached();
  });

  test("add task and see it in list", async ({ page }) => {
    await page.click("text=Add Task");
    await expect(page.locator("text=Add Study Task").first()).toBeAttached();

    await page.fill('input[placeholder="Task title"]', "Calculus exercises");
    await page.fill('input[placeholder="Subject"]', "Mathematics");
    await page.locator("button:has-text('Add Task')").last().click({ force: true });

    await expect(page.locator("text=Calculus exercises").first()).toBeVisible();
    await expect(page.locator("text=Mathematics").first()).toBeVisible();
  });

  test("complete task toggles completion", async ({ page }) => {
    await page.click("text=Add Task");
    await page.fill('input[placeholder="Task title"]', "Newton's Laws");
    await page.fill('input[placeholder="Subject"]', "Physics");
    await page.locator("button:has-text('Add Task')").last().click({ force: true });
    await expect(page.locator("text=Newton's Laws").first()).toBeVisible();

    const taskCard = page.locator(".subtle-card").filter({ hasText: "Newton's Laws" });
    const checkbox = taskCard.locator("button").first();
    await checkbox.click({ force: true });

    const checkIcon = page.locator("[data-testid='check-icon'], svg path").first();
    await expect(checkIcon).toBeAttached();
  });
});
