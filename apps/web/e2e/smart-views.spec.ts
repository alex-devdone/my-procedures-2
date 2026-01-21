import { expect, test } from "@playwright/test";

test.describe("Smart Views (localStorage mode)", () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage before each test to ensure clean state
		await page.goto("/todos");
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		// Wait for the page to be ready
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
		// Hover to reveal action buttons
		await todoItem.hover();
		const scheduleButton = todoItem.locator(
			'[data-testid="todo-schedule-popover-trigger"]',
		);
		await scheduleButton.click();
		// Wait for the schedule popover to be visible
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
		// Open date picker
		await page.click('[data-testid="date-picker-trigger"]');
		// Click Today preset
		await page.click('[data-testid="date-picker-preset-today"]');
		// Close popover
		await page.keyboard.press("Escape");
	}

	/**
	 * Helper to set due date for a todo to tomorrow
	 */
	async function setDueDateToTomorrow(
		todoItem: import("@playwright/test").Locator,
	) {
		await openSchedulePopover(todoItem);
		const page = todoItem.page();
		// Open date picker
		await page.click('[data-testid="date-picker-trigger"]');
		// Click Tomorrow preset
		await page.click('[data-testid="date-picker-preset-tomorrow"]');
		// Close popover
		await page.keyboard.press("Escape");
	}

	/**
	 * Helper to set due date for a todo to a past date (overdue)
	 */
	async function setDueDateToPast(
		todoItem: import("@playwright/test").Locator,
	) {
		await openSchedulePopover(todoItem);
		const page = todoItem.page();
		// Open date picker
		await page.click('[data-testid="date-picker-trigger"]');
		// Navigate to previous month
		await page.click('[data-testid="date-picker-prev-month"]');
		// Select day 15
		await page.click('[data-testid="date-picker-day-15"]');
		// Close popover
		await page.keyboard.press("Escape");
	}

	test.describe("Today View", () => {
		test("should navigate to Today view and see only today's todos", async ({
			page,
		}) => {
			// Create todos with different due dates
			const todayTodo = await createTodo(page, "Task due today");
			await setDueDateToToday(todayTodo);

			const tomorrowTodo = await createTodo(page, "Task due tomorrow");
			await setDueDateToTomorrow(tomorrowTodo);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// Should only show today's todo
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Task due today" }),
			).toBeVisible();
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Task due tomorrow" }),
			).not.toBeVisible();
		});

		test("should show empty state when no todos are due today", async ({
			page,
		}) => {
			// Create a todo without a due date
			await createTodo(page, "Task without due date");

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// Should show empty state
			await expect(
				page.locator('[data-testid="today-empty-state"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-testid="today-empty-state"]'),
			).toContainText("No tasks due today");
		});

		test("should complete todo from Today view", async ({ page }) => {
			// Create a todo due today
			const todayTodo = await createTodo(page, "Task to complete");
			await setDueDateToToday(todayTodo);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// Complete the todo
			const todoItem = page
				.locator('[data-testid="today-todo-list"]')
				.locator('[data-testid="todo-item-"]')
				.filter({ hasText: "Task to complete" });
			await expect(todoItem).toBeVisible({ timeout: 5000 });
			await todoItem.locator('[data-testid="todo-toggle"]').click();

			// Verify it's marked as completed
			await expect(todoItem).toHaveAttribute("data-completed", "true");
		});

		test("should filter todos in Today view by status", async ({ page }) => {
			// Create todos due today
			const activeTodo = await createTodo(page, "Active task");
			await setDueDateToToday(activeTodo);

			const completedTodo = await createTodo(page, "Completed task");
			await setDueDateToToday(completedTodo);
			// Mark as completed
			await completedTodo.locator('[data-testid="todo-toggle"]').click();

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');

			// Filter by active
			await page.click('[data-testid="filter-active"]');
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Active task" }),
			).toBeVisible();
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Completed task" }),
			).not.toBeVisible();

			// Filter by completed
			await page.click('[data-testid="filter-completed"]');
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Active task" }),
			).not.toBeVisible();
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Completed task" }),
			).toBeVisible();
		});
	});

	test.describe("Upcoming View", () => {
		test("should navigate to Upcoming view and see todos grouped by date", async ({
			page,
		}) => {
			// Create todos with different due dates
			const todayTodo = await createTodo(page, "Task due today");
			await setDueDateToToday(todayTodo);

			const tomorrowTodo = await createTodo(page, "Task due tomorrow");
			await setDueDateToTomorrow(tomorrowTodo);

			// Navigate to Upcoming view
			await page.click('[data-testid="smart-view-upcoming"]');
			await expect(page.locator('[data-testid="upcoming-view"]')).toBeVisible();

			// Should show date groups
			await expect(
				page
					.locator('[data-testid="date-group-"]')
					.filter({ hasText: "Today" }),
			).toBeVisible();
			await expect(
				page
					.locator('[data-testid="date-group-"]')
					.filter({ hasText: "Tomorrow" }),
			).toBeVisible();
		});

		test("should show empty state when no upcoming todos", async ({ page }) => {
			// Create a todo without a due date
			await createTodo(page, "Task without due date");

			// Navigate to Upcoming view
			await page.click('[data-testid="smart-view-upcoming"]');
			await expect(page.locator('[data-testid="upcoming-view"]')).toBeVisible();

			// Should show empty state
			await expect(
				page.locator('[data-testid="upcoming-empty-state"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-testid="upcoming-empty-state"]'),
			).toContainText("No upcoming tasks");
		});
	});

	test.describe("Overdue View", () => {
		test("should navigate to Overdue view and see only past-due todos", async ({
			page,
		}) => {
			// Create todos with different due dates
			const overdueTodo = await createTodo(page, "Overdue task");
			await setDueDateToPast(overdueTodo);

			const todayTodo = await createTodo(page, "Task due today");
			await setDueDateToToday(todayTodo);

			// Navigate to Overdue view
			await page.click('[data-testid="smart-view-overdue"]');
			await expect(page.locator('[data-testid="overdue-view"]')).toBeVisible();

			// Should only show overdue todo
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Overdue task" }),
			).toBeVisible();
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Task due today" }),
			).not.toBeVisible();
		});

		test("should show empty state when no overdue todos", async ({ page }) => {
			// Create a todo without a due date
			await createTodo(page, "Task without due date");

			// Navigate to Overdue view
			await page.click('[data-testid="smart-view-overdue"]');
			await expect(page.locator('[data-testid="overdue-view"]')).toBeVisible();

			// Should show empty state
			await expect(
				page.locator('[data-testid="overdue-empty-state"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-testid="overdue-empty-state"]'),
			).toContainText("No overdue tasks");
		});
	});

	test.describe("Smart View Navigation", () => {
		test("should switch between smart views and Inbox", async ({ page }) => {
			// Create todos in different states
			const inboxTodo = await createTodo(page, "Inbox task");

			const todayTodo = await createTodo(page, "Today task");
			await setDueDateToToday(todayTodo);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Today task" }),
			).toBeVisible();

			// Navigate back to Inbox
			await page.click('[data-testid="inbox-folder"]');
			await expect(
				page
					.locator('[data-testid="todo-item-"]')
					.filter({ hasText: "Inbox task" }),
			).toBeVisible();
		});

		test("should persist smart view selection after reload", async ({
			page,
		}) => {
			// Create a todo due today
			const todayTodo = await createTodo(page, "Persistent task");
			await setDueDateToToday(todayTodo);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Should still be on Today view
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();
		});
	});

	test.describe("Smart View Empty States", () => {
		test("should show 'all done' empty state when all todos completed", async ({
			page,
		}) => {
			// Create and complete a todo due today
			const todayTodo = await createTodo(page, "Completed task");
			await setDueDateToToday(todayTodo);
			await todayTodo.locator('[data-testid="todo-toggle"]').click();

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');

			// Filter by active (should show empty state)
			await page.click('[data-testid="filter-active"]');
			await expect(
				page.locator('[data-testid="today-empty-state"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-testid="today-empty-state"]'),
			).toContainText("All done for today");
		});

		test("should show search empty state when no matches", async ({ page }) => {
			// Create a todo due today
			const todayTodo = await createTodo(page, "Specific task name");
			await setDueDateToToday(todayTodo);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');

			// Search for non-existent text
			await page.fill('[data-testid="search-input"]', "nonexistent");
			await expect(
				page.locator('[data-testid="today-empty-state"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-testid="today-empty-state"]'),
			).toContainText("No matching tasks");
		});
	});
});
