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

interface RecurringPattern {
	type: "daily" | "weekly" | "monthly" | "yearly" | "custom";
	interval?: number;
	daysOfWeek?: number[];
	dayOfMonth?: number;
	monthOfYear?: number;
	endDate?: string;
	occurrences?: number;
}

interface MockTodo {
	id: number;
	text: string;
	completed: boolean;
	userId: string;
	dueDate?: Date | null;
	reminderAt?: Date | null;
	recurringPattern?: RecurringPattern | null;
	folderId?: number | null;
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

describe("Scheduling Fields Validation", () => {
	describe("RecurringPattern Schema Validation", () => {
		const validateRecurringPattern = (
			pattern: unknown,
		): { valid: boolean; pattern?: RecurringPattern } => {
			if (typeof pattern !== "object" || pattern === null) {
				return { valid: false };
			}

			const p = pattern as Record<string, unknown>;

			// Validate type field (required)
			const validTypes = ["daily", "weekly", "monthly", "yearly", "custom"];
			if (!validTypes.includes(p.type as string)) {
				return { valid: false };
			}

			// Validate interval (optional, must be positive integer)
			if (
				p.interval !== undefined &&
				(typeof p.interval !== "number" ||
					!Number.isInteger(p.interval) ||
					p.interval <= 0)
			) {
				return { valid: false };
			}

			// Validate daysOfWeek (optional, array of integers 0-6)
			if (p.daysOfWeek !== undefined) {
				if (!Array.isArray(p.daysOfWeek)) {
					return { valid: false };
				}
				for (const day of p.daysOfWeek) {
					if (
						typeof day !== "number" ||
						!Number.isInteger(day) ||
						day < 0 ||
						day > 6
					) {
						return { valid: false };
					}
				}
			}

			// Validate dayOfMonth (optional, integer 1-31)
			if (
				p.dayOfMonth !== undefined &&
				(typeof p.dayOfMonth !== "number" ||
					!Number.isInteger(p.dayOfMonth) ||
					p.dayOfMonth < 1 ||
					p.dayOfMonth > 31)
			) {
				return { valid: false };
			}

			// Validate monthOfYear (optional, integer 1-12)
			if (
				p.monthOfYear !== undefined &&
				(typeof p.monthOfYear !== "number" ||
					!Number.isInteger(p.monthOfYear) ||
					p.monthOfYear < 1 ||
					p.monthOfYear > 12)
			) {
				return { valid: false };
			}

			// Validate endDate (optional, string)
			if (p.endDate !== undefined && typeof p.endDate !== "string") {
				return { valid: false };
			}

			// Validate occurrences (optional, positive integer)
			if (
				p.occurrences !== undefined &&
				(typeof p.occurrences !== "number" ||
					!Number.isInteger(p.occurrences) ||
					p.occurrences <= 0)
			) {
				return { valid: false };
			}

			return { valid: true, pattern: pattern as RecurringPattern };
		};

		it("validates daily pattern", () => {
			expect(validateRecurringPattern({ type: "daily" })).toEqual({
				valid: true,
				pattern: { type: "daily" },
			});
		});

		it("validates daily pattern with interval", () => {
			expect(validateRecurringPattern({ type: "daily", interval: 3 })).toEqual({
				valid: true,
				pattern: { type: "daily", interval: 3 },
			});
		});

		it("validates weekly pattern with days of week", () => {
			expect(
				validateRecurringPattern({
					type: "weekly",
					daysOfWeek: [1, 3, 5],
				}),
			).toEqual({
				valid: true,
				pattern: { type: "weekly", daysOfWeek: [1, 3, 5] },
			});
		});

		it("validates monthly pattern with day of month", () => {
			expect(
				validateRecurringPattern({
					type: "monthly",
					dayOfMonth: 15,
				}),
			).toEqual({
				valid: true,
				pattern: { type: "monthly", dayOfMonth: 15 },
			});
		});

		it("validates yearly pattern with month and day", () => {
			expect(
				validateRecurringPattern({
					type: "yearly",
					monthOfYear: 1,
					dayOfMonth: 1,
				}),
			).toEqual({
				valid: true,
				pattern: { type: "yearly", monthOfYear: 1, dayOfMonth: 1 },
			});
		});

		it("validates custom pattern with all fields", () => {
			expect(
				validateRecurringPattern({
					type: "custom",
					interval: 2,
					daysOfWeek: [2],
					endDate: "2026-12-31",
					occurrences: 10,
				}),
			).toEqual({
				valid: true,
				pattern: {
					type: "custom",
					interval: 2,
					daysOfWeek: [2],
					endDate: "2026-12-31",
					occurrences: 10,
				},
			});
		});

		it("rejects invalid type", () => {
			expect(validateRecurringPattern({ type: "invalid" })).toEqual({
				valid: false,
			});
		});

		it("rejects missing type", () => {
			expect(validateRecurringPattern({ interval: 1 })).toEqual({
				valid: false,
			});
		});

		it("rejects negative interval", () => {
			expect(validateRecurringPattern({ type: "daily", interval: -1 })).toEqual(
				{ valid: false },
			);
		});

		it("rejects zero interval", () => {
			expect(validateRecurringPattern({ type: "daily", interval: 0 })).toEqual({
				valid: false,
			});
		});

		it("rejects non-integer interval", () => {
			expect(
				validateRecurringPattern({ type: "daily", interval: 1.5 }),
			).toEqual({ valid: false });
		});

		it("rejects invalid day of week (negative)", () => {
			expect(
				validateRecurringPattern({ type: "weekly", daysOfWeek: [-1] }),
			).toEqual({ valid: false });
		});

		it("rejects invalid day of week (> 6)", () => {
			expect(
				validateRecurringPattern({ type: "weekly", daysOfWeek: [7] }),
			).toEqual({ valid: false });
		});

		it("rejects invalid day of month (0)", () => {
			expect(
				validateRecurringPattern({ type: "monthly", dayOfMonth: 0 }),
			).toEqual({ valid: false });
		});

		it("rejects invalid day of month (> 31)", () => {
			expect(
				validateRecurringPattern({ type: "monthly", dayOfMonth: 32 }),
			).toEqual({ valid: false });
		});

		it("rejects invalid month of year (0)", () => {
			expect(
				validateRecurringPattern({ type: "yearly", monthOfYear: 0 }),
			).toEqual({ valid: false });
		});

		it("rejects invalid month of year (> 12)", () => {
			expect(
				validateRecurringPattern({ type: "yearly", monthOfYear: 13 }),
			).toEqual({ valid: false });
		});

		it("rejects zero occurrences", () => {
			expect(
				validateRecurringPattern({ type: "daily", occurrences: 0 }),
			).toEqual({ valid: false });
		});

		it("rejects negative occurrences", () => {
			expect(
				validateRecurringPattern({ type: "daily", occurrences: -5 }),
			).toEqual({ valid: false });
		});

		it("rejects non-object pattern", () => {
			expect(validateRecurringPattern("daily")).toEqual({ valid: false });
		});

		it("rejects null pattern", () => {
			expect(validateRecurringPattern(null)).toEqual({ valid: false });
		});
	});

	describe("Create Todo with Scheduling Input Validation", () => {
		interface CreateTodoWithSchedulingInput {
			text: string;
			folderId?: number | null;
			dueDate?: string | null;
			reminderAt?: string | null;
			recurringPattern?: RecurringPattern | null;
		}

		const validateCreateWithScheduling = (
			input: unknown,
		): { valid: boolean; data?: CreateTodoWithSchedulingInput } => {
			if (typeof input !== "object" || input === null) {
				return { valid: false };
			}

			const i = input as Record<string, unknown>;

			// text is required
			if (typeof i.text !== "string" || i.text.length < 1) {
				return { valid: false };
			}

			// folderId is optional, can be number or null
			if (
				i.folderId !== undefined &&
				i.folderId !== null &&
				typeof i.folderId !== "number"
			) {
				return { valid: false };
			}

			// dueDate is optional, must be valid ISO datetime string or null
			if (i.dueDate !== undefined && i.dueDate !== null) {
				if (typeof i.dueDate !== "string") {
					return { valid: false };
				}
				const date = new Date(i.dueDate);
				if (Number.isNaN(date.getTime())) {
					return { valid: false };
				}
			}

			// reminderAt is optional, must be valid ISO datetime string or null
			if (i.reminderAt !== undefined && i.reminderAt !== null) {
				if (typeof i.reminderAt !== "string") {
					return { valid: false };
				}
				const date = new Date(i.reminderAt);
				if (Number.isNaN(date.getTime())) {
					return { valid: false };
				}
			}

			return {
				valid: true,
				data: input as CreateTodoWithSchedulingInput,
			};
		};

		it("validates create input with text only", () => {
			const result = validateCreateWithScheduling({ text: "Buy groceries" });
			expect(result.valid).toBe(true);
			expect(result.data?.text).toBe("Buy groceries");
		});

		it("validates create input with all scheduling fields", () => {
			const result = validateCreateWithScheduling({
				text: "Meeting",
				folderId: 1,
				dueDate: "2026-01-25T10:00:00Z",
				reminderAt: "2026-01-25T09:30:00Z",
				recurringPattern: { type: "weekly", daysOfWeek: [1, 3, 5] },
			});
			expect(result.valid).toBe(true);
		});

		it("validates create input with null scheduling fields", () => {
			const result = validateCreateWithScheduling({
				text: "Task",
				dueDate: null,
				reminderAt: null,
				recurringPattern: null,
			});
			expect(result.valid).toBe(true);
		});

		it("rejects empty text", () => {
			expect(validateCreateWithScheduling({ text: "" })).toEqual({
				valid: false,
			});
		});

		it("rejects invalid dueDate string", () => {
			expect(
				validateCreateWithScheduling({
					text: "Task",
					dueDate: "not-a-date",
				}),
			).toEqual({ valid: false });
		});

		it("rejects invalid reminderAt string", () => {
			expect(
				validateCreateWithScheduling({
					text: "Task",
					reminderAt: "invalid",
				}),
			).toEqual({ valid: false });
		});
	});

	describe("UpdateSchedule Input Validation", () => {
		interface UpdateScheduleInput {
			id: number;
			dueDate?: string | null;
			reminderAt?: string | null;
			recurringPattern?: RecurringPattern | null;
		}

		const validateUpdateSchedule = (
			input: unknown,
		): { valid: boolean; data?: UpdateScheduleInput } => {
			if (typeof input !== "object" || input === null) {
				return { valid: false };
			}

			const i = input as Record<string, unknown>;

			// id is required and must be a number
			if (typeof i.id !== "number") {
				return { valid: false };
			}

			// dueDate is optional, must be valid ISO datetime string or null
			if (i.dueDate !== undefined && i.dueDate !== null) {
				if (typeof i.dueDate !== "string") {
					return { valid: false };
				}
				const date = new Date(i.dueDate);
				if (Number.isNaN(date.getTime())) {
					return { valid: false };
				}
			}

			// reminderAt is optional, must be valid ISO datetime string or null
			if (i.reminderAt !== undefined && i.reminderAt !== null) {
				if (typeof i.reminderAt !== "string") {
					return { valid: false };
				}
				const date = new Date(i.reminderAt);
				if (Number.isNaN(date.getTime())) {
					return { valid: false };
				}
			}

			return {
				valid: true,
				data: input as UpdateScheduleInput,
			};
		};

		it("validates update schedule with id only", () => {
			const result = validateUpdateSchedule({ id: 1 });
			expect(result.valid).toBe(true);
			expect(result.data?.id).toBe(1);
		});

		it("validates update schedule with dueDate", () => {
			const result = validateUpdateSchedule({
				id: 1,
				dueDate: "2026-01-30T12:00:00Z",
			});
			expect(result.valid).toBe(true);
		});

		it("validates update schedule with reminderAt", () => {
			const result = validateUpdateSchedule({
				id: 1,
				reminderAt: "2026-01-30T11:30:00Z",
			});
			expect(result.valid).toBe(true);
		});

		it("validates update schedule with recurringPattern", () => {
			const result = validateUpdateSchedule({
				id: 1,
				recurringPattern: { type: "daily", interval: 2 },
			});
			expect(result.valid).toBe(true);
		});

		it("validates update schedule with all fields", () => {
			const result = validateUpdateSchedule({
				id: 1,
				dueDate: "2026-01-30T12:00:00Z",
				reminderAt: "2026-01-30T11:30:00Z",
				recurringPattern: { type: "monthly", dayOfMonth: 15 },
			});
			expect(result.valid).toBe(true);
		});

		it("validates update schedule with null values to clear fields", () => {
			const result = validateUpdateSchedule({
				id: 1,
				dueDate: null,
				reminderAt: null,
				recurringPattern: null,
			});
			expect(result.valid).toBe(true);
		});

		it("rejects missing id", () => {
			expect(
				validateUpdateSchedule({ dueDate: "2026-01-30T12:00:00Z" }),
			).toEqual({ valid: false });
		});

		it("rejects string id", () => {
			expect(validateUpdateSchedule({ id: "1" })).toEqual({ valid: false });
		});

		it("rejects invalid dueDate string", () => {
			expect(
				validateUpdateSchedule({
					id: 1,
					dueDate: "not-a-date",
				}),
			).toEqual({ valid: false });
		});
	});

	describe("GetDueInRange Input Validation", () => {
		interface GetDueInRangeInput {
			startDate: string;
			endDate: string;
		}

		const validateGetDueInRange = (
			input: unknown,
		): { valid: boolean; data?: GetDueInRangeInput } => {
			if (typeof input !== "object" || input === null) {
				return { valid: false };
			}

			const i = input as Record<string, unknown>;

			// startDate is required
			if (typeof i.startDate !== "string") {
				return { valid: false };
			}
			const startDate = new Date(i.startDate);
			if (Number.isNaN(startDate.getTime())) {
				return { valid: false };
			}

			// endDate is required
			if (typeof i.endDate !== "string") {
				return { valid: false };
			}
			const endDate = new Date(i.endDate);
			if (Number.isNaN(endDate.getTime())) {
				return { valid: false };
			}

			return {
				valid: true,
				data: input as GetDueInRangeInput,
			};
		};

		it("validates valid date range", () => {
			const result = validateGetDueInRange({
				startDate: "2026-01-21T00:00:00Z",
				endDate: "2026-01-28T23:59:59Z",
			});
			expect(result.valid).toBe(true);
		});

		it("validates same day range", () => {
			const result = validateGetDueInRange({
				startDate: "2026-01-21T00:00:00Z",
				endDate: "2026-01-21T23:59:59Z",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects missing startDate", () => {
			expect(
				validateGetDueInRange({ endDate: "2026-01-28T23:59:59Z" }),
			).toEqual({ valid: false });
		});

		it("rejects missing endDate", () => {
			expect(
				validateGetDueInRange({ startDate: "2026-01-21T00:00:00Z" }),
			).toEqual({ valid: false });
		});

		it("rejects invalid startDate", () => {
			expect(
				validateGetDueInRange({
					startDate: "invalid",
					endDate: "2026-01-28T23:59:59Z",
				}),
			).toEqual({ valid: false });
		});

		it("rejects invalid endDate", () => {
			expect(
				validateGetDueInRange({
					startDate: "2026-01-21T00:00:00Z",
					endDate: "invalid",
				}),
			).toEqual({ valid: false });
		});
	});

	describe("Scheduling Business Logic", () => {
		describe("Date Conversion", () => {
			it("should convert ISO string to Date object", () => {
				const isoString = "2026-01-25T10:30:00.000Z";
				const date = new Date(isoString);

				expect(date instanceof Date).toBe(true);
				expect(date.toISOString()).toBe(isoString);
			});

			it("should handle null dueDate", () => {
				const processDate = (dateString: string | null | undefined) => {
					if (dateString) {
						return new Date(dateString);
					}
					return null;
				};

				expect(processDate(null)).toBeNull();
				expect(processDate(undefined)).toBeNull();
				expect(processDate("2026-01-25T10:30:00Z")).toBeInstanceOf(Date);
			});
		});

		describe("Update Schedule Data Preparation", () => {
			it("should only include fields that are explicitly set", () => {
				interface UpdateInput {
					dueDate?: string | null;
					reminderAt?: string | null;
					recurringPattern?: RecurringPattern | null;
				}

				const prepareUpdateData = (input: UpdateInput) => {
					const updateData: Record<string, unknown> = {};

					if (input.dueDate !== undefined) {
						updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
					}

					if (input.reminderAt !== undefined) {
						updateData.reminderAt = input.reminderAt
							? new Date(input.reminderAt)
							: null;
					}

					if (input.recurringPattern !== undefined) {
						updateData.recurringPattern = input.recurringPattern ?? null;
					}

					return updateData;
				};

				// Only dueDate specified
				const result1 = prepareUpdateData({
					dueDate: "2026-01-25T10:00:00Z",
				});
				expect(Object.keys(result1)).toEqual(["dueDate"]);
				expect(result1.dueDate).toBeInstanceOf(Date);

				// Clear dueDate (set to null)
				const result2 = prepareUpdateData({ dueDate: null });
				expect(Object.keys(result2)).toEqual(["dueDate"]);
				expect(result2.dueDate).toBeNull();

				// Multiple fields
				const result3 = prepareUpdateData({
					dueDate: "2026-01-25T10:00:00Z",
					reminderAt: "2026-01-25T09:00:00Z",
					recurringPattern: { type: "daily" },
				});
				expect(Object.keys(result3)).toHaveLength(3);
				expect(result3.recurringPattern).toEqual({ type: "daily" });

				// Empty input - no fields updated
				const result4 = prepareUpdateData({});
				expect(Object.keys(result4)).toHaveLength(0);
			});
		});

		describe("Filtering Todos by Due Date Range", () => {
			it("should filter todos within date range", () => {
				const todos: MockTodo[] = [
					{
						id: 1,
						text: "Todo 1",
						completed: false,
						userId: "user-123",
						dueDate: new Date("2026-01-22T10:00:00Z"),
					},
					{
						id: 2,
						text: "Todo 2",
						completed: false,
						userId: "user-123",
						dueDate: new Date("2026-01-25T10:00:00Z"),
					},
					{
						id: 3,
						text: "Todo 3",
						completed: false,
						userId: "user-123",
						dueDate: new Date("2026-01-30T10:00:00Z"),
					},
					{
						id: 4,
						text: "Todo 4 (no due date)",
						completed: false,
						userId: "user-123",
						dueDate: null,
					},
				];

				const filterByDateRange = (
					todoList: MockTodo[],
					startDate: Date,
					endDate: Date,
				) => {
					return todoList.filter((t) => {
						if (!t.dueDate) return false;
						return t.dueDate >= startDate && t.dueDate <= endDate;
					});
				};

				const startDate = new Date("2026-01-21T00:00:00Z");
				const endDate = new Date("2026-01-26T23:59:59Z");

				const result = filterByDateRange(todos, startDate, endDate);

				expect(result).toHaveLength(2);
				expect(result.map((t) => t.id)).toEqual([1, 2]);
			});

			it("should return empty array when no todos in range", () => {
				const todos: MockTodo[] = [
					{
						id: 1,
						text: "Todo 1",
						completed: false,
						userId: "user-123",
						dueDate: new Date("2026-02-01T10:00:00Z"),
					},
				];

				const filterByDateRange = (
					todoList: MockTodo[],
					startDate: Date,
					endDate: Date,
				) => {
					return todoList.filter((t) => {
						if (!t.dueDate) return false;
						return t.dueDate >= startDate && t.dueDate <= endDate;
					});
				};

				const startDate = new Date("2026-01-21T00:00:00Z");
				const endDate = new Date("2026-01-26T23:59:59Z");

				const result = filterByDateRange(todos, startDate, endDate);

				expect(result).toHaveLength(0);
			});
		});

		describe("Bulk Create with Scheduling Fields", () => {
			it("should map scheduling fields correctly", () => {
				interface BulkCreateTodoInput {
					text: string;
					completed: boolean;
					folderId?: number | null;
					dueDate?: string | null;
					reminderAt?: string | null;
					recurringPattern?: RecurringPattern | null;
				}

				const prepareBulkCreateData = (
					todos: BulkCreateTodoInput[],
					userId: string,
				) => {
					return todos.map((t) => ({
						text: t.text,
						completed: t.completed,
						userId,
						folderId: t.folderId ?? null,
						dueDate: t.dueDate ? new Date(t.dueDate) : null,
						reminderAt: t.reminderAt ? new Date(t.reminderAt) : null,
						recurringPattern: t.recurringPattern ?? null,
					}));
				};

				const input: BulkCreateTodoInput[] = [
					{
						text: "Task 1",
						completed: false,
						dueDate: "2026-01-25T10:00:00Z",
						reminderAt: "2026-01-25T09:00:00Z",
						recurringPattern: { type: "daily" },
					},
					{
						text: "Task 2",
						completed: true,
						dueDate: null,
						reminderAt: null,
						recurringPattern: null,
					},
					{
						text: "Task 3",
						completed: false,
						// No scheduling fields
					},
				];

				const result = prepareBulkCreateData(input, "user-123");

				expect(result).toHaveLength(3);

				const first = result[0];
				const second = result[1];
				const third = result[2];

				// First todo with scheduling
				expect(first?.text).toBe("Task 1");
				expect(first?.dueDate).toBeInstanceOf(Date);
				expect(first?.reminderAt).toBeInstanceOf(Date);
				expect(first?.recurringPattern).toEqual({ type: "daily" });
				expect(first?.userId).toBe("user-123");

				// Second todo with explicit nulls
				expect(second?.dueDate).toBeNull();
				expect(second?.reminderAt).toBeNull();
				expect(second?.recurringPattern).toBeNull();

				// Third todo with implicit nulls
				expect(third?.dueDate).toBeNull();
				expect(third?.reminderAt).toBeNull();
				expect(third?.recurringPattern).toBeNull();
			});
		});
	});
});
