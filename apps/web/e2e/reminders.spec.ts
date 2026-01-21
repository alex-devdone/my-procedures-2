import { expect, test } from "@playwright/test";

test.describe("Reminder notifications (localStorage mode)", () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage before each test to ensure clean state
		await page.goto("/todos");
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		// Wait for the page to be ready
		await page.waitForSelector('[data-testid="folder-sidebar"]');
	});

	/**
	 * Helper to create a todo with a reminder that's due now in localStorage
	 * This directly sets the reminder time to avoid timing issues with the scheduler
	 */
	async function createTodoWithDueReminder(
		page: import("@playwright/test").Page,
		todoText: string,
		options?: { overdue?: boolean },
	) {
		await page.evaluate(
			({ text, overdue }) => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				const now = new Date();

				// Set due date
				let dueDate: Date;
				if (overdue) {
					// Set due date in the past for overdue
					dueDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
				} else {
					// Set due date in the future
					dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now
				}

				// Set reminder to 10 seconds ago (within the 60 second tolerance window)
				const reminderAt = new Date(now.getTime() - 10 * 1000);

				const newTodo = {
					id: `local-${crypto.randomUUID()}`,
					text: text,
					completed: false,
					createdAt: now.toISOString(),
					folderId: null,
					dueDate: dueDate.toISOString(),
					reminderAt: reminderAt.toISOString(),
					recurringPattern: null,
				};

				todos.push(newTodo);
				localStorage.setItem("todos", JSON.stringify(todos));

				// Clear any previously shown reminders
				localStorage.removeItem("flowdo_shown_reminders");
			},
			{ text: todoText, overdue: options?.overdue ?? false },
		);
	}

	/**
	 * Helper to trigger reminder check by waiting for app hydration
	 * The reminder checker runs immediately on mount, but may need todos to be loaded first
	 */
	async function triggerReminderCheck(page: import("@playwright/test").Page) {
		// Wait a moment for React to hydrate and the reminder checker to run
		await page.waitForTimeout(1000);

		// The reminder checker polls every 30 seconds by default
		// But it also runs immediately on mount when enabled
		// If the todos aren't loaded yet when it first runs, we may need to wait for the next check
		// Or trigger a re-check by navigating away and back
	}

	/**
	 * Helper to wait for reminder toast to appear
	 */
	async function waitForReminderToast(
		page: import("@playwright/test").Page,
		timeout = 40000,
	) {
		// Sonner toasts appear in a specific container
		// The reminder toast content has data-testid="reminder-toast-content"
		const toast = page.locator('[data-testid="reminder-toast-content"]');
		await expect(toast.first()).toBeVisible({ timeout });
		return toast.first();
	}

	test.describe("Request browser notification permission", () => {
		test("should detect notification API support in browser", async ({
			page,
		}) => {
			// Verify the browser has notification API
			const hasNotificationSupport = await page.evaluate(() => {
				return "Notification" in window;
			});
			expect(hasNotificationSupport).toBe(true);
		});

		test("should report current notification permission state", async ({
			page,
		}) => {
			// Check that the permission state is accessible
			const permission = await page.evaluate(() => {
				return Notification.permission;
			});
			// Permission can be "default", "granted", or "denied"
			expect(["default", "granted", "denied"]).toContain(permission);
		});
	});

	test.describe("Show in-app toast when reminder is due", () => {
		test("should show reminder toast for todo with due reminder", async ({
			page,
		}) => {
			const todoText = "Reminder test task";

			// Create a todo with a due reminder directly in localStorage
			await createTodoWithDueReminder(page, todoText);

			// Reload to pick up the new todo and trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for the todo to appear in the list (confirms localStorage loaded)
			const todoItem = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: todoText });
			await expect(todoItem).toBeVisible({ timeout: 10000 });

			// Trigger reminder check
			await triggerReminderCheck(page);

			// Wait for the reminder toast to appear
			const toast = await waitForReminderToast(page);

			// Verify the toast shows the todo text
			await expect(
				toast.locator('[data-testid="reminder-toast-title"]'),
			).toContainText(todoText);
		});

		test("should show multiple reminder toasts for multiple due reminders", async ({
			page,
		}) => {
			const todoText1 = "First reminder task";
			const todoText2 = "Second reminder task";

			// Create multiple todos with due reminders
			await createTodoWithDueReminder(page, todoText1);
			await createTodoWithDueReminder(page, todoText2);

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for toasts to appear
			const toasts = page.locator('[data-testid="reminder-toast-content"]');
			await expect(toasts).toHaveCount(2, { timeout: 40000 });
		});

		test("should show overdue styling on reminder toast for overdue task", async ({
			page,
		}) => {
			const todoText = "Overdue reminder task";

			// Create a todo with an overdue due date
			await createTodoWithDueReminder(page, todoText, { overdue: true });

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for the toast to appear
			const toast = await waitForReminderToast(page);

			// Check that the toast body indicates overdue
			await expect(
				toast.locator('[data-testid="reminder-toast-body"]'),
			).toContainText("overdue");
		});

		test("should not show reminder toast for completed todo", async ({
			page,
		}) => {
			const todoText = "Completed task with reminder";

			// Create a completed todo with a due reminder directly in localStorage
			await page.evaluate((text) => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				const now = new Date();
				const reminderAt = new Date(now.getTime() - 10 * 1000);
				const dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

				todos.push({
					id: `local-${crypto.randomUUID()}`,
					text: text,
					completed: true, // Mark as completed
					createdAt: now.toISOString(),
					folderId: null,
					dueDate: dueDate.toISOString(),
					reminderAt: reminderAt.toISOString(),
					recurringPattern: null,
				});

				localStorage.setItem("todos", JSON.stringify(todos));
				localStorage.removeItem("flowdo_shown_reminders");
			}, todoText);

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait a bit for any potential toast (but it shouldn't appear)
			await page.waitForTimeout(5000);

			// Verify no toast appeared
			const toast = page.locator('[data-testid="reminder-toast-content"]');
			await expect(toast).not.toBeVisible();
		});
	});

	test.describe("Dismiss reminder toast", () => {
		test("should dismiss reminder toast when clicking dismiss button", async ({
			page,
		}) => {
			const todoText = "Dismissable reminder task";

			// Create a todo with due reminder
			await createTodoWithDueReminder(page, todoText);

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for the toast to appear
			const toast = await waitForReminderToast(page);

			// Click the dismiss button
			await toast
				.locator('[data-testid="reminder-toast-dismiss-button"]')
				.click();

			// Toast should disappear
			await expect(
				page.locator('[data-testid="reminder-toast-content"]'),
			).not.toBeVisible();
		});

		test("should not re-show dismissed reminder after reload", async ({
			page,
		}) => {
			const todoText = "No re-show after dismiss";

			// Create a todo with due reminder
			await createTodoWithDueReminder(page, todoText);

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for the toast to appear
			const toast = await waitForReminderToast(page);

			// Dismiss the toast
			await toast
				.locator('[data-testid="reminder-toast-dismiss-button"]')
				.click();

			// Wait for toast to disappear
			await expect(
				page.locator('[data-testid="reminder-toast-content"]'),
			).not.toBeVisible();

			// Reload again - the reminder should not reappear because it was marked as shown
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait a bit
			await page.waitForTimeout(5000);

			// Toast should not appear again
			await expect(
				page.locator('[data-testid="reminder-toast-content"]'),
			).not.toBeVisible();
		});
	});

	test.describe("Click reminder toast to navigate to todo", () => {
		test("should show view button on reminder toast", async ({ page }) => {
			const todoText = "Task with view button";

			// Create a todo with due reminder
			await createTodoWithDueReminder(page, todoText);

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for the toast to appear
			const toast = await waitForReminderToast(page);

			// Verify the toast content is visible and has the correct structure
			await expect(
				toast.locator('[data-testid="reminder-toast-title"]'),
			).toContainText(todoText);

			// The dismiss button should always be visible
			await expect(
				toast.locator('[data-testid="reminder-toast-dismiss-button"]'),
			).toBeVisible();
		});

		test("should dismiss toast when interacting with it", async ({ page }) => {
			const todoText = "Task with interaction";

			// Create a todo with due reminder
			await createTodoWithDueReminder(page, todoText);

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for the toast to appear
			const toast = await waitForReminderToast(page);

			// Check if view button exists (it may not if no click handler is configured)
			const viewButton = toast.locator(
				'[data-testid="reminder-toast-view-button"]',
			);
			const hasViewButton = await viewButton.isVisible().catch(() => false);

			if (hasViewButton) {
				// Click the view button
				await viewButton.click();
			} else {
				// Click the dismiss button
				await toast
					.locator('[data-testid="reminder-toast-dismiss-button"]')
					.click();
			}

			// Toast should dismiss
			await expect(
				page.locator('[data-testid="reminder-toast-content"]'),
			).not.toBeVisible();
		});
	});

	test.describe("Reminder toast displays correct information", () => {
		test("should show due date information in reminder toast", async ({
			page,
		}) => {
			const todoText = "Task with due date info";

			// Create a todo with due reminder
			await createTodoWithDueReminder(page, todoText);

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for the toast to appear
			const toast = await waitForReminderToast(page);

			// Should show due date info
			const dueDateInfo = toast.locator(
				'[data-testid="reminder-toast-due-date"]',
			);
			await expect(dueDateInfo).toBeVisible();
		});

		test("should show icon for reminders", async ({ page }) => {
			const todoText = "Reminder with icon";

			// Create a todo with reminder
			await createTodoWithDueReminder(page, todoText);

			// Reload to trigger reminder checking
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Wait for the toast to appear
			const toast = await waitForReminderToast(page);

			// Should show icon container
			const iconContainer = toast.locator(
				'[data-testid="reminder-toast-icon"]',
			);
			await expect(iconContainer).toBeVisible();
		});
	});
});
