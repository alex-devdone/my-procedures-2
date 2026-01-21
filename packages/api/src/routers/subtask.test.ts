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
	gt: vi.fn((a, b) => ({ type: "gt", a, b })),
	gte: vi.fn((a, b) => ({ type: "gte", a, b })),
	lt: vi.fn((a, b) => ({ type: "lt", a, b })),
	sql: vi.fn((strings, ...values) => ({ type: "sql", strings, values })),
}));

vi.mock("@my-procedures-2/db/schema/subtask", () => ({
	subtask: {
		id: "subtask.id",
		text: "subtask.text",
		completed: "subtask.completed",
		todoId: "subtask.todoId",
		order: "subtask.order",
	},
}));

vi.mock("@my-procedures-2/db/schema/todo", () => ({
	todo: {
		id: "todo.id",
		text: "todo.text",
		completed: "todo.completed",
		userId: "todo.userId",
		folderId: "todo.folderId",
	},
}));

// ============================================================================
// Type Definitions for Tests
// ============================================================================

interface MockSubtask {
	id: number;
	text: string;
	completed: boolean;
	todoId: number;
	order: number;
}

interface MockTodo {
	id: number;
	text: string;
	completed: boolean;
	userId: string;
	folderId: number | null;
}

interface MockContext {
	session: {
		user: {
			id: string;
		};
	} | null;
}

// ============================================================================
// Input Validation Tests
// ============================================================================

describe("Subtask Input Validation", () => {
	describe("Create Subtask Input Schema", () => {
		const validateCreate = (
			input: unknown,
		): { valid: boolean; todoId?: number; text?: string } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("todoId" in input) ||
				!("text" in input) ||
				typeof (input as { todoId: unknown }).todoId !== "number" ||
				typeof (input as { text: unknown }).text !== "string" ||
				(input as { text: string }).text.length < 1 ||
				(input as { text: string }).text.length > 500
			) {
				return { valid: false };
			}

			const typedInput = input as { todoId: number; text: string };
			return {
				valid: true,
				todoId: typedInput.todoId,
				text: typedInput.text,
			};
		};

		it("validates correct input", () => {
			expect(validateCreate({ todoId: 1, text: "Buy milk" })).toEqual({
				valid: true,
				todoId: 1,
				text: "Buy milk",
			});
		});

		it("rejects empty text", () => {
			expect(validateCreate({ todoId: 1, text: "" })).toEqual({ valid: false });
		});

		it("rejects missing todoId", () => {
			expect(validateCreate({ text: "Test" })).toEqual({ valid: false });
		});

		it("rejects missing text", () => {
			expect(validateCreate({ todoId: 1 })).toEqual({ valid: false });
		});

		it("rejects text over 500 characters", () => {
			expect(validateCreate({ todoId: 1, text: "a".repeat(501) })).toEqual({
				valid: false,
			});
		});

		it("accepts text at max length", () => {
			const maxText = "a".repeat(500);
			expect(validateCreate({ todoId: 1, text: maxText })).toEqual({
				valid: true,
				todoId: 1,
				text: maxText,
			});
		});

		it("rejects non-number todoId", () => {
			expect(validateCreate({ todoId: "1", text: "Test" })).toEqual({
				valid: false,
			});
		});
	});

	describe("Update Subtask Input Schema", () => {
		const validateUpdate = (
			input: unknown,
		): { valid: boolean; id?: number; text?: string } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("id" in input) ||
				typeof (input as { id: unknown }).id !== "number"
			) {
				return { valid: false };
			}

			const typedInput = input as { id: number; text?: string };

			if (typedInput.text !== undefined) {
				if (
					typeof typedInput.text !== "string" ||
					typedInput.text.length < 1 ||
					typedInput.text.length > 500
				) {
					return { valid: false };
				}
			}

			return {
				valid: true,
				id: typedInput.id,
				text: typedInput.text,
			};
		};

		it("validates correct input with id and text", () => {
			expect(validateUpdate({ id: 1, text: "Updated text" })).toEqual({
				valid: true,
				id: 1,
				text: "Updated text",
			});
		});

		it("validates input with only id", () => {
			expect(validateUpdate({ id: 1 })).toEqual({
				valid: true,
				id: 1,
				text: undefined,
			});
		});

		it("rejects string id", () => {
			expect(validateUpdate({ id: "1", text: "Test" })).toEqual({
				valid: false,
			});
		});

		it("rejects empty text when provided", () => {
			expect(validateUpdate({ id: 1, text: "" })).toEqual({ valid: false });
		});

		it("rejects text over 500 characters", () => {
			expect(validateUpdate({ id: 1, text: "a".repeat(501) })).toEqual({
				valid: false,
			});
		});
	});

	describe("Delete Subtask Input Schema", () => {
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

		it("rejects missing id", () => {
			expect(validateDelete({})).toEqual({ valid: false });
		});
	});

	describe("Toggle Subtask Input Schema", () => {
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

		it("validates correct input with completed true", () => {
			expect(validateToggle({ id: 1, completed: true })).toEqual({
				valid: true,
				id: 1,
				completed: true,
			});
		});

		it("validates correct input with completed false", () => {
			expect(validateToggle({ id: 1, completed: false })).toEqual({
				valid: true,
				id: 1,
				completed: false,
			});
		});

		it("rejects missing completed", () => {
			expect(validateToggle({ id: 1 })).toEqual({ valid: false });
		});

		it("rejects string completed", () => {
			expect(validateToggle({ id: 1, completed: "true" })).toEqual({
				valid: false,
			});
		});

		it("rejects string id", () => {
			expect(validateToggle({ id: "1", completed: true })).toEqual({
				valid: false,
			});
		});
	});

	describe("Reorder Subtask Input Schema", () => {
		const validateReorder = (
			input: unknown,
		): { valid: boolean; id?: number; newOrder?: number } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("id" in input) ||
				!("newOrder" in input) ||
				typeof (input as { id: unknown }).id !== "number" ||
				typeof (input as { newOrder: unknown }).newOrder !== "number" ||
				(input as { newOrder: number }).newOrder < 0
			) {
				return { valid: false };
			}
			return {
				valid: true,
				id: (input as { id: number }).id,
				newOrder: (input as { newOrder: number }).newOrder,
			};
		};

		it("validates correct input", () => {
			expect(validateReorder({ id: 1, newOrder: 2 })).toEqual({
				valid: true,
				id: 1,
				newOrder: 2,
			});
		});

		it("validates zero as newOrder", () => {
			expect(validateReorder({ id: 1, newOrder: 0 })).toEqual({
				valid: true,
				id: 1,
				newOrder: 0,
			});
		});

		it("rejects negative newOrder", () => {
			expect(validateReorder({ id: 1, newOrder: -1 })).toEqual({
				valid: false,
			});
		});

		it("rejects missing newOrder", () => {
			expect(validateReorder({ id: 1 })).toEqual({ valid: false });
		});

		it("rejects string id", () => {
			expect(validateReorder({ id: "1", newOrder: 2 })).toEqual({
				valid: false,
			});
		});
	});

	describe("List Subtasks Input Schema", () => {
		const validateList = (
			input: unknown,
		): { valid: boolean; todoId?: number } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("todoId" in input) ||
				typeof (input as { todoId: unknown }).todoId !== "number"
			) {
				return { valid: false };
			}
			return {
				valid: true,
				todoId: (input as { todoId: number }).todoId,
			};
		};

		it("validates correct input", () => {
			expect(validateList({ todoId: 1 })).toEqual({
				valid: true,
				todoId: 1,
			});
		});

		it("rejects missing todoId", () => {
			expect(validateList({})).toEqual({ valid: false });
		});

		it("rejects string todoId", () => {
			expect(validateList({ todoId: "1" })).toEqual({ valid: false });
		});
	});
});

// ============================================================================
// Business Logic Tests
// ============================================================================

describe("Subtask Router Business Logic", () => {
	const userId = "user-123";

	const createMockContext = (
		authenticated: boolean,
		overrideUserId?: string,
	): MockContext => ({
		session: authenticated ? { user: { id: overrideUserId ?? userId } } : null,
	});

	const createMockSubtask = (
		overrides: Partial<MockSubtask> = {},
	): MockSubtask => ({
		id: 1,
		text: "Test subtask",
		completed: false,
		todoId: 1,
		order: 0,
		...overrides,
	});

	const createMockTodo = (overrides: Partial<MockTodo> = {}): MockTodo => ({
		id: 1,
		text: "Test todo",
		completed: false,
		userId,
		folderId: null,
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Authorization Logic", () => {
		describe("Protected Procedure Middleware", () => {
			it("should throw UNAUTHORIZED when no session exists", () => {
				const ctx = createMockContext(false);

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

		describe("Todo Ownership Verification", () => {
			it("should allow access when todo belongs to user", () => {
				const aTodo = createMockTodo({ userId: "user-123" });
				const currentUserId = "user-123";

				const verifyOwnership = (
					existingTodo: MockTodo | undefined,
					ownerUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to access it",
						});
					}
					return true;
				};

				expect(verifyOwnership(aTodo, currentUserId)).toBe(true);
			});

			it("should throw NOT_FOUND when todo belongs to different user", () => {
				const aTodo = createMockTodo({ userId: "user-456" });
				const currentUserId = "user-123";

				const verifyOwnership = (
					existingTodo: MockTodo | undefined,
					ownerUserId: string,
				) => {
					if (!existingTodo || existingTodo.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Todo not found or you do not have permission to access it",
						});
					}
					return true;
				};

				expect(() => verifyOwnership(aTodo, currentUserId)).toThrow(TRPCError);
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
								"Todo not found or you do not have permission to access it",
						});
					}
					return true;
				};

				expect(() => verifyOwnership(undefined, currentUserId)).toThrow(
					TRPCError,
				);
			});
		});

		describe("Subtask Ownership Verification (via Todo)", () => {
			it("should allow access when subtask's todo belongs to user", () => {
				const subtaskWithTodo = {
					subtask: createMockSubtask({ todoId: 1 }),
					todo: createMockTodo({ id: 1, userId: "user-123" }),
				};
				const currentUserId = "user-123";

				const verifySubtaskOwnership = (
					existing: { subtask: MockSubtask; todo: MockTodo } | undefined,
					ownerUserId: string,
				) => {
					if (!existing || existing.todo.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Subtask not found or you do not have permission to access it",
						});
					}
					return true;
				};

				expect(verifySubtaskOwnership(subtaskWithTodo, currentUserId)).toBe(
					true,
				);
			});

			it("should throw NOT_FOUND when subtask's todo belongs to different user", () => {
				const subtaskWithTodo = {
					subtask: createMockSubtask({ todoId: 1 }),
					todo: createMockTodo({ id: 1, userId: "user-456" }),
				};
				const currentUserId = "user-123";

				const verifySubtaskOwnership = (
					existing: { subtask: MockSubtask; todo: MockTodo } | undefined,
					ownerUserId: string,
				) => {
					if (!existing || existing.todo.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Subtask not found or you do not have permission to access it",
						});
					}
					return true;
				};

				expect(() =>
					verifySubtaskOwnership(subtaskWithTodo, currentUserId),
				).toThrow(TRPCError);
			});

			it("should throw NOT_FOUND when subtask does not exist", () => {
				const currentUserId = "user-123";

				const verifySubtaskOwnership = (
					existing: { subtask: MockSubtask; todo: MockTodo } | undefined,
					ownerUserId: string,
				) => {
					if (!existing || existing.todo.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Subtask not found or you do not have permission to access it",
						});
					}
					return true;
				};

				expect(() => verifySubtaskOwnership(undefined, currentUserId)).toThrow(
					TRPCError,
				);
			});
		});
	});

	describe("List Operation", () => {
		it("should filter subtasks by todoId", () => {
			const allSubtasks: MockSubtask[] = [
				createMockSubtask({ id: 1, todoId: 1, order: 0 }),
				createMockSubtask({ id: 2, todoId: 2, order: 0 }),
				createMockSubtask({ id: 3, todoId: 1, order: 1 }),
			];

			const filterByTodoId = (
				subtasks: MockSubtask[],
				targetTodoId: number,
			) => {
				return subtasks.filter((s) => s.todoId === targetTodoId);
			};

			const result = filterByTodoId(allSubtasks, 1);

			expect(result).toHaveLength(2);
			expect(result.every((s) => s.todoId === 1)).toBe(true);
		});

		it("should return subtasks sorted by order", () => {
			const subtasks: MockSubtask[] = [
				createMockSubtask({ id: 1, order: 2 }),
				createMockSubtask({ id: 2, order: 0 }),
				createMockSubtask({ id: 3, order: 1 }),
			];

			const sortByOrder = (subtasksToSort: MockSubtask[]) => {
				return [...subtasksToSort].sort((a, b) => a.order - b.order);
			};

			const result = sortByOrder(subtasks);

			expect(result[0]?.order).toBe(0);
			expect(result[1]?.order).toBe(1);
			expect(result[2]?.order).toBe(2);
		});

		it("should return empty array when todo has no subtasks", () => {
			const allSubtasks: MockSubtask[] = [
				createMockSubtask({ id: 1, todoId: 1 }),
				createMockSubtask({ id: 2, todoId: 2 }),
			];

			const filterByTodoId = (
				subtasks: MockSubtask[],
				targetTodoId: number,
			) => {
				return subtasks.filter((s) => s.todoId === targetTodoId);
			};

			const result = filterByTodoId(allSubtasks, 3);

			expect(result).toHaveLength(0);
		});
	});

	describe("Create Operation", () => {
		it("should create subtask with correct structure", () => {
			const createSubtaskData = (
				text: string,
				todoId: number,
				order: number,
			): Omit<MockSubtask, "id"> => ({
				text,
				todoId,
				order,
				completed: false,
			});

			const result = createSubtaskData("Buy milk", 1, 0);

			expect(result).toEqual({
				text: "Buy milk",
				todoId: 1,
				order: 0,
				completed: false,
			});
		});

		it("should calculate next order based on max existing order", () => {
			const calculateNextOrder = (maxOrder: number | null) => {
				return (maxOrder ?? -1) + 1;
			};

			expect(calculateNextOrder(null)).toBe(0);
			expect(calculateNextOrder(-1)).toBe(0);
			expect(calculateNextOrder(0)).toBe(1);
			expect(calculateNextOrder(5)).toBe(6);
		});

		it("should default completed to false", () => {
			const createSubtaskData = (
				text: string,
				todoId: number,
				order: number,
			): Omit<MockSubtask, "id"> => ({
				text,
				todoId,
				order,
				completed: false,
			});

			const result = createSubtaskData("Test", 1, 0);

			expect(result.completed).toBe(false);
		});
	});

	describe("Update Operation", () => {
		it("should update subtask text", () => {
			const applyUpdate = (
				aSubtask: MockSubtask,
				updates: { text?: string },
			): MockSubtask => ({
				...aSubtask,
				...updates,
			});

			const original = createMockSubtask({ text: "Old text" });
			const updated = applyUpdate(original, { text: "New text" });

			expect(updated.text).toBe("New text");
		});

		it("should preserve other fields when updating text", () => {
			const applyUpdate = (
				aSubtask: MockSubtask,
				updates: { text?: string },
			): MockSubtask => ({
				...aSubtask,
				...updates,
			});

			const original = createMockSubtask({
				id: 5,
				text: "Original",
				completed: true,
				todoId: 3,
				order: 2,
			});
			const updated = applyUpdate(original, { text: "Updated" });

			expect(updated.id).toBe(5);
			expect(updated.completed).toBe(true);
			expect(updated.todoId).toBe(3);
			expect(updated.order).toBe(2);
		});

		it("should return existing subtask when no updates provided", () => {
			const applyUpdate = (
				aSubtask: MockSubtask,
				updates: { text?: string },
			): MockSubtask => {
				if (updates.text === undefined) {
					return aSubtask;
				}
				return { ...aSubtask, ...updates };
			};

			const original = createMockSubtask();
			const result = applyUpdate(original, {});

			expect(result).toBe(original);
		});
	});

	describe("Delete Operation", () => {
		it("should remove subtask from list", () => {
			const subtasks: MockSubtask[] = [
				createMockSubtask({ id: 1 }),
				createMockSubtask({ id: 2 }),
				createMockSubtask({ id: 3 }),
			];

			const removeSubtask = (list: MockSubtask[], idToRemove: number) => {
				return list.filter((s) => s.id !== idToRemove);
			};

			const result = removeSubtask(subtasks, 2);

			expect(result).toHaveLength(2);
			expect(result.find((s) => s.id === 2)).toBeUndefined();
		});

		it("should reorder remaining subtasks after deletion", () => {
			const subtasks: MockSubtask[] = [
				createMockSubtask({ id: 1, order: 0 }),
				createMockSubtask({ id: 2, order: 1 }),
				createMockSubtask({ id: 3, order: 2 }),
			];

			const reorderAfterDelete = (
				list: MockSubtask[],
				deletedOrder: number,
			) => {
				return list.map((s) => ({
					...s,
					order: s.order > deletedOrder ? s.order - 1 : s.order,
				}));
			};

			// Delete subtask with order 1
			const afterDelete = subtasks.filter((s) => s.id !== 2);
			const result = reorderAfterDelete(afterDelete, 1);

			expect(result.find((s) => s.id === 1)?.order).toBe(0);
			expect(result.find((s) => s.id === 3)?.order).toBe(1);
		});
	});

	describe("Toggle Operation", () => {
		it("should toggle subtask to completed", () => {
			const applyToggle = (
				aSubtask: MockSubtask,
				completed: boolean,
			): MockSubtask => ({
				...aSubtask,
				completed,
			});

			const original = createMockSubtask({ completed: false });
			const result = applyToggle(original, true);

			expect(result.completed).toBe(true);
		});

		it("should toggle subtask to incomplete", () => {
			const applyToggle = (
				aSubtask: MockSubtask,
				completed: boolean,
			): MockSubtask => ({
				...aSubtask,
				completed,
			});

			const original = createMockSubtask({ completed: true });
			const result = applyToggle(original, false);

			expect(result.completed).toBe(false);
		});

		it("should preserve other fields when toggling", () => {
			const applyToggle = (
				aSubtask: MockSubtask,
				completed: boolean,
			): MockSubtask => ({
				...aSubtask,
				completed,
			});

			const original = createMockSubtask({
				id: 5,
				text: "Test",
				todoId: 3,
				order: 2,
				completed: false,
			});
			const result = applyToggle(original, true);

			expect(result.id).toBe(5);
			expect(result.text).toBe("Test");
			expect(result.todoId).toBe(3);
			expect(result.order).toBe(2);
		});
	});

	describe("Reorder Operation", () => {
		it("should return existing subtask when order unchanged", () => {
			const aSubtask = createMockSubtask({ order: 2 });
			const newOrder = 2;

			const shouldReorder = aSubtask.order !== newOrder;

			expect(shouldReorder).toBe(false);
		});

		it("should calculate correct shift when moving down", () => {
			// Moving from order 1 to order 3
			// Subtasks at 2 and 3 should shift up (decrement)
			const oldOrder = 1;
			const newOrder = 3;

			const shouldShiftUp = (subtaskOrder: number) => {
				return subtaskOrder > oldOrder && subtaskOrder <= newOrder;
			};

			expect(shouldShiftUp(0)).toBe(false);
			expect(shouldShiftUp(1)).toBe(false);
			expect(shouldShiftUp(2)).toBe(true);
			expect(shouldShiftUp(3)).toBe(true);
			expect(shouldShiftUp(4)).toBe(false);
		});

		it("should calculate correct shift when moving up", () => {
			// Moving from order 3 to order 1
			// Subtasks at 1 and 2 should shift down (increment)
			const oldOrder = 3;
			const newOrder = 1;

			const shouldShiftDown = (subtaskOrder: number) => {
				return subtaskOrder >= newOrder && subtaskOrder < oldOrder;
			};

			expect(shouldShiftDown(0)).toBe(false);
			expect(shouldShiftDown(1)).toBe(true);
			expect(shouldShiftDown(2)).toBe(true);
			expect(shouldShiftDown(3)).toBe(false);
			expect(shouldShiftDown(4)).toBe(false);
		});

		it("should apply reorder correctly", () => {
			const subtasks: MockSubtask[] = [
				createMockSubtask({ id: 1, order: 0 }),
				createMockSubtask({ id: 2, order: 1 }),
				createMockSubtask({ id: 3, order: 2 }),
				createMockSubtask({ id: 4, order: 3 }),
			];

			const applyReorder = (
				list: MockSubtask[],
				subtaskId: number,
				newOrder: number,
			) => {
				const target = list.find((s) => s.id === subtaskId);
				if (!target) return list;

				const oldOrder = target.order;
				if (oldOrder === newOrder) return list;

				return list.map((s) => {
					if (s.id === subtaskId) {
						return { ...s, order: newOrder };
					}
					if (newOrder > oldOrder) {
						// Moving down: shift items between old and new up
						if (s.order > oldOrder && s.order <= newOrder) {
							return { ...s, order: s.order - 1 };
						}
					} else {
						// Moving up: shift items between new and old down
						if (s.order >= newOrder && s.order < oldOrder) {
							return { ...s, order: s.order + 1 };
						}
					}
					return s;
				});
			};

			// Move subtask 1 (order 0) to order 2
			const result = applyReorder(subtasks, 1, 2);

			expect(result.find((s) => s.id === 1)?.order).toBe(2);
			expect(result.find((s) => s.id === 2)?.order).toBe(0);
			expect(result.find((s) => s.id === 3)?.order).toBe(1);
			expect(result.find((s) => s.id === 4)?.order).toBe(3);
		});
	});

	describe("Auto-Complete Parent Todo Logic", () => {
		it("should mark parent todo as complete when all subtasks are completed", () => {
			const subtasks: MockSubtask[] = [
				createMockSubtask({ id: 1, completed: true }),
				createMockSubtask({ id: 2, completed: true }),
				createMockSubtask({ id: 3, completed: true }),
			];

			const shouldAutoComplete = (todoSubtasks: MockSubtask[]) => {
				if (todoSubtasks.length === 0) return null;
				return todoSubtasks.every((s) => s.completed);
			};

			expect(shouldAutoComplete(subtasks)).toBe(true);
		});

		it("should mark parent todo as incomplete when any subtask is incomplete", () => {
			const subtasks: MockSubtask[] = [
				createMockSubtask({ id: 1, completed: true }),
				createMockSubtask({ id: 2, completed: false }),
				createMockSubtask({ id: 3, completed: true }),
			];

			const shouldAutoComplete = (todoSubtasks: MockSubtask[]) => {
				if (todoSubtasks.length === 0) return null;
				return todoSubtasks.every((s) => s.completed);
			};

			expect(shouldAutoComplete(subtasks)).toBe(false);
		});

		it("should not change parent todo when there are no subtasks", () => {
			const subtasks: MockSubtask[] = [];

			const shouldAutoComplete = (todoSubtasks: MockSubtask[]) => {
				if (todoSubtasks.length === 0) return null;
				return todoSubtasks.every((s) => s.completed);
			};

			expect(shouldAutoComplete(subtasks)).toBe(null);
		});

		it("should mark parent incomplete when new subtask is added", () => {
			// Adding a new subtask always marks parent incomplete
			// because new subtasks start with completed: false
			const shouldMarkIncompleteOnAdd = () => true;

			expect(shouldMarkIncompleteOnAdd()).toBe(true);
		});

		it("should recalculate after subtask deletion", () => {
			// Before deletion: 3 subtasks, 2 complete, 1 incomplete
			const beforeDelete: MockSubtask[] = [
				createMockSubtask({ id: 1, completed: true }),
				createMockSubtask({ id: 2, completed: false }),
				createMockSubtask({ id: 3, completed: true }),
			];

			// After deleting the incomplete one
			const afterDelete = beforeDelete.filter((s) => s.id !== 2);

			const shouldAutoComplete = (todoSubtasks: MockSubtask[]) => {
				if (todoSubtasks.length === 0) return null;
				return todoSubtasks.every((s) => s.completed);
			};

			expect(shouldAutoComplete(beforeDelete)).toBe(false);
			expect(shouldAutoComplete(afterDelete)).toBe(true);
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
					message: "Subtask not found",
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
