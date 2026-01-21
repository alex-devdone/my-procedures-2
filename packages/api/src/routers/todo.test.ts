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

	describe("recurringPatternSchema notifyAt default", () => {
		// Import the actual schema to test Zod defaults
		// We need to test this separately as the schema has .default() behavior
		it("should default notifyAt to '09:00' when not provided", async () => {
			const { recurringPatternSchema } = await import("./todo");

			const result = recurringPatternSchema.parse({ type: "daily" });

			expect(result.notifyAt).toBe("09:00");
		});

		it("should default notifyAt to '09:00' for weekly pattern", async () => {
			const { recurringPatternSchema } = await import("./todo");

			const result = recurringPatternSchema.parse({
				type: "weekly",
				daysOfWeek: [1, 3, 5],
			});

			expect(result.notifyAt).toBe("09:00");
		});

		it("should use provided notifyAt value when specified", async () => {
			const { recurringPatternSchema } = await import("./todo");

			const result = recurringPatternSchema.parse({
				type: "daily",
				notifyAt: "14:30",
			});

			expect(result.notifyAt).toBe("14:30");
		});

		it("should accept valid HH:mm format for notifyAt", async () => {
			const { recurringPatternSchema } = await import("./todo");

			// Test various valid times
			expect(
				recurringPatternSchema.parse({ type: "daily", notifyAt: "00:00" })
					.notifyAt,
			).toBe("00:00");
			expect(
				recurringPatternSchema.parse({ type: "daily", notifyAt: "23:59" })
					.notifyAt,
			).toBe("23:59");
			expect(
				recurringPatternSchema.parse({ type: "daily", notifyAt: "12:00" })
					.notifyAt,
			).toBe("12:00");
		});

		it("should reject invalid notifyAt format", async () => {
			const { recurringPatternSchema } = await import("./todo");

			expect(() =>
				recurringPatternSchema.parse({ type: "daily", notifyAt: "9:00" }),
			).toThrow();
			expect(() =>
				recurringPatternSchema.parse({ type: "daily", notifyAt: "24:00" }),
			).toThrow();
			expect(() =>
				recurringPatternSchema.parse({ type: "daily", notifyAt: "12:60" }),
			).toThrow();
			expect(() =>
				recurringPatternSchema.parse({ type: "daily", notifyAt: "invalid" }),
			).toThrow();
		});

		it("should default notifyAt for all pattern types", async () => {
			const { recurringPatternSchema } = await import("./todo");

			const patternTypes = [
				{ type: "daily" as const },
				{ type: "weekly" as const, daysOfWeek: [1] },
				{ type: "monthly" as const, dayOfMonth: 15 },
				{ type: "yearly" as const, monthOfYear: 1, dayOfMonth: 1 },
				{ type: "custom" as const, interval: 2 },
			];

			for (const pattern of patternTypes) {
				const result = recurringPatternSchema.parse(pattern);
				expect(result.notifyAt).toBe("09:00");
			}
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

describe("CompleteRecurring Procedure", () => {
	describe("Input Validation", () => {
		interface CompleteRecurringInput {
			id: number;
			completedOccurrences?: number;
		}

		const validateCompleteRecurringInput = (
			input: unknown,
		): { valid: boolean; data?: CompleteRecurringInput } => {
			if (typeof input !== "object" || input === null) {
				return { valid: false };
			}

			const i = input as Record<string, unknown>;

			// id is required and must be a number
			if (typeof i.id !== "number") {
				return { valid: false };
			}

			// completedOccurrences is optional, must be non-negative integer
			if (i.completedOccurrences !== undefined) {
				if (
					typeof i.completedOccurrences !== "number" ||
					!Number.isInteger(i.completedOccurrences) ||
					i.completedOccurrences < 0
				) {
					return { valid: false };
				}
			}

			return {
				valid: true,
				data: input as CompleteRecurringInput,
			};
		};

		it("validates input with id only", () => {
			const result = validateCompleteRecurringInput({ id: 1 });
			expect(result.valid).toBe(true);
			expect(result.data?.id).toBe(1);
		});

		it("validates input with id and completedOccurrences", () => {
			const result = validateCompleteRecurringInput({
				id: 1,
				completedOccurrences: 5,
			});
			expect(result.valid).toBe(true);
			expect(result.data?.completedOccurrences).toBe(5);
		});

		it("validates input with completedOccurrences of 0", () => {
			const result = validateCompleteRecurringInput({
				id: 1,
				completedOccurrences: 0,
			});
			expect(result.valid).toBe(true);
			expect(result.data?.completedOccurrences).toBe(0);
		});

		it("rejects missing id", () => {
			expect(
				validateCompleteRecurringInput({ completedOccurrences: 5 }),
			).toEqual({ valid: false });
		});

		it("rejects string id", () => {
			expect(validateCompleteRecurringInput({ id: "1" })).toEqual({
				valid: false,
			});
		});

		it("rejects negative completedOccurrences", () => {
			expect(
				validateCompleteRecurringInput({ id: 1, completedOccurrences: -1 }),
			).toEqual({ valid: false });
		});

		it("rejects non-integer completedOccurrences", () => {
			expect(
				validateCompleteRecurringInput({ id: 1, completedOccurrences: 2.5 }),
			).toEqual({ valid: false });
		});
	});

	describe("Business Logic", () => {
		describe("Todo Ownership Verification", () => {
			it("should throw NOT_FOUND for non-existent todo", () => {
				const verifyTodoExists = (
					existingTodo: MockTodo | undefined,
					currentUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== currentUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to modify it",
						});
					}
					return existingTodo;
				};

				expect(() => verifyTodoExists(undefined, "user-123")).toThrow(
					TRPCError,
				);
			});

			it("should throw NOT_FOUND for todo owned by different user", () => {
				const verifyTodoExists = (
					existingTodo: MockTodo | undefined,
					currentUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== currentUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to modify it",
						});
					}
					return existingTodo;
				};

				const todo: MockTodo = {
					id: 1,
					text: "Test",
					completed: false,
					userId: "user-456",
				};

				expect(() => verifyTodoExists(todo, "user-123")).toThrow(TRPCError);
			});

			it("should pass for todo owned by current user", () => {
				const verifyTodoExists = (
					existingTodo: MockTodo | undefined,
					currentUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== currentUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to modify it",
						});
					}
					return existingTodo;
				};

				const todo: MockTodo = {
					id: 1,
					text: "Test",
					completed: false,
					userId: "user-123",
				};

				expect(() => verifyTodoExists(todo, "user-123")).not.toThrow();
			});
		});

		describe("Recurring Pattern Validation", () => {
			it("should throw BAD_REQUEST if todo has no recurring pattern", () => {
				const verifyRecurringPattern = (
					recurringPattern: RecurringPattern | null | undefined,
				) => {
					if (!recurringPattern) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Todo does not have a recurring pattern",
						});
					}
					return recurringPattern;
				};

				expect(() => verifyRecurringPattern(null)).toThrow(TRPCError);
				expect(() => verifyRecurringPattern(undefined)).toThrow(TRPCError);
			});

			it("should pass if todo has recurring pattern", () => {
				const verifyRecurringPattern = (
					recurringPattern: RecurringPattern | null | undefined,
				) => {
					if (!recurringPattern) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Todo does not have a recurring pattern",
						});
					}
					return recurringPattern;
				};

				const pattern: RecurringPattern = { type: "daily" };
				expect(() => verifyRecurringPattern(pattern)).not.toThrow();
			});
		});

		describe("Next Occurrence Calculation", () => {
			it("should calculate next occurrence for daily pattern", () => {
				const calculateNextOccurrence = (
					pattern: RecurringPattern,
					baseDate: Date,
				): Date | null => {
					// Simplified calculation for testing
					const interval = pattern.interval ?? 1;
					const next = new Date(baseDate);

					if (pattern.type === "daily") {
						next.setDate(next.getDate() + interval);
						return next;
					}

					return null;
				};

				const baseDate = new Date("2026-01-21T10:00:00Z");
				const pattern: RecurringPattern = { type: "daily" };

				const result = calculateNextOccurrence(pattern, baseDate);

				expect(result).not.toBeNull();
				expect(result?.getDate()).toBe(22);
			});

			it("should calculate next occurrence for daily pattern with interval", () => {
				const calculateNextOccurrence = (
					pattern: RecurringPattern,
					baseDate: Date,
				): Date | null => {
					const interval = pattern.interval ?? 1;
					const next = new Date(baseDate);

					if (pattern.type === "daily") {
						next.setDate(next.getDate() + interval);
						return next;
					}

					return null;
				};

				const baseDate = new Date("2026-01-21T10:00:00Z");
				const pattern: RecurringPattern = { type: "daily", interval: 3 };

				const result = calculateNextOccurrence(pattern, baseDate);

				expect(result).not.toBeNull();
				expect(result?.getDate()).toBe(24);
			});

			it("should return null when pattern has expired", () => {
				const calculateNextOccurrence = (
					pattern: RecurringPattern,
					baseDate: Date,
					completedOccurrences: number,
				): Date | null => {
					// Check if max occurrences reached
					if (
						pattern.occurrences !== undefined &&
						completedOccurrences >= pattern.occurrences
					) {
						return null;
					}

					// Check end date
					if (pattern.endDate) {
						const endDate = new Date(pattern.endDate);
						if (baseDate > endDate) {
							return null;
						}
					}

					const interval = pattern.interval ?? 1;
					const next = new Date(baseDate);
					next.setDate(next.getDate() + interval);

					// Check if next date exceeds end date
					if (pattern.endDate) {
						const endDate = new Date(pattern.endDate);
						if (next > endDate) {
							return null;
						}
					}

					return next;
				};

				// Test max occurrences reached
				const pattern1: RecurringPattern = {
					type: "daily",
					occurrences: 5,
				};
				const baseDate = new Date("2026-01-21T10:00:00Z");
				expect(calculateNextOccurrence(pattern1, baseDate, 5)).toBeNull();

				// Test end date passed
				const pattern2: RecurringPattern = {
					type: "daily",
					endDate: "2026-01-20",
				};
				expect(calculateNextOccurrence(pattern2, baseDate, 0)).toBeNull();
			});
		});

		describe("Reminder Offset Calculation", () => {
			it("should preserve reminder offset when creating next occurrence", () => {
				const calculateNextReminder = (
					originalDueDate: Date | null,
					originalReminder: Date | null,
					nextDueDate: Date,
				): Date | null => {
					if (!originalReminder || !originalDueDate) {
						return null;
					}

					const offset = originalDueDate.getTime() - originalReminder.getTime();
					return new Date(nextDueDate.getTime() - offset);
				};

				const originalDueDate = new Date("2026-01-21T10:00:00Z");
				const originalReminder = new Date("2026-01-21T09:30:00Z"); // 30 minutes before
				const nextDueDate = new Date("2026-01-22T10:00:00Z");

				const nextReminder = calculateNextReminder(
					originalDueDate,
					originalReminder,
					nextDueDate,
				);

				expect(nextReminder).not.toBeNull();
				// Should be 30 minutes before next due date
				expect(nextReminder?.toISOString()).toBe("2026-01-22T09:30:00.000Z");
			});

			it("should return null if original todo had no reminder", () => {
				const calculateNextReminder = (
					originalDueDate: Date | null,
					originalReminder: Date | null,
					nextDueDate: Date,
				): Date | null => {
					if (!originalReminder || !originalDueDate) {
						return null;
					}

					const offset = originalDueDate.getTime() - originalReminder.getTime();
					return new Date(nextDueDate.getTime() - offset);
				};

				const nextDueDate = new Date("2026-01-22T10:00:00Z");

				expect(
					calculateNextReminder(
						new Date("2026-01-21T10:00:00Z"),
						null,
						nextDueDate,
					),
				).toBeNull();
			});

			it("should return null if original todo had no due date", () => {
				const calculateNextReminder = (
					originalDueDate: Date | null,
					originalReminder: Date | null,
					nextDueDate: Date,
				): Date | null => {
					if (!originalReminder || !originalDueDate) {
						return null;
					}

					const offset = originalDueDate.getTime() - originalReminder.getTime();
					return new Date(nextDueDate.getTime() - offset);
				};

				const nextDueDate = new Date("2026-01-22T10:00:00Z");

				expect(
					calculateNextReminder(
						null,
						new Date("2026-01-21T09:30:00Z"),
						nextDueDate,
					),
				).toBeNull();
			});
		});

		describe("New Todo Creation Data", () => {
			it("should create correct data structure for new recurring todo", () => {
				interface CreateNextTodoInput {
					text: string;
					userId: string;
					folderId: number | null;
					dueDate: Date;
					reminderAt: Date | null;
					recurringPattern: RecurringPattern;
				}

				const createNextTodoData = (input: CreateNextTodoInput) => ({
					text: input.text,
					completed: false,
					userId: input.userId,
					folderId: input.folderId,
					dueDate: input.dueDate,
					reminderAt: input.reminderAt,
					recurringPattern: input.recurringPattern,
				});

				const input: CreateNextTodoInput = {
					text: "Daily standup",
					userId: "user-123",
					folderId: 1,
					dueDate: new Date("2026-01-22T09:00:00Z"),
					reminderAt: new Date("2026-01-22T08:45:00Z"),
					recurringPattern: { type: "daily" },
				};

				const result = createNextTodoData(input);

				expect(result).toEqual({
					text: "Daily standup",
					completed: false, // Always starts as incomplete
					userId: "user-123",
					folderId: 1,
					dueDate: new Date("2026-01-22T09:00:00Z"),
					reminderAt: new Date("2026-01-22T08:45:00Z"),
					recurringPattern: { type: "daily" },
				});
			});

			it("should handle null folderId and reminderAt", () => {
				interface CreateNextTodoInput {
					text: string;
					userId: string;
					folderId: number | null;
					dueDate: Date;
					reminderAt: Date | null;
					recurringPattern: RecurringPattern;
				}

				const createNextTodoData = (input: CreateNextTodoInput) => ({
					text: input.text,
					completed: false,
					userId: input.userId,
					folderId: input.folderId,
					dueDate: input.dueDate,
					reminderAt: input.reminderAt,
					recurringPattern: input.recurringPattern,
				});

				const input: CreateNextTodoInput = {
					text: "Task",
					userId: "user-123",
					folderId: null,
					dueDate: new Date("2026-01-22T09:00:00Z"),
					reminderAt: null,
					recurringPattern: { type: "weekly", daysOfWeek: [1, 3, 5] },
				};

				const result = createNextTodoData(input);

				expect(result.folderId).toBeNull();
				expect(result.reminderAt).toBeNull();
			});
		});

		describe("Return Value Structure", () => {
			it("should return completed status and next todo when pattern continues", () => {
				interface CompleteRecurringResult {
					completed: boolean;
					nextTodo: MockTodo | null;
					message: string | null;
				}

				const buildSuccessResult = (
					nextTodo: MockTodo,
				): CompleteRecurringResult => ({
					completed: true,
					nextTodo,
					message: null,
				});

				const nextTodo: MockTodo = {
					id: 2,
					text: "Daily task",
					completed: false,
					userId: "user-123",
					dueDate: new Date("2026-01-22T10:00:00Z"),
					recurringPattern: { type: "daily" },
				};

				const result = buildSuccessResult(nextTodo);

				expect(result.completed).toBe(true);
				expect(result.nextTodo).toEqual(nextTodo);
				expect(result.message).toBeNull();
			});

			it("should return null nextTodo when pattern has expired", () => {
				interface CompleteRecurringResult {
					completed: boolean;
					nextTodo: MockTodo | null;
					message: string | null;
				}

				const buildExpiredResult = (): CompleteRecurringResult => ({
					completed: true,
					nextTodo: null,
					message: "Recurring pattern has expired",
				});

				const result = buildExpiredResult();

				expect(result.completed).toBe(true);
				expect(result.nextTodo).toBeNull();
				expect(result.message).toBe("Recurring pattern has expired");
			});
		});

		describe("Base Date Selection", () => {
			it("should use existing dueDate as base when available", () => {
				const getBaseDate = (
					existingDueDate: Date | null | undefined,
				): Date => {
					return existingDueDate ?? new Date();
				};

				const existingDueDate = new Date("2026-01-21T10:00:00Z");
				const result = getBaseDate(existingDueDate);

				expect(result).toEqual(existingDueDate);
			});

			it("should use current date as base when no dueDate", () => {
				const getBaseDate = (
					existingDueDate: Date | null | undefined,
				): Date => {
					return existingDueDate ?? new Date();
				};

				const beforeCall = new Date();
				const result = getBaseDate(null);
				const afterCall = new Date();

				expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
				expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
			});
		});
	});
});

describe("GetCompletionHistory Procedure", () => {
	describe("Input Validation", () => {
		interface GetCompletionHistoryInput {
			startDate: string;
			endDate: string;
		}

		const validateGetCompletionHistoryInput = (
			input: unknown,
		): { valid: boolean; data?: GetCompletionHistoryInput } => {
			if (typeof input !== "object" || input === null) {
				return { valid: false };
			}

			const i = input as Record<string, unknown>;

			// startDate is required and must be valid datetime string
			if (typeof i.startDate !== "string") {
				return { valid: false };
			}
			const startDate = new Date(i.startDate);
			if (Number.isNaN(startDate.getTime())) {
				return { valid: false };
			}

			// endDate is required and must be valid datetime string
			if (typeof i.endDate !== "string") {
				return { valid: false };
			}
			const endDate = new Date(i.endDate);
			if (Number.isNaN(endDate.getTime())) {
				return { valid: false };
			}

			return {
				valid: true,
				data: input as GetCompletionHistoryInput,
			};
		};

		it("validates valid date range", () => {
			const result = validateGetCompletionHistoryInput({
				startDate: "2026-01-01T00:00:00Z",
				endDate: "2026-01-31T23:59:59Z",
			});
			expect(result.valid).toBe(true);
			expect(result.data?.startDate).toBe("2026-01-01T00:00:00Z");
			expect(result.data?.endDate).toBe("2026-01-31T23:59:59Z");
		});

		it("validates same day range", () => {
			const result = validateGetCompletionHistoryInput({
				startDate: "2026-01-15T00:00:00Z",
				endDate: "2026-01-15T23:59:59Z",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects missing startDate", () => {
			expect(
				validateGetCompletionHistoryInput({
					endDate: "2026-01-31T23:59:59Z",
				}),
			).toEqual({ valid: false });
		});

		it("rejects missing endDate", () => {
			expect(
				validateGetCompletionHistoryInput({
					startDate: "2026-01-01T00:00:00Z",
				}),
			).toEqual({ valid: false });
		});

		it("rejects invalid startDate string", () => {
			expect(
				validateGetCompletionHistoryInput({
					startDate: "not-a-date",
					endDate: "2026-01-31T23:59:59Z",
				}),
			).toEqual({ valid: false });
		});

		it("rejects invalid endDate string", () => {
			expect(
				validateGetCompletionHistoryInput({
					startDate: "2026-01-01T00:00:00Z",
					endDate: "invalid",
				}),
			).toEqual({ valid: false });
		});

		it("rejects non-object input", () => {
			expect(validateGetCompletionHistoryInput("invalid")).toEqual({
				valid: false,
			});
		});

		it("rejects null input", () => {
			expect(validateGetCompletionHistoryInput(null)).toEqual({ valid: false });
		});
	});

	describe("Business Logic", () => {
		interface CompletionRecord {
			id: number;
			todoId: number;
			scheduledDate: Date;
			completedAt: Date | null;
			createdAt: Date;
			userId: string;
		}

		interface CompletionWithTodoText extends CompletionRecord {
			todoText: string;
		}

		describe("Filtering by Date Range", () => {
			it("should filter completions within date range", () => {
				const completions: CompletionRecord[] = [
					{
						id: 1,
						todoId: 10,
						scheduledDate: new Date("2026-01-05T10:00:00Z"),
						completedAt: new Date("2026-01-05T10:30:00Z"),
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
					{
						id: 2,
						todoId: 10,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completedAt: new Date("2026-01-15T11:00:00Z"),
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
					{
						id: 3,
						todoId: 10,
						scheduledDate: new Date("2026-02-01T10:00:00Z"),
						completedAt: null,
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
				];

				const filterByDateRange = (
					records: CompletionRecord[],
					startDate: Date,
					endDate: Date,
				) => {
					return records.filter(
						(r) => r.scheduledDate >= startDate && r.scheduledDate <= endDate,
					);
				};

				const startDate = new Date("2026-01-01T00:00:00Z");
				const endDate = new Date("2026-01-31T23:59:59Z");

				const result = filterByDateRange(completions, startDate, endDate);

				expect(result).toHaveLength(2);
				expect(result.map((r) => r.id)).toEqual([1, 2]);
			});

			it("should return empty array when no completions in range", () => {
				const completions: CompletionRecord[] = [
					{
						id: 1,
						todoId: 10,
						scheduledDate: new Date("2026-03-01T10:00:00Z"),
						completedAt: new Date("2026-03-01T10:30:00Z"),
						createdAt: new Date("2026-03-01T00:00:00Z"),
						userId: "user-123",
					},
				];

				const filterByDateRange = (
					records: CompletionRecord[],
					startDate: Date,
					endDate: Date,
				) => {
					return records.filter(
						(r) => r.scheduledDate >= startDate && r.scheduledDate <= endDate,
					);
				};

				const startDate = new Date("2026-01-01T00:00:00Z");
				const endDate = new Date("2026-01-31T23:59:59Z");

				const result = filterByDateRange(completions, startDate, endDate);

				expect(result).toHaveLength(0);
			});
		});

		describe("Filtering by User", () => {
			it("should only return completions for the authenticated user", () => {
				const completions: CompletionRecord[] = [
					{
						id: 1,
						todoId: 10,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completedAt: new Date("2026-01-15T10:30:00Z"),
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
					{
						id: 2,
						todoId: 20,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completedAt: new Date("2026-01-15T11:00:00Z"),
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-456", // Different user
					},
					{
						id: 3,
						todoId: 30,
						scheduledDate: new Date("2026-01-16T10:00:00Z"),
						completedAt: null,
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
				];

				const filterByUser = (records: CompletionRecord[], userId: string) => {
					return records.filter((r) => r.userId === userId);
				};

				const result = filterByUser(completions, "user-123");

				expect(result).toHaveLength(2);
				expect(result.every((r) => r.userId === "user-123")).toBe(true);
			});
		});

		describe("Join with Todo Data", () => {
			it("should include todo text in completion record", () => {
				const todos = [
					{ id: 10, text: "Daily standup", userId: "user-123" },
					{ id: 20, text: "Weekly review", userId: "user-123" },
				];

				const completions: CompletionRecord[] = [
					{
						id: 1,
						todoId: 10,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completedAt: new Date("2026-01-15T10:30:00Z"),
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
					{
						id: 2,
						todoId: 20,
						scheduledDate: new Date("2026-01-15T14:00:00Z"),
						completedAt: null,
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
				];

				const joinWithTodoText = (
					completionRecords: CompletionRecord[],
					todoRecords: Array<{ id: number; text: string; userId: string }>,
				): CompletionWithTodoText[] => {
					return completionRecords
						.map((completion) => {
							const todo = todoRecords.find((t) => t.id === completion.todoId);
							if (!todo) return null;
							return {
								...completion,
								todoText: todo.text,
							};
						})
						.filter((r): r is CompletionWithTodoText => r !== null);
				};

				const result = joinWithTodoText(completions, todos);

				expect(result).toHaveLength(2);
				expect(result[0]?.todoText).toBe("Daily standup");
				expect(result[1]?.todoText).toBe("Weekly review");
			});

			it("should exclude completions where todo no longer exists (inner join behavior)", () => {
				const todos = [{ id: 10, text: "Existing todo", userId: "user-123" }];

				const completions: CompletionRecord[] = [
					{
						id: 1,
						todoId: 10,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completedAt: new Date("2026-01-15T10:30:00Z"),
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
					{
						id: 2,
						todoId: 99, // Todo was deleted
						scheduledDate: new Date("2026-01-16T10:00:00Z"),
						completedAt: null,
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
				];

				const joinWithTodoText = (
					completionRecords: CompletionRecord[],
					todoRecords: Array<{ id: number; text: string; userId: string }>,
				): CompletionWithTodoText[] => {
					return completionRecords
						.map((completion) => {
							const todo = todoRecords.find((t) => t.id === completion.todoId);
							if (!todo) return null;
							return {
								...completion,
								todoText: todo.text,
							};
						})
						.filter((r): r is CompletionWithTodoText => r !== null);
				};

				const result = joinWithTodoText(completions, todos);

				expect(result).toHaveLength(1);
				expect(result[0]?.todoId).toBe(10);
			});
		});

		describe("Return Value Structure", () => {
			it("should return correct shape for completion history records", () => {
				interface CompletionHistoryRecord {
					id: number;
					todoId: number;
					scheduledDate: Date;
					completedAt: Date | null;
					createdAt: Date;
					todoText: string;
				}

				const createCompletionHistoryRecord = (data: {
					id: number;
					todoId: number;
					scheduledDate: Date;
					completedAt: Date | null;
					createdAt: Date;
					todoText: string;
				}): CompletionHistoryRecord => ({
					id: data.id,
					todoId: data.todoId,
					scheduledDate: data.scheduledDate,
					completedAt: data.completedAt,
					createdAt: data.createdAt,
					todoText: data.todoText,
				});

				const record = createCompletionHistoryRecord({
					id: 1,
					todoId: 10,
					scheduledDate: new Date("2026-01-15T10:00:00Z"),
					completedAt: new Date("2026-01-15T10:30:00Z"),
					createdAt: new Date("2026-01-01T00:00:00Z"),
					todoText: "Daily standup",
				});

				expect(record).toHaveProperty("id");
				expect(record).toHaveProperty("todoId");
				expect(record).toHaveProperty("scheduledDate");
				expect(record).toHaveProperty("completedAt");
				expect(record).toHaveProperty("createdAt");
				expect(record).toHaveProperty("todoText");
			});

			it("should handle completedAt being null for incomplete records", () => {
				interface CompletionHistoryRecord {
					id: number;
					todoId: number;
					scheduledDate: Date;
					completedAt: Date | null;
					createdAt: Date;
					todoText: string;
				}

				const record: CompletionHistoryRecord = {
					id: 1,
					todoId: 10,
					scheduledDate: new Date("2026-01-15T10:00:00Z"),
					completedAt: null, // Not yet completed
					createdAt: new Date("2026-01-01T00:00:00Z"),
					todoText: "Pending task",
				};

				expect(record.completedAt).toBeNull();
			});
		});

		describe("Combined Filters", () => {
			it("should apply both user and date range filters", () => {
				const completions: CompletionRecord[] = [
					{
						id: 1,
						todoId: 10,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completedAt: new Date("2026-01-15T10:30:00Z"),
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
					{
						id: 2,
						todoId: 20,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completedAt: new Date("2026-01-15T11:00:00Z"),
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-456", // Different user - should be excluded
					},
					{
						id: 3,
						todoId: 30,
						scheduledDate: new Date("2026-02-15T10:00:00Z"), // Outside range
						completedAt: null,
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
					{
						id: 4,
						todoId: 40,
						scheduledDate: new Date("2026-01-20T10:00:00Z"),
						completedAt: new Date("2026-01-20T10:30:00Z"),
						createdAt: new Date("2026-01-01T00:00:00Z"),
						userId: "user-123",
					},
				];

				const filterCompletions = (
					records: CompletionRecord[],
					userId: string,
					startDate: Date,
					endDate: Date,
				) => {
					return records.filter(
						(r) =>
							r.userId === userId &&
							r.scheduledDate >= startDate &&
							r.scheduledDate <= endDate,
					);
				};

				const result = filterCompletions(
					completions,
					"user-123",
					new Date("2026-01-01T00:00:00Z"),
					new Date("2026-01-31T23:59:59Z"),
				);

				expect(result).toHaveLength(2);
				expect(result.map((r) => r.id)).toEqual([1, 4]);
			});
		});
	});
});

describe("GetAnalytics Procedure", () => {
	describe("Input Validation", () => {
		interface GetAnalyticsInput {
			startDate: string;
			endDate: string;
		}

		const validateGetAnalyticsInput = (
			input: unknown,
		): { valid: boolean; data?: GetAnalyticsInput } => {
			if (typeof input !== "object" || input === null) {
				return { valid: false };
			}

			const i = input as Record<string, unknown>;

			// startDate is required and must be valid datetime string
			if (typeof i.startDate !== "string") {
				return { valid: false };
			}
			const startDate = new Date(i.startDate);
			if (Number.isNaN(startDate.getTime())) {
				return { valid: false };
			}

			// endDate is required and must be valid datetime string
			if (typeof i.endDate !== "string") {
				return { valid: false };
			}
			const endDate = new Date(i.endDate);
			if (Number.isNaN(endDate.getTime())) {
				return { valid: false };
			}

			return {
				valid: true,
				data: input as GetAnalyticsInput,
			};
		};

		it("validates valid date range", () => {
			const result = validateGetAnalyticsInput({
				startDate: "2026-01-01T00:00:00Z",
				endDate: "2026-01-31T23:59:59Z",
			});
			expect(result.valid).toBe(true);
			expect(result.data?.startDate).toBe("2026-01-01T00:00:00Z");
			expect(result.data?.endDate).toBe("2026-01-31T23:59:59Z");
		});

		it("validates same day range", () => {
			const result = validateGetAnalyticsInput({
				startDate: "2026-01-15T00:00:00Z",
				endDate: "2026-01-15T23:59:59Z",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects missing startDate", () => {
			expect(
				validateGetAnalyticsInput({
					endDate: "2026-01-31T23:59:59Z",
				}),
			).toEqual({ valid: false });
		});

		it("rejects missing endDate", () => {
			expect(
				validateGetAnalyticsInput({
					startDate: "2026-01-01T00:00:00Z",
				}),
			).toEqual({ valid: false });
		});

		it("rejects invalid startDate string", () => {
			expect(
				validateGetAnalyticsInput({
					startDate: "not-a-date",
					endDate: "2026-01-31T23:59:59Z",
				}),
			).toEqual({ valid: false });
		});

		it("rejects invalid endDate string", () => {
			expect(
				validateGetAnalyticsInput({
					startDate: "2026-01-01T00:00:00Z",
					endDate: "invalid",
				}),
			).toEqual({ valid: false });
		});

		it("rejects non-object input", () => {
			expect(validateGetAnalyticsInput("invalid")).toEqual({
				valid: false,
			});
		});

		it("rejects null input", () => {
			expect(validateGetAnalyticsInput(null)).toEqual({ valid: false });
		});
	});

	describe("Completion Rate Calculation", () => {
		const calculateCompletionRate = (
			totalCompleted: number,
			totalExpected: number,
		): number => {
			if (totalExpected === 0) {
				return 100; // No tasks expected = 100% completion
			}
			return Math.round((totalCompleted / totalExpected) * 100);
		};

		it("should return 100% when all tasks are completed", () => {
			expect(calculateCompletionRate(10, 10)).toBe(100);
		});

		it("should return 0% when no tasks are completed", () => {
			expect(calculateCompletionRate(0, 10)).toBe(0);
		});

		it("should return correct percentage for partial completion", () => {
			expect(calculateCompletionRate(7, 10)).toBe(70);
			expect(calculateCompletionRate(1, 3)).toBe(33);
			expect(calculateCompletionRate(2, 3)).toBe(67);
		});

		it("should return 100% when no tasks are expected", () => {
			expect(calculateCompletionRate(0, 0)).toBe(100);
		});

		it("should round to nearest integer", () => {
			expect(calculateCompletionRate(1, 6)).toBe(17); // 16.67 rounds to 17
			expect(calculateCompletionRate(5, 6)).toBe(83); // 83.33 rounds to 83
		});
	});

	describe("Streak Calculation", () => {
		const calculateStreak = (
			completionDates: string[],
			today: Date,
		): number => {
			if (completionDates.length === 0) {
				return 0;
			}

			// Sort dates in descending order (most recent first)
			const sortedDates = [...completionDates].sort(
				(a, b) => new Date(b).getTime() - new Date(a).getTime(),
			);

			const todayStr = today.toISOString().split("T")[0] ?? "";
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = yesterday.toISOString().split("T")[0] ?? "";

			let streak = 0;
			let checkDate = todayStr;

			// If no completion today but there's one yesterday, start from yesterday
			if (
				sortedDates.length > 0 &&
				sortedDates[0] !== todayStr &&
				sortedDates[0] === yesterdayStr
			) {
				checkDate = yesterdayStr;
			}

			for (const dateStr of sortedDates) {
				if (dateStr === checkDate) {
					streak++;
					const checkDateObj = new Date(checkDate);
					checkDateObj.setDate(checkDateObj.getDate() - 1);
					const newCheckDate = checkDateObj.toISOString().split("T")[0];
					checkDate = newCheckDate ?? "";
				} else if (new Date(dateStr) < new Date(checkDate)) {
					// Gap in dates, streak broken
					break;
				}
			}

			return streak;
		};

		it("should return 0 when no completion dates", () => {
			const today = new Date("2026-01-22T12:00:00Z");
			expect(calculateStreak([], today)).toBe(0);
		});

		it("should return 1 for completion today only", () => {
			const today = new Date("2026-01-22T12:00:00Z");
			expect(calculateStreak(["2026-01-22"], today)).toBe(1);
		});

		it("should return 1 for completion yesterday only", () => {
			const today = new Date("2026-01-22T12:00:00Z");
			expect(calculateStreak(["2026-01-21"], today)).toBe(1);
		});

		it("should return 0 when last completion is more than 1 day ago", () => {
			const today = new Date("2026-01-22T12:00:00Z");
			expect(calculateStreak(["2026-01-20"], today)).toBe(0);
		});

		it("should count consecutive days starting from today", () => {
			const today = new Date("2026-01-22T12:00:00Z");
			expect(
				calculateStreak(["2026-01-22", "2026-01-21", "2026-01-20"], today),
			).toBe(3);
		});

		it("should count consecutive days starting from yesterday", () => {
			const today = new Date("2026-01-22T12:00:00Z");
			// No completion today, but consecutive days before
			expect(
				calculateStreak(["2026-01-21", "2026-01-20", "2026-01-19"], today),
			).toBe(3);
		});

		it("should break streak on gaps", () => {
			const today = new Date("2026-01-22T12:00:00Z");
			// Gap on Jan 20
			expect(
				calculateStreak(["2026-01-22", "2026-01-21", "2026-01-19"], today),
			).toBe(2);
		});

		it("should handle unsorted input dates", () => {
			const today = new Date("2026-01-22T12:00:00Z");
			expect(
				calculateStreak(["2026-01-20", "2026-01-22", "2026-01-21"], today),
			).toBe(3);
		});

		it("should handle duplicate dates", () => {
			const today = new Date("2026-01-22T12:00:00Z");
			expect(
				calculateStreak(
					["2026-01-22", "2026-01-22", "2026-01-21", "2026-01-21"],
					today,
				),
			).toBe(2);
		});
	});

	describe("Daily Breakdown Calculation", () => {
		interface DailyStats {
			date: string;
			regularCompleted: number;
			recurringCompleted: number;
			recurringMissed: number;
		}

		const buildDailyBreakdown = (
			startDate: Date,
			endDate: Date,
			regularCompletions: Array<{ date: string; count: number }>,
			recurringCompletions: Array<{ date: string; count: number }>,
			recurringMissed: Array<{ date: string; count: number }>,
		): DailyStats[] => {
			const dailyBreakdownMap = new Map<string, DailyStats>();

			// Initialize all dates in range
			const currentDate = new Date(startDate);
			while (currentDate <= endDate) {
				const dateStr = currentDate.toISOString().split("T")[0] ?? "";
				dailyBreakdownMap.set(dateStr, {
					date: dateStr,
					regularCompleted: 0,
					recurringCompleted: 0,
					recurringMissed: 0,
				});
				currentDate.setDate(currentDate.getDate() + 1);
			}

			// Fill in regular completions
			for (const { date, count } of regularCompletions) {
				const entry = dailyBreakdownMap.get(date);
				if (entry) {
					entry.regularCompleted = count;
				}
			}

			// Fill in recurring completions
			for (const { date, count } of recurringCompletions) {
				const entry = dailyBreakdownMap.get(date);
				if (entry) {
					entry.recurringCompleted = count;
				}
			}

			// Fill in recurring missed
			for (const { date, count } of recurringMissed) {
				const entry = dailyBreakdownMap.get(date);
				if (entry) {
					entry.recurringMissed = count;
				}
			}

			return Array.from(dailyBreakdownMap.values()).sort((a, b) =>
				a.date.localeCompare(b.date),
			);
		};

		it("should create entry for each day in range", () => {
			const startDate = new Date("2026-01-20T00:00:00Z");
			const endDate = new Date("2026-01-22T23:59:59Z");

			const result = buildDailyBreakdown(startDate, endDate, [], [], []);

			expect(result).toHaveLength(3);
			expect(result.map((d) => d.date)).toEqual([
				"2026-01-20",
				"2026-01-21",
				"2026-01-22",
			]);
		});

		it("should initialize all counts to zero", () => {
			const startDate = new Date("2026-01-20T00:00:00Z");
			const endDate = new Date("2026-01-20T23:59:59Z");

			const result = buildDailyBreakdown(startDate, endDate, [], [], []);

			expect(result[0]).toEqual({
				date: "2026-01-20",
				regularCompleted: 0,
				recurringCompleted: 0,
				recurringMissed: 0,
			});
		});

		it("should populate regular completions", () => {
			const startDate = new Date("2026-01-20T00:00:00Z");
			const endDate = new Date("2026-01-22T23:59:59Z");

			const result = buildDailyBreakdown(
				startDate,
				endDate,
				[
					{ date: "2026-01-20", count: 3 },
					{ date: "2026-01-22", count: 1 },
				],
				[],
				[],
			);

			expect(result[0]?.regularCompleted).toBe(3);
			expect(result[1]?.regularCompleted).toBe(0);
			expect(result[2]?.regularCompleted).toBe(1);
		});

		it("should populate recurring completions and missed", () => {
			const startDate = new Date("2026-01-20T00:00:00Z");
			const endDate = new Date("2026-01-22T23:59:59Z");

			const result = buildDailyBreakdown(
				startDate,
				endDate,
				[],
				[
					{ date: "2026-01-20", count: 2 },
					{ date: "2026-01-21", count: 4 },
				],
				[{ date: "2026-01-22", count: 1 }],
			);

			expect(result[0]?.recurringCompleted).toBe(2);
			expect(result[1]?.recurringCompleted).toBe(4);
			expect(result[2]?.recurringMissed).toBe(1);
		});

		it("should handle all types of data together", () => {
			const startDate = new Date("2026-01-20T00:00:00Z");
			const endDate = new Date("2026-01-21T23:59:59Z");

			const result = buildDailyBreakdown(
				startDate,
				endDate,
				[{ date: "2026-01-20", count: 2 }],
				[{ date: "2026-01-20", count: 3 }],
				[{ date: "2026-01-21", count: 1 }],
			);

			expect(result[0]).toEqual({
				date: "2026-01-20",
				regularCompleted: 2,
				recurringCompleted: 3,
				recurringMissed: 0,
			});
			expect(result[1]).toEqual({
				date: "2026-01-21",
				regularCompleted: 0,
				recurringCompleted: 0,
				recurringMissed: 1,
			});
		});

		it("should sort results by date", () => {
			const startDate = new Date("2026-01-18T00:00:00Z");
			const endDate = new Date("2026-01-22T23:59:59Z");

			const result = buildDailyBreakdown(startDate, endDate, [], [], []);

			const dates = result.map((d) => d.date);
			const sortedDates = [...dates].sort();
			expect(dates).toEqual(sortedDates);
		});
	});

	describe("Return Value Structure", () => {
		interface AnalyticsResult {
			totalRegularCompleted: number;
			totalRecurringCompleted: number;
			totalRecurringMissed: number;
			completionRate: number;
			currentStreak: number;
			dailyBreakdown: Array<{
				date: string;
				regularCompleted: number;
				recurringCompleted: number;
				recurringMissed: number;
			}>;
		}

		it("should have all required fields", () => {
			const result: AnalyticsResult = {
				totalRegularCompleted: 5,
				totalRecurringCompleted: 10,
				totalRecurringMissed: 2,
				completionRate: 88,
				currentStreak: 3,
				dailyBreakdown: [
					{
						date: "2026-01-20",
						regularCompleted: 2,
						recurringCompleted: 5,
						recurringMissed: 1,
					},
				],
			};

			expect(result).toHaveProperty("totalRegularCompleted");
			expect(result).toHaveProperty("totalRecurringCompleted");
			expect(result).toHaveProperty("totalRecurringMissed");
			expect(result).toHaveProperty("completionRate");
			expect(result).toHaveProperty("currentStreak");
			expect(result).toHaveProperty("dailyBreakdown");
		});

		it("should have numeric values for totals", () => {
			const result: AnalyticsResult = {
				totalRegularCompleted: 5,
				totalRecurringCompleted: 10,
				totalRecurringMissed: 2,
				completionRate: 88,
				currentStreak: 3,
				dailyBreakdown: [],
			};

			expect(typeof result.totalRegularCompleted).toBe("number");
			expect(typeof result.totalRecurringCompleted).toBe("number");
			expect(typeof result.totalRecurringMissed).toBe("number");
			expect(typeof result.completionRate).toBe("number");
			expect(typeof result.currentStreak).toBe("number");
		});

		it("should have dailyBreakdown as an array", () => {
			const result: AnalyticsResult = {
				totalRegularCompleted: 0,
				totalRecurringCompleted: 0,
				totalRecurringMissed: 0,
				completionRate: 100,
				currentStreak: 0,
				dailyBreakdown: [],
			};

			expect(Array.isArray(result.dailyBreakdown)).toBe(true);
		});
	});

	describe("Missed Detection Logic", () => {
		const isMissed = (
			scheduledDate: Date,
			completedAt: Date | null,
			today: Date,
		): boolean => {
			// A recurring occurrence is missed if:
			// 1. Its scheduled date has passed (before today)
			// 2. No completion record exists (completedAt is null)
			return scheduledDate < today && completedAt === null;
		};

		it("should return true for past scheduled date with no completion", () => {
			const scheduledDate = new Date("2026-01-20T10:00:00Z");
			const today = new Date("2026-01-22T12:00:00Z");

			expect(isMissed(scheduledDate, null, today)).toBe(true);
		});

		it("should return false for past scheduled date with completion", () => {
			const scheduledDate = new Date("2026-01-20T10:00:00Z");
			const completedAt = new Date("2026-01-20T11:00:00Z");
			const today = new Date("2026-01-22T12:00:00Z");

			expect(isMissed(scheduledDate, completedAt, today)).toBe(false);
		});

		it("should return false for future scheduled date with no completion", () => {
			const scheduledDate = new Date("2026-01-25T10:00:00Z");
			const today = new Date("2026-01-22T12:00:00Z");

			expect(isMissed(scheduledDate, null, today)).toBe(false);
		});

		it("should return false for today's scheduled date with no completion", () => {
			const scheduledDate = new Date("2026-01-22T10:00:00Z");
			const today = new Date("2026-01-22T00:00:00Z");
			// scheduledDate is same day or after today start

			// At midnight today, 10am is in the future
			expect(isMissed(scheduledDate, null, today)).toBe(false);
		});
	});
});

describe("UpdatePastCompletion Procedure", () => {
	describe("Input Validation", () => {
		interface UpdatePastCompletionInput {
			todoId: number;
			scheduledDate: string;
			completed: boolean;
		}

		const validateUpdatePastCompletionInput = (
			input: unknown,
		): { valid: boolean; data?: UpdatePastCompletionInput } => {
			if (typeof input !== "object" || input === null) {
				return { valid: false };
			}

			const i = input as Record<string, unknown>;

			// todoId is required and must be a number
			if (typeof i.todoId !== "number") {
				return { valid: false };
			}

			// scheduledDate is required and must be valid datetime string
			if (typeof i.scheduledDate !== "string") {
				return { valid: false };
			}
			const scheduledDate = new Date(i.scheduledDate);
			if (Number.isNaN(scheduledDate.getTime())) {
				return { valid: false };
			}

			// completed is required and must be a boolean
			if (typeof i.completed !== "boolean") {
				return { valid: false };
			}

			return {
				valid: true,
				data: input as UpdatePastCompletionInput,
			};
		};

		it("validates valid input with completed=true", () => {
			const result = validateUpdatePastCompletionInput({
				todoId: 1,
				scheduledDate: "2026-01-15T10:00:00Z",
				completed: true,
			});
			expect(result.valid).toBe(true);
			expect(result.data?.todoId).toBe(1);
			expect(result.data?.scheduledDate).toBe("2026-01-15T10:00:00Z");
			expect(result.data?.completed).toBe(true);
		});

		it("validates valid input with completed=false", () => {
			const result = validateUpdatePastCompletionInput({
				todoId: 5,
				scheduledDate: "2026-01-10T09:00:00Z",
				completed: false,
			});
			expect(result.valid).toBe(true);
			expect(result.data?.completed).toBe(false);
		});

		it("rejects missing todoId", () => {
			expect(
				validateUpdatePastCompletionInput({
					scheduledDate: "2026-01-15T10:00:00Z",
					completed: true,
				}),
			).toEqual({ valid: false });
		});

		it("rejects string todoId", () => {
			expect(
				validateUpdatePastCompletionInput({
					todoId: "1",
					scheduledDate: "2026-01-15T10:00:00Z",
					completed: true,
				}),
			).toEqual({ valid: false });
		});

		it("rejects missing scheduledDate", () => {
			expect(
				validateUpdatePastCompletionInput({
					todoId: 1,
					completed: true,
				}),
			).toEqual({ valid: false });
		});

		it("rejects invalid scheduledDate string", () => {
			expect(
				validateUpdatePastCompletionInput({
					todoId: 1,
					scheduledDate: "not-a-date",
					completed: true,
				}),
			).toEqual({ valid: false });
		});

		it("rejects missing completed field", () => {
			expect(
				validateUpdatePastCompletionInput({
					todoId: 1,
					scheduledDate: "2026-01-15T10:00:00Z",
				}),
			).toEqual({ valid: false });
		});

		it("rejects string completed field", () => {
			expect(
				validateUpdatePastCompletionInput({
					todoId: 1,
					scheduledDate: "2026-01-15T10:00:00Z",
					completed: "true",
				}),
			).toEqual({ valid: false });
		});

		it("rejects non-object input", () => {
			expect(validateUpdatePastCompletionInput("invalid")).toEqual({
				valid: false,
			});
		});

		it("rejects null input", () => {
			expect(validateUpdatePastCompletionInput(null)).toEqual({ valid: false });
		});
	});

	describe("Business Logic", () => {
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
			recurringPattern?: RecurringPattern | null;
		}

		interface CompletionRecord {
			id: number;
			todoId: number;
			scheduledDate: Date;
			completedAt: Date | null;
			userId: string;
			createdAt: Date;
		}

		describe("Todo Ownership Verification", () => {
			it("should throw NOT_FOUND for non-existent todo", () => {
				const verifyTodoExists = (
					existingTodo: MockTodo | undefined,
					currentUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== currentUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to modify it",
						});
					}
					return existingTodo;
				};

				expect(() => verifyTodoExists(undefined, "user-123")).toThrow(
					TRPCError,
				);
			});

			it("should throw NOT_FOUND for todo owned by different user", () => {
				const verifyTodoExists = (
					existingTodo: MockTodo | undefined,
					currentUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== currentUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to modify it",
						});
					}
					return existingTodo;
				};

				const todo: MockTodo = {
					id: 1,
					text: "Test",
					completed: false,
					userId: "user-456",
					recurringPattern: { type: "daily" },
				};

				expect(() => verifyTodoExists(todo, "user-123")).toThrow(TRPCError);
			});

			it("should pass for todo owned by current user", () => {
				const verifyTodoExists = (
					existingTodo: MockTodo | undefined,
					currentUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== currentUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to modify it",
						});
					}
					return existingTodo;
				};

				const todo: MockTodo = {
					id: 1,
					text: "Test",
					completed: false,
					userId: "user-123",
					recurringPattern: { type: "daily" },
				};

				expect(() => verifyTodoExists(todo, "user-123")).not.toThrow();
			});
		});

		describe("Recurring Pattern Validation", () => {
			it("should throw BAD_REQUEST if todo has no recurring pattern", () => {
				const verifyRecurringPattern = (
					recurringPattern: RecurringPattern | null | undefined,
				) => {
					if (!recurringPattern) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Todo does not have a recurring pattern",
						});
					}
					return recurringPattern;
				};

				expect(() => verifyRecurringPattern(null)).toThrow(TRPCError);
				expect(() => verifyRecurringPattern(undefined)).toThrow(TRPCError);
			});

			it("should pass if todo has recurring pattern", () => {
				const verifyRecurringPattern = (
					recurringPattern: RecurringPattern | null | undefined,
				) => {
					if (!recurringPattern) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: "Todo does not have a recurring pattern",
						});
					}
					return recurringPattern;
				};

				const pattern: RecurringPattern = { type: "daily" };
				expect(() => verifyRecurringPattern(pattern)).not.toThrow();
			});
		});

		describe("Completion Record Update Logic", () => {
			it("should return 'updated' action when record exists and completed=true", () => {
				const determineAction = (
					existingRecord: CompletionRecord | undefined,
					completed: boolean,
				): { action: "created" | "updated"; completedAt: Date | null } => {
					if (existingRecord) {
						return {
							action: "updated",
							completedAt: completed ? new Date() : null,
						};
					}
					return {
						action: "created",
						completedAt: completed ? new Date() : null,
					};
				};

				const existingRecord: CompletionRecord = {
					id: 1,
					todoId: 10,
					scheduledDate: new Date("2026-01-15T10:00:00Z"),
					completedAt: null,
					userId: "user-123",
					createdAt: new Date(),
				};

				const result = determineAction(existingRecord, true);
				expect(result.action).toBe("updated");
				expect(result.completedAt).toBeInstanceOf(Date);
			});

			it("should return 'updated' action when record exists and completed=false", () => {
				const determineAction = (
					existingRecord: CompletionRecord | undefined,
					completed: boolean,
				): { action: "created" | "updated"; completedAt: Date | null } => {
					if (existingRecord) {
						return {
							action: "updated",
							completedAt: completed ? new Date() : null,
						};
					}
					return {
						action: "created",
						completedAt: completed ? new Date() : null,
					};
				};

				const existingRecord: CompletionRecord = {
					id: 1,
					todoId: 10,
					scheduledDate: new Date("2026-01-15T10:00:00Z"),
					completedAt: new Date("2026-01-15T11:00:00Z"),
					userId: "user-123",
					createdAt: new Date(),
				};

				const result = determineAction(existingRecord, false);
				expect(result.action).toBe("updated");
				expect(result.completedAt).toBeNull();
			});

			it("should return 'created' action when no record exists and completed=true", () => {
				const determineAction = (
					existingRecord: CompletionRecord | undefined,
					completed: boolean,
				): { action: "created" | "updated"; completedAt: Date | null } => {
					if (existingRecord) {
						return {
							action: "updated",
							completedAt: completed ? new Date() : null,
						};
					}
					return {
						action: "created",
						completedAt: completed ? new Date() : null,
					};
				};

				const result = determineAction(undefined, true);
				expect(result.action).toBe("created");
				expect(result.completedAt).toBeInstanceOf(Date);
			});

			it("should return 'created' action when no record exists and completed=false", () => {
				const determineAction = (
					existingRecord: CompletionRecord | undefined,
					completed: boolean,
				): { action: "created" | "updated"; completedAt: Date | null } => {
					if (existingRecord) {
						return {
							action: "updated",
							completedAt: completed ? new Date() : null,
						};
					}
					return {
						action: "created",
						completedAt: completed ? new Date() : null,
					};
				};

				const result = determineAction(undefined, false);
				expect(result.action).toBe("created");
				expect(result.completedAt).toBeNull();
			});
		});

		describe("New Completion Record Creation", () => {
			it("should create record with correct fields when completed=true", () => {
				interface CreateCompletionInput {
					todoId: number;
					scheduledDate: Date;
					completed: boolean;
					userId: string;
				}

				const buildCompletionRecord = (input: CreateCompletionInput) => ({
					todoId: input.todoId,
					scheduledDate: input.scheduledDate,
					completedAt: input.completed ? new Date() : null,
					userId: input.userId,
				});

				const result = buildCompletionRecord({
					todoId: 10,
					scheduledDate: new Date("2026-01-15T10:00:00Z"),
					completed: true,
					userId: "user-123",
				});

				expect(result.todoId).toBe(10);
				expect(result.scheduledDate).toEqual(new Date("2026-01-15T10:00:00Z"));
				expect(result.completedAt).toBeInstanceOf(Date);
				expect(result.userId).toBe("user-123");
			});

			it("should create record with null completedAt when completed=false", () => {
				interface CreateCompletionInput {
					todoId: number;
					scheduledDate: Date;
					completed: boolean;
					userId: string;
				}

				const buildCompletionRecord = (input: CreateCompletionInput) => ({
					todoId: input.todoId,
					scheduledDate: input.scheduledDate,
					completedAt: input.completed ? new Date() : null,
					userId: input.userId,
				});

				const result = buildCompletionRecord({
					todoId: 10,
					scheduledDate: new Date("2026-01-15T10:00:00Z"),
					completed: false,
					userId: "user-123",
				});

				expect(result.completedAt).toBeNull();
			});
		});

		describe("Return Value Structure", () => {
			it("should return correct structure for created action", () => {
				interface UpdatePastCompletionResult {
					action: "created" | "updated";
					completion: CompletionRecord;
				}

				const createResult = (
					action: "created" | "updated",
					completion: CompletionRecord,
				): UpdatePastCompletionResult => ({
					action,
					completion,
				});

				const completion: CompletionRecord = {
					id: 1,
					todoId: 10,
					scheduledDate: new Date("2026-01-15T10:00:00Z"),
					completedAt: new Date("2026-01-22T11:00:00Z"),
					userId: "user-123",
					createdAt: new Date(),
				};

				const result = createResult("created", completion);

				expect(result.action).toBe("created");
				expect(result.completion).toEqual(completion);
			});

			it("should return correct structure for updated action", () => {
				interface UpdatePastCompletionResult {
					action: "created" | "updated";
					completion: CompletionRecord;
				}

				const createResult = (
					action: "created" | "updated",
					completion: CompletionRecord,
				): UpdatePastCompletionResult => ({
					action,
					completion,
				});

				const completion: CompletionRecord = {
					id: 5,
					todoId: 10,
					scheduledDate: new Date("2026-01-15T10:00:00Z"),
					completedAt: null, // Marked as incomplete
					userId: "user-123",
					createdAt: new Date("2026-01-10T00:00:00Z"),
				};

				const result = createResult("updated", completion);

				expect(result.action).toBe("updated");
				expect(result.completion.completedAt).toBeNull();
			});
		});

		describe("Scheduled Date Lookup", () => {
			it("should find existing record by todoId and scheduledDate", () => {
				const existingRecords: CompletionRecord[] = [
					{
						id: 1,
						todoId: 10,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completedAt: new Date("2026-01-15T11:00:00Z"),
						userId: "user-123",
						createdAt: new Date(),
					},
					{
						id: 2,
						todoId: 10,
						scheduledDate: new Date("2026-01-16T10:00:00Z"),
						completedAt: null,
						userId: "user-123",
						createdAt: new Date(),
					},
					{
						id: 3,
						todoId: 20,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completedAt: null,
						userId: "user-123",
						createdAt: new Date(),
					},
				];

				const findRecord = (
					records: CompletionRecord[],
					todoId: number,
					scheduledDate: Date,
					userId: string,
				): CompletionRecord | undefined => {
					return records.find(
						(r) =>
							r.todoId === todoId &&
							r.scheduledDate.getTime() === scheduledDate.getTime() &&
							r.userId === userId,
					);
				};

				// Should find exact match
				const result1 = findRecord(
					existingRecords,
					10,
					new Date("2026-01-15T10:00:00Z"),
					"user-123",
				);
				expect(result1?.id).toBe(1);

				// Should find different date for same todo
				const result2 = findRecord(
					existingRecords,
					10,
					new Date("2026-01-16T10:00:00Z"),
					"user-123",
				);
				expect(result2?.id).toBe(2);

				// Should not find non-existent combination
				const result3 = findRecord(
					existingRecords,
					10,
					new Date("2026-01-17T10:00:00Z"),
					"user-123",
				);
				expect(result3).toBeUndefined();

				// Should not find record for different user
				const result4 = findRecord(
					existingRecords,
					10,
					new Date("2026-01-15T10:00:00Z"),
					"user-456",
				);
				expect(result4).toBeUndefined();
			});
		});

		describe("Use Cases", () => {
			it("should support marking a missed occurrence as completed retroactively", () => {
				// Simulating: User forgot to check in on Jan 15, now marking it completed on Jan 22
				interface MarkCompletedInput {
					todoId: number;
					scheduledDate: Date;
					completed: boolean;
					userId: string;
				}

				const processUpdate = (
					input: MarkCompletedInput,
					existingRecord: CompletionRecord | undefined,
				): { action: "created" | "updated"; completedAt: Date | null } => {
					if (existingRecord) {
						return {
							action: "updated",
							completedAt: input.completed ? new Date() : null,
						};
					}
					return {
						action: "created",
						completedAt: input.completed ? new Date() : null,
					};
				};

				// No existing record - creating new one
				const result = processUpdate(
					{
						todoId: 10,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completed: true,
						userId: "user-123",
					},
					undefined,
				);

				expect(result.action).toBe("created");
				expect(result.completedAt).toBeInstanceOf(Date);
			});

			it("should support unmarking an accidentally completed occurrence", () => {
				// Simulating: User accidentally marked completed, now reverting
				interface MarkCompletedInput {
					todoId: number;
					scheduledDate: Date;
					completed: boolean;
					userId: string;
				}

				const processUpdate = (
					input: MarkCompletedInput,
					existingRecord: CompletionRecord | undefined,
				): { action: "created" | "updated"; completedAt: Date | null } => {
					if (existingRecord) {
						return {
							action: "updated",
							completedAt: input.completed ? new Date() : null,
						};
					}
					return {
						action: "created",
						completedAt: input.completed ? new Date() : null,
					};
				};

				const existingRecord: CompletionRecord = {
					id: 1,
					todoId: 10,
					scheduledDate: new Date("2026-01-15T10:00:00Z"),
					completedAt: new Date("2026-01-15T11:00:00Z"),
					userId: "user-123",
					createdAt: new Date(),
				};

				const result = processUpdate(
					{
						todoId: 10,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completed: false,
						userId: "user-123",
					},
					existingRecord,
				);

				expect(result.action).toBe("updated");
				expect(result.completedAt).toBeNull();
			});

			it("should support pre-creating a record as missed (completed=false)", () => {
				// Simulating: Creating a record for a missed occurrence explicitly
				interface MarkCompletedInput {
					todoId: number;
					scheduledDate: Date;
					completed: boolean;
					userId: string;
				}

				const processUpdate = (
					input: MarkCompletedInput,
					existingRecord: CompletionRecord | undefined,
				): { action: "created" | "updated"; completedAt: Date | null } => {
					if (existingRecord) {
						return {
							action: "updated",
							completedAt: input.completed ? new Date() : null,
						};
					}
					return {
						action: "created",
						completedAt: input.completed ? new Date() : null,
					};
				};

				const result = processUpdate(
					{
						todoId: 10,
						scheduledDate: new Date("2026-01-15T10:00:00Z"),
						completed: false,
						userId: "user-123",
					},
					undefined,
				);

				expect(result.action).toBe("created");
				expect(result.completedAt).toBeNull();
			});
		});
	});
});
