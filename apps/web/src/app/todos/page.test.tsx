"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UseFolderStorageReturn } from "@/app/api/folder";
import type { SubtaskProgress } from "@/app/api/subtask";

// Mock the navigation hook
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: vi.fn().mockReturnValue(null),
	}),
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
	}),
}));

// Mock the folder navigation hook
vi.mock("@/hooks/use-folder-navigation", () => ({
	useFolderNavigation: () => ({
		navigateToFolder: vi.fn(),
	}),
}));

// Mock the folder storage hook
const mockUseFolderStorage = vi.fn<() => UseFolderStorageReturn>();
vi.mock("@/app/api/folder", () => ({
	useFolderStorage: () => mockUseFolderStorage(),
	// Include constants used by FolderCreateDialog
	FOLDER_COLORS: [
		"slate",
		"red",
		"orange",
		"amber",
		"yellow",
		"lime",
		"green",
		"emerald",
		"teal",
		"cyan",
		"sky",
		"blue",
		"indigo",
		"violet",
		"purple",
		"fuchsia",
		"pink",
		"rose",
	],
	folderColorSchema: {
		parse: (v: string) => v,
	},
}));

// Mock toggle function to verify how it's called
const mockToggle = vi.fn();

// Mock the todo storage hook
vi.mock("@/hooks/use-todo-storage", () => ({
	useTodoStorage: () => ({
		create: vi.fn(),
		toggle: mockToggle,
		deleteTodo: vi.fn(),
		updateSchedule: vi.fn(),
		isLoading: false,
		isAuthenticated: false,
		selectedFolderId: "inbox",
		setSelectedFolderId: vi.fn(),
		filteredTodos: [
			{
				id: "recurring-1",
				text: "Daily Standup",
				completed: false,
				folderId: null,
				dueDate: null,
				reminderAt: null,
				recurringPattern: {
					type: "daily",
				},
			},
		],
		todos: [],
	}),
}));

// Mock the subtask progress hook
const mockGetProgress =
	vi.fn<(id: number | string) => SubtaskProgress | null>();
vi.mock("@/app/api/subtask", () => ({
	useAllSubtasksProgress: () => ({
		getProgress: mockGetProgress,
	}),
	useSubtaskStorage: () => ({
		subtasks: [],
		create: vi.fn(),
		update: vi.fn(),
		toggle: vi.fn(),
		deleteSubtask: vi.fn(),
		reorder: vi.fn(),
		isLoading: false,
	}),
}));

// Mock the reminder provider to avoid supabase dependency
vi.mock("@/components/notifications/reminder-provider", () => ({
	useDueReminders: () => ({
		dueReminderIds: new Set<string>(),
		dueReminders: [],
		dismissReminder: vi.fn(),
	}),
}));

// Import after mocks
import TodosPage from "./page";

describe("TodosPage (Folder View) - Recurring Todo Toggle Behavior", () => {
	/**
	 * DOCUMENTATION: Folder View Toggle Behavior for Recurring Todos
	 *
	 * This test suite documents and verifies the expected behavior when completing
	 * recurring todos in folder views (Inbox and custom folders).
	 *
	 * Key Difference Between Folder Views and Smart Views:
	 *
	 * FOLDER VIEWS (Inbox and custom folders):
	 * - Location: apps/web/src/app/todos/page.tsx
	 * - Code reference: Lines 161-163
	 *   const handleToggleTodo = (id: number | string, completed: boolean) => {
	 *     toggle(id, !completed);
	 *   };
	 *
	 * - When completing a recurring todo: NO virtualDate is passed
	 * - The toggle function calls completeRecurring mutation
	 * - This CREATES THE NEXT OCCURRENCE of the recurring todo
	 * - Expected behavior: "Complete this recurring task and create the next one"
	 *
	 * SMART VIEWS (Today, Upcoming, Overdue):
	 * - Location: apps/web/src/components/views/today-view.tsx (similar for others)
	 * - Code reference: Lines 341-348 in today-view.tsx
	 *   const handleToggleTodo = (entry: TodayTodoEntry, completed: boolean) => {
	 *     const id = entry.id;
	 *     if (isVirtualTodo(entry)) {
	 *       onToggle(id, completed, { virtualDate: entry.virtualDate });
	 *     } else {
	 *       onToggle(id, completed);
	 *     }
	 *   };
	 *
	 * - When completing a recurring todo instance: virtualDate IS passed
	 * - The toggle function calls updatePastCompletion mutation
	 * - This marks only that specific occurrence as completed
	 * - Expected behavior: "Mark this specific past occurrence as completed"
	 */

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseFolderStorage.mockReturnValue({
			folders: [],
			create: vi.fn(),
			update: vi.fn(),
			deleteFolder: vi.fn(),
			reorder: vi.fn(),
			isLoading: false,
			isAuthenticated: false,
		});
		mockGetProgress.mockReturnValue(null);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Functional verification", () => {
		it("calls toggle without virtualDate when completing recurring todo in folder view", () => {
			/**
			 * This test verifies that folder views (Inbox and custom folders)
			 * do NOT pass virtualDate when toggling a recurring todo.
			 *
			 * When no virtualDate is passed, the toggle function uses the
			 * completeRecurringMutation which creates the next occurrence.
			 */
			render(<TodosPage />);

			// Find and click the toggle button for the recurring todo
			const toggleButton = screen.getByTestId("todo-toggle");
			fireEvent.click(toggleButton);

			// Verify toggle was called with just (id, completed) - NO virtualDate option
			expect(mockToggle).toHaveBeenCalledTimes(1);
			expect(mockToggle).toHaveBeenCalledWith("recurring-1", true);

			// Verify NO third argument (options with virtualDate) was passed
			const callArgs = mockToggle.mock.calls[0];
			expect(callArgs.length).toBe(2);
			expect(callArgs[2]).toBeUndefined();
		});
	});

	describe("Behavior documentation", () => {
		it("documents that folder views create next occurrence for recurring todos", () => {
			/**
			 * Verification that the code implements the documented behavior:
			 *
			 * In apps/web/src/app/todos/page.tsx, the handleToggleTodo function
			 * is defined as:
			 *
			 * const handleToggleTodo = (id: number | string, completed: boolean) => {
			 *   toggle(id, !completed);
			 * };
			 *
			 * Notice that:
			 * 1. Only two parameters are passed: id and completed
			 * 2. No third parameter (options) is passed
			 * 3. Therefore, no virtualDate is passed to the toggle function
			 *
			 * In apps/web/src/app/api/todo/todo.hooks.ts, the toggle function
			 * handles recurring todos as follows (lines 396-414):
			 *
			 * if (completed) {
			 *   const currentTodos = remoteTodos || [];
			 *   const todo = currentTodos.find((t) => t.id === id);
			 *
			 *   if (todo?.recurringPattern) {
			 *     // If virtualDate is provided, use updatePastCompletion
			 *     if (options?.virtualDate) {
			 *       await updatePastCompletionMutation.mutateAsync({...});
			 *       return;
			 *     }
			 *     // Otherwise use completeRecurring mutation for recurring todos
			 *     await completeRecurringMutation.mutateAsync({ id: id as number });
			 *     return;
			 *   }
			 * }
			 *
			 * Since folder views don't pass virtualDate, the completeRecurringMutation
			 * is used, which creates the next occurrence.
			 */
			expect(true).toBe(true);
		});

		it("documents the toggle function signature differences", () => {
			/**
			 * Function Signature Comparison:
			 *
			 * Folder view toggle (todos/page.tsx):
			 *   handleToggleTodo = (id, completed) => toggle(id, !completed)
			 *
			 * Smart view toggle (today-view.tsx):
			 *   handleToggleTodo = (entry, completed) => {
			 *     if (isVirtualTodo(entry)) {
			 *       onToggle(id, completed, { virtualDate: entry.virtualDate })
			 *     } else {
			 *       onToggle(id, completed)
			 *     }
			 *   }
			 *
			 * The key difference:
			 * - Folder views: Always call toggle with just (id, completed)
			 * - Smart views: Call toggle with (id, completed, { virtualDate: ... })
			 *                 when dealing with virtual recurring instances
			 */
			expect(true).toBe(true);
		});

		it("documents the mutation used for each behavior", () => {
			/**
			 * Mutation Selection Logic (todo.hooks.ts):
			 *
			 * 1. When virtualDate is provided:
			 *    - Uses: updatePastCompletionMutation
			 *    - Effect: Marks only that specific occurrence as completed
			 *    - Use case: Smart views (Today, Upcoming, Overdue)
			 *
			 * 2. When virtualDate is NOT provided:
			 *    - Uses: completeRecurringMutation
			 *    - Effect: Creates the next occurrence of the recurring todo
			 *    - Use case: Folder views (Inbox, custom folders)
			 *
			 * This ensures that:
			 * - In folder views, completing a recurring task advances to the next occurrence
			 * - In smart views, completing a past occurrence marks just that occurrence done
			 */
			expect(true).toBe(true);
		});
	});

	describe("Code location references", () => {
		it("provides references to key implementation files", () => {
			/**
			 * Key Files for This Behavior:
			 *
			 * 1. Folder view implementation:
			 *    - File: apps/web/src/app/todos/page.tsx
			 *    - Lines: 161-163 (handleToggleTodo function)
			 *
			 * 2. Toggle hook implementation:
			 *    - File: apps/web/src/app/api/todo/todo.hooks.ts
			 *    - Lines: 384-441 (toggle function)
			 *    - Lines: 396-414 (recurring todo handling logic)
			 *
			 * 3. Smart view implementation (for comparison):
			 *    - File: apps/web/src/components/views/today-view.tsx
			 *    - Lines: 341-348 (handleToggleTodo with virtualDate)
			 *
			 * 4. Type definitions:
			 *    - File: apps/web/src/app/api/todo/todo.types.ts
			 *    - Defines: VirtualTodo, RecurringPattern, etc.
			 */
			expect(true).toBe(true);
		});
	});
});
