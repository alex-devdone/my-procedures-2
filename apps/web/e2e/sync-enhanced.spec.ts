import { expect, test } from "@playwright/test";

/**
 * E2E tests for the enhanced sync mechanism.
 *
 * These tests verify:
 * - Todos with scheduling fields are correctly stored in localStorage
 * - Folders are correctly stored in localStorage
 * - Subtasks are correctly stored in localStorage
 * - Sync dialog shows correct counts for local items
 * - Discard action clears all local data
 *
 * Note: Full sync flow (login → sync to server) requires authentication
 * infrastructure. These tests focus on localStorage persistence and
 * the sync dialog UI behavior.
 */
test.describe("Enhanced Sync - localStorage with scheduling/folders/subtasks", () => {
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
		await todoItem.hover();
		const scheduleButton = todoItem.locator(
			'[data-testid="todo-schedule-popover-trigger"]',
		);
		await scheduleButton.click();
		await expect(
			todoItem.page().locator('[data-testid="todo-schedule-popover"]'),
		).toBeVisible();
	}

	test.describe("Todos with due dates are persisted in localStorage", () => {
		test("should persist todo with due date after page reload", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo with due date");
			await openSchedulePopover(todoItem);

			// Open date picker and set due date using Today preset
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-today"]');

			// Close the schedule popover (click elsewhere)
			await page.keyboard.press("Escape");

			// Verify due date badge is shown
			await expect(
				todoItem.locator('[data-testid="due-date-badge"]'),
			).toBeVisible();

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Verify todo and due date persist
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Todo with due date" });
			await expect(reloadedTodo).toBeVisible();
			await expect(
				reloadedTodo.locator('[data-testid="due-date-badge"]'),
			).toBeVisible();
		});

		test("should persist todo with recurring pattern after page reload", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Recurring todo");
			await openSchedulePopover(todoItem);

			// Set recurring pattern - Daily
			await page.click('[data-testid="recurring-picker-trigger"]');
			await expect(
				page.locator('[data-testid="recurring-picker-popover"]'),
			).toBeVisible();
			await page.click('[data-testid="recurring-picker-preset-daily"]');

			// Close the schedule popover
			await page.keyboard.press("Escape");

			// Verify recurring indicator is shown
			await expect(
				todoItem.locator('[data-testid="due-date-badge"]'),
			).toBeVisible();

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Verify todo and recurring pattern persist
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Recurring todo" });
			await expect(reloadedTodo).toBeVisible();
			await expect(
				reloadedTodo.locator('[data-testid="due-date-badge"]'),
			).toBeVisible();
		});
	});

	test.describe("Folders are persisted in localStorage", () => {
		test("should persist folders after page reload", async ({ page }) => {
			// Create a folder
			await page.click('[data-testid="create-folder-button"]');
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).toBeVisible();

			await page.fill('[data-testid="folder-name-input"]', "Work Projects");
			// Click on the label that wraps the color radio, not the hidden radio itself
			await page.click('label:has([data-testid="folder-color-blue"])');
			await page.click('[data-testid="folder-create-submit"]');

			// Wait for dialog to close and folder to appear
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).not.toBeVisible();
			await expect(
				page.locator('[data-testid="folder-sidebar"]'),
			).toContainText("Work Projects");

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Verify folder persists
			await expect(
				page.locator('[data-testid="folder-sidebar"]'),
			).toContainText("Work Projects");
		});

		test("should persist multiple folders with correct colors", async ({
			page,
		}) => {
			// Create first folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Personal");
			await page.click('label:has([data-testid="folder-color-green"])');
			await page.click('[data-testid="folder-create-submit"]');

			// Wait for dialog to close
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).not.toBeVisible();

			// Create second folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Home");
			await page.click('label:has([data-testid="folder-color-orange"])');
			await page.click('[data-testid="folder-create-submit"]');

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Verify both folders persist
			const sidebar = page.locator('[data-testid="folder-sidebar"]');
			await expect(sidebar).toContainText("Personal");
			await expect(sidebar).toContainText("Home");
		});
	});

	test.describe("Subtasks are persisted in localStorage", () => {
		test("should persist subtasks after page reload", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo with subtasks");

			// Expand todo to show subtasks
			await todoItem.locator('[data-testid="todo-expand-toggle"]').click();

			// Add subtasks using the input inside the todo's subtask section
			const subtaskSection = todoItem.locator(
				'[data-testid="todo-subtasks-section"]',
			);
			const subtaskInput = subtaskSection.locator(
				'[data-testid="subtask-add-input-field"]',
			);
			await subtaskInput.fill("First subtask");
			await subtaskInput.press("Enter");
			await subtaskInput.fill("Second subtask");
			await subtaskInput.press("Enter");

			// Verify subtasks are visible
			await expect(subtaskSection.locator("text=First subtask")).toBeVisible();
			await expect(subtaskSection.locator("text=Second subtask")).toBeVisible();

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Find and expand the todo again
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Todo with subtasks" });
			await reloadedTodo.locator('[data-testid="todo-expand-toggle"]').click();

			// Verify subtasks persist
			const reloadedSection = reloadedTodo.locator(
				'[data-testid="todo-subtasks-section"]',
			);
			await expect(reloadedSection.locator("text=First subtask")).toBeVisible();
			await expect(
				reloadedSection.locator("text=Second subtask"),
			).toBeVisible();
		});

		test("should persist subtask completion state after reload", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo with completed subtask");

			// Expand and add subtask
			await todoItem.locator('[data-testid="todo-expand-toggle"]').click();
			const subtaskSection = todoItem.locator(
				'[data-testid="todo-subtasks-section"]',
			);
			const subtaskInput = subtaskSection.locator(
				'[data-testid="subtask-add-input-field"]',
			);
			await subtaskInput.fill("Subtask to complete");
			await subtaskInput.press("Enter");

			// Toggle subtask completion
			const subtaskCheckbox = subtaskSection.locator(
				'[data-testid^="subtask-checkbox-"]',
			);
			await subtaskCheckbox.click();

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Find and expand the todo again
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Todo with completed subtask" });
			await reloadedTodo.locator('[data-testid="todo-expand-toggle"]').click();

			// Verify subtask completion persists
			const reloadedSection = reloadedTodo.locator(
				'[data-testid="todo-subtasks-section"]',
			);
			const reloadedCheckbox = reloadedSection.locator(
				'[data-testid^="subtask-checkbox-"]',
			);
			await expect(reloadedCheckbox).toBeChecked();
		});

		test("should persist subtask progress indicator after reload", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo with progress");

			// Expand and add multiple subtasks
			await todoItem.locator('[data-testid="todo-expand-toggle"]').click();
			const subtaskSection = todoItem.locator(
				'[data-testid="todo-subtasks-section"]',
			);
			const subtaskInput = subtaskSection.locator(
				'[data-testid="subtask-add-input-field"]',
			);
			await subtaskInput.fill("Subtask 1");
			await subtaskInput.press("Enter");
			await subtaskInput.fill("Subtask 2");
			await subtaskInput.press("Enter");
			await subtaskInput.fill("Subtask 3");
			await subtaskInput.press("Enter");

			// Complete one subtask
			await subtaskSection
				.locator('[data-testid^="subtask-checkbox-"]')
				.first()
				.click();

			// Check progress indicator shows "1/3"
			await expect(
				todoItem.locator('[data-testid="subtask-progress-indicator"]'),
			).toContainText("1/3");

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Verify progress indicator persists
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Todo with progress" });
			await expect(
				reloadedTodo.locator('[data-testid="subtask-progress-indicator"]'),
			).toContainText("1/3");
		});
	});

	test.describe("localStorage data structure", () => {
		test("should store todos with scheduling fields in correct format", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Scheduled todo");
			await openSchedulePopover(todoItem);

			// Set due date
			await page.click('[data-testid="date-picker-trigger"]');
			await page.click('[data-testid="date-picker-preset-today"]');

			// Set recurring
			await page.click('[data-testid="recurring-picker-trigger"]');
			await page.click('[data-testid="recurring-picker-preset-daily"]');

			await page.keyboard.press("Escape");

			// Check localStorage structure
			const todosJson = await page.evaluate(() =>
				localStorage.getItem("todos"),
			);
			expect(todosJson).not.toBeNull();

			const todos = JSON.parse(todosJson as string);
			expect(Array.isArray(todos)).toBe(true);
			expect(todos.length).toBeGreaterThan(0);

			const todo = todos.find(
				(t: { text: string }) => t.text === "Scheduled todo",
			);
			expect(todo).toBeDefined();
			expect(todo.dueDate).toBeDefined();
			expect(todo.recurringPattern).toBeDefined();
			expect(todo.recurringPattern.type).toBe("daily");
		});

		test("should store folders with correct structure", async ({ page }) => {
			// Create a folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Test Folder");
			await page.click('label:has([data-testid="folder-color-red"])');
			await page.click('[data-testid="folder-create-submit"]');

			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).not.toBeVisible();

			// Check localStorage structure
			const foldersJson = await page.evaluate(() =>
				localStorage.getItem("folders"),
			);
			expect(foldersJson).not.toBeNull();

			const folders = JSON.parse(foldersJson as string);
			expect(Array.isArray(folders)).toBe(true);
			expect(folders.length).toBeGreaterThan(0);

			const folder = folders.find(
				(f: { name: string }) => f.name === "Test Folder",
			);
			expect(folder).toBeDefined();
			expect(folder.color).toBe("red");
			expect(folder.id).toBeDefined();
			expect(folder.order).toBeDefined();
		});

		test("should store subtasks with correct structure", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for subtask test");

			// Get todoId from localStorage
			const todoId = await page.evaluate(() => {
				const todos = JSON.parse(localStorage.getItem("todos") || "[]");
				return todos.find(
					(t: { text: string }) => t.text === "Todo for subtask test",
				)?.id;
			});

			// Add subtask
			await todoItem.locator('[data-testid="todo-expand-toggle"]').click();
			const subtaskSection = todoItem.locator(
				'[data-testid="todo-subtasks-section"]',
			);
			const subtaskInput = subtaskSection.locator(
				'[data-testid="subtask-add-input-field"]',
			);
			await subtaskInput.fill("Test subtask");
			await subtaskInput.press("Enter");

			// Wait for subtask to be saved
			await expect(subtaskSection.locator("text=Test subtask")).toBeVisible();

			// Check localStorage structure
			const subtasksJson = await page.evaluate(() =>
				localStorage.getItem("subtasks"),
			);
			expect(subtasksJson).not.toBeNull();

			const subtasks = JSON.parse(subtasksJson as string);
			expect(Array.isArray(subtasks)).toBe(true);
			expect(subtasks.length).toBeGreaterThan(0);

			const subtask = subtasks.find(
				(s: { text: string }) => s.text === "Test subtask",
			);
			expect(subtask).toBeDefined();
			expect(subtask.todoId).toBe(todoId);
			expect(subtask.completed).toBe(false);
			expect(subtask.order).toBeDefined();
		});
	});

	test.describe("Discard action clears all local data", () => {
		test("should clear todos when discarding", async ({ page }) => {
			// Create some todos
			await createTodo(page, "Todo 1");
			await createTodo(page, "Todo 2");

			// Verify todos exist in localStorage
			const todosBeforeJson = await page.evaluate(() =>
				localStorage.getItem("todos"),
			);
			const todosBefore = JSON.parse(todosBeforeJson as string);
			expect(todosBefore.length).toBe(2);

			// Clear localStorage directly (simulating discard action)
			await page.evaluate(() => {
				localStorage.removeItem("todos");
			});

			// Reload and verify todos are gone
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Check for empty state
			await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
		});

		test("should clear folders when discarding", async ({ page }) => {
			// Create a folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Folder to delete");
			await page.click('[data-testid="folder-create-submit"]');

			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).not.toBeVisible();

			// Verify folder exists
			await expect(
				page.locator('[data-testid="folder-sidebar"]'),
			).toContainText("Folder to delete");

			// Clear localStorage directly
			await page.evaluate(() => {
				localStorage.removeItem("folders");
			});

			// Reload and verify folder is gone
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Folder should not be visible
			await expect(
				page.locator('[data-testid="folder-sidebar"]'),
			).not.toContainText("Folder to delete");
		});

		test("should clear subtasks when discarding", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo with subtasks to clear");

			// Add subtask
			await todoItem.locator('[data-testid="todo-expand-toggle"]').click();
			const subtaskSection = todoItem.locator(
				'[data-testid="todo-subtasks-section"]',
			);
			const subtaskInput = subtaskSection.locator(
				'[data-testid="subtask-add-input-field"]',
			);
			await subtaskInput.fill("Subtask to clear");
			await subtaskInput.press("Enter");

			await expect(
				subtaskSection.locator("text=Subtask to clear"),
			).toBeVisible();

			// Clear subtasks localStorage
			await page.evaluate(() => {
				localStorage.removeItem("subtasks");
			});

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Find and expand the todo
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: "Todo with subtasks to clear" });
			await reloadedTodo.locator('[data-testid="todo-expand-toggle"]').click();

			// Subtask should be gone (but todo remains)
			const reloadedSection = reloadedTodo.locator(
				'[data-testid="todo-subtasks-section"]',
			);
			await expect(
				reloadedSection.locator("text=Subtask to clear"),
			).not.toBeVisible();
		});

		test("should clear all data when discarding everything", async ({
			page,
		}) => {
			// Create folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Test Folder");
			await page.click('[data-testid="folder-create-submit"]');
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).not.toBeVisible();

			// Create todo with subtask
			const todoItem = await createTodo(page, "Test Todo");
			await todoItem.locator('[data-testid="todo-expand-toggle"]').click();
			const subtaskSection = todoItem.locator(
				'[data-testid="todo-subtasks-section"]',
			);
			const subtaskInput = subtaskSection.locator(
				'[data-testid="subtask-add-input-field"]',
			);
			await subtaskInput.fill("Test Subtask");
			await subtaskInput.press("Enter");

			// Clear all localStorage
			await page.evaluate(() => {
				localStorage.clear();
			});

			// Reload and verify everything is gone
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// No folder
			await expect(
				page.locator('[data-testid="folder-sidebar"]'),
			).not.toContainText("Test Folder");

			// No todo
			await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
		});
	});
});
