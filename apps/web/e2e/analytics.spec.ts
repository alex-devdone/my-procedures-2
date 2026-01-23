import { expect, test } from "@playwright/test";

/**
 * Analytics E2E Tests
 *
 * Note: The analytics page (/analytics) works in both authenticated and
 * unauthenticated modes. When unauthenticated, it shows analytics based on
 * local storage data. These tests verify:
 * 1. The analytics smart view exists in the sidebar
 * 2. The analytics page loads correctly for unauthenticated users
 * 3. Basic navigation and UI elements when accessing analytics
 */
test.describe("Analytics (unauthenticated access)", () => {
	test.describe("Sidebar Analytics Smart View", () => {
		test("should display analytics smart view in sidebar", async ({ page }) => {
			await page.goto("/todos");
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Analytics smart view should be visible in sidebar
			const analyticsButton = page.locator(
				'[data-testid="smart-view-analytics"]',
			);
			await expect(analyticsButton).toBeVisible();
			await expect(analyticsButton).toHaveAttribute(
				"aria-label",
				"Analytics dashboard",
			);
		});

		test("should have correct icon and label for analytics view", async ({
			page,
		}) => {
			await page.goto("/todos");
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			const analyticsButton = page.locator(
				'[data-testid="smart-view-analytics"]',
			);
			await expect(analyticsButton).toContainText("Analytics");
		});
	});

	test.describe("Analytics Page Access", () => {
		test("should load analytics page in local storage mode without auth", async ({
			page,
		}) => {
			// Clear any existing session
			await page.goto("/todos");
			await page.evaluate(() => localStorage.clear());

			// Navigate directly to analytics page
			await page.goto("/analytics");

			// Should stay on analytics page (works in local storage mode)
			await expect(page).toHaveURL(/\/analytics/);

			// Should show the local storage indicator
			const localBadge = page.locator("text=Local");
			await expect(localBadge).toBeVisible();
		});
	});
});

/**
 * Analytics Dashboard Component Tests
 *
 * These tests verify the analytics dashboard UI when rendered.
 * The analytics page works in both authenticated and local storage modes.
 */
test.describe("Analytics Dashboard (direct page test)", () => {
	test.beforeEach(async ({ page }) => {
		// Set up some todo data before testing
		await page.goto("/todos");
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		await page.waitForSelector('[data-testid="folder-sidebar"]');
	});

	/**
	 * Helper to create a todo and return the todo item locator
	 */
	async function createTodo(
		page: import("@playwright/test").Page,
		text: string,
	) {
		await page.fill('input[placeholder^="Add task to"]', text);
		await page.click('button[type="submit"]:has-text("Add")');
		const todoItem = page
			.locator('[data-testid^="todo-item-"]')
			.filter({ hasText: text });
		await expect(todoItem).toBeVisible();
		return todoItem;
	}

	/**
	 * Helper to open the schedule popover for a todo
	 */
	async function openSchedulePopover(
		todoItem: import("@playwright/test").Locator,
	) {
		await todoItem.hover();
		const scheduleButton = todoItem.locator(
			'[data-testid="todo-schedule-popover-trigger"]',
		);
		await scheduleButton.click();
		await expect(
			todoItem.page().locator('[data-testid="todo-schedule-popover"]'),
		).toBeVisible();
	}

	/**
	 * Helper to set due date for a todo to today
	 */
	async function setDueDateToToday(
		todoItem: import("@playwright/test").Locator,
	) {
		await openSchedulePopover(todoItem);
		const page = todoItem.page();
		await page.click('[data-testid="date-picker-trigger"]');
		await page.click('[data-testid="date-picker-preset-today"]');
		await page.keyboard.press("Escape");
	}

	test.describe("Local Storage Data Setup", () => {
		test("should create todo and complete it for analytics data", async ({
			page,
		}) => {
			// This test verifies that local storage data can be created
			// which would be used by analytics if the page were accessible

			const todo = await createTodo(page, "Analytics data task");
			await setDueDateToToday(todo);

			// Complete the todo
			await todo.locator('[data-testid="todo-toggle"]').click();

			// Verify the todo is marked as complete
			await expect(todo.locator("span.line-through")).toBeVisible();

			// Verify local storage has the data
			const localData = await page.evaluate(() => {
				const todos = localStorage.getItem("todos");
				return todos ? JSON.parse(todos) : null;
			});

			expect(localData).not.toBeNull();
			expect(localData.length).toBeGreaterThan(0);
		});

		test("should store completion history in local storage", async ({
			page,
		}) => {
			const todo = await createTodo(page, "History data task");
			await setDueDateToToday(todo);
			await todo.locator('[data-testid="todo-toggle"]').click();

			// Verify completion is stored
			const completedTodo = await page.evaluate(() => {
				const todos = localStorage.getItem("todos");
				if (todos) {
					const parsed = JSON.parse(todos);
					return parsed.find(
						(t: { text: string; completed: boolean }) =>
							t.text === "History data task" && t.completed,
					);
				}
				return null;
			});

			expect(completedTodo).not.toBeNull();
			expect(completedTodo.completed).toBe(true);
		});
	});

	test.describe("Recurring Todo Setup for Analytics", () => {
		test("should create recurring todo with due date", async ({ page }) => {
			const todo = await createTodo(page, "Recurring analytics task");
			await setDueDateToToday(todo);

			// Open schedule popover and check for recurring option
			await openSchedulePopover(todo);
			const recurringToggle = page.locator('[data-testid="recurring-toggle"]');

			if (await recurringToggle.isVisible()) {
				await recurringToggle.click();
				// Verify recurring options appear
				const recurringOptions = page.locator('[data-testid^="recurring-"]');
				const count = await recurringOptions.count();
				expect(count).toBeGreaterThan(0);
			}

			await page.keyboard.press("Escape");
		});
	});
});

/**
 * Analytics Smart View Navigation Tests
 *
 * These tests verify what happens when clicking the analytics smart view
 * in the sidebar from the todos page.
 */
test.describe("Analytics Smart View Interaction", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/todos");
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		await page.waitForSelector('[data-testid="folder-sidebar"]');
	});

	test("should be able to click analytics smart view button", async ({
		page,
	}) => {
		const analyticsButton = page.locator(
			'[data-testid="smart-view-analytics"]',
		);

		// Click the analytics button
		await analyticsButton.click();

		// Currently, clicking analytics in the todos page sets selectedFolderId
		// but doesn't navigate to /analytics or show a special view.
		// The button should remain clickable and not cause errors.
		await expect(analyticsButton).toBeVisible();
	});

	test("analytics button should have selected state when clicked", async ({
		page,
	}) => {
		const analyticsButton = page.locator(
			'[data-testid="smart-view-analytics"]',
		);

		// Click analytics
		await analyticsButton.click();

		// Button should show selected state (aria-current="page")
		await expect(analyticsButton).toHaveAttribute("aria-current", "page");
	});

	test("should allow switching between analytics and other smart views", async ({
		page,
	}) => {
		// Click analytics
		await page.click('[data-testid="smart-view-analytics"]');
		await expect(
			page.locator('[data-testid="smart-view-analytics"]'),
		).toHaveAttribute("aria-current", "page");

		// Switch to today view
		await page.click('[data-testid="smart-view-today"]');
		await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

		// Analytics should no longer be selected
		await expect(
			page.locator('[data-testid="smart-view-analytics"]'),
		).not.toHaveAttribute("aria-current", "page");
	});

	test("should allow switching from analytics to inbox", async ({ page }) => {
		// Click analytics
		await page.click('[data-testid="smart-view-analytics"]');

		// Switch to inbox
		await page.click('[data-testid="inbox-folder"]');

		// Inbox should be selected
		await expect(page.locator('[data-testid="inbox-folder"]')).toHaveAttribute(
			"aria-current",
			"page",
		);

		// Analytics should not be selected
		await expect(
			page.locator('[data-testid="smart-view-analytics"]'),
		).not.toHaveAttribute("aria-current", "page");
	});
});
