import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
	test("should load the home page", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/My Procedures/i);
	});

	test("should have main content visible", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("main")).toBeVisible();
	});
});
