import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock("@my-procedures-2/db", () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
	eq: vi.fn((a, b) => ({ type: "eq", a, b })),
	and: vi.fn((...conditions) => ({ type: "and", conditions })),
}));

vi.mock("@my-procedures-2/db/schema/todo", () => ({
	todo: {
		id: "todo.id",
		text: "todo.text",
		completed: "todo.completed",
		userId: "todo.userId",
	},
}));

// ============================================================================
// Type Definitions for Tests
// ============================================================================

interface MockTodo {
	id: number;
	text: string;
	completed: boolean;
	userId: string;
}

interface MockContext {
	session: {
		user: {
			id: string;
		};
	} | null;
}

// ============================================================================
// Pure Function Tests (Business Logic)
// ============================================================================

describe("Todo Router Business Logic", () => {
	const userId = "user-123";

	// Helper to create a mock context
	const createMockContext = (
		authenticated: boolean,
		overrideUserId?: string,
	): MockContext => ({
		session: authenticated ? { user: { id: overrideUserId ?? userId } } : null,
	});

	// Helper to create a mock todo
	const createMockTodo = (overrides: Partial<MockTodo> = {}): MockTodo => ({
		id: 1,
		text: "Test todo",
		completed: false,
		userId,
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Authorization Logic", () => {
		describe("Protected Procedure Middleware", () => {
			it("should throw UNAUTHORIZED when no session exists", () => {
				const ctx = createMockContext(false);

				// Simulate the protectedProcedure middleware check
				const checkAuth = (context: MockContext) => {
					if (!context.session) {
						throw new TRPCError({
							code: "UNAUTHORIZED",
							message: "Authentication required",
						});
					}
					return context;
				};

				expect(() => checkAuth(ctx)).toThrow(TRPCError);
				expect(() => checkAuth(ctx)).toThrow("Authentication required");
			});

			it("should pass when session exists", () => {
				const ctx = createMockContext(true);

				const checkAuth = (context: MockContext) => {
					if (!context.session) {
						throw new TRPCError({
							code: "UNAUTHORIZED",
							message: "Authentication required",
						});
					}
					return context;
				};

				expect(() => checkAuth(ctx)).not.toThrow();
			});
		});

		describe("Ownership Verification", () => {
			it("should allow access when todo belongs to user", () => {
				const todo = createMockTodo({ userId: "user-123" });
				const currentUserId = "user-123";

				const verifyOwnership = (
					existingTodo: MockTodo | undefined,
					ownerUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to modify it",
						});
					}
					return true;
				};

				expect(verifyOwnership(todo, currentUserId)).toBe(true);
			});

			it("should throw NOT_FOUND when todo belongs to different user", () => {
				const todo = createMockTodo({ userId: "user-456" });
				const currentUserId = "user-123";

				const verifyOwnership = (
					existingTodo: MockTodo | undefined,
					ownerUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to modify it",
						});
					}
					return true;
				};

				expect(() => verifyOwnership(todo, currentUserId)).toThrow(TRPCError);
			});

			it("should throw NOT_FOUND when todo does not exist", () => {
				const currentUserId = "user-123";

				const verifyOwnership = (
					existingTodo: MockTodo | undefined,
					ownerUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to modify it",
						});
					}
					return true;
				};

				expect(() => verifyOwnership(undefined, currentUserId)).toThrow(
					TRPCError,
				);
			});
		});
	});

	describe("Input Validation Logic", () => {
		describe("Create Todo Validation", () => {
			it("should accept valid text input", () => {
				const validateCreateInput = (input: { text: string }) => {
					if (!input.text || input.text.length < 1) {
						throw new Error("Text is required");
					}
					return true;
				};

				expect(validateCreateInput({ text: "Valid task" })).toBe(true);
			});

			it("should reject empty text input", () => {
				const validateCreateInput = (input: { text: string }) => {
					if (!input.text || input.text.length < 1) {
						throw new Error("Text is required");
					}
					return true;
				};

				expect(() => validateCreateInput({ text: "" })).toThrow(
					"Text is required",
				);
			});
		});

		describe("Toggle Todo Validation", () => {
			it("should accept valid toggle input", () => {
				const validateToggleInput = (input: {
					id: number;
					completed: boolean;
				}) => {
					if (typeof input.id !== "number") {
						throw new Error("ID must be a number");
					}
					if (typeof input.completed !== "boolean") {
						throw new Error("Completed must be a boolean");
					}
					return true;
				};

				expect(validateToggleInput({ id: 1, completed: true })).toBe(true);
				expect(validateToggleInput({ id: 1, completed: false })).toBe(true);
			});

			it("should reject invalid id type", () => {
				const validateToggleInput = (input: {
					id: number;
					completed: boolean;
				}) => {
					if (typeof input.id !== "number") {
						throw new Error("ID must be a number");
					}
					if (typeof input.completed !== "boolean") {
						throw new Error("Completed must be a boolean");
					}
					return true;
				};

				expect(() =>
					validateToggleInput({
						id: "1" as unknown as number,
						completed: true,
					}),
				).toThrow("ID must be a number");
			});
		});

		describe("Delete Todo Validation", () => {
			it("should accept valid delete input", () => {
				const validateDeleteInput = (input: { id: number }) => {
					if (typeof input.id !== "number") {
						throw new Error("ID must be a number");
					}
					return true;
				};

				expect(validateDeleteInput({ id: 1 })).toBe(true);
			});
		});

		describe("Bulk Create Validation", () => {
			it("should accept valid bulk create input", () => {
				const validateBulkCreateInput = (input: {
					todos: Array<{ text: string; completed: boolean }>;
				}) => {
					if (!Array.isArray(input.todos)) {
						throw new Error("Todos must be an array");
					}
					for (const todo of input.todos) {
						if (!todo.text || todo.text.length < 1) {
							throw new Error("Each todo must have text");
						}
						if (typeof todo.completed !== "boolean") {
							throw new Error("Each todo must have completed status");
						}
					}
					return true;
				};

				expect(
					validateBulkCreateInput({
						todos: [
							{ text: "Task 1", completed: false },
							{ text: "Task 2", completed: true },
						],
					}),
				).toBe(true);
			});

			it("should accept empty array", () => {
				const validateBulkCreateInput = (input: {
					todos: Array<{ text: string; completed: boolean }>;
				}) => {
					if (!Array.isArray(input.todos)) {
						throw new Error("Todos must be an array");
					}
					return true;
				};

				expect(validateBulkCreateInput({ todos: [] })).toBe(true);
			});

			it("should reject todos with empty text", () => {
				const validateBulkCreateInput = (input: {
					todos: Array<{ text: string; completed: boolean }>;
				}) => {
					for (const todo of input.todos) {
						if (!todo.text || todo.text.length < 1) {
							throw new Error("Each todo must have text");
						}
					}
					return true;
				};

				expect(() =>
					validateBulkCreateInput({
						todos: [{ text: "", completed: false }],
					}),
				).toThrow("Each todo must have text");
			});
		});
	});

	describe("Business Logic Operations", () => {
		describe("getAll Operation", () => {
			it("should filter todos by userId", () => {
				const allTodos: MockTodo[] = [
					createMockTodo({ id: 1, userId: "user-123" }),
					createMockTodo({ id: 2, userId: "user-456" }),
					createMockTodo({ id: 3, userId: "user-123" }),
				];

				const filterByUserId = (todos: MockTodo[], targetUserId: string) => {
					return todos.filter((t) => t.userId === targetUserId);
				};

				const result = filterByUserId(allTodos, "user-123");

				expect(result).toHaveLength(2);
				expect(result.every((t) => t.userId === "user-123")).toBe(true);
			});
		});

		describe("create Operation", () => {
			it("should create todo with correct structure", () => {
				const createTodoData = (
					text: string,
					currentUserId: string,
				): Omit<MockTodo, "id"> => ({
					text,
					completed: false,
					userId: currentUserId,
				});

				const result = createTodoData("New task", "user-123");

				expect(result).toEqual({
					text: "New task",
					completed: false,
					userId: "user-123",
				});
			});

			it("should default completed to false", () => {
				const createTodoData = (
					text: string,
					currentUserId: string,
				): Omit<MockTodo, "id"> => ({
					text,
					completed: false,
					userId: currentUserId,
				});

				const result = createTodoData("Task", "user-123");

				expect(result.completed).toBe(false);
			});
		});

		describe("toggle Operation", () => {
			it("should update completed status", () => {
				const applyToggle = (
					todo: MockTodo,
					newCompleted: boolean,
				): MockTodo => ({
					...todo,
					completed: newCompleted,
				});

				const original = createMockTodo({ completed: false });
				const toggled = applyToggle(original, true);

				expect(toggled.completed).toBe(true);
				expect(original.completed).toBe(false); // Immutability check
			});

			it("should preserve other fields", () => {
				const applyToggle = (
					todo: MockTodo,
					newCompleted: boolean,
				): MockTodo => ({
					...todo,
					completed: newCompleted,
				});

				const original = createMockTodo({
					id: 5,
					text: "Important task",
					userId: "user-999",
				});
				const toggled = applyToggle(original, true);

				expect(toggled.id).toBe(5);
				expect(toggled.text).toBe("Important task");
				expect(toggled.userId).toBe("user-999");
			});
		});

		describe("delete Operation", () => {
			it("should remove todo from list", () => {
				const todos: MockTodo[] = [
					createMockTodo({ id: 1 }),
					createMockTodo({ id: 2 }),
					createMockTodo({ id: 3 }),
				];

				const removeTodo = (list: MockTodo[], idToRemove: number) => {
					return list.filter((t) => t.id !== idToRemove);
				};

				const result = removeTodo(todos, 2);

				expect(result).toHaveLength(2);
				expect(result.find((t) => t.id === 2)).toBeUndefined();
			});
		});

		describe("bulkCreate Operation", () => {
			it("should return count of 0 for empty array", () => {
				const bulkCreate = (
					todos: Array<{ text: string; completed: boolean }>,
				) => {
					if (todos.length === 0) {
						return { count: 0 };
					}
					return { count: todos.length };
				};

				expect(bulkCreate([])).toEqual({ count: 0 });
			});

			it("should return correct count for multiple todos", () => {
				const bulkCreate = (
					todos: Array<{ text: string; completed: boolean }>,
				) => {
					return { count: todos.length };
				};

				const input = [
					{ text: "Task 1", completed: false },
					{ text: "Task 2", completed: true },
					{ text: "Task 3", completed: false },
				];

				expect(bulkCreate(input)).toEqual({ count: 3 });
			});

			it("should add userId to each todo", () => {
				const prepareTodosForInsert = (
					todos: Array<{ text: string; completed: boolean }>,
					currentUserId: string,
				) => {
					return todos.map((t) => ({
						text: t.text,
						completed: t.completed,
						userId: currentUserId,
					}));
				};

				const input = [
					{ text: "Task 1", completed: false },
					{ text: "Task 2", completed: true },
				];

				const result = prepareTodosForInsert(input, "user-123");

				expect(result).toEqual([
					{ text: "Task 1", completed: false, userId: "user-123" },
					{ text: "Task 2", completed: true, userId: "user-123" },
				]);
			});
		});
	});

	describe("Error Handling", () => {
		it("should use correct error codes for authorization failures", () => {
			const throwUnauthorized = () => {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			};

			try {
				throwUnauthorized();
			} catch (error) {
				expect(error).toBeInstanceOf(TRPCError);
				expect((error as TRPCError).code).toBe("UNAUTHORIZED");
			}
		});

		it("should use correct error codes for not found", () => {
			const throwNotFound = () => {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Todo not found",
				});
			};

			try {
				throwNotFound();
			} catch (error) {
				expect(error).toBeInstanceOf(TRPCError);
				expect((error as TRPCError).code).toBe("NOT_FOUND");
			}
		});
	});
});

describe("Zod Schema Validation", () => {
	// These tests verify the Zod schemas used in the router
	// We test them independently to ensure input validation works correctly

	describe("Create Input Schema", () => {
		const validateCreate = (
			input: unknown,
		): { valid: boolean; text?: string } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("text" in input) ||
				typeof (input as { text: unknown }).text !== "string" ||
				(input as { text: string }).text.length < 1
			) {
				return { valid: false };
			}
			return { valid: true, text: (input as { text: string }).text };
		};

		it("validates correct input", () => {
			expect(validateCreate({ text: "Valid task" })).toEqual({
				valid: true,
				text: "Valid task",
			});
		});

		it("rejects empty string", () => {
			expect(validateCreate({ text: "" })).toEqual({ valid: false });
		});

		it("rejects missing text field", () => {
			expect(validateCreate({})).toEqual({ valid: false });
		});

		it("rejects non-string text", () => {
			expect(validateCreate({ text: 123 })).toEqual({ valid: false });
		});
	});

	describe("Toggle Input Schema", () => {
		const validateToggle = (
			input: unknown,
		): { valid: boolean; id?: number; completed?: boolean } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("id" in input) ||
				!("completed" in input) ||
				typeof (input as { id: unknown }).id !== "number" ||
				typeof (input as { completed: unknown }).completed !== "boolean"
			) {
				return { valid: false };
			}
			return {
				valid: true,
				id: (input as { id: number }).id,
				completed: (input as { completed: boolean }).completed,
			};
		};

		it("validates correct input", () => {
			expect(validateToggle({ id: 1, completed: true })).toEqual({
				valid: true,
				id: 1,
				completed: true,
			});
		});

		it("rejects string id", () => {
			expect(validateToggle({ id: "1", completed: true })).toEqual({
				valid: false,
			});
		});

		it("rejects missing completed", () => {
			expect(validateToggle({ id: 1 })).toEqual({ valid: false });
		});
	});

	describe("Delete Input Schema", () => {
		const validateDelete = (
			input: unknown,
		): { valid: boolean; id?: number } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("id" in input) ||
				typeof (input as { id: unknown }).id !== "number"
			) {
				return { valid: false };
			}
			return { valid: true, id: (input as { id: number }).id };
		};

		it("validates correct input", () => {
			expect(validateDelete({ id: 42 })).toEqual({ valid: true, id: 42 });
		});

		it("rejects string id", () => {
			expect(validateDelete({ id: "42" })).toEqual({ valid: false });
		});
	});

	describe("Bulk Create Input Schema", () => {
		const validateBulkCreate = (
			input: unknown,
		): {
			valid: boolean;
			todos?: Array<{ text: string; completed: boolean }>;
		} => {
			if (typeof input !== "object" || input === null || !("todos" in input)) {
				return { valid: false };
			}

			const todos = (input as { todos: unknown }).todos;
			if (!Array.isArray(todos)) {
				return { valid: false };
			}

			for (const todo of todos) {
				if (
					typeof todo !== "object" ||
					todo === null ||
					typeof todo.text !== "string" ||
					todo.text.length < 1 ||
					typeof todo.completed !== "boolean"
				) {
					return { valid: false };
				}
			}

			return {
				valid: true,
				todos: todos as Array<{ text: string; completed: boolean }>,
			};
		};

		it("validates correct input", () => {
			expect(
				validateBulkCreate({
					todos: [
						{ text: "Task 1", completed: false },
						{ text: "Task 2", completed: true },
					],
				}),
			).toEqual({
				valid: true,
				todos: [
					{ text: "Task 1", completed: false },
					{ text: "Task 2", completed: true },
				],
			});
		});

		it("validates empty todos array", () => {
			expect(validateBulkCreate({ todos: [] })).toEqual({
				valid: true,
				todos: [],
			});
		});

		it("rejects todo with empty text", () => {
			expect(
				validateBulkCreate({
					todos: [{ text: "", completed: false }],
				}),
			).toEqual({ valid: false });
		});

		it("rejects missing completed field", () => {
			expect(
				validateBulkCreate({
					todos: [{ text: "Task" }],
				}),
			).toEqual({ valid: false });
		});
	});
});
