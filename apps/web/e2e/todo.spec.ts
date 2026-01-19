import { expect, test } from "@playwright/test";

test.describe("Todo functionality (localStorage mode)", () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage before each test to ensure clean state
		await page.goto("/todos");
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		// Wait for the page to be ready (wait for the input field)
		await page.waitForSelector('input[placeholder="What needs to be done?"]');
	});

	test.describe("Create todo", () => {
		test("should create a todo by clicking the Add button", async ({
			page,
		}) => {
			const todoText = "Buy groceries";

			// Enter todo text
			await page.fill('input[placeholder="What needs to be done?"]', todoText);

			// Click Add button
			await page.click('button[type="submit"]');

			// Verify todo appears in the list
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).toBeVisible();
		});

		test("should create a todo by pressing Enter", async ({ page }) => {
			const todoText = "Walk the dog";

			// Enter todo text and press Enter
			await page.fill('input[placeholder="What needs to be done?"]', todoText);
			await page.press('input[placeholder="What needs to be done?"]', "Enter");

			// Verify todo appears in the list
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).toBeVisible();
		});

		test("should clear input field after creating todo", async ({ page }) => {
			const todoText = "Read a book";

			await page.fill('input[placeholder="What needs to be done?"]', todoText);
			await page.click('button[type="submit"]');

			// Verify input is cleared
			await expect(
				page.locator('input[placeholder="What needs to be done?"]'),
			).toHaveValue("");
		});

		test("should persist todo after page reload", async ({ page }) => {
			const todoText = "Persistent todo";

			// Create todo
			await page.fill('input[placeholder="What needs to be done?"]', todoText);
			await page.click('button[type="submit"]');

			// Wait for todo to appear
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).toBeVisible();

			// Reload page
			await page.reload();

			// Wait for page to load
			await page.waitForSelector('input[placeholder="What needs to be done?"]');

			// Verify todo still exists
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).toBeVisible();
		});
	});

	test.describe("Complete todo", () => {
		test("should toggle todo completion state", async ({ page }) => {
			const todoText = "Complete me";

			// Create todo
			await page.fill('input[placeholder="What needs to be done?"]', todoText);
			await page.click('button[type="submit"]');

			// Wait for todo to appear
			const todoItem = page.locator("li").filter({ hasText: todoText });
			await expect(todoItem).toBeVisible();

			// Click the toggle button (circle/checkbox)
			const toggleButton = todoItem.locator(
				'button[aria-label="Mark as complete"]',
			);
			await toggleButton.click();

			// Verify visual state change - text should have line-through
			const todoTextSpan = todoItem.locator("span.line-through");
			await expect(todoTextSpan).toBeVisible();

			// Verify the toggle button now shows "Mark as incomplete"
			await expect(
				todoItem.locator('button[aria-label="Mark as incomplete"]'),
			).toBeVisible();
		});

		test("should persist completed state after reload", async ({ page }) => {
			const todoText = "Persist completion";

			// Create todo
			await page.fill('input[placeholder="What needs to be done?"]', todoText);
			await page.click('button[type="submit"]');

			// Complete the todo
			const todoItem = page.locator("li").filter({ hasText: todoText });
			await todoItem.locator('button[aria-label="Mark as complete"]').click();

			// Wait for completion state
			await expect(todoItem.locator("span.line-through")).toBeVisible();

			// Reload page
			await page.reload();
			await page.waitForSelector('input[placeholder="What needs to be done?"]');

			// Verify completed state persists
			const reloadedTodoItem = page.locator("li").filter({ hasText: todoText });
			await expect(reloadedTodoItem.locator("span.line-through")).toBeVisible();
		});

		test("should uncheck completed todo", async ({ page }) => {
			const todoText = "Toggle me back";

			// Create and complete todo
			await page.fill('input[placeholder="What needs to be done?"]', todoText);
			await page.click('button[type="submit"]');

			const todoItem = page.locator("li").filter({ hasText: todoText });
			await todoItem.locator('button[aria-label="Mark as complete"]').click();

			// Wait for completion
			await expect(todoItem.locator("span.line-through")).toBeVisible();

			// Uncheck the todo
			await todoItem.locator('button[aria-label="Mark as incomplete"]').click();

			// Verify it's back to uncompleted state (no line-through)
			await expect(
				todoItem.locator('button[aria-label="Mark as complete"]'),
			).toBeVisible();
			await expect(todoItem.locator("span.line-through")).not.toBeVisible();
		});
	});

	test.describe("Delete todo", () => {
		test("should delete todo", async ({ page }) => {
			const todoText = "Delete me";

			// Create todo
			await page.fill('input[placeholder="What needs to be done?"]', todoText);
			await page.click('button[type="submit"]');

			// Wait for todo to appear
			const todoItem = page.locator("li").filter({ hasText: todoText });
			await expect(todoItem).toBeVisible();

			// Hover to reveal delete button (it has opacity-0 by default)
			await todoItem.hover();

			// Click delete button
			await todoItem.locator('button[aria-label="Delete task"]').click();

			// Verify todo is removed
			await expect(todoItem).not.toBeVisible();
		});

		test("should persist deletion after reload", async ({ page }) => {
			const todoText = "Delete and persist";

			// Create todo
			await page.fill('input[placeholder="What needs to be done?"]', todoText);
			await page.click('button[type="submit"]');

			// Delete the todo
			const todoItem = page.locator("li").filter({ hasText: todoText });
			await todoItem.hover();
			await todoItem.locator('button[aria-label="Delete task"]').click();

			// Verify deletion
			await expect(todoItem).not.toBeVisible();

			// Reload page
			await page.reload();
			await page.waitForSelector('input[placeholder="What needs to be done?"]');

			// Verify todo is still gone
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).not.toBeVisible();
		});
	});

	test.describe("Edge cases", () => {
		test("should prevent empty todo submission - button disabled", async ({
			page,
		}) => {
			// Verify Add button is disabled when input is empty
			const addButton = page.locator('button[type="submit"]');
			await expect(addButton).toBeDisabled();
		});

		test("should prevent whitespace-only todo submission", async ({ page }) => {
			// Enter only whitespace
			await page.fill('input[placeholder="What needs to be done?"]', "   ");

			// Button should still be disabled (whitespace is trimmed)
			const addButton = page.locator('button[type="submit"]');
			await expect(addButton).toBeDisabled();
		});

		test("should handle multiple todos CRUD operations", async ({ page }) => {
			const todos = ["First todo", "Second todo", "Third todo"];

			// Create multiple todos
			for (const todoText of todos) {
				await page.fill(
					'input[placeholder="What needs to be done?"]',
					todoText,
				);
				await page.click('button[type="submit"]');
				await expect(
					page.locator("li").filter({ hasText: todoText }),
				).toBeVisible();
			}

			// Verify all todos are visible
			for (const todoText of todos) {
				await expect(
					page.locator("li").filter({ hasText: todoText }),
				).toBeVisible();
			}

			// Complete the second todo
			const secondTodo = page.locator("li").filter({ hasText: "Second todo" });
			await secondTodo.locator('button[aria-label="Mark as complete"]').click();
			await expect(secondTodo.locator("span.line-through")).toBeVisible();

			// Delete the first todo
			const firstTodo = page.locator("li").filter({ hasText: "First todo" });
			await firstTodo.hover();
			await firstTodo.locator('button[aria-label="Delete task"]').click();
			await expect(firstTodo).not.toBeVisible();

			// Verify remaining state
			await expect(
				page.locator("li").filter({ hasText: "First todo" }),
			).not.toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Second todo" }),
			).toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Third todo" }),
			).toBeVisible();

			// Reload and verify persistence
			await page.reload();
			await page.waitForSelector('input[placeholder="What needs to be done?"]');

			await expect(
				page.locator("li").filter({ hasText: "First todo" }),
			).not.toBeVisible();
			const reloadedSecondTodo = page
				.locator("li")
				.filter({ hasText: "Second todo" });
			await expect(reloadedSecondTodo).toBeVisible();
			await expect(
				reloadedSecondTodo.locator("span.line-through"),
			).toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Third todo" }),
			).toBeVisible();
		});
	});

	test.describe("Filter functionality", () => {
		test("should filter todos by active/completed status", async ({ page }) => {
			// Create todos
			await page.fill(
				'input[placeholder="What needs to be done?"]',
				"Active todo",
			);
			await page.click('button[type="submit"]');

			await page.fill(
				'input[placeholder="What needs to be done?"]',
				"Completed todo",
			);
			await page.click('button[type="submit"]');

			// Complete one todo
			const completedTodo = page
				.locator("li")
				.filter({ hasText: "Completed todo" });
			await completedTodo
				.locator('button[aria-label="Mark as complete"]')
				.click();

			// Test "Active" filter
			await page.click('button:has-text("Active")');
			await expect(
				page.locator("li").filter({ hasText: "Active todo" }),
			).toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Completed todo" }),
			).not.toBeVisible();

			// Test "Completed" filter
			await page.click('button:has-text("Completed")');
			await expect(
				page.locator("li").filter({ hasText: "Active todo" }),
			).not.toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Completed todo" }),
			).toBeVisible();

			// Test "All" filter
			await page.click('button:has-text("All")');
			await expect(
				page.locator("li").filter({ hasText: "Active todo" }),
			).toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Completed todo" }),
			).toBeVisible();
		});
	});
});
