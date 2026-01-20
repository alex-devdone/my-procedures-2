import { expect, test } from "@playwright/test";

test.describe("Folder functionality (localStorage mode)", () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage before each test to ensure clean state
		await page.goto("/todos");
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		// Wait for the page to be ready (wait for the sidebar)
		await page.waitForSelector('[data-testid="folder-sidebar"]');
	});

	test.describe("Create folder", () => {
		test("should create a new folder with name and color", async ({ page }) => {
			const folderName = "Work Tasks";

			// Click create folder button
			await page.click('[data-testid="create-folder-button"]');

			// Wait for dialog to appear
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).toBeVisible();

			// Enter folder name
			await page.fill('[data-testid="folder-name-input"]', folderName);

			// Select a color (blue) - click the label containing the hidden radio
			await page
				.locator('label:has([data-testid="folder-color-blue"])')
				.click();

			// Verify preview shows the name
			await expect(
				page.locator('[data-testid="folder-preview"]'),
			).toContainText(folderName);

			// Click create
			await page.click('[data-testid="folder-create-submit"]');

			// Dialog should close
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).not.toBeVisible();

			// Folder should appear in sidebar
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText(folderName),
			).toBeVisible();
		});

		test("should show validation error for empty folder name", async ({
			page,
		}) => {
			// Click create folder button
			await page.click('[data-testid="create-folder-button"]');

			// Wait for dialog
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).toBeVisible();

			// Submit button should be disabled when name is empty
			await expect(
				page.locator('[data-testid="folder-create-submit"]'),
			).toBeDisabled();
		});

		test("should cancel folder creation", async ({ page }) => {
			// Click create folder button
			await page.click('[data-testid="create-folder-button"]');

			// Wait for dialog
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).toBeVisible();

			// Enter a name
			await page.fill('[data-testid="folder-name-input"]', "Test Folder");

			// Click cancel
			await page.click('[data-testid="folder-create-cancel"]');

			// Dialog should close
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).not.toBeVisible();

			// Folder should NOT appear in sidebar
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Test Folder"),
			).not.toBeVisible();
		});

		test("should default to slate color when no color selected", async ({
			page,
		}) => {
			const folderName = "Default Color Folder";

			// Click create folder button
			await page.click('[data-testid="create-folder-button"]');

			// Wait for dialog
			await expect(
				page.locator('[data-testid="folder-create-dialog"]'),
			).toBeVisible();

			// Enter folder name
			await page.fill('[data-testid="folder-name-input"]', folderName);

			// Slate should be checked by default (use force since it's sr-only)
			await expect(
				page.locator('[data-testid="folder-color-slate"]'),
			).toBeChecked();

			// Click create
			await page.click('[data-testid="folder-create-submit"]');

			// Folder should appear in sidebar
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText(folderName),
			).toBeVisible();
		});
	});

	test.describe("Edit folder", () => {
		test.beforeEach(async ({ page }) => {
			// Create a folder first
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Edit Me");
			await page.locator('label:has([data-testid="folder-color-red"])').click();
			await page.click('[data-testid="folder-create-submit"]');
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Edit Me"),
			).toBeVisible();
		});

		test("should edit folder name", async ({ page }) => {
			// Hover over the folder to reveal actions button
			const folderItem = page
				.locator('[data-testid="folder-sidebar"]')
				.getByText("Edit Me");
			await folderItem.hover();

			// Click actions dropdown - get the folder's ID first by finding its parent
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Edit Me" });
			const folderId = await folderButton
				.getAttribute("data-testid")
				.then((id) => id?.replace("folder-item-", ""));
			await page.click(`[data-testid="folder-actions-${folderId}"]`);

			// Click Edit
			await page.click(`[data-testid="folder-edit-${folderId}"]`);

			// Wait for edit dialog
			await expect(
				page.locator('[data-testid="folder-edit-dialog"]'),
			).toBeVisible();

			// Change the name
			await page.fill('[data-testid="folder-name-input"]', "Edited Folder");

			// Save changes
			await page.click('[data-testid="folder-edit-submit"]');

			// Dialog should close
			await expect(
				page.locator('[data-testid="folder-edit-dialog"]'),
			).not.toBeVisible();

			// New name should appear
			await expect(
				page
					.locator('[data-testid="folder-sidebar"]')
					.getByText("Edited Folder"),
			).toBeVisible();

			// Old name should not appear
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Edit Me"),
			).not.toBeVisible();
		});

		test("should edit folder color", async ({ page }) => {
			// Hover and click actions
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Edit Me" });
			const folderId = await folderButton
				.getAttribute("data-testid")
				.then((id) => id?.replace("folder-item-", ""));
			await folderButton.hover();
			await page.click(`[data-testid="folder-actions-${folderId}"]`);
			await page.click(`[data-testid="folder-edit-${folderId}"]`);

			// Wait for edit dialog
			await expect(
				page.locator('[data-testid="folder-edit-dialog"]'),
			).toBeVisible();

			// Red should be currently selected
			await expect(
				page.locator('[data-testid="folder-color-red"]'),
			).toBeChecked();

			// Change to green
			await page
				.locator('label:has([data-testid="folder-color-green"])')
				.click();

			// Save changes
			await page.click('[data-testid="folder-edit-submit"]');

			// Dialog should close
			await expect(
				page.locator('[data-testid="folder-edit-dialog"]'),
			).not.toBeVisible();

			// Folder should still be visible
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Edit Me"),
			).toBeVisible();
		});

		test("should cancel folder edit without saving changes", async ({
			page,
		}) => {
			// Open edit dialog
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Edit Me" });
			const folderId = await folderButton
				.getAttribute("data-testid")
				.then((id) => id?.replace("folder-item-", ""));
			await folderButton.hover();
			await page.click(`[data-testid="folder-actions-${folderId}"]`);
			await page.click(`[data-testid="folder-edit-${folderId}"]`);

			// Wait for edit dialog
			await expect(
				page.locator('[data-testid="folder-edit-dialog"]'),
			).toBeVisible();

			// Change the name
			await page.fill('[data-testid="folder-name-input"]', "Should Not Save");

			// Cancel
			await page.click('[data-testid="folder-edit-cancel"]');

			// Dialog should close
			await expect(
				page.locator('[data-testid="folder-edit-dialog"]'),
			).not.toBeVisible();

			// Original name should still be there
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Edit Me"),
			).toBeVisible();

			// Changed name should not be there
			await expect(
				page
					.locator('[data-testid="folder-sidebar"]')
					.getByText("Should Not Save"),
			).not.toBeVisible();
		});
	});

	test.describe("Delete folder", () => {
		test.beforeEach(async ({ page }) => {
			// Create a folder first
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Delete Me");
			await page.click('[data-testid="folder-create-submit"]');
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Delete Me"),
			).toBeVisible();
		});

		test("should delete folder after confirmation", async ({ page }) => {
			// Open edit dialog
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Delete Me" });
			const folderId = await folderButton
				.getAttribute("data-testid")
				.then((id) => id?.replace("folder-item-", ""));
			await folderButton.hover();
			await page.click(`[data-testid="folder-actions-${folderId}"]`);
			await page.click(`[data-testid="folder-edit-${folderId}"]`);

			// Wait for edit dialog
			await expect(
				page.locator('[data-testid="folder-edit-dialog"]'),
			).toBeVisible();

			// Click delete button
			await page.click('[data-testid="folder-delete-button"]');

			// Confirmation should appear
			await expect(
				page.locator('[data-testid="delete-confirmation"]'),
			).toBeVisible();

			// Confirm deletion
			await page.click('[data-testid="folder-delete-confirm"]');

			// Dialog should close
			await expect(
				page.locator('[data-testid="folder-edit-dialog"]'),
			).not.toBeVisible();

			// Folder should no longer appear
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Delete Me"),
			).not.toBeVisible();
		});

		test("should cancel folder deletion", async ({ page }) => {
			// Open edit dialog
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Delete Me" });
			const folderId = await folderButton
				.getAttribute("data-testid")
				.then((id) => id?.replace("folder-item-", ""));
			await folderButton.hover();
			await page.click(`[data-testid="folder-actions-${folderId}"]`);
			await page.click(`[data-testid="folder-edit-${folderId}"]`);

			// Wait for edit dialog
			await expect(
				page.locator('[data-testid="folder-edit-dialog"]'),
			).toBeVisible();

			// Click delete button
			await page.click('[data-testid="folder-delete-button"]');

			// Confirmation should appear
			await expect(
				page.locator('[data-testid="delete-confirmation"]'),
			).toBeVisible();

			// Cancel deletion
			await page.click('[data-testid="folder-delete-cancel"]');

			// Should go back to edit form (no confirmation visible)
			await expect(
				page.locator('[data-testid="delete-confirmation"]'),
			).not.toBeVisible();

			// Edit form should be visible
			await expect(
				page.locator('[data-testid="folder-name-input"]'),
			).toBeVisible();

			// Close dialog
			await page.click('[data-testid="folder-edit-cancel"]');

			// Folder should still exist
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Delete Me"),
			).toBeVisible();
		});

		test("should move todos to Inbox when folder is deleted", async ({
			page,
		}) => {
			// First, select the folder
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Delete Me" });
			await folderButton.click();

			// Add a todo to this folder
			await page.fill('input[placeholder^="Add task to"]', "Todo in folder");
			await page.click('button[type="submit"]:has-text("Add")');

			// Verify todo appears
			await expect(
				page.locator("li").filter({ hasText: "Todo in folder" }),
			).toBeVisible();

			// Now delete the folder
			const folderId = await folderButton
				.getAttribute("data-testid")
				.then((id) => id?.replace("folder-item-", ""));
			await folderButton.hover();
			await page.click(`[data-testid="folder-actions-${folderId}"]`);
			await page.click(`[data-testid="folder-edit-${folderId}"]`);
			await page.click('[data-testid="folder-delete-button"]');
			await page.click('[data-testid="folder-delete-confirm"]');

			// Wait for folder to be deleted
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Delete Me"),
			).not.toBeVisible();

			// Should now be in Inbox (selected automatically after folder deletion)
			await expect(
				page.locator('[data-testid="inbox-folder"]'),
			).toHaveAttribute("aria-current", "page");

			// Todo should still be visible in Inbox
			await expect(
				page.locator("li").filter({ hasText: "Todo in folder" }),
			).toBeVisible();
		});
	});

	test.describe("Assign todo to folder", () => {
		test.beforeEach(async ({ page }) => {
			// Create a folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "My Folder");
			await page.click('[data-testid="folder-create-submit"]');
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("My Folder"),
			).toBeVisible();
		});

		test("should create todo in selected folder", async ({ page }) => {
			// Select the folder
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "My Folder" });
			await folderButton.click();

			// Verify folder is selected (has aria-current)
			await expect(folderButton).toHaveAttribute("aria-current", "page");

			// Add a todo
			const todoText = "Task in My Folder";
			await page.fill('input[placeholder^="Add task to"]', todoText);
			await page.click('button[type="submit"]:has-text("Add")');

			// Todo should appear in list
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).toBeVisible();

			// Go to Inbox
			await page.click('[data-testid="inbox-folder"]');

			// Todo should NOT appear in Inbox
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).not.toBeVisible();

			// Go back to folder
			await folderButton.click();

			// Todo should be there
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).toBeVisible();
		});

		test("should create todo in Inbox when no folder is selected", async ({
			page,
		}) => {
			// Ensure Inbox is selected
			await page.click('[data-testid="inbox-folder"]');

			// Add a todo
			const todoText = "Task in Inbox";
			await page.fill('input[placeholder^="Add task to"]', todoText);
			await page.click('button[type="submit"]:has-text("Add")');

			// Todo should appear
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).toBeVisible();

			// Go to the folder
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "My Folder" });
			await folderButton.click();

			// Todo should NOT appear in the folder
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).not.toBeVisible();

			// Go back to Inbox
			await page.click('[data-testid="inbox-folder"]');

			// Todo should still be in Inbox
			await expect(
				page.locator("li").filter({ hasText: todoText }),
			).toBeVisible();
		});
	});

	test.describe("Filter todos by folder", () => {
		test.beforeEach(async ({ page }) => {
			// Create two folders
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Work");
			await page
				.locator('label:has([data-testid="folder-color-blue"])')
				.click();
			await page.click('[data-testid="folder-create-submit"]');

			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Personal");
			await page
				.locator('label:has([data-testid="folder-color-green"])')
				.click();
			await page.click('[data-testid="folder-create-submit"]');

			// Wait for both folders
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Work"),
			).toBeVisible();
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText("Personal"),
			).toBeVisible();

			// Add todo to Inbox
			await page.click('[data-testid="inbox-folder"]');
			await page.fill('input[placeholder^="Add task to"]', "Inbox task");
			await page.click('button[type="submit"]:has-text("Add")');

			// Add todo to Work folder
			await page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Work" })
				.click();
			await page.fill('input[placeholder^="Add task to"]', "Work task");
			await page.click('button[type="submit"]:has-text("Add")');

			// Add todo to Personal folder
			await page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Personal" })
				.click();
			await page.fill('input[placeholder^="Add task to"]', "Personal task");
			await page.click('button[type="submit"]:has-text("Add")');
		});

		test("should show only Inbox todos when Inbox is selected", async ({
			page,
		}) => {
			await page.click('[data-testid="inbox-folder"]');

			await expect(
				page.locator("li").filter({ hasText: "Inbox task" }),
			).toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Work task" }),
			).not.toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Personal task" }),
			).not.toBeVisible();
		});

		test("should show only Work folder todos when Work is selected", async ({
			page,
		}) => {
			await page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Work" })
				.click();

			await expect(
				page.locator("li").filter({ hasText: "Work task" }),
			).toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Inbox task" }),
			).not.toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Personal task" }),
			).not.toBeVisible();
		});

		test("should show only Personal folder todos when Personal is selected", async ({
			page,
		}) => {
			await page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Personal" })
				.click();

			await expect(
				page.locator("li").filter({ hasText: "Personal task" }),
			).toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Work task" }),
			).not.toBeVisible();
			await expect(
				page.locator("li").filter({ hasText: "Inbox task" }),
			).not.toBeVisible();
		});

		test("should update task count in folder stats", async ({ page }) => {
			// Check Inbox count
			await page.click('[data-testid="inbox-folder"]');
			// The tasks remaining text should show 1
			await expect(page.getByText("1 task remaining")).toBeVisible();

			// Check Work folder
			await page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Work" })
				.click();
			await expect(page.getByText("1 task remaining")).toBeVisible();

			// Check Personal folder
			await page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Personal" })
				.click();
			await expect(page.getByText("1 task remaining")).toBeVisible();
		});
	});

	test.describe("Persist folders after page reload", () => {
		test("should persist created folder after reload", async ({ page }) => {
			const folderName = "Persistent Folder";

			// Create folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', folderName);
			await page
				.locator('label:has([data-testid="folder-color-purple"])')
				.click();
			await page.click('[data-testid="folder-create-submit"]');

			// Verify folder exists
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText(folderName),
			).toBeVisible();

			// Reload page
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Folder should still exist
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText(folderName),
			).toBeVisible();
		});

		test("should persist folder edits after reload", async ({ page }) => {
			// Create folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Original Name");
			await page.click('[data-testid="folder-create-submit"]');

			// Edit folder
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Original Name" });
			const folderId = await folderButton
				.getAttribute("data-testid")
				.then((id) => id?.replace("folder-item-", ""));
			await folderButton.hover();
			await page.click(`[data-testid="folder-actions-${folderId}"]`);
			await page.click(`[data-testid="folder-edit-${folderId}"]`);
			await page.fill('[data-testid="folder-name-input"]', "Updated Name");
			await page.click('[data-testid="folder-edit-submit"]');

			// Verify edit
			await expect(
				page
					.locator('[data-testid="folder-sidebar"]')
					.getByText("Updated Name"),
			).toBeVisible();

			// Reload
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Edited name should persist
			await expect(
				page
					.locator('[data-testid="folder-sidebar"]')
					.getByText("Updated Name"),
			).toBeVisible();
			await expect(
				page
					.locator('[data-testid="folder-sidebar"]')
					.getByText("Original Name"),
			).not.toBeVisible();
		});

		test("should persist folder deletion after reload", async ({ page }) => {
			const folderName = "To Be Deleted";

			// Create folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', folderName);
			await page.click('[data-testid="folder-create-submit"]');

			// Delete folder
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: folderName });
			const folderId = await folderButton
				.getAttribute("data-testid")
				.then((id) => id?.replace("folder-item-", ""));
			await folderButton.hover();
			await page.click(`[data-testid="folder-actions-${folderId}"]`);
			await page.click(`[data-testid="folder-edit-${folderId}"]`);
			await page.click('[data-testid="folder-delete-button"]');
			await page.click('[data-testid="folder-delete-confirm"]');

			// Verify deleted
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText(folderName),
			).not.toBeVisible();

			// Reload
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Should still be deleted
			await expect(
				page.locator('[data-testid="folder-sidebar"]').getByText(folderName),
			).not.toBeVisible();
		});

		test("should persist todo-folder assignments after reload", async ({
			page,
		}) => {
			// Create folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Test Folder");
			await page.click('[data-testid="folder-create-submit"]');

			// Select folder and add todo
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Test Folder" });
			await folderButton.click();

			await page.fill('input[placeholder^="Add task to"]', "Folder Todo");
			await page.click('button[type="submit"]:has-text("Add")');

			// Verify todo is in folder
			await expect(
				page.locator("li").filter({ hasText: "Folder Todo" }),
			).toBeVisible();

			// Reload
			await page.reload();
			await page.waitForSelector('[data-testid="folder-sidebar"]');

			// Select the folder again
			await page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Test Folder" })
				.click();

			// Todo should still be in folder
			await expect(
				page.locator("li").filter({ hasText: "Folder Todo" }),
			).toBeVisible();

			// Check Inbox doesn't have it
			await page.click('[data-testid="inbox-folder"]');
			await expect(
				page.locator("li").filter({ hasText: "Folder Todo" }),
			).not.toBeVisible();
		});
	});

	test.describe("Multiple folders management", () => {
		test("should handle creating multiple folders", async ({ page }) => {
			const folderNames = ["Alpha", "Beta", "Gamma"];

			for (const name of folderNames) {
				await page.click('[data-testid="create-folder-button"]');
				await page.fill('[data-testid="folder-name-input"]', name);
				await page.click('[data-testid="folder-create-submit"]');
				await expect(
					page.locator('[data-testid="folder-sidebar"]').getByText(name),
				).toBeVisible();
			}

			// All folders should be visible
			for (const name of folderNames) {
				await expect(
					page.locator('[data-testid="folder-sidebar"]').getByText(name),
				).toBeVisible();
			}
		});

		test("should maintain folder selection when switching between folders", async ({
			page,
		}) => {
			// Create two folders
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Folder A");
			await page.click('[data-testid="folder-create-submit"]');

			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Folder B");
			await page.click('[data-testid="folder-create-submit"]');

			// Select Folder A
			const folderA = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Folder A" });
			await folderA.click();
			await expect(folderA).toHaveAttribute("aria-current", "page");

			// Select Folder B
			const folderB = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Folder B" });
			await folderB.click();
			await expect(folderB).toHaveAttribute("aria-current", "page");
			await expect(folderA).not.toHaveAttribute("aria-current", "page");

			// Select Inbox
			await page.click('[data-testid="inbox-folder"]');
			await expect(
				page.locator('[data-testid="inbox-folder"]'),
			).toHaveAttribute("aria-current", "page");
			await expect(folderB).not.toHaveAttribute("aria-current", "page");
		});
	});

	test.describe("Empty state", () => {
		test("should show empty state when no folders exist", async ({ page }) => {
			// No folders created, empty state should be visible
			await expect(
				page.locator('[data-testid="folder-empty-state"]'),
			).toBeVisible();
			await expect(page.getByText("No folders yet.")).toBeVisible();
		});

		test("should hide empty state after creating a folder", async ({
			page,
		}) => {
			// Verify empty state is shown
			await expect(
				page.locator('[data-testid="folder-empty-state"]'),
			).toBeVisible();

			// Create a folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "New Folder");
			await page.click('[data-testid="folder-create-submit"]');

			// Empty state should be hidden
			await expect(
				page.locator('[data-testid="folder-empty-state"]'),
			).not.toBeVisible();
		});

		test("should show empty state after deleting all folders", async ({
			page,
		}) => {
			// Create a folder
			await page.click('[data-testid="create-folder-button"]');
			await page.fill('[data-testid="folder-name-input"]', "Only Folder");
			await page.click('[data-testid="folder-create-submit"]');

			// Empty state should be hidden
			await expect(
				page.locator('[data-testid="folder-empty-state"]'),
			).not.toBeVisible();

			// Delete the folder
			const folderButton = page
				.locator('button[data-testid^="folder-item-"]')
				.filter({ hasText: "Only Folder" });
			const folderId = await folderButton
				.getAttribute("data-testid")
				.then((id) => id?.replace("folder-item-", ""));
			await folderButton.hover();
			await page.click(`[data-testid="folder-actions-${folderId}"]`);
			await page.click(`[data-testid="folder-edit-${folderId}"]`);
			await page.click('[data-testid="folder-delete-button"]');
			await page.click('[data-testid="folder-delete-confirm"]');

			// Empty state should be visible again
			await expect(
				page.locator('[data-testid="folder-empty-state"]'),
			).toBeVisible();
		});
	});
});
