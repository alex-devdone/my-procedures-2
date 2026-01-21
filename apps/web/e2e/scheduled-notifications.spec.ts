import { expect, test } from "@playwright/test";

test.describe("Scheduled notifications (localStorage mode)", () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage before each test to ensure clean state
		await page.goto("/todos");
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		// Wait for the page to be ready
		await page.waitForSelector('[data-testid="folder-sidebar"]');
	});

	/**
	 * Helper to create a todo with a scheduled notification time in localStorage.
	 * Uses recurringPattern.notifyAt for scheduled notifications.
	 */
	async function createTodoWithScheduledNotification(
		page: import("@playwright/test").Page,
		todoText: string,
		options: {
			notifyAt: string; // HH:mm format
			recurringType?: "daily" | "weekly" | "monthly" | "yearly" | "custom";
			dueWithinTolerance?: boolean; // If true, set notification time within 60s tolerance window
		},
	) {
		// If we need to be within tolerance, wait if we're too close to minute boundary
		// This prevents race conditions where we set the time at second 58, and by the
		// time the reminder checker runs (after reload + hydration), we've crossed into
		// the next minute and are outside the tolerance window.
		if (options.dueWithinTolerance) {
			const secondsInMinute = new Date().getSeconds();
			if (secondsInMinute > 50) {
				// Wait until the next minute starts to ensure we have enough time
				await page.waitForTimeout((60 - secondsInMinute + 1) * 1000);
			}
		}

		await page.evaluate(
			({ text, notifyAt, recurringType, dueWithinTolerance }) => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				const now = new Date();

				// Calculate notification time
				let notifyAtTime: string;
				if (dueWithinTolerance) {
					// Set notification time to current minute (within 60 second tolerance window)
					// Since notifyAt is in HH:mm format (minute precision), we use the current
					// minute which guarantees we're within the 60-second tolerance window.
					// The tolerance check compares current time against HH:mm:00, so as long as
					// we're within the same minute, we'll be within 0-59 seconds tolerance.
					const hours = now.getHours().toString().padStart(2, "0");
					const minutes = now.getMinutes().toString().padStart(2, "0");
					notifyAtTime = `${hours}:${minutes}`;
				} else {
					notifyAtTime = notifyAt;
				}

				const newTodo = {
					id: `local-${crypto.randomUUID()}`,
					text: text,
					completed: false,
					createdAt: now.toISOString(),
					folderId: null,
					dueDate: null,
					reminderAt: null,
					recurringPattern: {
						type: recurringType || "daily",
						interval: 1,
						notifyAt: notifyAtTime,
					},
				};

				todos.push(newTodo);
				localStorage.setItem("todos", JSON.stringify(todos));

				// Clear any previously shown reminders
				localStorage.removeItem("flowdo_shown_reminders");
			},
			{
				text: todoText,
				notifyAt: options.notifyAt,
				recurringType: options.recurringType,
				dueWithinTolerance: options.dueWithinTolerance ?? false,
			},
		);
	}

	/**
	 * Helper to trigger reminder check by waiting for app hydration
	 */
	async function triggerReminderCheck(page: import("@playwright/test").Page) {
		// Wait for React to hydrate and the reminder checker to run
		await page.waitForTimeout(1000);
	}

	/**
	 * Helper to wait for reminder toast to appear
	 */
	async function waitForReminderToast(
		page: import("@playwright/test").Page,
		timeout = 40000,
	) {
		const toast = page.locator('[data-testid="reminder-toast-content"]');
		await expect(toast.first()).toBeVisible({ timeout });
		return toast.first();
	}

	test.describe("Recurring pattern notification time (notifyAt)", () => {
		test("should show notification for daily recurring todo with notifyAt time", async ({
			page,
		}) => {
			const todoText = "Daily standup meeting";

			// Create a todo with daily recurring pattern and notifyAt within tolerance
			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "09:00",
				recurringType: "daily",
				dueWithinTolerance: true,
			});

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for the todo to appear
			const todoItem = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: todoText });
			await expect(todoItem).toBeVisible({ timeout: 10000 });

			await triggerReminderCheck(page);

			// Wait for the reminder toast
			const toast = await waitForReminderToast(page);

			// Verify toast shows the todo text
			await expect(
				toast.locator('[data-testid="reminder-toast-title"]'),
			).toContainText(todoText);

			// Verify toast shows recurring badge
			await expect(
				toast.locator('[data-testid="reminder-toast-recurring-badge"]'),
			).toBeVisible();
			await expect(
				toast.locator('[data-testid="reminder-toast-recurring-badge"]'),
			).toContainText("Daily");
		});

		test("should show notification for weekly recurring todo with notifyAt time", async ({
			page,
		}) => {
			const todoText = "Weekly team sync";

			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "10:00",
				recurringType: "weekly",
				dueWithinTolerance: true,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			const toast = await waitForReminderToast(page);

			await expect(
				toast.locator('[data-testid="reminder-toast-title"]'),
			).toContainText(todoText);

			await expect(
				toast.locator('[data-testid="reminder-toast-recurring-badge"]'),
			).toContainText("Weekly");
		});

		test("should show notification for monthly recurring todo with notifyAt time", async ({
			page,
		}) => {
			const todoText = "Monthly review";

			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "14:00",
				recurringType: "monthly",
				dueWithinTolerance: true,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			const toast = await waitForReminderToast(page);

			await expect(
				toast.locator('[data-testid="reminder-toast-title"]'),
			).toContainText(todoText);

			await expect(
				toast.locator('[data-testid="reminder-toast-recurring-badge"]'),
			).toContainText("Monthly");
		});

		test("should not show notification for future scheduled time", async ({
			page,
		}) => {
			const todoText = "Future scheduled task";

			// Create todo with notification time in the future (not within tolerance)
			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "23:59", // Far in future for most test runs
				recurringType: "daily",
				dueWithinTolerance: false,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await page.waitForTimeout(5000);

			// Toast should not appear
			const toast = page.locator('[data-testid="reminder-toast-content"]');
			await expect(toast).not.toBeVisible();
		});
	});

	test.describe("Explicit reminder time vs recurring notifyAt priority", () => {
		test("should use explicit reminderAt over recurring notifyAt", async ({
			page,
		}) => {
			const todoText = "Task with explicit reminder";

			// Create todo with both explicit reminder and recurring pattern
			await page.evaluate((text) => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				const now = new Date();

				// Set explicit reminder to 10 seconds ago (due)
				const reminderAt = new Date(now.getTime() - 10 * 1000);

				// Set notifyAt to far in future (should be ignored)
				const newTodo = {
					id: `local-${crypto.randomUUID()}`,
					text: text,
					completed: false,
					createdAt: now.toISOString(),
					folderId: null,
					dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
					reminderAt: reminderAt.toISOString(),
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "23:59", // Far future
					},
				};

				todos.push(newTodo);
				localStorage.setItem("todos", JSON.stringify(todos));
				localStorage.removeItem("flowdo_shown_reminders");
			}, todoText);

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			// Should show toast (from explicit reminder, not recurring)
			const toast = await waitForReminderToast(page);
			await expect(
				toast.locator('[data-testid="reminder-toast-title"]'),
			).toContainText(todoText);

			// Should NOT show recurring badge since it's using explicit reminder
			await expect(
				toast.locator('[data-testid="reminder-toast-recurring-badge"]'),
			).not.toBeVisible();
		});
	});

	test.describe("Notification time tolerance window", () => {
		test("should show notification when exactly at scheduled time", async ({
			page,
		}) => {
			const todoText = "Exact time notification";

			// Wait if we're too close to minute boundary to avoid race conditions
			const secondsInMinute = new Date().getSeconds();
			if (secondsInMinute > 50) {
				await page.waitForTimeout((60 - secondsInMinute + 1) * 1000);
			}

			// Create todo with current time as notification time
			await page.evaluate((text) => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				const now = new Date();

				const hours = now.getHours().toString().padStart(2, "0");
				const minutes = now.getMinutes().toString().padStart(2, "0");

				const newTodo = {
					id: `local-${crypto.randomUUID()}`,
					text: text,
					completed: false,
					createdAt: now.toISOString(),
					folderId: null,
					dueDate: null,
					reminderAt: null,
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: `${hours}:${minutes}`,
					},
				};

				todos.push(newTodo);
				localStorage.setItem("todos", JSON.stringify(todos));
				localStorage.removeItem("flowdo_shown_reminders");
			}, todoText);

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			const toast = await waitForReminderToast(page);
			await expect(
				toast.locator('[data-testid="reminder-toast-title"]'),
			).toContainText(todoText);
		});

		test("should not show notification outside tolerance window", async ({
			page,
		}) => {
			const todoText = "Outside tolerance window";

			// Create todo with notification time 2 minutes ago (outside 60s tolerance)
			await page.evaluate((text) => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				const now = new Date();

				// Set notification time 2 minutes ago
				const notifyTime = new Date(now.getTime() - 2 * 60 * 1000);
				const hours = notifyTime.getHours().toString().padStart(2, "0");
				const minutes = notifyTime.getMinutes().toString().padStart(2, "0");

				const newTodo = {
					id: `local-${crypto.randomUUID()}`,
					text: text,
					completed: false,
					createdAt: now.toISOString(),
					folderId: null,
					dueDate: null,
					reminderAt: null,
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: `${hours}:${minutes}`,
					},
				};

				todos.push(newTodo);
				localStorage.setItem("todos", JSON.stringify(todos));
				localStorage.removeItem("flowdo_shown_reminders");
			}, todoText);

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await page.waitForTimeout(5000);

			// Toast should not appear
			const toast = page.locator('[data-testid="reminder-toast-content"]');
			await expect(toast).not.toBeVisible();
		});
	});

	test.describe("Multiple scheduled notifications", () => {
		test("should show multiple notifications for different scheduled tasks", async ({
			page,
		}) => {
			const todoText1 = "First scheduled task";
			const todoText2 = "Second scheduled task";

			// Create two todos with notifications due within tolerance
			await createTodoWithScheduledNotification(page, todoText1, {
				notifyAt: "09:00",
				recurringType: "daily",
				dueWithinTolerance: true,
			});
			await createTodoWithScheduledNotification(page, todoText2, {
				notifyAt: "09:00",
				recurringType: "weekly",
				dueWithinTolerance: true,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			// Should show 2 toasts
			const toasts = page.locator('[data-testid="reminder-toast-content"]');
			await expect(toasts).toHaveCount(2, { timeout: 40000 });
		});

		test("should not show duplicate notification after dismissal", async ({
			page,
		}) => {
			const todoText = "No duplicate after dismiss";

			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "09:00",
				recurringType: "daily",
				dueWithinTolerance: true,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			// Wait for toast
			const toast = await waitForReminderToast(page);

			// Dismiss it
			await toast
				.locator('[data-testid="reminder-toast-dismiss-button"]')
				.click();

			// Toast should disappear
			await expect(
				page.locator('[data-testid="reminder-toast-content"]'),
			).not.toBeVisible();

			// Reload and verify notification doesn't show again
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await page.waitForTimeout(5000);

			// Toast should not reappear
			await expect(
				page.locator('[data-testid="reminder-toast-content"]'),
			).not.toBeVisible();
		});
	});

	test.describe("Completed tasks should not trigger notifications", () => {
		test("should not show notification for completed recurring task", async ({
			page,
		}) => {
			const todoText = "Completed recurring task";

			// Create a completed todo with recurring notification
			await page.evaluate((text) => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				const now = new Date();

				// Set notification time within tolerance
				const notifyTime = new Date(now.getTime() - 10 * 1000);
				const hours = notifyTime.getHours().toString().padStart(2, "0");
				const minutes = notifyTime.getMinutes().toString().padStart(2, "0");

				const newTodo = {
					id: `local-${crypto.randomUUID()}`,
					text: text,
					completed: true, // Mark as completed
					createdAt: now.toISOString(),
					folderId: null,
					dueDate: null,
					reminderAt: null,
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: `${hours}:${minutes}`,
					},
				};

				todos.push(newTodo);
				localStorage.setItem("todos", JSON.stringify(todos));
				localStorage.removeItem("flowdo_shown_reminders");
			}, todoText);

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await page.waitForTimeout(5000);

			// Toast should not appear for completed task
			const toast = page.locator('[data-testid="reminder-toast-content"]');
			await expect(toast).not.toBeVisible();
		});
	});

	test.describe("Notification toast display for scheduled reminders", () => {
		test("should display daily recurring type badge correctly", async ({
			page,
		}) => {
			const todoText = "daily scheduled task";

			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "09:00",
				recurringType: "daily",
				dueWithinTolerance: true,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			const toast = await waitForReminderToast(page);

			await expect(
				toast.locator('[data-testid="reminder-toast-recurring-badge"]'),
			).toContainText("Daily");
		});

		test("should display weekly recurring type badge correctly", async ({
			page,
		}) => {
			const todoText = "weekly scheduled task";

			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "09:00",
				recurringType: "weekly",
				dueWithinTolerance: true,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			const toast = await waitForReminderToast(page);

			await expect(
				toast.locator('[data-testid="reminder-toast-recurring-badge"]'),
			).toContainText("Weekly");
		});

		test("should display monthly recurring type badge correctly", async ({
			page,
		}) => {
			const todoText = "monthly scheduled task";

			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "09:00",
				recurringType: "monthly",
				dueWithinTolerance: true,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			const toast = await waitForReminderToast(page);

			await expect(
				toast.locator('[data-testid="reminder-toast-recurring-badge"]'),
			).toContainText("Monthly");
		});

		test("should show reminder body text for recurring notifications", async ({
			page,
		}) => {
			const todoText = "Daily reminder task";

			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "09:00",
				recurringType: "daily",
				dueWithinTolerance: true,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			const toast = await waitForReminderToast(page);

			// Body should show "Daily reminder" text
			await expect(
				toast.locator('[data-testid="reminder-toast-body"]'),
			).toContainText("Daily reminder");
		});

		test("should show icon in toast", async ({ page }) => {
			const todoText = "Task with icon";

			await createTodoWithScheduledNotification(page, todoText, {
				notifyAt: "09:00",
				recurringType: "daily",
				dueWithinTolerance: true,
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await triggerReminderCheck(page);

			const toast = await waitForReminderToast(page);

			await expect(
				toast.locator('[data-testid="reminder-toast-icon"]'),
			).toBeVisible();
		});
	});

	test.describe("Scheduling UI integration", () => {
		/**
		 * Helper to create a todo through UI
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

		test("should set recurring pattern with notification time through UI", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "UI scheduled task");
			await openSchedulePopover(todoItem);

			// Set daily recurring
			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-daily"]');

			// Summary should show daily
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Daily");

			// Close popover
			await page.keyboard.press("Escape");

			// Verify due-date-badge shows "Daily" (when only recurring is set without date)
			await expect(
				todoItem.locator('[data-testid="due-date-badge"]'),
			).toBeVisible();
			await expect(
				todoItem.locator('[data-testid="due-date-badge"]'),
			).toContainText("Daily");
		});

		test("should persist recurring pattern after page reload", async ({
			page,
		}) => {
			const todoText = "Persistent recurring task";
			const todoItem = await createTodo(page, todoText);
			await openSchedulePopover(todoItem);

			// Set weekly recurring
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
			await expect(reloadedTodo).toBeVisible();

			// Open schedule popover and verify recurring is set
			await reloadedTodo.hover();
			await reloadedTodo
				.locator('[data-testid="todo-schedule-popover-trigger"]')
				.click();

			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toContainText("Weekly");
		});

		test("should clear recurring pattern and remove scheduled notification", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Task to clear recurring");
			await openSchedulePopover(todoItem);

			// Set recurring
			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-daily"]');

			// Verify it's set
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).toBeVisible();

			// Clear using recurring clear button
			await page.click('[data-testid="recurring-picker-clear"]');

			// Summary should no longer show recurring
			await expect(
				page.locator('[data-testid="todo-schedule-popover-summary-recurring"]'),
			).not.toBeVisible();
		});
	});

	test.describe("Edge cases", () => {
		test("should handle todo without any notification settings", async ({
			page,
		}) => {
			// Create a plain todo without reminder or recurring pattern
			await page.evaluate(() => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				const now = new Date();

				const newTodo = {
					id: `local-${crypto.randomUUID()}`,
					text: "Plain todo without notifications",
					completed: false,
					createdAt: now.toISOString(),
					folderId: null,
					dueDate: null,
					reminderAt: null,
					recurringPattern: null,
				};

				todos.push(newTodo);
				localStorage.setItem("todos", JSON.stringify(todos));
				localStorage.removeItem("flowdo_shown_reminders");
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await page.waitForTimeout(3000);

			// No toast should appear
			const toast = page.locator('[data-testid="reminder-toast-content"]');
			await expect(toast).not.toBeVisible();
		});

		test("should handle recurring pattern without notifyAt", async ({
			page,
		}) => {
			// Create todo with recurring pattern but no notifyAt
			await page.evaluate(() => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				const now = new Date();

				const newTodo = {
					id: `local-${crypto.randomUUID()}`,
					text: "Recurring without notifyAt",
					completed: false,
					createdAt: now.toISOString(),
					folderId: null,
					dueDate: null,
					reminderAt: null,
					recurringPattern: {
						type: "daily",
						interval: 1,
						// No notifyAt field
					},
				};

				todos.push(newTodo);
				localStorage.setItem("todos", JSON.stringify(todos));
				localStorage.removeItem("flowdo_shown_reminders");
			});

			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');
			await page.waitForTimeout(3000);

			// No toast should appear (no notifyAt means no scheduled notification)
			const toast = page.locator('[data-testid="reminder-toast-content"]');
			await expect(toast).not.toBeVisible();
		});
	});
});
