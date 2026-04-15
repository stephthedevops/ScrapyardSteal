import { test, expect } from "@playwright/test";

test.describe("Game Launch", () => {
  test("page loads with game container", async ({ page }) => {
    await page.goto("/");
    const container = page.locator("#game-container");
    await expect(container).toBeVisible();
  });

  test("Phaser canvas renders", async ({ page }) => {
    await page.goto("/");
    const canvas = page.locator("#game-container canvas");
    await expect(canvas).toBeVisible({ timeout: 5_000 });
  });
});
