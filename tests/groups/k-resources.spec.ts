import { test, expect } from "@playwright/test";
import { mockSessionsRoute } from "../utils/test-helpers";

test.describe("K. Resources Tests", () => {
  const createdResources: Array<{ id: string; title: string; subject: string; type: string; description: string; url: string }> = [];

  test.beforeEach(async ({ page }) => {
    await mockSessionsRoute(page);
    createdResources.length = 0;

    await page.route("/api/resources", async (route) => {
      const method = route.request().method();

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ resources: [...createdResources] }),
        });
        return;
      }

      const postData = await route.request().postData();
      const body = JSON.parse(postData || "{}");

      if (body.action === "create" || body.action === "update") {
        const resource = {
          id: body.resourceId || "res-" + Date.now(),
          title: body.title,
          subject: body.subject,
          type: body.type || "link",
          description: body.description || "",
          url: body.url || "",
        };
        createdResources.push(resource);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ resource }),
        });
        return;
      }

      if (body.action === "delete") {
        const idx = createdResources.findIndex((r) => r.id === body.resourceId);
        if (idx >= 0) createdResources.splice(idx, 1);
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

    await page.goto("http://localhost:3000/dashboard/resources");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1:has-text('Resources')").first()).toBeAttached();
  });

  test("resources page loads", async ({ page }) => {
    await expect(page.locator("h1:has-text('Resources')").first()).toBeAttached();
  });

  test("add resource button is visible", async ({ page }) => {
    await expect(page.locator("text=Add").first()).toBeAttached();
  });

  test("add resource and see it in list", async ({ page }) => {
    await page.click("text=Add");
    await expect(page.locator("text=Add Resource").first()).toBeAttached();

    await page.fill('input[placeholder="Title"]', "NCERT Solutions");
    await page.fill('input[placeholder="Subject"]', "Mathematics");
    await page.fill('textarea[placeholder="Description"]', "NCERT solutions for class 10");
    await page.click("button:has-text('Save')");

    await expect(page.locator("text=NCERT Solutions").first()).toBeVisible();
  });
});
