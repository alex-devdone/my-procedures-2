import { describe, expect, it } from "vitest";
import type { LocalTodo, RemoteTodo, Todo } from "./todo.types";
import {
	applyOptimisticCreate,
	applyOptimisticDelete,
	applyOptimisticToggle,
	calculateTodoStats,
	createOptimisticTodo,
	filterTodos,
	filterTodosBySearch,
	filterTodosByStatus,
	getMotivationMessage,
	getRecentTodos,
	getTimeBasedGreeting,
	hasLocalTodosToSync,
	normalizeLocalTodo,
	normalizeLocalTodos,
	normalizeRemoteTodo,
	normalizeRemoteTodos,
	prepareTodosForSync,
} from "./todo.utils";

describe("Todo Statistics", () => {
	describe("calculateTodoStats", () => {
		it("calculates correct stats for mixed todos", () => {
			const todos: Todo[] = [
				{ id: 1, text: "Task 1", completed: true },
				{ id: 2, text: "Task 2", completed: false },
				{ id: 3, text: "Task 3", completed: true },
				{ id: 4, text: "Task 4", completed: false },
			];

			const stats = calculateTodoStats(todos);

			expect(stats.total).toBe(4);
			expect(stats.completed).toBe(2);
			expect(stats.active).toBe(2);
			expect(stats.completionRate).toBe(50);
		});

		it("handles empty todo list", () => {
			const stats = calculateTodoStats([]);

			expect(stats.total).toBe(0);
			expect(stats.completed).toBe(0);
			expect(stats.active).toBe(0);
			expect(stats.completionRate).toBe(0);
		});

		it("calculates 100% completion rate when all done", () => {
			const todos: Todo[] = [
				{ id: 1, text: "Task 1", completed: true },
				{ id: 2, text: "Task 2", completed: true },
			];

			const stats = calculateTodoStats(todos);

			expect(stats.completionRate).toBe(100);
		});

		it("rounds completion rate to nearest integer", () => {
			const todos: Todo[] = [
				{ id: 1, text: "Task 1", completed: true },
				{ id: 2, text: "Task 2", completed: false },
				{ id: 3, text: "Task 3", completed: false },
			];

			const stats = calculateTodoStats(todos);

			expect(stats.completionRate).toBe(33); // 33.33% rounded
		});
	});
});

describe("Filtering Functions", () => {
	const testTodos: Todo[] = [
		{ id: 1, text: "Buy groceries", completed: false },
		{ id: 2, text: "Walk the dog", completed: true },
		{ id: 3, text: "Finish report", completed: false },
		{ id: 4, text: "Call mom", completed: true },
	];

	describe("filterTodosByStatus", () => {
		it('returns all todos when filter is "all"', () => {
			const result = filterTodosByStatus(testTodos, "all");
			expect(result).toHaveLength(4);
		});

		it('returns only active todos when filter is "active"', () => {
			const result = filterTodosByStatus(testTodos, "active");
			expect(result).toHaveLength(2);
			expect(result.every((t) => !t.completed)).toBe(true);
		});

		it('returns only completed todos when filter is "completed"', () => {
			const result = filterTodosByStatus(testTodos, "completed");
			expect(result).toHaveLength(2);
			expect(result.every((t) => t.completed)).toBe(true);
		});
	});

	describe("filterTodosBySearch", () => {
		it("returns all todos when query is empty", () => {
			const result = filterTodosBySearch(testTodos, "");
			expect(result).toHaveLength(4);
		});

		it("returns all todos when query is whitespace", () => {
			const result = filterTodosBySearch(testTodos, "   ");
			expect(result).toHaveLength(4);
		});

		it("filters todos by case-insensitive search", () => {
			const result = filterTodosBySearch(testTodos, "buy");
			expect(result).toHaveLength(1);
			expect(result[0].text).toBe("Buy groceries");
		});

		it("matches partial text", () => {
			const result = filterTodosBySearch(testTodos, "the");
			expect(result).toHaveLength(1);
			expect(result[0].text).toBe("Walk the dog");
		});

		it("returns empty array when no match", () => {
			const result = filterTodosBySearch(testTodos, "xyz");
			expect(result).toHaveLength(0);
		});
	});

	describe("filterTodos", () => {
		it("combines status and search filters", () => {
			const result = filterTodos(testTodos, "active", "groceries");
			expect(result).toHaveLength(1);
			expect(result[0].text).toBe("Buy groceries");
		});

		it("returns empty when status matches but search does not", () => {
			const result = filterTodos(testTodos, "completed", "groceries");
			expect(result).toHaveLength(0);
		});
	});

	describe("getRecentTodos", () => {
		it("returns first N todos", () => {
			const result = getRecentTodos(testTodos, 2);
			expect(result).toHaveLength(2);
			expect(result[0].text).toBe("Buy groceries");
			expect(result[1].text).toBe("Walk the dog");
		});

		it("returns all todos when count exceeds length", () => {
			const result = getRecentTodos(testTodos, 10);
			expect(result).toHaveLength(4);
		});

		it("returns empty array when count is 0", () => {
			const result = getRecentTodos(testTodos, 0);
			expect(result).toHaveLength(0);
		});
	});
});

describe("Todo Normalization", () => {
	describe("normalizeRemoteTodo", () => {
		it("normalizes remote todo to unified type", () => {
			const remoteTodo: RemoteTodo = {
				id: 1,
				text: "Test",
				completed: false,
				userId: "user-123",
				folderId: null,
				dueDate: null,
				reminderAt: null,
				recurringPattern: null,
				googleSyncEnabled: false,
				googleTaskId: null,
				lastSyncedAt: null,
			};

			const result = normalizeRemoteTodo(remoteTodo);

			expect(result).toEqual({
				id: 1,
				text: "Test",
				completed: false,
			});
			expect(result).not.toHaveProperty("userId");
		});
	});

	describe("normalizeRemoteTodos", () => {
		it("normalizes array of remote todos", () => {
			const remoteTodos: RemoteTodo[] = [
				{
					id: 1,
					text: "Task 1",
					completed: false,
					userId: "user-1",
					folderId: null,
					dueDate: null,
					reminderAt: null,
					recurringPattern: null,
					googleSyncEnabled: false,
					googleTaskId: null,
					lastSyncedAt: null,
				},
				{
					id: 2,
					text: "Task 2",
					completed: true,
					userId: "user-1",
					folderId: null,
					dueDate: null,
					reminderAt: null,
					recurringPattern: null,
					googleSyncEnabled: false,
					googleTaskId: null,
					lastSyncedAt: null,
				},
			];

			const result = normalizeRemoteTodos(remoteTodos);

			expect(result).toHaveLength(2);
			expect(result[0]).not.toHaveProperty("userId");
			expect(result[1]).not.toHaveProperty("userId");
		});
	});

	describe("normalizeLocalTodo", () => {
		it("normalizes local todo to unified type", () => {
			const localTodo: LocalTodo = {
				id: "uuid-123",
				text: "Test",
				completed: true,
			};

			const result = normalizeLocalTodo(localTodo);

			expect(result).toEqual({
				id: "uuid-123",
				text: "Test",
				completed: true,
			});
		});
	});

	describe("normalizeLocalTodos", () => {
		it("normalizes array of local todos", () => {
			const localTodos: LocalTodo[] = [
				{ id: "uuid-1", text: "Task 1", completed: false },
				{ id: "uuid-2", text: "Task 2", completed: true },
			];

			const result = normalizeLocalTodos(localTodos);

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe("uuid-1");
			expect(result[1].id).toBe("uuid-2");
		});
	});
});

describe("Local Storage Sync Logic", () => {
	describe("prepareTodosForSync", () => {
		it("prepares local todos for server sync", () => {
			const localTodos: LocalTodo[] = [
				{ id: "uuid-1", text: "Task 1", completed: false },
				{ id: "uuid-2", text: "Task 2", completed: true },
			];

			const result = prepareTodosForSync(localTodos);

			expect(result).toEqual([
				{ text: "Task 1", completed: false },
				{ text: "Task 2", completed: true },
			]);
			expect(result[0]).not.toHaveProperty("id");
		});
	});

	describe("hasLocalTodosToSync", () => {
		it("returns true when there are local todos", () => {
			const localTodos: LocalTodo[] = [
				{ id: "uuid-1", text: "Task 1", completed: false },
			];

			expect(hasLocalTodosToSync(localTodos)).toBe(true);
		});

		it("returns false when there are no local todos", () => {
			expect(hasLocalTodosToSync([])).toBe(false);
		});
	});
});

describe("Optimistic Update Helpers", () => {
	const baseTodos: RemoteTodo[] = [
		{
			id: 1,
			text: "Task 1",
			completed: false,
			userId: "user-1",
			folderId: null,
			dueDate: null,
			reminderAt: null,
			recurringPattern: null,
			googleSyncEnabled: false,
			googleTaskId: null,
			lastSyncedAt: null,
		},
		{
			id: 2,
			text: "Task 2",
			completed: true,
			userId: "user-1",
			folderId: null,
			dueDate: null,
			reminderAt: null,
			recurringPattern: null,
			googleSyncEnabled: false,
			googleTaskId: null,
			lastSyncedAt: null,
		},
	];

	describe("createOptimisticTodo", () => {
		it("creates a todo with negative ID", () => {
			const result = createOptimisticTodo("New Task", "user-123");

			expect(result.id).toBeLessThan(0);
			expect(result.text).toBe("New Task");
			expect(result.completed).toBe(false);
			expect(result.userId).toBe("user-123");
		});
	});

	describe("applyOptimisticCreate", () => {
		it("adds new todo to the end of list", () => {
			const newTodo: RemoteTodo = {
				id: -1,
				text: "New Task",
				completed: false,
				userId: "user-1",
				folderId: null,
				dueDate: null,
				reminderAt: null,
				recurringPattern: null,
				googleSyncEnabled: false,
				googleTaskId: null,
				lastSyncedAt: null,
			};

			const result = applyOptimisticCreate(baseTodos, newTodo);

			expect(result).toHaveLength(3);
			expect(result[2].text).toBe("New Task");
		});

		it("does not mutate original array", () => {
			const newTodo: RemoteTodo = {
				id: -1,
				text: "New",
				completed: false,
				userId: "user-1",
				folderId: null,
				dueDate: null,
				reminderAt: null,
				recurringPattern: null,
				googleSyncEnabled: false,
				googleTaskId: null,
				lastSyncedAt: null,
			};

			applyOptimisticCreate(baseTodos, newTodo);

			expect(baseTodos).toHaveLength(2);
		});
	});

	describe("applyOptimisticToggle", () => {
		it("toggles completed status of matching todo", () => {
			const result = applyOptimisticToggle(baseTodos, 1, true);

			expect(result[0].completed).toBe(true);
			expect(result[1].completed).toBe(true); // unchanged
		});

		it("does not mutate original array", () => {
			applyOptimisticToggle(baseTodos, 1, true);

			expect(baseTodos[0].completed).toBe(false);
		});

		it("returns unchanged array if id not found", () => {
			const result = applyOptimisticToggle(baseTodos, 999, true);

			expect(result).toEqual(baseTodos);
		});
	});

	describe("applyOptimisticDelete", () => {
		it("removes todo with matching id", () => {
			const result = applyOptimisticDelete(baseTodos, 1);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(2);
		});

		it("does not mutate original array", () => {
			applyOptimisticDelete(baseTodos, 1);

			expect(baseTodos).toHaveLength(2);
		});

		it("returns unchanged array if id not found", () => {
			const result = applyOptimisticDelete(baseTodos, 999);

			expect(result).toHaveLength(2);
		});
	});
});

describe("Greeting Helper", () => {
	describe("getTimeBasedGreeting", () => {
		it("returns morning greeting for hours 0-11", () => {
			expect(getTimeBasedGreeting(0)).toBe("Good morning");
			expect(getTimeBasedGreeting(6)).toBe("Good morning");
			expect(getTimeBasedGreeting(11)).toBe("Good morning");
		});

		it("returns afternoon greeting for hours 12-17", () => {
			expect(getTimeBasedGreeting(12)).toBe("Good afternoon");
			expect(getTimeBasedGreeting(15)).toBe("Good afternoon");
			expect(getTimeBasedGreeting(17)).toBe("Good afternoon");
		});

		it("returns evening greeting for hours 18-23", () => {
			expect(getTimeBasedGreeting(18)).toBe("Good evening");
			expect(getTimeBasedGreeting(21)).toBe("Good evening");
			expect(getTimeBasedGreeting(23)).toBe("Good evening");
		});
	});
});

describe("Motivation Messages", () => {
	describe("getMotivationMessage", () => {
		it("returns high achievement message for 80%+ completion", () => {
			const result = getMotivationMessage(80, 1);
			expect(result).toContain("crushing");
		});

		it("returns encouraging message for 50-79% completion", () => {
			const result = getMotivationMessage(50, 2);
			expect(result).toContain("momentum");
		});

		it("returns progress message when under 50% with pending tasks", () => {
			const result = getMotivationMessage(30, 5);
			expect(result).toContain("step forward");
		});

		it("returns starter message when no pending tasks and low completion", () => {
			const result = getMotivationMessage(0, 0);
			expect(result).toContain("first task");
		});
	});
});
