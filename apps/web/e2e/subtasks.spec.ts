import { expect, test } from "@playwright/test";

test.describe("Subtask functionality (localStorage mode)", () => {
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
	 * Helper to expand a todo to show subtasks section
	 */
	async function expandTodo(todoItem: import("@playwright/test").Locator) {
		const expandButton = todoItem.locator('[data-testid="todo-expand-toggle"]');
		await expandButton.click();
		await expect(
			todoItem.locator('[data-testid="todo-subtasks-section"]'),
		).toBeVisible();
	}

	/**
	 * Helper to add a subtask to a todo and return the subtask item locator.
	 * Uses data-testid attributes to find the subtask item.
	 */
	async function addSubtask(
		todoItem: import("@playwright/test").Locator,
		text: string,
	) {
		const inputField = todoItem.locator(
			'[data-testid="subtask-add-input-field"]',
		);
		await inputField.fill(text);
		await todoItem.locator('[data-testid="subtask-add-button"]').click();
		// Wait for a subtask item to appear with matching text
		const subtaskItem = todoItem
			.locator('[data-testid^="subtask-item-"]')
			.filter({ hasText: text });
		await expect(subtaskItem).toBeVisible();
		return subtaskItem;
	}

	/**
	 * Helper to find an existing subtask by text within a todo's subtask section
	 */
	function findSubtask(
		todoItem: import("@playwright/test").Locator,
		text: string,
	) {
		return todoItem
			.locator('[data-testid^="subtask-item-"]')
			.filter({ hasText: text });
	}

	/**
	 * Helper to toggle a subtask's checkbox using its data-testid attribute
	 */
	async function toggleSubtask(
		subtaskItem: import("@playwright/test").Locator,
	) {
		// The checkbox has data-testid="subtask-checkbox-{id}"
		const checkbox = subtaskItem.locator('[data-testid^="subtask-checkbox-"]');
		await checkbox.click();
	}

	/**
	 * Helper to check if a subtask checkbox is checked using data-checked attribute
	 */
	async function expectSubtaskChecked(
		subtaskItem: import("@playwright/test").Locator,
		checked: boolean,
	) {
		const checkbox = subtaskItem.locator('[data-testid^="subtask-checkbox-"]');
		if (checked) {
			await expect(checkbox).toHaveAttribute("data-checked");
		} else {
			await expect(checkbox).not.toHaveAttribute("data-checked");
		}
	}

	test.describe("Add subtasks to a todo", () => {
		test("should add a subtask using the add button", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo with subtask");
			await expandTodo(todoItem);

			// Initially shows empty state
			await expect(
				todoItem.locator('[data-testid="subtask-list-empty"]'),
			).toBeVisible();

			// Add a subtask
			const subtaskText = "My first subtask";
			await addSubtask(todoItem, subtaskText);

			// Subtask should appear in the list
			await expect(
				todoItem.locator('[data-testid="subtask-list"]'),
			).toBeVisible();
			await expect(findSubtask(todoItem, subtaskText)).toBeVisible();

			// Empty state should be hidden
			await expect(
				todoItem.locator('[data-testid="subtask-list-empty"]'),
			).not.toBeVisible();
		});

		test("should add a subtask by pressing Enter", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for Enter key test");
			await expandTodo(todoItem);

			const subtaskText = "Subtask via Enter";
			const inputField = todoItem.locator(
				'[data-testid="subtask-add-input-field"]',
			);
			await inputField.fill(subtaskText);
			await inputField.press("Enter");

			await expect(findSubtask(todoItem, subtaskText)).toBeVisible();
		});

		test("should clear input after adding subtask", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for input clear test");
			await expandTodo(todoItem);

			const inputField = todoItem.locator(
				'[data-testid="subtask-add-input-field"]',
			);
			await inputField.fill("Subtask text");
			await todoItem.locator('[data-testid="subtask-add-button"]').click();

			// Input should be cleared
			await expect(inputField).toHaveValue("");
		});

		test("should add multiple subtasks", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo with multiple subtasks");
			await expandTodo(todoItem);

			const subtasks = ["Subtask 1", "Subtask 2", "Subtask 3"];
			for (const subtaskText of subtasks) {
				await addSubtask(todoItem, subtaskText);
			}

			// All subtasks should be visible
			for (const subtaskText of subtasks) {
				await expect(findSubtask(todoItem, subtaskText)).toBeVisible();
			}
		});

		test("should prevent adding empty subtask", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for empty validation");
			await expandTodo(todoItem);

			// Add button should be disabled when input is empty
			const addButton = todoItem.locator('[data-testid="subtask-add-button"]');
			await expect(addButton).toBeDisabled();

			// Add button should be disabled with whitespace only
			const inputField = todoItem.locator(
				'[data-testid="subtask-add-input-field"]',
			);
			await inputField.fill("   ");
			await expect(addButton).toBeDisabled();
		});
	});

	test.describe("Toggle subtask completion", () => {
		test("should toggle subtask to completed", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for toggle test");
			await expandTodo(todoItem);
			const subtaskItem = await addSubtask(todoItem, "Toggle me");

			// Initially unchecked
			await expectSubtaskChecked(subtaskItem, false);

			// Toggle to complete
			await toggleSubtask(subtaskItem);

			// Should now be checked and have strikethrough
			await expectSubtaskChecked(subtaskItem, true);
			await expect(subtaskItem.locator("span.line-through")).toBeVisible();
		});

		test("should toggle subtask back to incomplete", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for untoggle test");
			await expandTodo(todoItem);
			const subtaskItem = await addSubtask(todoItem, "Toggle back");

			// Complete the subtask
			await toggleSubtask(subtaskItem);
			await expectSubtaskChecked(subtaskItem, true);

			// Toggle back to incomplete
			await toggleSubtask(subtaskItem);
			await expectSubtaskChecked(subtaskItem, false);
			await expect(subtaskItem.locator("span.line-through")).not.toBeVisible();
		});

		test("should toggle multiple subtasks independently", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo with independent subtasks");
			await expandTodo(todoItem);

			const firstSubtask = await addSubtask(todoItem, "First");
			const secondSubtask = await addSubtask(todoItem, "Second");
			const thirdSubtask = await addSubtask(todoItem, "Third");

			// Toggle only the second subtask
			await toggleSubtask(secondSubtask);

			// Verify states
			await expectSubtaskChecked(firstSubtask, false);
			await expectSubtaskChecked(secondSubtask, true);
			await expectSubtaskChecked(thirdSubtask, false);
		});
	});

	test.describe("Delete a subtask", () => {
		test("should delete a subtask", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for delete test");
			await expandTodo(todoItem);
			const subtaskItem = await addSubtask(todoItem, "Delete me");

			await expect(subtaskItem).toBeVisible();

			// Hover to reveal delete button
			await subtaskItem.hover();

			// Click delete using data-testid
			const deleteButton = subtaskItem.locator(
				'[data-testid^="subtask-delete-"]',
			);
			await deleteButton.click();

			// Subtask should be removed
			await expect(subtaskItem).not.toBeVisible();
		});

		test("should show empty state after deleting last subtask", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo for last subtask delete");
			await expandTodo(todoItem);
			const subtaskItem = await addSubtask(todoItem, "Only subtask");

			// Delete the only subtask
			await subtaskItem.hover();
			await subtaskItem.locator('[data-testid^="subtask-delete-"]').click();

			// Empty state should be visible
			await expect(
				todoItem.locator('[data-testid="subtask-list-empty"]'),
			).toBeVisible();
		});

		test("should delete only the targeted subtask", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for selective delete");
			await expandTodo(todoItem);

			const keep1 = await addSubtask(todoItem, "Keep me 1");
			const deleteMe = await addSubtask(todoItem, "Delete me");
			const keep2 = await addSubtask(todoItem, "Keep me 2");

			// Delete middle subtask
			await deleteMe.hover();
			await deleteMe.locator('[data-testid^="subtask-delete-"]').click();

			// Verify correct subtask was deleted
			await expect(deleteMe).not.toBeVisible();
			await expect(keep1).toBeVisible();
			await expect(keep2).toBeVisible();
		});
	});

	test.describe("Reorder subtasks", () => {
		// Note: Drag-and-drop reordering is not currently implemented in the UI
		// This test verifies that subtasks maintain their order
		test("should maintain subtask order after adding multiple", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo for order test");
			await expandTodo(todoItem);

			await addSubtask(todoItem, "First subtask");
			await addSubtask(todoItem, "Second subtask");
			await addSubtask(todoItem, "Third subtask");

			// Get all subtask texts in order
			const subtaskTexts = todoItem.locator('[data-testid^="subtask-text-"]');
			const texts = await subtaskTexts.allTextContents();

			// Verify order (newer subtasks appear at the end)
			expect(texts[0]).toBe("First subtask");
			expect(texts[1]).toBe("Second subtask");
			expect(texts[2]).toBe("Third subtask");
		});
	});

	test.describe("Auto-complete parent todo when all subtasks completed", () => {
		test("should complete parent todo when all subtasks are completed", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo for auto-complete test");
			await expandTodo(todoItem);

			const subtaskA = await addSubtask(todoItem, "Task A");
			const subtaskB = await addSubtask(todoItem, "Task B");

			// Parent should not be completed yet
			const toggleButton = todoItem.locator('[data-testid="todo-toggle"]');
			await expect(toggleButton).toHaveAttribute(
				"aria-label",
				"Mark as complete",
			);

			// Complete first subtask
			await toggleSubtask(subtaskA);

			// Parent should still not be completed (one subtask remaining)
			await expect(toggleButton).toHaveAttribute(
				"aria-label",
				"Mark as complete",
			);

			// Complete second subtask
			await toggleSubtask(subtaskB);

			// Parent should now be auto-completed
			await expect(toggleButton).toHaveAttribute(
				"aria-label",
				"Mark as incomplete",
			);

			// Parent text should have strikethrough
			await expect(
				todoItem.locator('[data-testid="todo-text"].line-through'),
			).toBeVisible();
		});
	});

	test.describe("Uncheck parent todo when subtask unchecked", () => {
		test("should uncomplete parent todo when a subtask is unchecked", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo for uncheck test");
			await expandTodo(todoItem);

			const subtaskItem = await addSubtask(todoItem, "Subtask X");

			// Complete the subtask (which will auto-complete parent)
			await toggleSubtask(subtaskItem);

			// Parent should be completed
			const toggleButton = todoItem.locator('[data-testid="todo-toggle"]');
			await expect(toggleButton).toHaveAttribute(
				"aria-label",
				"Mark as incomplete",
			);

			// Uncheck the subtask
			await toggleSubtask(subtaskItem);

			// Parent should be uncompleted
			await expect(toggleButton).toHaveAttribute(
				"aria-label",
				"Mark as complete",
			);

			// Parent text should not have strikethrough
			await expect(
				todoItem.locator('[data-testid="todo-text"].line-through'),
			).not.toBeVisible();
		});
	});

	test.describe("Show subtask progress indicator", () => {
		test("should show progress indicator when subtasks exist", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo for progress indicator");
			await expandTodo(todoItem);

			await addSubtask(todoItem, "Progress subtask 1");
			await addSubtask(todoItem, "Progress subtask 2");
			await addSubtask(todoItem, "Progress subtask 3");

			// Collapse to see progress indicator on main todo row
			const expandButton = todoItem.locator(
				'[data-testid="todo-expand-toggle"]',
			);
			await expandButton.click();

			// Progress should show 0/3
			const progressIndicator = todoItem.locator(
				'[data-testid="subtask-progress-indicator"]',
			);
			await expect(progressIndicator).toBeVisible();
			await expect(
				todoItem.locator('[data-testid="subtask-progress-text"]'),
			).toHaveText("0/3");
		});

		test("should update progress indicator when subtasks are completed", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo for progress update");
			await expandTodo(todoItem);

			const subtask1 = await addSubtask(todoItem, "Item 1");
			await addSubtask(todoItem, "Item 2");

			// Complete first subtask
			await toggleSubtask(subtask1);

			// Collapse to see progress
			const expandButton = todoItem.locator(
				'[data-testid="todo-expand-toggle"]',
			);
			await expandButton.click();

			// Progress should show 1/2
			await expect(
				todoItem.locator('[data-testid="subtask-progress-text"]'),
			).toHaveText("1/2");
		});

		test("should show green progress when all subtasks completed", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo for green progress");
			await expandTodo(todoItem);

			const subtaskItem = await addSubtask(todoItem, "Complete me");

			// Complete the subtask
			await toggleSubtask(subtaskItem);

			// Collapse to see progress
			const expandButton = todoItem.locator(
				'[data-testid="todo-expand-toggle"]',
			);
			await expandButton.click();

			// Progress should show 1/1 with green color
			const progressIndicator = todoItem.locator(
				'[data-testid="subtask-progress-indicator"]',
			);
			await expect(progressIndicator).toBeVisible();
			await expect(
				todoItem.locator('[data-testid="subtask-progress-text"]'),
			).toHaveText("1/1");

			// Should have green text (text-green-600 or dark:text-green-400)
			await expect(progressIndicator).toHaveClass(/text-green/);
		});

		test("should not show progress indicator when no subtasks", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo without subtasks");

			// Progress indicator should not be visible
			await expect(
				todoItem.locator('[data-testid="subtask-progress-indicator"]'),
			).not.toBeVisible();
		});
	});

	test.describe("Persist subtasks after page reload", () => {
		test("should persist subtasks after reload", async ({ page }) => {
			const todoText = "Persistent todo";
			const todoItem = await createTodo(page, todoText);
			await expandTodo(todoItem);

			const subtask1 = await addSubtask(todoItem, "Persistent subtask 1");
			await addSubtask(todoItem, "Persistent subtask 2");

			// Complete one subtask
			await toggleSubtask(subtask1);

			// Reload the page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Find the todo again and expand it
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: todoText });
			await expect(reloadedTodo).toBeVisible();

			const expandButton = reloadedTodo.locator(
				'[data-testid="todo-expand-toggle"]',
			);
			await expandButton.click();

			// Wait for subtasks section
			await expect(
				reloadedTodo.locator('[data-testid="todo-subtasks-section"]'),
			).toBeVisible();

			// Both subtasks should be there
			const reloadedSubtask1 = findSubtask(
				reloadedTodo,
				"Persistent subtask 1",
			);
			const reloadedSubtask2 = findSubtask(
				reloadedTodo,
				"Persistent subtask 2",
			);
			await expect(reloadedSubtask1).toBeVisible();
			await expect(reloadedSubtask2).toBeVisible();

			// First subtask should still be completed
			await expectSubtaskChecked(reloadedSubtask1, true);

			// Second subtask should still be incomplete
			await expectSubtaskChecked(reloadedSubtask2, false);
		});

		test("should persist subtask deletion after reload", async ({ page }) => {
			const todoText = "Todo for deletion persist";
			const todoItem = await createTodo(page, todoText);
			await expandTodo(todoItem);

			await addSubtask(todoItem, "Keep this");
			const subtaskToDelete = await addSubtask(todoItem, "Delete this");

			// Delete the second subtask
			await subtaskToDelete.hover();
			await subtaskToDelete.locator('[data-testid^="subtask-delete-"]').click();

			// Verify deletion
			await expect(subtaskToDelete).not.toBeVisible();

			// Reload
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Find and expand todo
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: todoText });
			await reloadedTodo.locator('[data-testid="todo-expand-toggle"]').click();

			// Only the kept subtask should be visible
			await expect(findSubtask(reloadedTodo, "Keep this")).toBeVisible();
			await expect(findSubtask(reloadedTodo, "Delete this")).not.toBeVisible();
		});

		test("should persist subtask progress after reload", async ({ page }) => {
			const todoText = "Todo for progress persist";
			const todoItem = await createTodo(page, todoText);
			await expandTodo(todoItem);

			const sub1 = await addSubtask(todoItem, "Sub 1");
			const sub2 = await addSubtask(todoItem, "Sub 2");
			await addSubtask(todoItem, "Sub 3");

			// Complete two subtasks
			await toggleSubtask(sub1);
			await toggleSubtask(sub2);

			// Collapse to see progress
			await todoItem.locator('[data-testid="todo-expand-toggle"]').click();

			// Verify progress shows 2/3
			await expect(
				todoItem.locator('[data-testid="subtask-progress-text"]'),
			).toHaveText("2/3");

			// Reload
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Find the todo (should show same progress)
			const reloadedTodo = page
				.locator('[data-testid^="todo-item-"]')
				.filter({ hasText: todoText });
			await expect(
				reloadedTodo.locator('[data-testid="subtask-progress-text"]'),
			).toHaveText("2/3");
		});
	});

	test.describe("Subtasks and todo deletion", () => {
		test("should delete subtasks when parent todo is deleted", async ({
			page,
		}) => {
			const todoText = "Todo to delete with subtasks";
			const todoItem = await createTodo(page, todoText);
			await expandTodo(todoItem);

			await addSubtask(todoItem, "Child subtask");

			// Collapse the todo
			await todoItem.locator('[data-testid="todo-expand-toggle"]').click();

			// Delete the parent todo
			await todoItem.hover();
			await todoItem.locator('[data-testid="todo-delete"]').click();

			// Todo should be gone
			await expect(todoItem).not.toBeVisible();

			// Create a new todo with the same name
			const newTodo = await createTodo(page, todoText);
			await expandTodo(newTodo);

			// Should show empty state (previous subtasks were deleted)
			await expect(
				newTodo.locator('[data-testid="subtask-list-empty"]'),
			).toBeVisible();
		});
	});

	test.describe("Edge cases", () => {
		test("should handle special characters in subtask text", async ({
			page,
		}) => {
			const todoItem = await createTodo(page, "Todo for special chars");
			await expandTodo(todoItem);

			const specialText = "Subtask with <script> & \"quotes\" 'apostrophes'";
			await addSubtask(todoItem, specialText);

			// Subtask should be visible with correct text
			await expect(findSubtask(todoItem, specialText)).toBeVisible();
		});

		test("should handle long subtask text", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for long text");
			await expandTodo(todoItem);

			const longText =
				"This is a very long subtask text that might wrap to multiple lines and should still be handled correctly by the UI without breaking the layout or causing any visual issues";
			await addSubtask(todoItem, longText);

			await expect(
				findSubtask(todoItem, longText.substring(0, 50)),
			).toBeVisible();
		});

		test("should handle unicode in subtask text", async ({ page }) => {
			const todoItem = await createTodo(page, "Todo for unicode");
			await expandTodo(todoItem);

			const unicodeText = "Subtask with 日本語 and emoji 🎉";
			await addSubtask(todoItem, unicodeText);

			await expect(findSubtask(todoItem, unicodeText)).toBeVisible();
		});

		test("should expand and collapse subtasks section", async ({ page }) => {
			const todoItem = await createTodo(page, "Expand collapse test");
			await expandTodo(todoItem);

			// Add a subtask while expanded
			await addSubtask(todoItem, "Test subtask");

			// Subtasks section visible
			await expect(
				todoItem.locator('[data-testid="todo-subtasks-section"]'),
			).toBeVisible();

			// Collapse
			const expandButton = todoItem.locator(
				'[data-testid="todo-expand-toggle"]',
			);
			await expandButton.click();

			// Subtasks section should be hidden
			await expect(
				todoItem.locator('[data-testid="todo-subtasks-section"]'),
			).not.toBeVisible();

			// Expand again
			await expandButton.click();

			// Subtasks section visible again with the subtask
			await expect(
				todoItem.locator('[data-testid="todo-subtasks-section"]'),
			).toBeVisible();
			await expect(findSubtask(todoItem, "Test subtask")).toBeVisible();
		});
	});
});
