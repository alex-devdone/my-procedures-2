import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as localSubtaskStorage from "./local-subtask-storage";
import * as localTodoStorage from "./local-todo-storage";

const STORAGE_KEY = "todos";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string): string | null => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get _store() {
			return store;
		},
	};
})();

// Mock crypto.randomUUID
const mockUUID = vi.fn(() => "test-uuid-1234");

// Mock localSubtaskStorage
vi.mock("./local-subtask-storage", () => ({
	deleteByTodoId: vi.fn(),
}));

describe("local-todo-storage", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", localStorageMock);
		vi.stubGlobal("crypto", { randomUUID: mockUUID });
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("getAll", () => {
		it("returns empty array when localStorage is empty", () => {
			const result = localTodoStorage.getAll();
			expect(result).toEqual([]);
		});

		it("returns empty array when stored value is null", () => {
			localStorageMock.getItem.mockReturnValueOnce(null);
			const result = localTodoStorage.getAll();
			expect(result).toEqual([]);
		});

		it("returns todos from localStorage", () => {
			const todos = [
				{ id: "todo-1", text: "Task 1", completed: false, folderId: null },
				{
					id: "todo-2",
					text: "Task 2",
					completed: true,
					folderId: "folder-1",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			const result = localTodoStorage.getAll();

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("todo-1");
			expect(result[1].id).toBe("todo-2");
		});

		it("returns empty array for invalid JSON", () => {
			localStorageMock.setItem(STORAGE_KEY, "not valid json");

			const result = localTodoStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when data is not an array", () => {
			localStorageMock.setItem(
				STORAGE_KEY,
				JSON.stringify({ id: "todo-1", text: "Test" }),
			);

			const result = localTodoStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when todo item is missing required fields", () => {
			const invalidTodos = [{ id: "todo-1", text: "Test" }]; // missing completed
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidTodos));

			const result = localTodoStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when todo has wrong id type", () => {
			const invalidTodos = [
				{ id: 123, text: "Test", completed: false, folderId: null },
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidTodos));

			const result = localTodoStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when todo has wrong text type", () => {
			const invalidTodos = [
				{ id: "todo-1", text: 123, completed: false, folderId: null },
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidTodos));

			const result = localTodoStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when todo has wrong completed type", () => {
			const invalidTodos = [
				{ id: "todo-1", text: "Test", completed: "yes", folderId: null },
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidTodos));

			const result = localTodoStorage.getAll();

			expect(result).toEqual([]);
		});

		it("accepts todo with undefined folderId", () => {
			const todos = [{ id: "todo-1", text: "Test", completed: false }];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			const result = localTodoStorage.getAll();

			expect(result).toHaveLength(1);
			expect(result[0].folderId).toBeUndefined();
		});

		it("accepts todo with null folderId", () => {
			const todos = [
				{ id: "todo-1", text: "Test", completed: false, folderId: null },
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			const result = localTodoStorage.getAll();

			expect(result).toHaveLength(1);
			expect(result[0].folderId).toBeNull();
		});

		it("accepts todo with string folderId", () => {
			const todos = [
				{ id: "todo-1", text: "Test", completed: false, folderId: "folder-1" },
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			const result = localTodoStorage.getAll();

			expect(result).toHaveLength(1);
			expect(result[0].folderId).toBe("folder-1");
		});

		it("rejects todo with wrong folderId type (number)", () => {
			const invalidTodos = [
				{ id: "todo-1", text: "Test", completed: false, folderId: 123 },
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidTodos));

			const result = localTodoStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when window is undefined (SSR)", () => {
			vi.stubGlobal("window", undefined);

			const result = localTodoStorage.getAll();

			expect(result).toEqual([]);
		});
	});

	describe("create", () => {
		it("creates a new todo with default values", () => {
			const result = localTodoStorage.create("New Task");

			expect(result).toMatchObject({
				id: "test-uuid-1234",
				text: "New Task",
				completed: false,
				folderId: null,
			});
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEY,
				expect.any(String),
			);
		});

		it("creates a new todo with specified folderId", () => {
			const result = localTodoStorage.create("New Task", "folder-1");

			expect(result.folderId).toBe("folder-1");
		});

		it("creates a new todo with null folderId when not specified", () => {
			const result = localTodoStorage.create("New Task");

			expect(result.folderId).toBeNull();
		});

		it("creates a new todo with null folderId when undefined is passed", () => {
			const result = localTodoStorage.create("New Task", undefined);

			expect(result.folderId).toBeNull();
		});

		it("stores the new todo in localStorage", () => {
			localTodoStorage.create("Test Todo");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored).toHaveLength(1);
			expect(stored[0].text).toBe("Test Todo");
		});

		it("appends to existing todos", () => {
			const existingTodos = [
				{ id: "todo-1", text: "Existing", completed: false, folderId: null },
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(existingTodos));

			localTodoStorage.create("New Todo");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored).toHaveLength(2);
			expect(stored[1].text).toBe("New Todo");
		});

		it("uses crypto.randomUUID for id generation", () => {
			mockUUID.mockReturnValueOnce("custom-uuid-5678");

			const result = localTodoStorage.create("Test");

			expect(result.id).toBe("custom-uuid-5678");
		});
	});

	describe("toggle", () => {
		beforeEach(() => {
			const todos = [
				{ id: "todo-1", text: "Task 1", completed: false, folderId: null },
				{
					id: "todo-2",
					text: "Task 2",
					completed: true,
					folderId: "folder-1",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));
		});

		it("toggles incomplete todo to complete", () => {
			const result = localTodoStorage.toggle("todo-1");

			expect(result).not.toBeNull();
			expect(result?.completed).toBe(true);
		});

		it("toggles complete todo to incomplete", () => {
			const result = localTodoStorage.toggle("todo-2");

			expect(result).not.toBeNull();
			expect(result?.completed).toBe(false);
		});

		it("returns null for non-existent todo", () => {
			const result = localTodoStorage.toggle("non-existent");

			expect(result).toBeNull();
		});

		it("persists toggle to localStorage", () => {
			localTodoStorage.toggle("todo-1");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const toggled = stored.find((t: { id: string }) => t.id === "todo-1");
			expect(toggled.completed).toBe(true);
		});

		it("does not modify other todos", () => {
			localTodoStorage.toggle("todo-1");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const other = stored.find((t: { id: string }) => t.id === "todo-2");
			expect(other.completed).toBe(true); // unchanged
		});

		it("preserves folderId when toggling", () => {
			localTodoStorage.toggle("todo-2");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const toggled = stored.find((t: { id: string }) => t.id === "todo-2");
			expect(toggled.folderId).toBe("folder-1");
		});
	});

	describe("deleteTodo", () => {
		beforeEach(() => {
			const todos = [
				{ id: "todo-1", text: "Task 1", completed: false, folderId: null },
				{
					id: "todo-2",
					text: "Task 2",
					completed: true,
					folderId: "folder-1",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));
		});

		it("deletes an existing todo", () => {
			const result = localTodoStorage.deleteTodo("todo-1");

			expect(result).toBe(true);
			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe("todo-2");
		});

		it("returns false for non-existent todo", () => {
			const result = localTodoStorage.deleteTodo("non-existent");

			expect(result).toBe(false);
		});

		it("persists deletion to localStorage", () => {
			localTodoStorage.deleteTodo("todo-1");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored.some((t: { id: string }) => t.id === "todo-1")).toBe(false);
		});

		it("deletes associated subtasks when todo is deleted", () => {
			localTodoStorage.deleteTodo("todo-1");

			expect(localSubtaskStorage.deleteByTodoId).toHaveBeenCalledWith("todo-1");
		});

		it("does not delete subtasks when todo does not exist", () => {
			localTodoStorage.deleteTodo("non-existent");

			expect(localSubtaskStorage.deleteByTodoId).not.toHaveBeenCalled();
		});
	});

	describe("updateFolder", () => {
		beforeEach(() => {
			const todos = [
				{ id: "todo-1", text: "Task 1", completed: false, folderId: null },
				{
					id: "todo-2",
					text: "Task 2",
					completed: true,
					folderId: "folder-1",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));
		});

		it("updates todo folderId from null to a folder", () => {
			const result = localTodoStorage.updateFolder("todo-1", "folder-2");

			expect(result).not.toBeNull();
			expect(result?.folderId).toBe("folder-2");
		});

		it("updates todo folderId from one folder to another", () => {
			const result = localTodoStorage.updateFolder("todo-2", "folder-3");

			expect(result).not.toBeNull();
			expect(result?.folderId).toBe("folder-3");
		});

		it("updates todo folderId to null (move to Inbox)", () => {
			const result = localTodoStorage.updateFolder("todo-2", null);

			expect(result).not.toBeNull();
			expect(result?.folderId).toBeNull();
		});

		it("returns null for non-existent todo", () => {
			const result = localTodoStorage.updateFolder("non-existent", "folder-1");

			expect(result).toBeNull();
		});

		it("persists folderId change to localStorage", () => {
			localTodoStorage.updateFolder("todo-1", "folder-2");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const updated = stored.find((t: { id: string }) => t.id === "todo-1");
			expect(updated.folderId).toBe("folder-2");
		});

		it("does not modify other todos", () => {
			localTodoStorage.updateFolder("todo-1", "folder-2");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const other = stored.find((t: { id: string }) => t.id === "todo-2");
			expect(other.folderId).toBe("folder-1"); // unchanged
		});

		it("preserves other todo properties when updating folder", () => {
			localTodoStorage.updateFolder("todo-2", "folder-3");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const updated = stored.find((t: { id: string }) => t.id === "todo-2");
			expect(updated.text).toBe("Task 2");
			expect(updated.completed).toBe(true);
		});
	});

	describe("clearAll", () => {
		it("removes all todos from localStorage", () => {
			const todos = [
				{ id: "todo-1", text: "Test", completed: false, folderId: null },
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			localTodoStorage.clearAll();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
		});

		it("handles clearing when no todos exist", () => {
			localTodoStorage.clearAll();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
		});

		it("does not throw when window is undefined (SSR)", () => {
			vi.stubGlobal("window", undefined);

			expect(() => localTodoStorage.clearAll()).not.toThrow();
		});
	});

	describe("clearFolderFromTodos", () => {
		beforeEach(() => {
			const todos = [
				{
					id: "todo-1",
					text: "Task 1",
					completed: false,
					folderId: "folder-1",
				},
				{
					id: "todo-2",
					text: "Task 2",
					completed: true,
					folderId: "folder-1",
				},
				{
					id: "todo-3",
					text: "Task 3",
					completed: false,
					folderId: "folder-2",
				},
				{ id: "todo-4", text: "Task 4", completed: false, folderId: null },
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));
		});

		it("clears folderId from todos belonging to the folder", () => {
			const result = localTodoStorage.clearFolderFromTodos("folder-1");

			expect(result).toBe(2);
			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const todo1 = stored.find((t: { id: string }) => t.id === "todo-1");
			const todo2 = stored.find((t: { id: string }) => t.id === "todo-2");
			expect(todo1.folderId).toBeNull();
			expect(todo2.folderId).toBeNull();
		});

		it("does not modify todos in other folders", () => {
			localTodoStorage.clearFolderFromTodos("folder-1");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const todo3 = stored.find((t: { id: string }) => t.id === "todo-3");
			expect(todo3.folderId).toBe("folder-2");
		});

		it("does not modify todos with null folderId", () => {
			localTodoStorage.clearFolderFromTodos("folder-1");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const todo4 = stored.find((t: { id: string }) => t.id === "todo-4");
			expect(todo4.folderId).toBeNull();
		});

		it("returns 0 when no todos belong to the folder", () => {
			const result = localTodoStorage.clearFolderFromTodos("non-existent");

			expect(result).toBe(0);
		});

		it("does not save to localStorage when no todos are updated", () => {
			localStorageMock.setItem.mockClear();

			localTodoStorage.clearFolderFromTodos("non-existent");

			// Only the initial setItem in beforeEach, no new calls
			expect(localStorageMock.setItem).not.toHaveBeenCalled();
		});

		it("persists changes to localStorage when todos are updated", () => {
			localStorageMock.setItem.mockClear();

			localTodoStorage.clearFolderFromTodos("folder-1");

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEY,
				expect.any(String),
			);
		});
	});

	describe("notifyAt field persistence", () => {
		it("creates a todo with notifyAt in recurringPattern", () => {
			const result = localTodoStorage.create("Daily reminder", null, {
				dueDate: "2024-01-15T09:00:00.000Z",
				recurringPattern: {
					type: "daily",
					interval: 1,
					notifyAt: "09:00",
				},
			});

			expect(result.recurringPattern).toBeDefined();
			expect(result.recurringPattern?.notifyAt).toBe("09:00");
		});

		it("persists notifyAt to localStorage when creating a todo", () => {
			localTodoStorage.create("Daily reminder", null, {
				dueDate: "2024-01-15T09:00:00.000Z",
				recurringPattern: {
					type: "daily",
					interval: 1,
					notifyAt: "14:30",
				},
			});

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored).toHaveLength(1);
			expect(stored[0].recurringPattern.notifyAt).toBe("14:30");
		});

		it("retrieves notifyAt from localStorage via getAll", () => {
			const todos = [
				{
					id: "todo-1",
					text: "Daily task",
					completed: false,
					folderId: null,
					dueDate: "2024-01-15T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "08:00",
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			const result = localTodoStorage.getAll();

			expect(result).toHaveLength(1);
			expect(result[0].recurringPattern?.notifyAt).toBe("08:00");
		});

		it("preserves notifyAt when updating schedule", () => {
			const todos = [
				{
					id: "todo-1",
					text: "Daily task",
					completed: false,
					folderId: null,
					dueDate: "2024-01-15T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "09:00",
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			// Update dueDate but keep the same recurringPattern
			localTodoStorage.updateSchedule("todo-1", {
				dueDate: "2024-01-16T09:00:00.000Z",
			});

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored[0].recurringPattern.notifyAt).toBe("09:00");
		});

		it("updates notifyAt when updating recurringPattern", () => {
			const todos = [
				{
					id: "todo-1",
					text: "Daily task",
					completed: false,
					folderId: null,
					dueDate: "2024-01-15T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "09:00",
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			localTodoStorage.updateSchedule("todo-1", {
				recurringPattern: {
					type: "weekly",
					interval: 1,
					daysOfWeek: [1, 3, 5],
					notifyAt: "10:30",
				},
			});

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored[0].recurringPattern.type).toBe("weekly");
			expect(stored[0].recurringPattern.notifyAt).toBe("10:30");
		});

		it("preserves notifyAt through completeRecurring", () => {
			const todos = [
				{
					id: "todo-1",
					text: "Daily task",
					completed: false,
					folderId: null,
					dueDate: "2024-01-15T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "09:00",
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			const result = localTodoStorage.completeRecurring("todo-1");

			expect(result.completed).toBe(true);
			expect(result.nextTodo).not.toBeNull();
			expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("09:00");
		});
	});

	describe("recurring patterns with notifyAt integration", () => {
		describe("daily patterns with notifyAt", () => {
			it("creates daily recurring todo with notifyAt", () => {
				const result = localTodoStorage.create("Morning standup", null, {
					dueDate: "2024-01-15T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "08:45",
					},
				});

				expect(result.recurringPattern?.type).toBe("daily");
				expect(result.recurringPattern?.interval).toBe(1);
				expect(result.recurringPattern?.notifyAt).toBe("08:45");
			});

			it("creates daily recurring todo with custom interval and notifyAt", () => {
				const result = localTodoStorage.create("Every 3 days task", null, {
					dueDate: "2024-01-15T14:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 3,
						notifyAt: "14:00",
					},
				});

				expect(result.recurringPattern?.type).toBe("daily");
				expect(result.recurringPattern?.interval).toBe(3);
				expect(result.recurringPattern?.notifyAt).toBe("14:00");
			});

			it("completes daily recurring todo and creates next occurrence with notifyAt preserved", () => {
				const todos = [
					{
						id: "daily-1",
						text: "Daily reminder",
						completed: false,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
						recurringPattern: {
							type: "daily",
							interval: 1,
							notifyAt: "10:00",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("daily-1");

				expect(result.completed).toBe(true);
				expect(result.nextTodo).not.toBeNull();
				expect(result.nextTodo?.recurringPattern?.type).toBe("daily");
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("10:00");
				// Next occurrence should be 1 day later
				expect(result.nextTodo?.dueDate).toBeDefined();
				const nextDate = new Date(result.nextTodo?.dueDate ?? "");
				expect(nextDate.getUTCDate()).toBe(16);
			});
		});

		describe("weekly patterns with notifyAt", () => {
			it("creates weekly recurring todo with specific days and notifyAt", () => {
				const result = localTodoStorage.create("Team meeting", null, {
					dueDate: "2024-01-15T15:00:00.000Z",
					recurringPattern: {
						type: "weekly",
						interval: 1,
						daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
						notifyAt: "14:45",
					},
				});

				expect(result.recurringPattern?.type).toBe("weekly");
				expect(result.recurringPattern?.daysOfWeek).toEqual([1, 3, 5]);
				expect(result.recurringPattern?.notifyAt).toBe("14:45");
			});

			it("completes weekly recurring todo and preserves notifyAt", () => {
				const todos = [
					{
						id: "weekly-1",
						text: "Weekly review",
						completed: false,
						folderId: "work",
						dueDate: "2024-01-15T09:00:00.000Z", // Monday
						recurringPattern: {
							type: "weekly",
							interval: 1,
							daysOfWeek: [1], // Monday
							notifyAt: "08:30",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("weekly-1");

				expect(result.completed).toBe(true);
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("08:30");
				expect(result.nextTodo?.recurringPattern?.daysOfWeek).toEqual([1]);
			});

			it("creates bi-weekly recurring todo with notifyAt", () => {
				const result = localTodoStorage.create("Bi-weekly sync", null, {
					dueDate: "2024-01-15T11:00:00.000Z",
					recurringPattern: {
						type: "weekly",
						interval: 2,
						daysOfWeek: [2], // Tuesday
						notifyAt: "10:30",
					},
				});

				expect(result.recurringPattern?.interval).toBe(2);
				expect(result.recurringPattern?.notifyAt).toBe("10:30");
			});
		});

		describe("monthly patterns with notifyAt", () => {
			it("creates monthly recurring todo with day of month and notifyAt", () => {
				const result = localTodoStorage.create("Monthly report", null, {
					dueDate: "2024-01-15T17:00:00.000Z",
					recurringPattern: {
						type: "monthly",
						interval: 1,
						dayOfMonth: 15,
						notifyAt: "16:00",
					},
				});

				expect(result.recurringPattern?.type).toBe("monthly");
				expect(result.recurringPattern?.dayOfMonth).toBe(15);
				expect(result.recurringPattern?.notifyAt).toBe("16:00");
			});

			it("completes monthly recurring todo and preserves notifyAt", () => {
				const todos = [
					{
						id: "monthly-1",
						text: "Monthly bills",
						completed: false,
						folderId: null,
						dueDate: "2024-01-31T12:00:00.000Z",
						recurringPattern: {
							type: "monthly",
							interval: 1,
							dayOfMonth: 31,
							notifyAt: "11:00",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("monthly-1");

				expect(result.completed).toBe(true);
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("11:00");
				expect(result.nextTodo?.recurringPattern?.dayOfMonth).toBe(31);
			});

			it("handles end of month edge case with notifyAt", () => {
				const todos = [
					{
						id: "monthly-eom",
						text: "End of month task",
						completed: false,
						folderId: null,
						dueDate: "2024-01-31T09:00:00.000Z",
						recurringPattern: {
							type: "monthly",
							interval: 1,
							dayOfMonth: 31,
							notifyAt: "09:00",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("monthly-eom");

				expect(result.completed).toBe(true);
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("09:00");
				// February has 29 days in 2024 (leap year), so should be Feb 29
				expect(result.nextTodo?.dueDate).toBeDefined();
				const nextDate = new Date(result.nextTodo?.dueDate ?? "");
				expect(nextDate.getUTCMonth()).toBe(1); // February
				expect(nextDate.getUTCDate()).toBe(29); // Feb 29 in leap year
			});
		});

		describe("yearly patterns with notifyAt", () => {
			it("creates yearly recurring todo with notifyAt", () => {
				const result = localTodoStorage.create("Annual review", null, {
					dueDate: "2024-03-15T10:00:00.000Z",
					recurringPattern: {
						type: "yearly",
						interval: 1,
						monthOfYear: 3,
						dayOfMonth: 15,
						notifyAt: "09:00",
					},
				});

				expect(result.recurringPattern?.type).toBe("yearly");
				expect(result.recurringPattern?.monthOfYear).toBe(3);
				expect(result.recurringPattern?.dayOfMonth).toBe(15);
				expect(result.recurringPattern?.notifyAt).toBe("09:00");
			});

			it("completes yearly recurring todo and preserves notifyAt", () => {
				const todos = [
					{
						id: "yearly-1",
						text: "Birthday reminder",
						completed: false,
						folderId: "personal",
						dueDate: "2024-06-15T08:00:00.000Z",
						recurringPattern: {
							type: "yearly",
							interval: 1,
							monthOfYear: 6,
							dayOfMonth: 15,
							notifyAt: "08:00",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("yearly-1");

				expect(result.completed).toBe(true);
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("08:00");
				expect(result.nextTodo?.dueDate).toBeDefined();
				const nextDate = new Date(result.nextTodo?.dueDate ?? "");
				expect(nextDate.getUTCFullYear()).toBe(2025);
				expect(nextDate.getUTCMonth()).toBe(5); // June
			});
		});

		describe("custom patterns with notifyAt", () => {
			it("creates custom recurring todo with specific days and notifyAt", () => {
				const result = localTodoStorage.create("Custom schedule", null, {
					dueDate: "2024-01-15T13:00:00.000Z",
					recurringPattern: {
						type: "custom",
						interval: 1,
						daysOfWeek: [0, 6], // Weekends only
						notifyAt: "12:00",
					},
				});

				expect(result.recurringPattern?.type).toBe("custom");
				expect(result.recurringPattern?.daysOfWeek).toEqual([0, 6]);
				expect(result.recurringPattern?.notifyAt).toBe("12:00");
			});

			it("completes custom recurring todo and preserves notifyAt", () => {
				const todos = [
					{
						id: "custom-1",
						text: "Weekend activity",
						completed: false,
						folderId: null,
						dueDate: "2024-01-13T10:00:00.000Z", // Saturday
						recurringPattern: {
							type: "custom",
							interval: 1,
							daysOfWeek: [0, 6], // Sun, Sat
							notifyAt: "09:30",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("custom-1");

				expect(result.completed).toBe(true);
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("09:30");
				expect(result.nextTodo?.recurringPattern?.daysOfWeek).toEqual([0, 6]);
			});
		});

		describe("pattern expiration with notifyAt", () => {
			it("handles pattern with endDate and notifyAt", () => {
				const result = localTodoStorage.create("Limited recurrence", null, {
					dueDate: "2024-01-15T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						endDate: "2024-01-31",
						notifyAt: "09:00",
					},
				});

				expect(result.recurringPattern?.endDate).toBe("2024-01-31");
				expect(result.recurringPattern?.notifyAt).toBe("09:00");
			});

			it("handles pattern with max occurrences and notifyAt", () => {
				const result = localTodoStorage.create("Limited occurrences", null, {
					dueDate: "2024-01-15T10:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						occurrences: 5,
						notifyAt: "10:00",
					},
				});

				expect(result.recurringPattern?.occurrences).toBe(5);
				expect(result.recurringPattern?.notifyAt).toBe("10:00");
			});

			it("stops creating next occurrence when pattern expires by date", () => {
				const todos = [
					{
						id: "expiring-date",
						text: "Expiring by date",
						completed: false,
						folderId: null,
						dueDate: "2024-01-30T09:00:00.000Z",
						recurringPattern: {
							type: "daily",
							interval: 1,
							endDate: "2024-01-30",
							notifyAt: "09:00",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("expiring-date");

				expect(result.completed).toBe(true);
				expect(result.nextTodo).toBeNull();
				expect(result.message).toBe("Recurring pattern has expired");
			});

			it("stops creating next occurrence when max occurrences reached", () => {
				const todos = [
					{
						id: "expiring-occ",
						text: "Expiring by occurrences",
						completed: false,
						folderId: null,
						dueDate: "2024-01-15T09:00:00.000Z",
						recurringPattern: {
							type: "daily",
							interval: 1,
							occurrences: 1,
							notifyAt: "09:00",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				// Complete with 0 prior completions, so this is the 1st (and last)
				const result = localTodoStorage.completeRecurring("expiring-occ", 0);

				expect(result.completed).toBe(true);
				expect(result.nextTodo).toBeNull();
				expect(result.message).toBe("Recurring pattern has expired");
			});
		});

		describe("notifyAt time format variations", () => {
			it("accepts morning time format", () => {
				const result = localTodoStorage.create("Morning task", null, {
					dueDate: "2024-01-15T06:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "06:00",
					},
				});

				expect(result.recurringPattern?.notifyAt).toBe("06:00");
			});

			it("accepts afternoon time format", () => {
				const result = localTodoStorage.create("Afternoon task", null, {
					dueDate: "2024-01-15T15:30:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "15:30",
					},
				});

				expect(result.recurringPattern?.notifyAt).toBe("15:30");
			});

			it("accepts evening time format", () => {
				const result = localTodoStorage.create("Evening task", null, {
					dueDate: "2024-01-15T21:45:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "21:45",
					},
				});

				expect(result.recurringPattern?.notifyAt).toBe("21:45");
			});

			it("accepts midnight time format", () => {
				const result = localTodoStorage.create("Midnight task", null, {
					dueDate: "2024-01-15T00:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "00:00",
					},
				});

				expect(result.recurringPattern?.notifyAt).toBe("00:00");
			});

			it("accepts end of day time format", () => {
				const result = localTodoStorage.create("End of day task", null, {
					dueDate: "2024-01-15T23:59:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "23:59",
					},
				});

				expect(result.recurringPattern?.notifyAt).toBe("23:59");
			});
		});

		describe("recurring pattern without notifyAt", () => {
			it("creates recurring todo without notifyAt", () => {
				const result = localTodoStorage.create("No notification", null, {
					dueDate: "2024-01-15T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
					},
				});

				expect(result.recurringPattern?.type).toBe("daily");
				expect(result.recurringPattern?.notifyAt).toBeUndefined();
			});

			it("completes recurring todo without notifyAt", () => {
				const todos = [
					{
						id: "no-notify",
						text: "Silent recurrence",
						completed: false,
						folderId: null,
						dueDate: "2024-01-15T09:00:00.000Z",
						recurringPattern: {
							type: "daily",
							interval: 1,
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("no-notify");

				expect(result.completed).toBe(true);
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBeUndefined();
			});
		});

		describe("folder assignment with recurring and notifyAt", () => {
			it("preserves folderId when completing recurring todo with notifyAt", () => {
				const todos = [
					{
						id: "folder-recurring",
						text: "Work task",
						completed: false,
						folderId: "work-folder",
						dueDate: "2024-01-15T09:00:00.000Z",
						recurringPattern: {
							type: "daily",
							interval: 1,
							notifyAt: "08:45",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("folder-recurring");

				expect(result.nextTodo?.folderId).toBe("work-folder");
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("08:45");
			});

			it("handles null folderId with recurring and notifyAt", () => {
				const todos = [
					{
						id: "inbox-recurring",
						text: "Inbox task",
						completed: false,
						folderId: null,
						dueDate: "2024-01-15T09:00:00.000Z",
						recurringPattern: {
							type: "weekly",
							interval: 1,
							daysOfWeek: [1, 3, 5],
							notifyAt: "09:00",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("inbox-recurring");

				expect(result.nextTodo?.folderId).toBeNull();
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("09:00");
			});
		});

		describe("reminderAt combined with recurring and notifyAt", () => {
			it("preserves reminderAt offset when completing recurring todo with notifyAt", () => {
				const todos = [
					{
						id: "reminder-recurring",
						text: "Reminder task",
						completed: false,
						folderId: null,
						dueDate: "2024-01-15T14:00:00.000Z",
						reminderAt: "2024-01-15T13:30:00.000Z", // 30 min before
						recurringPattern: {
							type: "daily",
							interval: 1,
							notifyAt: "14:00",
						},
					},
				];
				localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

				const result = localTodoStorage.completeRecurring("reminder-recurring");

				expect(result.completed).toBe(true);
				expect(result.nextTodo?.recurringPattern?.notifyAt).toBe("14:00");
				// Reminder should maintain 30 min offset
				expect(result.nextTodo?.dueDate).toBeDefined();
				expect(result.nextTodo?.reminderAt).toBeDefined();
				const nextDue = new Date(result.nextTodo?.dueDate ?? "");
				const nextReminder = new Date(result.nextTodo?.reminderAt ?? "");
				const offset = nextDue.getTime() - nextReminder.getTime();
				expect(offset).toBe(30 * 60 * 1000); // 30 minutes in ms
			});
		});
	});

	describe("completeRecurring completion history storage", () => {
		beforeEach(() => {
			const todos = [
				{
					id: "recurring-1",
					text: "Daily task",
					completed: false,
					folderId: null,
					dueDate: "2024-01-15T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));
		});

		it("should store completion record when completing recurring todo", () => {
			localTodoStorage.completeRecurring("recurring-1");

			const history = localTodoStorage.getCompletionHistory();
			expect(history).toHaveLength(1);
			expect(history[0].todoId).toBe("recurring-1");
			expect(history[0].scheduledDate).toBe("2024-01-15T09:00:00.000Z");
			expect(history[0].completedAt).not.toBeNull();
		});

		it("should use todo dueDate as scheduledDate in completion history", () => {
			const dueDate = "2024-01-15T09:00:00.000Z";
			localTodoStorage.completeRecurring("recurring-1");

			const history = localTodoStorage.getCompletionHistory();
			expect(history[0].scheduledDate).toBe(dueDate);
		});

		it("should use current timestamp as completedAt when no dueDate exists", () => {
			const todos = [
				{
					id: "no-due-date",
					text: "Task without due date",
					completed: false,
					folderId: null,
					recurringPattern: {
						type: "daily",
						interval: 1,
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			const beforeTime = Date.now();
			localTodoStorage.completeRecurring("no-due-date");
			const afterTime = Date.now();

			const history = localTodoStorage.getCompletionHistory();
			const completedAtTime = new Date(
				history[0].completedAt as string,
			).getTime();
			expect(completedAtTime).toBeGreaterThanOrEqual(beforeTime);
			expect(completedAtTime).toBeLessThanOrEqual(afterTime);
		});

		it("should use current timestamp as completedAt in completion history", () => {
			const beforeTime = Date.now();
			localTodoStorage.completeRecurring("recurring-1");
			const afterTime = Date.now();

			const history = localTodoStorage.getCompletionHistory();
			const completedAtTime = new Date(
				history[0].completedAt as string,
			).getTime();
			expect(completedAtTime).toBeGreaterThanOrEqual(beforeTime);
			expect(completedAtTime).toBeLessThanOrEqual(afterTime);
		});

		it("should not store completion record when todo is not found", () => {
			const result = localTodoStorage.completeRecurring("non-existent");

			expect(result.completed).toBe(false);
			const history = localTodoStorage.getCompletionHistory();
			expect(history).toHaveLength(0);
		});

		it("should not store completion record when todo has no recurring pattern", () => {
			const todos = [
				{
					id: "non-recurring",
					text: "One-time task",
					completed: false,
					folderId: null,
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			const result = localTodoStorage.completeRecurring("non-recurring");

			expect(result.completed).toBe(false);
			const history = localTodoStorage.getCompletionHistory();
			expect(history).toHaveLength(0);
		});

		it("should store completion record even when pattern expires", () => {
			const todos = [
				{
					id: "expiring",
					text: "Expiring task",
					completed: false,
					folderId: null,
					dueDate: "2024-01-30T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						endDate: "2024-01-30",
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			const result = localTodoStorage.completeRecurring("expiring");

			expect(result.completed).toBe(true);
			expect(result.nextTodo).toBeNull();
			const history = localTodoStorage.getCompletionHistory();
			expect(history).toHaveLength(1);
			expect(history[0].todoId).toBe("expiring");
		});

		it("should append to existing completion history", () => {
			localTodoStorage.addCompletionHistoryEntry({
				todoId: "other-todo",
				scheduledDate: "2024-01-01T00:00:00.000Z",
				completedAt: "2024-01-01T10:00:00.000Z",
			});

			localTodoStorage.completeRecurring("recurring-1");

			const history = localTodoStorage.getCompletionHistory();
			expect(history).toHaveLength(2);
			expect(history[0].todoId).toBe("other-todo");
			expect(history[1].todoId).toBe("recurring-1");
		});

		it("should work with weekly recurring pattern", () => {
			const todos = [
				{
					id: "weekly-1",
					text: "Weekly task",
					completed: false,
					folderId: null,
					dueDate: "2024-01-15T09:00:00.000Z",
					recurringPattern: {
						type: "weekly",
						interval: 1,
						daysOfWeek: [1, 3, 5],
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			localTodoStorage.completeRecurring("weekly-1");

			const history = localTodoStorage.getCompletionHistory();
			expect(history).toHaveLength(1);
			expect(history[0].todoId).toBe("weekly-1");
		});

		it("should work with monthly recurring pattern", () => {
			const todos = [
				{
					id: "monthly-1",
					text: "Monthly task",
					completed: false,
					folderId: null,
					dueDate: "2024-01-31T09:00:00.000Z",
					recurringPattern: {
						type: "monthly",
						interval: 1,
						dayOfMonth: 31,
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			localTodoStorage.completeRecurring("monthly-1");

			const history = localTodoStorage.getCompletionHistory();
			expect(history).toHaveLength(1);
			expect(history[0].todoId).toBe("monthly-1");
		});

		it("should work with yearly recurring pattern", () => {
			const todos = [
				{
					id: "yearly-1",
					text: "Yearly task",
					completed: false,
					folderId: null,
					dueDate: "2024-06-15T09:00:00.000Z",
					recurringPattern: {
						type: "yearly",
						interval: 1,
						monthOfYear: 6,
						dayOfMonth: 15,
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			localTodoStorage.completeRecurring("yearly-1");

			const history = localTodoStorage.getCompletionHistory();
			expect(history).toHaveLength(1);
			expect(history[0].todoId).toBe("yearly-1");
		});

		it("should work with custom recurring pattern", () => {
			const todos = [
				{
					id: "custom-1",
					text: "Custom task",
					completed: false,
					folderId: null,
					dueDate: "2024-01-13T10:00:00.000Z",
					recurringPattern: {
						type: "custom",
						interval: 1,
						daysOfWeek: [0, 6],
					},
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(todos));

			localTodoStorage.completeRecurring("custom-1");

			const history = localTodoStorage.getCompletionHistory();
			expect(history).toHaveLength(1);
			expect(history[0].todoId).toBe("custom-1");
		});
	});

	describe("Completion History", () => {
		const COMPLETION_HISTORY_KEY = "completion_history";

		describe("getCompletionHistory", () => {
			it("should return empty array when no history exists", () => {
				const history = localTodoStorage.getCompletionHistory();
				expect(history).toEqual([]);
			});

			it("should return empty array when localStorage has invalid data", () => {
				localStorageMock.setItem(COMPLETION_HISTORY_KEY, "invalid json");
				const history = localTodoStorage.getCompletionHistory();
				expect(history).toEqual([]);
			});

			it("should return empty array when localStorage has non-array data", () => {
				localStorageMock.setItem(
					COMPLETION_HISTORY_KEY,
					JSON.stringify({ not: "an array" }),
				);
				const history = localTodoStorage.getCompletionHistory();
				expect(history).toEqual([]);
			});

			it("should return empty array when array contains invalid entries", () => {
				localStorageMock.setItem(
					COMPLETION_HISTORY_KEY,
					JSON.stringify([
						{
							todoId: "1",
							scheduledDate: "2024-01-01",
							completedAt: null,
						},
						{ invalid: "entry" },
					]),
				);
				const history = localTodoStorage.getCompletionHistory();
				expect(history).toEqual([]);
			});

			it("should return valid completion history entries", () => {
				const mockHistory = [
					{
						todoId: "todo-1",
						scheduledDate: "2024-01-01T00:00:00.000Z",
						completedAt: "2024-01-01T10:00:00.000Z",
					},
					{
						todoId: "todo-2",
						scheduledDate: "2024-01-02T00:00:00.000Z",
						completedAt: null,
					},
				];
				localStorageMock.setItem(
					COMPLETION_HISTORY_KEY,
					JSON.stringify(mockHistory),
				);

				const history = localTodoStorage.getCompletionHistory();
				expect(history).toEqual(mockHistory);
			});
		});

		describe("addCompletionHistoryEntry", () => {
			it("should add a new entry with default completedAt timestamp", () => {
				const beforeTime = Date.now();
				const entry = localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
				});
				const afterTime = Date.now();

				expect(entry).toEqual({
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: entry.completedAt,
				});
				expect(entry.completedAt).not.toBeNull();
				expect(
					new Date(entry.completedAt as string).getTime(),
				).toBeGreaterThanOrEqual(beforeTime);
				expect(
					new Date(entry.completedAt as string).getTime(),
				).toBeLessThanOrEqual(afterTime);

				const history = localTodoStorage.getCompletionHistory();
				expect(history).toHaveLength(1);
				expect(history[0]).toEqual(entry);
			});

			it("should add a new entry with custom completedAt timestamp", () => {
				const customCompletedAt = "2024-01-01T10:00:00.000Z";
				const entry = localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: customCompletedAt,
				});

				expect(entry.completedAt).toBe(customCompletedAt);

				const history = localTodoStorage.getCompletionHistory();
				expect(history).toHaveLength(1);
				expect(history[0].completedAt).toBe(customCompletedAt);
			});

			it("should add entry with null completedAt when explicitly set", () => {
				const entry = localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: null,
				});

				expect(entry.completedAt).toBeNull();

				const history = localTodoStorage.getCompletionHistory();
				expect(history[0].completedAt).toBeNull();
			});

			it("should append to existing history", () => {
				const entry1 = localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: "2024-01-01T10:00:00.000Z",
				});

				const entry2 = localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-2",
					scheduledDate: "2024-01-02T00:00:00.000Z",
					completedAt: "2024-01-02T10:00:00.000Z",
				});

				const history = localTodoStorage.getCompletionHistory();
				expect(history).toHaveLength(2);
				expect(history[0]).toEqual(entry1);
				expect(history[1]).toEqual(entry2);
			});
		});

		describe("updateCompletionHistoryEntry", () => {
			beforeEach(() => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: null,
				});
			});

			it("should update completedAt of an existing entry", () => {
				const updatedEntry = localTodoStorage.updateCompletionHistoryEntry(
					"todo-1",
					"2024-01-01T00:00:00.000Z",
					{ completedAt: "2024-01-01T10:00:00.000Z" },
				);

				expect(updatedEntry).not.toBeNull();
				expect(updatedEntry?.completedAt).toBe("2024-01-01T10:00:00.000Z");

				const history = localTodoStorage.getCompletionHistory();
				expect(history[0].completedAt).toBe("2024-01-01T10:00:00.000Z");
			});

			it("should return null when entry not found", () => {
				const result = localTodoStorage.updateCompletionHistoryEntry(
					"non-existent",
					"2024-01-01T00:00:00.000Z",
					{ completedAt: "2024-01-01T10:00:00.000Z" },
				);

				expect(result).toBeNull();
			});

			it("should update completedAt to null", () => {
				localTodoStorage.updateCompletionHistoryEntry(
					"todo-1",
					"2024-01-01T00:00:00.000Z",
					{ completedAt: "2024-01-01T10:00:00.000Z" },
				);

				const updatedEntry = localTodoStorage.updateCompletionHistoryEntry(
					"todo-1",
					"2024-01-01T00:00:00.000Z",
					{ completedAt: null },
				);

				expect(updatedEntry?.completedAt).toBeNull();
			});

			it("should only update the matching entry", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-02T00:00:00.000Z",
					completedAt: null,
				});

				localTodoStorage.updateCompletionHistoryEntry(
					"todo-1",
					"2024-01-01T00:00:00.000Z",
					{ completedAt: "2024-01-01T10:00:00.000Z" },
				);

				const history = localTodoStorage.getCompletionHistory();
				expect(history).toHaveLength(2);
				expect(history[0].completedAt).toBe("2024-01-01T10:00:00.000Z");
				expect(history[1].completedAt).toBeNull();
			});
		});

		describe("deleteCompletionHistoryEntry", () => {
			beforeEach(() => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: null,
				});
			});

			it("should delete an existing entry", () => {
				const result = localTodoStorage.deleteCompletionHistoryEntry(
					"todo-1",
					"2024-01-01T00:00:00.000Z",
				);

				expect(result).toBe(true);
				expect(localTodoStorage.getCompletionHistory()).toHaveLength(0);
			});

			it("should return false when entry not found", () => {
				const result = localTodoStorage.deleteCompletionHistoryEntry(
					"non-existent",
					"2024-01-01T00:00:00.000Z",
				);

				expect(result).toBe(false);
			});

			it("should only delete the matching entry", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-2",
					scheduledDate: "2024-01-02T00:00:00.000Z",
					completedAt: null,
				});

				localTodoStorage.deleteCompletionHistoryEntry(
					"todo-1",
					"2024-01-01T00:00:00.000Z",
				);

				const history = localTodoStorage.getCompletionHistory();
				expect(history).toHaveLength(1);
				expect(history[0].todoId).toBe("todo-2");
			});
		});

		describe("deleteCompletionHistoryByTodoId", () => {
			beforeEach(() => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: null,
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-02T00:00:00.000Z",
					completedAt: null,
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-2",
					scheduledDate: "2024-01-03T00:00:00.000Z",
					completedAt: null,
				});
			});

			it("should delete all entries for a specific todoId", () => {
				const deletedCount =
					localTodoStorage.deleteCompletionHistoryByTodoId("todo-1");

				expect(deletedCount).toBe(2);

				const history = localTodoStorage.getCompletionHistory();
				expect(history).toHaveLength(1);
				expect(history[0].todoId).toBe("todo-2");
			});

			it("should return 0 when no entries found for todoId", () => {
				const deletedCount =
					localTodoStorage.deleteCompletionHistoryByTodoId("non-existent");

				expect(deletedCount).toBe(0);
			});
		});

		describe("clearCompletionHistory", () => {
			beforeEach(() => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: null,
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-2",
					scheduledDate: "2024-01-02T00:00:00.000Z",
					completedAt: null,
				});
			});

			it("should clear all completion history", () => {
				localTodoStorage.clearCompletionHistory();

				expect(localTodoStorage.getCompletionHistory()).toHaveLength(0);
				expect(localStorageMock.removeItem).toHaveBeenCalledWith(
					COMPLETION_HISTORY_KEY,
				);
			});

			it("should do nothing when history is already empty", () => {
				localTodoStorage.clearCompletionHistory();
				localTodoStorage.clearCompletionHistory();

				expect(localTodoStorage.getCompletionHistory()).toHaveLength(0);
			});
		});

		describe("getLocalCompletionHistory", () => {
			beforeEach(() => {
				// Clear storage before each test
				localTodoStorage.clearCompletionHistory();
			});

			it("should return entries within the date range", () => {
				// Add entries with different scheduled dates
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: "2024-01-15T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "2",
					scheduledDate: "2024-01-20T10:00:00.000Z",
					completedAt: "2024-01-20T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "3",
					scheduledDate: "2024-01-25T10:00:00.000Z",
					completedAt: "2024-01-25T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-01-18T00:00:00.000Z",
					"2024-01-22T00:00:00.000Z",
				);

				expect(result).toHaveLength(1);
				expect(result[0].todoId).toBe("2");
			});

			it("should include entries on the start boundary", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: "2024-01-15T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-01-15T10:00:00.000Z",
					"2024-01-20T00:00:00.000Z",
				);

				expect(result).toHaveLength(1);
				expect(result[0].todoId).toBe("1");
			});

			it("should include entries on the end boundary", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-20T10:00:00.000Z",
					completedAt: "2024-01-20T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-01-15T00:00:00.000Z",
					"2024-01-20T10:00:00.000Z",
				);

				expect(result).toHaveLength(1);
				expect(result[0].todoId).toBe("1");
			});

			it("should exclude entries before the start date", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-10T10:00:00.000Z",
					completedAt: "2024-01-10T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "2",
					scheduledDate: "2024-01-20T10:00:00.000Z",
					completedAt: "2024-01-20T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-01-15T00:00:00.000Z",
					"2024-01-25T00:00:00.000Z",
				);

				expect(result).toHaveLength(1);
				expect(result[0].todoId).toBe("2");
			});

			it("should exclude entries after the end date", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: "2024-01-15T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "2",
					scheduledDate: "2024-01-30T10:00:00.000Z",
					completedAt: "2024-01-30T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-01-10T00:00:00.000Z",
					"2024-01-20T00:00:00.000Z",
				);

				expect(result).toHaveLength(1);
				expect(result[0].todoId).toBe("1");
			});

			it("should return empty array when no entries match", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: "2024-01-15T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-02-01T00:00:00.000Z",
					"2024-02-28T00:00:00.000Z",
				);

				expect(result).toHaveLength(0);
			});

			it("should return empty array when no history exists", () => {
				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-01-01T00:00:00.000Z",
					"2024-12-31T23:59:59.000Z",
				);

				expect(result).toHaveLength(0);
			});

			it("should handle entries with null completedAt", () => {
				// Add entry directly to localStorage to set completedAt to null
				const mockHistory = [
					{
						todoId: "1",
						scheduledDate: "2024-01-15T10:00:00.000Z",
						completedAt: null,
					},
				];
				localStorageMock.setItem(
					"completion_history",
					JSON.stringify(mockHistory),
				);

				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result).toHaveLength(1);
				expect(result[0].todoId).toBe("1");
				expect(result[0].completedAt).toBeNull();
			});

			it("should return multiple entries within range", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-10T10:00:00.000Z",
					completedAt: "2024-01-10T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "2",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: "2024-01-15T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "3",
					scheduledDate: "2024-01-20T10:00:00.000Z",
					completedAt: "2024-01-20T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "4",
					scheduledDate: "2024-01-25T10:00:00.000Z",
					completedAt: "2024-01-25T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-01-12T00:00:00.000Z",
					"2024-01-22T00:00:00.000Z",
				);

				expect(result).toHaveLength(2);
				expect(result.map((e) => e.todoId).sort()).toEqual(["2", "3"]);
			});

			it("should handle ISO date strings correctly", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-15",
					completedAt: "2024-01-15T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalCompletionHistory(
					"2024-01-01",
					"2024-01-31",
				);

				expect(result).toHaveLength(1);
				expect(result[0].todoId).toBe("1");
			});
		});

		describe("updateLocalPastCompletion", () => {
			beforeEach(() => {
				// Add an entry with null completedAt (missed) to start with
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-15T00:00:00.000Z",
					completedAt: null,
				});
			});

			it("should update completedAt when setting completed to true", () => {
				const beforeTime = Date.now();
				const result = localTodoStorage.updateLocalPastCompletion(
					"todo-1",
					"2024-01-15T00:00:00.000Z",
					true,
				);
				const afterTime = Date.now();

				expect(result).not.toBeNull();
				expect(result?.completedAt).not.toBeNull();

				const completedAtTime = new Date(
					result?.completedAt as string,
				).getTime();
				expect(completedAtTime).toBeGreaterThanOrEqual(beforeTime);
				expect(completedAtTime).toBeLessThanOrEqual(afterTime);
			});

			it("should set completedAt to null when setting completed to false", () => {
				// First mark as completed
				localTodoStorage.updateCompletionHistoryEntry(
					"todo-1",
					"2024-01-15T00:00:00.000Z",
					{ completedAt: "2024-01-15T10:00:00.000Z" },
				);

				// Then mark as not completed
				const result = localTodoStorage.updateLocalPastCompletion(
					"todo-1",
					"2024-01-15T00:00:00.000Z",
					false,
				);

				expect(result).not.toBeNull();
				expect(result?.completedAt).toBeNull();
			});

			it("should return null when entry not found", () => {
				const result = localTodoStorage.updateLocalPastCompletion(
					"non-existent",
					"2024-01-15T00:00:00.000Z",
					true,
				);

				expect(result).toBeNull();
			});

			it("should return null when scheduledDate does not match", () => {
				const result = localTodoStorage.updateLocalPastCompletion(
					"todo-1",
					"2024-01-16T00:00:00.000Z", // different date
					true,
				);

				expect(result).toBeNull();
			});

			it("should only update the matching entry", () => {
				// Add another entry for the same todo but different date
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-16T00:00:00.000Z",
					completedAt: null,
				});

				localTodoStorage.updateLocalPastCompletion(
					"todo-1",
					"2024-01-15T00:00:00.000Z",
					true,
				);

				const history = localTodoStorage.getCompletionHistory();
				expect(history).toHaveLength(2);

				const entry1 = history.find(
					(e) =>
						e.todoId === "todo-1" &&
						e.scheduledDate === "2024-01-15T00:00:00.000Z",
				);
				const entry2 = history.find(
					(e) =>
						e.todoId === "todo-1" &&
						e.scheduledDate === "2024-01-16T00:00:00.000Z",
				);

				expect(entry1?.completedAt).not.toBeNull();
				expect(entry2?.completedAt).toBeNull();
			});

			it("should handle multiple entries with same todoId correctly", () => {
				// Add multiple entries with same todoId
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-16T00:00:00.000Z",
					completedAt: null,
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "todo-1",
					scheduledDate: "2024-01-17T00:00:00.000Z",
					completedAt: null,
				});

				// Update the middle entry
				const result = localTodoStorage.updateLocalPastCompletion(
					"todo-1",
					"2024-01-16T00:00:00.000Z",
					true,
				);

				expect(result).not.toBeNull();
				expect(result?.scheduledDate).toBe("2024-01-16T00:00:00.000Z");

				const history = localTodoStorage.getCompletionHistory();
				const completed = history.filter((e) => e.completedAt !== null);
				expect(completed).toHaveLength(1);
				expect(completed[0].scheduledDate).toBe("2024-01-16T00:00:00.000Z");
			});

			it("should persist changes to localStorage", () => {
				localTodoStorage.updateLocalPastCompletion(
					"todo-1",
					"2024-01-15T00:00:00.000Z",
					true,
				);

				const history = localTodoStorage.getCompletionHistory();
				expect(history[0].completedAt).not.toBeNull();
			});
		});

		describe("Type validation", () => {
			it("should accept valid entry with all required fields", () => {
				const entry = {
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: "2024-01-01T10:00:00.000Z",
				};

				localTodoStorage.addCompletionHistoryEntry(entry);

				const history = localTodoStorage.getCompletionHistory();
				expect(history[0]).toEqual(entry);
			});

			it("should accept entry with null completedAt", () => {
				const entry = {
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: null,
				};

				localTodoStorage.addCompletionHistoryEntry(entry);

				const history = localTodoStorage.getCompletionHistory();
				expect(history[0].completedAt).toBeNull();
			});

			it("should reject entry with missing todoId", () => {
				const invalidEntry = {
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: null,
				};
				localStorageMock.setItem(
					COMPLETION_HISTORY_KEY,
					JSON.stringify([invalidEntry]),
				);

				expect(localTodoStorage.getCompletionHistory()).toEqual([]);
			});

			it("should reject entry with missing scheduledDate", () => {
				const invalidEntry = {
					todoId: "todo-1",
					completedAt: null,
				};
				localStorageMock.setItem(
					COMPLETION_HISTORY_KEY,
					JSON.stringify([invalidEntry]),
				);

				expect(localTodoStorage.getCompletionHistory()).toEqual([]);
			});

			it("should reject entry with number completedAt", () => {
				const invalidEntry = {
					todoId: "todo-1",
					scheduledDate: "2024-01-01T00:00:00.000Z",
					completedAt: 1234567890,
				};
				localStorageMock.setItem(
					COMPLETION_HISTORY_KEY,
					JSON.stringify([invalidEntry]),
				);

				expect(localTodoStorage.getCompletionHistory()).toEqual([]);
			});
		});
	});

	describe("getLocalAnalytics", () => {
		beforeEach(() => {
			// Clear storage before each test
			localTodoStorage.clearCompletionHistory();
			localTodoStorage.clearAll();
		});

		describe("with empty data", () => {
			it("should return zero values when no todos or history exist", () => {
				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.totalRegularCompleted).toBe(0);
				expect(result.totalRecurringCompleted).toBe(0);
				expect(result.totalRecurringMissed).toBe(0);
				expect(result.completionRate).toBe(100);
				expect(result.currentStreak).toBe(0);
				expect(result.dailyBreakdown).toHaveLength(31);
			});
		});

		describe("regular todos", () => {
			it("should count completed regular todos within date range", () => {
				// Create completed regular todos - set up todos directly with unique IDs
				const todos = [
					{
						id: "task-1",
						text: "Task 1",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
					},
					{
						id: "task-2",
						text: "Task 2",
						completed: true,
						folderId: null,
						dueDate: "2024-01-20T10:00:00.000Z",
					},
					{
						id: "task-3",
						text: "Task 3",
						completed: true,
						folderId: null,
						dueDate: "2024-01-25T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.totalRegularCompleted).toBe(3);
				expect(result.totalRecurringCompleted).toBe(0);
				expect(result.totalRecurringMissed).toBe(0);
			});

			it("should exclude regular todos outside date range", () => {
				const todos = [
					{
						id: "task-before",
						text: "Task before",
						completed: true,
						folderId: null,
						dueDate: "2023-12-31T10:00:00.000Z",
					},
					{
						id: "task-inside",
						text: "Task inside",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
					},
					{
						id: "task-after",
						text: "Task after",
						completed: true,
						folderId: null,
						dueDate: "2024-02-01T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.totalRegularCompleted).toBe(1);
			});

			it("should exclude incomplete regular todos", () => {
				const todos = [
					{
						id: "task-1",
						text: "Completed task",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
					},
					{
						id: "task-2",
						text: "Incomplete task",
						completed: false,
						folderId: null,
						dueDate: "2024-01-20T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.totalRegularCompleted).toBe(1);
			});

			it("should exclude recurring todos from regular count", () => {
				const todos = [
					{
						id: "task-1",
						text: "Regular task",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
					},
					{
						id: "task-2",
						text: "Recurring task",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
						recurringPattern: { type: "daily", interval: 1 },
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.totalRegularCompleted).toBe(1);
				expect(result.totalRecurringCompleted).toBe(0);
			});
		});

		describe("recurring todos", () => {
			it("should count completed recurring todos from completion history", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: "2024-01-15T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-16T10:00:00.000Z",
					completedAt: "2024-01-16T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-2",
					scheduledDate: "2024-01-17T10:00:00.000Z",
					completedAt: "2024-01-17T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.totalRegularCompleted).toBe(0);
				expect(result.totalRecurringCompleted).toBe(3);
				expect(result.totalRecurringMissed).toBe(0);
			});

			it("should count missed recurring todos (before today, null completedAt)", () => {
				// Mock "today" to be 2024-01-20
				vi.useFakeTimers();
				vi.setSystemTime(new Date("2024-01-20T12:00:00.000Z"));

				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: "2024-01-15T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-16T10:00:00.000Z",
					completedAt: null, // missed
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-17T10:00:00.000Z",
					completedAt: null, // missed
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.totalRecurringCompleted).toBe(1);
				expect(result.totalRecurringMissed).toBe(2);

				vi.useRealTimers();
			});

			it("should not count future entries as missed", () => {
				// Mock "today" to be 2024-01-15
				vi.useFakeTimers();
				vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));

				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: null,
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-16T10:00:00.000Z",
					completedAt: null,
				}); // future - should not be counted as missed

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.totalRecurringMissed).toBe(0);

				vi.useRealTimers();
			});

			it("should exclude completion history outside date range", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2023-12-31T10:00:00.000Z",
					completedAt: "2023-12-31T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: "2024-01-15T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-02-01T10:00:00.000Z",
					completedAt: "2024-02-01T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.totalRecurringCompleted).toBe(1);
			});
		});

		describe("completion rate", () => {
			it("should calculate completion rate correctly", () => {
				// 3 regular completed, 1 recurring completed, 1 recurring missed
				const todos = [
					{
						id: "task-1",
						text: "Task 1",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
					},
					{
						id: "task-2",
						text: "Task 2",
						completed: true,
						folderId: null,
						dueDate: "2024-01-16T10:00:00.000Z",
					},
					{
						id: "task-3",
						text: "Task 3",
						completed: true,
						folderId: null,
						dueDate: "2024-01-17T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				vi.useFakeTimers();
				vi.setSystemTime(new Date("2024-01-20T12:00:00.000Z"));
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-18T10:00:00.000Z",
					completedAt: "2024-01-18T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-19T10:00:00.000Z",
					completedAt: null,
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				// (3 regular + 1 recurring completed) / (3 regular + 2 recurring expected) * 100
				// = 4 / 5 * 100 = 80%
				expect(result.completionRate).toBe(80);

				vi.useRealTimers();
			});

			it("should return 100% when no expected todos", () => {
				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.completionRate).toBe(100);
			});
		});

		describe("current streak", () => {
			it("should calculate streak from consecutive completion days", () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date("2024-01-20T12:00:00.000Z"));

				// Completions on consecutive days
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-20T10:00:00.000Z",
					completedAt: "2024-01-20T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-19T10:00:00.000Z",
					completedAt: "2024-01-19T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-18T10:00:00.000Z",
					completedAt: "2024-01-18T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.currentStreak).toBe(3);

				vi.useRealTimers();
			});

			it("should calculate streak from yesterday if no completion today", () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date("2024-01-20T12:00:00.000Z"));

				// No completion on Jan 20, but completions on previous days
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-19T10:00:00.000Z",
					completedAt: "2024-01-19T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-18T10:00:00.000Z",
					completedAt: "2024-01-18T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.currentStreak).toBe(2);

				vi.useRealTimers();
			});

			it("should break streak when there's a gap", () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date("2024-01-20T12:00:00.000Z"));

				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-20T10:00:00.000Z",
					completedAt: "2024-01-20T10:05:00.000Z",
				});
				// Gap on Jan 19
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "1",
					scheduledDate: "2024-01-18T10:00:00.000Z",
					completedAt: "2024-01-18T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.currentStreak).toBe(1);

				vi.useRealTimers();
			});

			it("should include regular todos in streak calculation", () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date("2024-01-20T12:00:00.000Z"));

				const todos = [
					{
						id: "task-1",
						text: "Task 1",
						completed: true,
						folderId: null,
						dueDate: "2024-01-20T10:00:00.000Z",
					},
					{
						id: "task-2",
						text: "Task 2",
						completed: true,
						folderId: null,
						dueDate: "2024-01-19T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.currentStreak).toBe(2);

				vi.useRealTimers();
			});

			it("should return 0 when no completions exist", () => {
				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				expect(result.currentStreak).toBe(0);
			});
		});

		describe("daily breakdown", () => {
			it("should create entries for all days in range", () => {
				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-05T23:59:59.000Z",
				);

				expect(result.dailyBreakdown).toHaveLength(5);
				expect(result.dailyBreakdown[0].date).toBe("2024-01-01");
				expect(result.dailyBreakdown[4].date).toBe("2024-01-05");
			});

			it("should count regular completions per day", () => {
				const todos = [
					{
						id: "task-1",
						text: "Task 1",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
					},
					{
						id: "task-2",
						text: "Task 2",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T14:00:00.000Z",
					},
					{
						id: "task-3",
						text: "Task 3",
						completed: true,
						folderId: null,
						dueDate: "2024-01-16T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				const jan15 = result.dailyBreakdown.find(
					(d) => d.date === "2024-01-15",
				);
				const jan16 = result.dailyBreakdown.find(
					(d) => d.date === "2024-01-16",
				);

				expect(jan15?.regularCompleted).toBe(2);
				expect(jan15?.recurringCompleted).toBe(0);
				expect(jan16?.regularCompleted).toBe(1);
			});

			it("should count recurring completions per day", () => {
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: "2024-01-15T10:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-15T14:00:00.000Z",
					completedAt: "2024-01-15T14:05:00.000Z",
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-16T10:00:00.000Z",
					completedAt: "2024-01-16T10:05:00.000Z",
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				const jan15 = result.dailyBreakdown.find(
					(d) => d.date === "2024-01-15",
				);
				const jan16 = result.dailyBreakdown.find(
					(d) => d.date === "2024-01-16",
				);

				expect(jan15?.recurringCompleted).toBe(2);
				expect(jan16?.recurringCompleted).toBe(1);
			});

			it("should count recurring misses per day", () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date("2024-01-20T12:00:00.000Z"));

				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: null,
				});
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-16T10:00:00.000Z",
					completedAt: null,
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				const jan15 = result.dailyBreakdown.find(
					(d) => d.date === "2024-01-15",
				);
				const jan16 = result.dailyBreakdown.find(
					(d) => d.date === "2024-01-16",
				);

				expect(jan15?.recurringMissed).toBe(1);
				expect(jan16?.recurringMissed).toBe(1);

				vi.useRealTimers();
			});

			it("should combine all counts per day", () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date("2024-01-20T12:00:00.000Z"));

				// Regular completed
				const todos = [
					{
						id: "task-1",
						text: "Regular task",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				// Recurring completed
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-15T14:00:00.000Z",
					completedAt: "2024-01-15T14:05:00.000Z",
				});

				// Recurring missed
				localTodoStorage.addCompletionHistoryEntry({
					todoId: "recurring-1",
					scheduledDate: "2024-01-15T16:00:00.000Z",
					completedAt: null,
				});

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				const jan15 = result.dailyBreakdown.find(
					(d) => d.date === "2024-01-15",
				);

				expect(jan15?.regularCompleted).toBe(1);
				expect(jan15?.recurringCompleted).toBe(1);
				expect(jan15?.recurringMissed).toBe(1);

				vi.useRealTimers();
			});

			it("should have zero values for days with no activity", () => {
				const todos = [
					{
						id: "task-1",
						text: "Task",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				const jan1 = result.dailyBreakdown.find((d) => d.date === "2024-01-01");
				const jan15 = result.dailyBreakdown.find(
					(d) => d.date === "2024-01-15",
				);

				expect(jan1?.regularCompleted).toBe(0);
				expect(jan1?.recurringCompleted).toBe(0);
				expect(jan1?.recurringMissed).toBe(0);
				expect(jan15?.regularCompleted).toBe(1);
			});

			it("should sort daily breakdown by date", () => {
				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-05T00:00:00.000Z",
					"2024-01-10T23:59:59.000Z",
				);

				const dates = result.dailyBreakdown.map((d) => d.date);
				expect(dates).toEqual([
					"2024-01-05",
					"2024-01-06",
					"2024-01-07",
					"2024-01-08",
					"2024-01-09",
					"2024-01-10",
				]);
			});
		});

		describe("edge cases", () => {
			it("should handle single day range", () => {
				const todos = [
					{
						id: "task-1",
						text: "Task",
						completed: true,
						folderId: null,
						dueDate: "2024-01-15T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-15T00:00:00.000Z",
					"2024-01-15T23:59:59.000Z",
				);

				expect(result.dailyBreakdown).toHaveLength(1);
				expect(result.dailyBreakdown[0].date).toBe("2024-01-15");
				expect(result.totalRegularCompleted).toBe(1);
			});

			it("should handle leap year in date range", () => {
				const result = localTodoStorage.getLocalAnalytics(
					"2024-02-01T00:00:00.000Z",
					"2024-03-01T23:59:59.000Z",
				);

				// February 2024 has 29 days (leap year)
				expect(result.dailyBreakdown.length).toBeGreaterThan(28);
				const feb29 = result.dailyBreakdown.find(
					(d) => d.date === "2024-02-29",
				);
				expect(feb29).toBeDefined();
			});

			it("should handle cross-month range", () => {
				const todos = [
					{
						id: "task-1",
						text: "Task",
						completed: true,
						folderId: null,
						dueDate: "2024-01-31T10:00:00.000Z",
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-02-29T23:59:59.000Z",
				);

				expect(result.dailyBreakdown[0].date).toBe("2024-01-01");
				const lastDay = result.dailyBreakdown[result.dailyBreakdown.length - 1];
				expect(lastDay.date).toBe("2024-02-29");
			});

			it("should handle todos without dueDate for regular count", () => {
				const todos = [
					{
						id: "task-1",
						text: "Task without due date",
						completed: true,
						folderId: null,
					},
				];
				localStorageMock.setItem("todos", JSON.stringify(todos));

				const result = localTodoStorage.getLocalAnalytics(
					"2024-01-01T00:00:00.000Z",
					"2024-01-31T23:59:59.000Z",
				);

				// Regular todos without dueDate should not be counted in analytics
				expect(result.totalRegularCompleted).toBe(0);
			});
		});
	});

	describe("toggleLocalOccurrence", () => {
		const COMPLETION_HISTORY_KEY = "completion_history";

		it("should mark a past occurrence as completed", () => {
			const scheduledDate = "2024-01-15T10:00:00.000Z";
			const history = [
				{
					todoId: "todo-1",
					scheduledDate,
					completedAt: null,
				},
			];
			localStorageMock.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(history));

			const result = localTodoStorage.toggleLocalOccurrence(
				"todo-1",
				scheduledDate,
				true,
			);

			expect(result).not.toBeNull();
			expect(result?.todoId).toBe("todo-1");
			expect(result?.scheduledDate).toBe(scheduledDate);
			expect(result?.completedAt).not.toBeNull();

			const stored = JSON.parse(
				localStorageMock._store[COMPLETION_HISTORY_KEY] ?? "[]",
			);
			expect(stored[0].completedAt).not.toBeNull();
		});

		it("should mark a completed occurrence as uncompleted", () => {
			const scheduledDate = "2024-01-15T10:00:00.000Z";
			const completedAt = "2024-01-15T10:05:00.000Z";
			const history = [
				{
					todoId: "todo-1",
					scheduledDate,
					completedAt,
				},
			];
			localStorageMock.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(history));

			const result = localTodoStorage.toggleLocalOccurrence(
				"todo-1",
				scheduledDate,
				false,
			);

			expect(result).not.toBeNull();
			expect(result?.todoId).toBe("todo-1");
			expect(result?.scheduledDate).toBe(scheduledDate);
			expect(result?.completedAt).toBeNull();

			const stored = JSON.parse(
				localStorageMock._store[COMPLETION_HISTORY_KEY] ?? "[]",
			);
			expect(stored[0].completedAt).toBeNull();
		});

		it("should return null when entry does not exist", () => {
			const result = localTodoStorage.toggleLocalOccurrence(
				"non-existent",
				"2024-01-15T10:00:00.000Z",
				true,
			);

			expect(result).toBeNull();
		});

		it("should only update the matching entry by todoId and scheduledDate", () => {
			const history = [
				{
					todoId: "todo-1",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: null,
				},
				{
					todoId: "todo-1",
					scheduledDate: "2024-01-16T10:00:00.000Z",
					completedAt: null,
				},
				{
					todoId: "todo-2",
					scheduledDate: "2024-01-15T10:00:00.000Z",
					completedAt: null,
				},
			];
			localStorageMock.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(history));

			const result = localTodoStorage.toggleLocalOccurrence(
				"todo-1",
				"2024-01-15T10:00:00.000Z",
				true,
			);

			expect(result).not.toBeNull();
			expect(result?.todoId).toBe("todo-1");
			expect(result?.scheduledDate).toBe("2024-01-15T10:00:00.000Z");

			const stored = JSON.parse(
				localStorageMock._store[COMPLETION_HISTORY_KEY] ?? "[]",
			);
			expect(stored[0].completedAt).not.toBeNull(); // First entry updated
			expect(stored[1].completedAt).toBeNull(); // Second entry unchanged
			expect(stored[2].completedAt).toBeNull(); // Third entry unchanged
		});

		it("should set completedAt to current timestamp when marking completed", () => {
			const scheduledDate = "2024-01-15T10:00:00.000Z";
			const history = [
				{
					todoId: "todo-1",
					scheduledDate,
					completedAt: null,
				},
			];
			localStorageMock.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(history));

			const beforeTime = Date.now();
			const result = localTodoStorage.toggleLocalOccurrence(
				"todo-1",
				scheduledDate,
				true,
			);
			const afterTime = Date.now();

			expect(result).not.toBeNull();
			if (result?.completedAt) {
				const completedAtTime = new Date(result.completedAt).getTime();
				expect(completedAtTime).toBeGreaterThanOrEqual(beforeTime);
				expect(completedAtTime).toBeLessThanOrEqual(afterTime);
			}
		});
	});
});
