import { expect, test } from "@playwright/test";

test.describe("Scheduling functionality (localStorage mode)", () => {
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

	test.describe("Set due date using date picker", () => {
		test("should set due date using calendar day selection", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Task with calendar due date");
			await openSchedulePopover(todoItem);

			// Open date picker
			const datePicker = page.locator('[data-testid="date-picker-trigger"]');
			await datePicker.click();
			await expect(
				page.locator('[data-testid="date-picker-popover"]'),
			).toBeVisible();

			// Select day 15 of current month
			await page.click('[data-testid="date-picker-day-15"]');

			// Date picker should close after selection
			await expect(
				page.locator('[data-testid="date-picker-popover"]'),
			).not.toBeVisible();

			// Schedule popover should still be open with summary
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-due"]'),
			).toBeVisible();
		});

		test("should navigate calendar months", async ({ page }) => {
			const todoItem = await createTodo(page, "Task for month navigation");
			await openSchedulePopover(todoItem);

			// Open date picker
			await page.click('[data-testid="date-picker-trigger"]');
			await expect(
				page.locator('[data-testid="date-picker-popover"]'),
			).toBeVisible();

			// Get current month text
			const currentMonthText = await page
				.locator('[data-testid="date-picker-current-month"]')
				.textContent();

			// Navigate to next month
			await page.click('[data-testid="date-picker-next-month"]');

			// Month display should change
			const nextMonthText = await page
				.locator('[data-testid="date-picker-current-month"]')
				.textContent();
			expect(nextMonthText).not.toBe(currentMonthText);

			// Navigate back to previous month
			await page.click('[data-testid="date-picker-prev-month"]');

			// Month display should be back to original
			await expect(
				page.locator('[data-testid="date-picker-current-month"]'),
			).toHaveText(currentMonthText as string);
		});
	});

	test.describe("Set due date using presets", () => {
		test("should set due date to Today using preset", async ({ page }) => {
			const todoItem = await createTodo(page, "Task due today");
			await openSchedulePopover(todoItem);

			// Open date picker
			await page.click('[data-testid="date-picker-trigger"]');

			// Click Today preset
			await page.click('[data-testid="date-picker-preset-today"]');

			// Date picker should close
			await expect(
				page.locator('[data-testid="date-picker-popover"]'),
			).not.toBeVisible();

			// Summary should show "Today"
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-due"]'),
			).toContainText("Today");
		});

		test("should set due date to Tomorrow using preset", async ({ page }) => {
			const todoItem = await createTodo(page, "Task due tomorrow");
			await openSchedulePopover(todoItem);

			// Open date picker
			await page.click('[data-testid="date-picker-trigger"]');

			// Click Tomorrow preset
			await page.click('[data-testid="date-picker-preset-tomorrow"]');

			// Summary should show "Tomorrow"
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-due"]'),
			).toContainText("Tomorrow");
		});

		test("should set due date to Next week using preset", async ({ page }) => {
			const todoItem = await createTodo(page, "Task due next week");
			await openSchedulePopover(todoItem);

			// Open date picker
			await page.click('[data-testid="date-picker-trigger"]');

			// Click Next week preset
			await page.click('[data-testid="date-picker-preset-next-week"]');

			// Summary should show due date (weekday format for dates within 7 days)
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-due"]'),
			).toBeVisible();
		});
	});

	test.describe("Clear due date from todo", () => {
		test("should clear due date using clear button", async ({ page }) => {
			const todoItem = await createTodo(page, "Task to clear due date");
			await openSchedulePopover(todoItem);

			// Set a due date first
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-today"]');

			// Verify due date is set
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-due"]'),
			).toBeVisible();

			// Clear the due date using the clear button in the date picker section
			await page.click('[data-testid="date-picker-clear"]');

			// Summary should no longer show due date
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-due"]'),
			).not.toBeVisible();
		});

		test("should clear all schedule using Clear all button", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Task to clear all");
			await openSchedulePopover(todoItem);

			// Set a due date
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-today"]');

			// Set a recurring pattern
			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-daily"]');

			// Verify both are set
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary"]'),
			).toBeVisible();

			// Click Clear all
			await page.click('[data-testid="todo-schedule-popover-clear-all"]');

			// Popover should close after clear all
			await expect(
				page.locator('[data-testid="todo-schedule-popover"]'),
			).not.toBeVisible();

			// Reopen to verify it's cleared
			await todoItem.hover();
			await todoItem
				.locator('[data-testid="todo-schedule-popover-trigger"]')
				.click();
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary"]'),
			).not.toBeVisible();
		});
	});

	test.describe("Set reminder time for todo", () => {
		test("should show hint when no due date is set", async ({ page }) => {
			const todoItem = await createTodo(page, "Task for reminder hint");
			await openSchedulePopover(todoItem);

			// Reminder hint should be visible
			await expect(
				page.locator('[data-testid="todo-schedule-popover-reminder-hint"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-testid="todo-schedule-popover-reminder-hint"]'),
			).toContainText("Set a due date first");
		});

		test("should set reminder after due date is set", async ({ page }) => {
			const todoItem = await createTodo(page, "Task with reminder");
			await openSchedulePopover(todoItem);

			// Set a due date first
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-tomorrow"]');

			// Reminder hint should be gone
			await expect(
				page.locator('[data-testid="todo-schedule-popover-reminder-hint"]'),
			).not.toBeVisible();

			// Now set a reminder
			await page.click('[data-testid="reminder-picker-trigger"]');
			await expect(
				page.locator('[data-testid="reminder-picker-popover"]'),
			).toBeVisible();

			// Select "30 minutes before" (offset -30)
			await page.click('[data-testid="reminder-picker-offset--30"]');

			// Reminder should be shown in summary
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-reminder"]'),
			).toBeVisible();
		});

		test("should clear reminder when due date is cleared", async ({ page }) => {
			const todoItem = await createTodo(page, "Task with reminder to clear");
			await openSchedulePopover(todoItem);

			// Set due date
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-tomorrow"]');

			// Set reminder
			await page.click('[data-testid="reminder-picker-trigger"]');
			await page.click('[data-testid="reminder-picker-offset--30"]');

			// Verify reminder is set
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-reminder"]'),
			).toBeVisible();

			// Clear due date
			await page.click('[data-testid="date-picker-clear"]');

			// Reminder should also be cleared (since it depends on due date)
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-reminder"]'),
			).not.toBeVisible();

			// Hint should be back
			await expect(
				page.locator('[data-testid="todo-schedule-popover-reminder-hint"]'),
			).toBeVisible();
		});
	});

	test.describe("Create daily recurring todo", () => {
		test("should create daily recurring todo using preset", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Daily task");
			await openSchedulePopover(todoItem);

			// Open recurring picker
			await page.click('[data-testid="recurring-picker-trigger"]');
			await expect(
				page.locator('[data-testid="recurring-picker-popover"]'),
			).toBeVisible();

			// Select Daily preset
			await page.click('[data-testid="recurring-picker-preset-daily"]');

			// Recurring should be shown in summary
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Daily");
		});

		test("should create daily recurring todo using custom builder", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Custom daily task");
			await openSchedulePopover(todoItem);

			// Open recurring picker
			await page.click('[data-testid="recurring-picker-trigger"]');

			// Set interval to every 3 days
			const intervalInput = page.locator(
				'[data-testid="recurring-picker-interval-input"]',
			);
			await intervalInput.fill("3");

			// Apply the pattern
			await page.click('[data-testid="recurring-picker-apply"]');

			// Popover closes
			await expect(
				page.locator('[data-testid="recurring-picker-popover"]'),
			).not.toBeVisible();

			// Summary should show the pattern
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Every 3 days");
		});
	});

	test.describe("Create weekly recurring todo", () => {
		test("should create weekly recurring todo using preset", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Weekly task");
			await openSchedulePopover(todoItem);

			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-weekly"]');

			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Weekly");
		});

		test("should create weekly recurring todo with specific days", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "MWF task");
			await openSchedulePopover(todoItem);

			await page.click('[data-testid="recurring-picker-trigger"]');

			// Change type to weekly
			await page.click('[data-testid="recurring-picker-type-trigger"]');
			await page.click('[data-testid="recurring-picker-type-weekly"]');

			// Select Monday (1), Wednesday (3), Friday (5)
			await page.click('[data-testid="recurring-picker-day-1"]');
			await page.click('[data-testid="recurring-picker-day-3"]');
			await page.click('[data-testid="recurring-picker-day-5"]');

			// Apply
			await page.click('[data-testid="recurring-picker-apply"]');

			// Summary should show the days
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Mon");
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Wed");
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Fri");
		});

		test("should create weekdays recurring todo using preset", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Weekday task");
			await openSchedulePopover(todoItem);

			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-weekdays"]');

			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Weekdays");
		});
	});

	test.describe("Create monthly recurring todo", () => {
		test("should create monthly recurring todo using preset", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Monthly task");
			await openSchedulePopover(todoItem);

			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-monthly"]');

			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Monthly");
		});

		test("should create monthly recurring todo on specific day", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Monthly on 15th");
			await openSchedulePopover(todoItem);

			await page.click('[data-testid="recurring-picker-trigger"]');

			// Change type to monthly
			await page.click('[data-testid="recurring-picker-type-trigger"]');
			await page.click('[data-testid="recurring-picker-type-monthly"]');

			// Set day of month to 15
			const dayInput = page.locator(
				'[data-testid="recurring-picker-day-of-month-input"]',
			);
			await dayInput.fill("15");

			// Apply
			await page.click('[data-testid="recurring-picker-apply"]');

			// Summary should show the day
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("15th");
		});
	});

	test.describe("Show overdue styling for past-due todos", () => {
		test("should show overdue styling for past-due incomplete todo", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Overdue task");
			await openSchedulePopover(todoItem);

			// Open date picker
			await page.click('[data-testid="date-picker-trigger"]');

			// Navigate to previous month and select a day
			await page.click('[data-testid="date-picker-prev-month"]');
			await page.click('[data-testid="date-picker-day-15"]');

			// Close the schedule popover
			await page.keyboard.press("Escape");

			// Todo item should have overdue styling (data-overdue attribute)
			await expect(todoItem).toHaveAttribute("data-overdue", "true");
		});

		test("should not show overdue styling for completed todo", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Completed overdue task");
			await openSchedulePopover(todoItem);

			// Set past due date
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-prev-month"]');
			await page.click('[data-testid="date-picker-day-15"]');
			await page.keyboard.press("Escape");

			// Complete the todo
			await todoItem.locator('[data-testid="todo-toggle"]').click();

			// Should not have overdue attribute
			await expect(todoItem).not.toHaveAttribute("data-overdue");
		});

		test("should not show overdue styling for future due date", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Future task");
			await openSchedulePopover(todoItem);

			// Set future due date
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-next-week"]');
			await page.keyboard.press("Escape");

			// Should not have overdue attribute
			await expect(todoItem).not.toHaveAttribute("data-overdue");
		});
	});

	test.describe("Persist scheduling data after page reload", () => {
		test("should persist due date after reload", async ({ page }) => {
			const todoText = "Persistent due date task";
			const todoItem = await createTodo(page, todoText);
			await openSchedulePopover(todoItem);

			// Set due date to tomorrow
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-tomorrow"]');
			await page.keyboard.press("Escape");

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Find the todo again and check for due date badge
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: todoText });
			await expect(reloadedTodo).toBeVisible();

			// Should have due date badge showing "Tomorrow"
			await expect(
				reloadedTodo.locator('[data-testid="due-date-badge"]'),
			).toContainText("Tomorrow");
		});

		test("should persist recurring pattern after reload", async ({ page }) => {
			const todoText = "Persistent recurring task";
			const todoItem = await createTodo(page, todoText);
			await openSchedulePopover(todoItem);

			// Set daily recurring
			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-daily"]');
			await page.keyboard.press("Escape");

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Find the todo again
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: todoText });
			await expect(reloadedTodo).toBeVisible();

			// Open schedule popover and verify recurring is set
			await reloadedTodo.hover();
			await reloadedTodo
				.locator('[data-testid="todo-schedule-popover-trigger"]')
				.click();

			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Daily");
		});

		test("should persist combined schedule after reload", async ({ page }) => {
			const todoText = "Persistent combined schedule";
			const todoItem = await createTodo(page, todoText);
			await openSchedulePopover(todoItem);

			// Set due date
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-tomorrow"]');

			// Set reminder
			await page.click('[data-testid="reminder-picker-trigger"]');
			await page.click('[data-testid="reminder-picker-offset--30"]');

			// Set recurring
			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-weekly"]');

			await page.keyboard.press("Escape");

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Find the todo again
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: todoText });

			// Open schedule popover
			await reloadedTodo.hover();
			await reloadedTodo
				.locator('[data-testid="todo-schedule-popover-trigger"]')
				.click();

			// Verify all schedule components are preserved
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-due"]'),
			).toContainText("Tomorrow");
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-reminder"]'),
			).toBeVisible();
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Weekly");
		});
	});

	test.describe("Schedule display in todo list", () => {
		test("should show due date badge on todo item", async ({ page }) => {
			const todoItem = await createTodo(page, "Task with due date badge");
			await openSchedulePopover(todoItem);

			// Set due date
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-today"]');
			await page.keyboard.press("Escape");

			// Due date badge should be visible on the todo item
			await expect(
				todoItem.locator('[data-testid="due-date-badge"]'),
			).toBeVisible();
			await expect(
				todoItem.locator('[data-testid="due-date-badge"]'),
			).toContainText("Today");
		});

		test("should show recurring indicator on due date badge", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Task with recurring indicator");
			await openSchedulePopover(todoItem);

			// Set recurring without due date
			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-daily"]');
			await page.keyboard.press("Escape");

			// Should show recurring pattern badge (without date)
			await expect(
				todoItem.locator('[data-testid="due-date-badge"]'),
			).toBeVisible();
			await expect(
				todoItem.locator('[data-testid="due-date-badge"]'),
			).toContainText("Daily");
		});

		test("should show both due date and recurring on badge", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Task with both");
			await openSchedulePopover(todoItem);

			// Set due date
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-tomorrow"]');

			// Set recurring
			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-daily"]');
			await page.keyboard.press("Escape");

			// Badge should show recurring indicator (repeat icon)
			const badge = todoItem.locator('[data-testid="due-date-badge"]');
			await expect(badge).toBeVisible();
			// The badge should contain the repeat icon when recurring
			await expect(
				badge.locator('[data-testid="recurring-indicator"]'),
			).toBeVisible();
		});
	});
});
