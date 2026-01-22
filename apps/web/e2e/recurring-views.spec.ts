import { expect, test } from "@playwright/test";

test.describe("Recurring Todos in Smart Views (localStorage mode)", () => {
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
	 * Helper to set a daily recurring pattern for a todo
	 */
	async function setDailyRecurring(
		todoItem: import("@playwright/test").Locator,
	) {
		await openSchedulePopover(todoItem);
		const page = todoItem.page();
		// Open recurring picker
		await page.click('[data-testid="recurring-picker-trigger"]');
		await expect(
			page.locator('[data-testid="recurring-picker-popover"]'),
		).toBeVisible();
		// Select Daily preset
		await page.click('[data-testid="recurring-picker-preset-daily"]');
		// Close popover
		await page.keyboard.press("Escape");
	}

	/**
	 * Helper to set a weekly recurring pattern for a todo
	 */
	async function setWeeklyRecurring(
		todoItem: import("@playwright/test").Locator,
	) {
		await openSchedulePopover(todoItem);
		const page = todoItem.page();
		await page.click('[data-testid="recurring-picker-trigger"]');
		await expect(
			page.locator('[data-testid="recurring-picker-popover"]'),
		).toBeVisible();
		await page.click('[data-testid="recurring-picker-preset-weekly"]');
		await page.keyboard.press("Escape");
	}

	/**
	 * Helper to set a daily recurring pattern with due date for today
	 */
	async function setDailyRecurringWithDueDateToday(
		todoItem: import("@playwright/test").Locator,
	) {
		await openSchedulePopover(todoItem);
		const page = todoItem.page();
		// Set due date to today
		await page.click('[data-testid="date-picker-trigger"]');
		await page.click('[data-testid="date-picker-preset-today"]');
		// Set daily recurring
		await page.click('[data-testid="recurring-picker-trigger"]');
		await page.click('[data-testid="recurring-picker-preset-daily"]');
		await page.keyboard.press("Escape");
	}

	test.describe("Recurring todos appear in Today view", () => {
		test("should show daily recurring todo in Today view", async ({ page }) => {
			// Create a todo with daily recurring pattern
			const todoItem = await createTodo(page, "Daily standup meeting");
			await setDailyRecurring(todoItem);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// The recurring todo should appear in Today view
			await expect(
				page
					.locator('[data-testid="today-todo-list"]')
					.locator('[data-testid^="todo-item-"]')
					.filter({ hasText: "Daily standup meeting" }),
			).toBeVisible();
		});

		test("should show daily recurring todo with due date in Today view", async ({
			page,
		}) => {
			// Create a todo with both daily recurring and due date today
			const todoItem = await createTodo(page, "Review daily reports");
			await setDailyRecurringWithDueDateToday(todoItem);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// The todo should appear in Today view
			const todayTodo = page
				.locator('[data-testid="today-todo-list"]')
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Review daily reports" });
			await expect(todayTodo).toBeVisible();

			// Should have both due date badge and recurring indicator
			await expect(
				todayTodo.locator('[data-testid="due-date-badge"]'),
			).toBeVisible();
			await expect(
				todayTodo.locator('[data-testid="recurring-indicator"]'),
			).toBeVisible();
		});

		test("should not show weekly recurring todo in Today view if today is not a matching day", async ({
			page,
		}) => {
			// Create a todo with weekly recurring on specific days
			const todoItem = await createTodo(page, "Weekly sync");
			await openSchedulePopover(todoItem);

			await page.click('[data-testid="recurring-picker-trigger"]');
			// Change type to weekly
			await page.click('[data-testid="recurring-picker-type-trigger"]');
			await page.click('[data-testid="recurring-picker-type-weekly"]');

			// Get today's day of week (0 = Sunday, 6 = Saturday)
			const today = new Date().getDay();
			// Select a day that is NOT today (pick the day after today, wrapping around)
			const notTodayDay = (today + 1) % 7;
			await page.click(`[data-testid="recurring-picker-day-${notTodayDay}"]`);

			await page.click('[data-testid="recurring-picker-apply"]');
			await page.keyboard.press("Escape");

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// The weekly recurring todo should NOT appear today (unless by chance today matches)
			// Since we selected a day that is not today, it should not be visible
			await expect(
				page
					.locator('[data-testid="today-todo-list"]')
					.locator('[data-testid^="todo-item-"]')
					.filter({ hasText: "Weekly sync" }),
			).not.toBeVisible();
		});

		test("should show recurring indicator badge on todo in Today view", async ({
			page,
		}) => {
			// Create a daily recurring todo
			const todoItem = await createTodo(page, "Check emails");
			await setDailyRecurring(todoItem);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// Find the todo in Today view
			const todayTodo = page
				.locator('[data-testid="today-todo-list"]')
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Check emails" });
			await expect(todayTodo).toBeVisible();

			// Should show recurring pattern badge
			await expect(
				todayTodo.locator('[data-testid="due-date-badge"]'),
			).toContainText("Daily");
		});
	});

	test.describe("Recurring todos appear in Upcoming view", () => {
		test("should show daily recurring todo in Upcoming view grouped by date", async ({
			page,
		}) => {
			// Create a daily recurring todo
			const todoItem = await createTodo(page, "Daily exercise");
			await setDailyRecurring(todoItem);

			// Navigate to Upcoming view
			await page.click('[data-testid="smart-view-upcoming"]');
			await expect(page.locator('[data-testid="upcoming-view"]')).toBeVisible();

			// Should show the todo in Today's group
			const todayGroup = page
				.locator('[data-testid^="date-group-"]')
				.filter({ hasText: "Today" });
			await expect(todayGroup).toBeVisible();
			await expect(
				todayGroup
					.locator('[data-testid^="todo-item-"]')
					.filter({ hasText: "Daily exercise" }),
			).toBeVisible();

			// Should also show in Tomorrow's group (since it's daily)
			const tomorrowGroup = page
				.locator('[data-testid^="date-group-"]')
				.filter({ hasText: "Tomorrow" });
			await expect(tomorrowGroup).toBeVisible();
			await expect(
				tomorrowGroup
					.locator('[data-testid^="todo-item-"]')
					.filter({ hasText: "Daily exercise" }),
			).toBeVisible();
		});

		test("should show weekly recurring todo on matching days in Upcoming view", async ({
			page,
		}) => {
			// Create a weekly recurring todo (using default weekly which uses all days)
			const todoItem = await createTodo(page, "Weekly review");
			await setWeeklyRecurring(todoItem);

			// Navigate to Upcoming view
			await page.click('[data-testid="smart-view-upcoming"]');
			await expect(page.locator('[data-testid="upcoming-view"]')).toBeVisible();

			// The weekly recurring todo should appear at least once in the upcoming view
			// (since weekly with no specific days defaults to showing all days)
			await expect(
				page
					.locator('[data-testid="upcoming-todo-list"]')
					.locator('[data-testid^="todo-item-"]')
					.filter({ hasText: "Weekly review" })
					.first(),
			).toBeVisible();
		});

		test("should show recurring indicator on todos in Upcoming view", async ({
			page,
		}) => {
			// Create a daily recurring todo
			const todoItem = await createTodo(page, "Morning routine");
			await setDailyRecurring(todoItem);

			// Navigate to Upcoming view
			await page.click('[data-testid="smart-view-upcoming"]');
			await expect(page.locator('[data-testid="upcoming-view"]')).toBeVisible();

			// Find the first occurrence in Upcoming view
			const upcomingTodo = page
				.locator('[data-testid="upcoming-todo-list"]')
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Morning routine" })
				.first();
			await expect(upcomingTodo).toBeVisible();

			// Should show Daily badge
			await expect(
				upcomingTodo.locator('[data-testid="due-date-badge"]'),
			).toContainText("Daily");
		});

		test("should show multiple occurrences of daily recurring todo across days", async ({
			page,
		}) => {
			// Create a daily recurring todo
			const todoItem = await createTodo(page, "Take medication");
			await setDailyRecurring(todoItem);

			// Navigate to Upcoming view
			await page.click('[data-testid="smart-view-upcoming"]');
			await expect(page.locator('[data-testid="upcoming-view"]')).toBeVisible();

			// Count occurrences - daily recurring should appear on multiple days
			const occurrences = page
				.locator('[data-testid="upcoming-todo-list"]')
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Take medication" });

			// Should appear at least 2 times (today and tomorrow at minimum)
			const count = await occurrences.count();
			expect(count).toBeGreaterThanOrEqual(2);
		});
	});

	test.describe("Completed recurring todos shown with strikethrough", () => {
		test("should show strikethrough on completed recurring todo in Today view", async ({
			page,
		}) => {
			// Create and complete a daily recurring todo
			const todoItem = await createTodo(page, "Morning meditation");
			await setDailyRecurring(todoItem);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// Find and complete the todo
			const todayTodo = page
				.locator('[data-testid="today-todo-list"]')
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Morning meditation" });
			await expect(todayTodo).toBeVisible();

			// Complete the todo
			await todayTodo.locator('[data-testid="todo-toggle"]').click();

			// Wait for completion state update
			await expect(
				todayTodo.locator('[data-testid="todo-toggle"]'),
			).toHaveAttribute("aria-label", "Mark as incomplete");

			// The text should have strikethrough (line-through class)
			const todoText = todayTodo.locator('[data-testid="todo-text"]');
			await expect(todoText).toHaveClass(/line-through/);
		});

		test("should show strikethrough on completed recurring todo in Inbox view", async ({
			page,
		}) => {
			// Create a daily recurring todo
			const todoItem = await createTodo(page, "Daily journaling");
			// Store the original todo's testid for later reference
			const originalTodoTestId = await todoItem.getAttribute("data-testid");
			await setDailyRecurring(todoItem);

			// Complete the todo directly in Inbox
			await todoItem.locator('[data-testid="todo-toggle"]').click();

			// When completing a recurring todo, a new occurrence is created
			// So we need to target the original todo using its specific testid
			const originalTodo = page.locator(
				`[data-testid="${originalTodoTestId}"]`,
			);

			// Wait for completion state update on the original todo
			await expect(
				originalTodo.locator('[data-testid="todo-toggle"]'),
			).toHaveAttribute("aria-label", "Mark as incomplete");

			// The text should have strikethrough on the completed (original) todo
			const todoText = originalTodo.locator('[data-testid="todo-text"]');
			await expect(todoText).toHaveClass(/line-through/);

			// Verify recurring badge is still visible on the original completed todo
			await expect(
				originalTodo.locator('[data-testid="due-date-badge"]'),
			).toContainText("Daily");
		});

		test("should show muted text color on completed recurring todo", async ({
			page,
		}) => {
			// Create a daily recurring todo
			const todoItem = await createTodo(page, "Check notifications");
			// Store the original todo's testid for later reference
			const originalTodoTestId = await todoItem.getAttribute("data-testid");
			await setDailyRecurring(todoItem);

			// Complete the todo
			await todoItem.locator('[data-testid="todo-toggle"]').click();

			// Target the original completed todo by its specific testid
			const originalTodo = page.locator(
				`[data-testid="${originalTodoTestId}"]`,
			);

			// Wait for completion
			await expect(
				originalTodo.locator('[data-testid="todo-toggle"]'),
			).toHaveAttribute("aria-label", "Mark as incomplete");

			// The text should have muted color class on the completed todo
			const todoText = originalTodo.locator('[data-testid="todo-text"]');
			await expect(todoText).toHaveClass(/text-muted-foreground/);
		});

		test("should remove strikethrough when uncompleting recurring todo", async ({
			page,
		}) => {
			// Create a daily recurring todo
			const todoItem = await createTodo(page, "Water plants");
			// Store the original todo's testid for later reference
			const originalTodoTestId = await todoItem.getAttribute("data-testid");
			await setDailyRecurring(todoItem);

			// Complete the todo
			await todoItem.locator('[data-testid="todo-toggle"]').click();

			// Target the original completed todo by its specific testid
			const originalTodo = page.locator(
				`[data-testid="${originalTodoTestId}"]`,
			);

			await expect(
				originalTodo.locator('[data-testid="todo-toggle"]'),
			).toHaveAttribute("aria-label", "Mark as incomplete");

			// Verify strikethrough is applied
			const todoText = originalTodo.locator('[data-testid="todo-text"]');
			await expect(todoText).toHaveClass(/line-through/);

			// Uncomplete the todo (click on the original completed todo)
			await originalTodo.locator('[data-testid="todo-toggle"]').click();
			await expect(
				originalTodo.locator('[data-testid="todo-toggle"]'),
			).toHaveAttribute("aria-label", "Mark as complete");

			// Strikethrough should be removed
			await expect(todoText).not.toHaveClass(/line-through/);
		});

		test("should filter completed recurring todos in Today view", async ({
			page,
		}) => {
			// Create two daily recurring todos with unique names
			const todo1 = await createTodo(page, "Morning routine unique");
			// Store the original todo's testid
			const todo1TestId = await todo1.getAttribute("data-testid");
			await setDailyRecurring(todo1);

			const todo2 = await createTodo(page, "Evening routine unique");
			await setDailyRecurring(todo2);

			// Complete the first one (this creates a new occurrence)
			await todo1.locator('[data-testid="todo-toggle"]').click();

			// Wait for the new occurrence to be created
			await page.waitForTimeout(500);

			// Navigate to Today view
			await page.click('[data-testid="smart-view-today"]');
			await expect(page.locator('[data-testid="today-view"]')).toBeVisible();

			// Filter by completed - should show the completed todo
			await page.click('[data-testid="filter-completed"]');

			// The completed version of "Morning routine unique" should be visible
			// Find it by the specific testid we saved earlier
			const completedTodo = page.locator(`[data-testid="${todo1TestId}"]`);
			await expect(completedTodo).toBeVisible();

			// "Evening routine unique" should NOT be visible (it's active)
			await expect(
				page
					.locator('[data-testid^="todo-item-"]')
					.filter({ hasText: "Evening routine unique" }),
			).not.toBeVisible();

			// Filter by active
			await page.click('[data-testid="filter-active"]');

			// The completed todo should NOT be visible in active filter
			await expect(completedTodo).not.toBeVisible();

			// "Evening routine unique" should be visible (it's active)
			await expect(
				page
					.locator('[data-testid^="todo-item-"]')
					.filter({ hasText: "Evening routine unique" }),
			).toBeVisible();
		});

		test("should persist completed state of recurring todo after reload", async ({
			page,
		}) => {
			// Create a daily recurring todo
			const todoTextContent = "Persistent recurring task";
			const todoItem = await createTodo(page, todoTextContent);
			// Store the original todo's testid for later reference
			const originalTodoTestId = await todoItem.getAttribute("data-testid");
			await setDailyRecurring(todoItem);

			// Complete the todo
			await todoItem.locator('[data-testid="todo-toggle"]').click();

			// Target the original todo by its specific testid
			const originalTodo = page.locator(
				`[data-testid="${originalTodoTestId}"]`,
			);

			await expect(
				originalTodo.locator('[data-testid="todo-toggle"]'),
			).toHaveAttribute("aria-label", "Mark as incomplete");

			// Reload the page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// After reload, find the completed todo (the one with completed state)
			// The original todo should still be completed
			const completedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: todoTextContent })
				.filter({
					has: page.locator(
						'[data-testid="todo-toggle"][aria-label="Mark as incomplete"]',
					),
				});
			await expect(completedTodo).toBeVisible();

			// Should have strikethrough
			await expect(
				completedTodo.locator('[data-testid="todo-text"]'),
			).toHaveClass(/line-through/);
		});
	});
});
