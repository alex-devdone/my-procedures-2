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
});
