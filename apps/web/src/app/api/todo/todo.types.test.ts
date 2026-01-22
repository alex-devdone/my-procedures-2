import { describe, expect, it } from "vitest";
import type { UseTodoStorageReturn } from "./todo.types";
import {
	bulkCreateTodosInputSchema,
	completeRecurringInputSchema,
	createTodoInputSchema,
	deleteTodoInputSchema,
	getDueInRangeInputSchema,
	localCreateTodoInputSchema,
	localDeleteTodoInputSchema,
	localToggleTodoInputSchema,
	localUpdateTodoFolderInputSchema,
	localUpdateTodoScheduleInputSchema,
	RECURRING_PATTERN_TYPES,
	recurringPatternSchema,
	toggleTodoInputSchema,
	updateTodoFolderInputSchema,
	updateTodoScheduleInputSchema,
} from "./todo.types";

// ============================================================================
// Recurring Pattern Schema Tests
// ============================================================================

describe("Recurring Pattern Schema", () => {
	describe("recurringPatternSchema", () => {
		it("accepts daily pattern", () => {
			const result = recurringPatternSchema.safeParse({ type: "daily" });
			expect(result.success).toBe(true);
		});

		it("accepts weekly pattern", () => {
			const result = recurringPatternSchema.safeParse({ type: "weekly" });
			expect(result.success).toBe(true);
		});

		it("accepts monthly pattern", () => {
			const result = recurringPatternSchema.safeParse({ type: "monthly" });
			expect(result.success).toBe(true);
		});

		it("accepts yearly pattern", () => {
			const result = recurringPatternSchema.safeParse({ type: "yearly" });
			expect(result.success).toBe(true);
		});

		it("accepts custom pattern", () => {
			const result = recurringPatternSchema.safeParse({ type: "custom" });
			expect(result.success).toBe(true);
		});

		it("rejects invalid pattern type", () => {
			const result = recurringPatternSchema.safeParse({ type: "invalid" });
			expect(result.success).toBe(false);
		});

		it("accepts pattern with interval", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				interval: 3,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.interval).toBe(3);
			}
		});

		it("rejects non-positive interval", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				interval: 0,
			});
			expect(result.success).toBe(false);
		});

		it("rejects negative interval", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				interval: -1,
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-integer interval", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				interval: 1.5,
			});
			expect(result.success).toBe(false);
		});

		it("accepts weekly pattern with daysOfWeek", () => {
			const result = recurringPatternSchema.safeParse({
				type: "weekly",
				daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.daysOfWeek).toEqual([1, 3, 5]);
			}
		});

		it("accepts daysOfWeek with all valid values (0-6)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "weekly",
				daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
			});
			expect(result.success).toBe(true);
		});

		it("rejects daysOfWeek with invalid day (7)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "weekly",
				daysOfWeek: [7],
			});
			expect(result.success).toBe(false);
		});

		it("rejects daysOfWeek with negative day", () => {
			const result = recurringPatternSchema.safeParse({
				type: "weekly",
				daysOfWeek: [-1],
			});
			expect(result.success).toBe(false);
		});

		it("accepts monthly pattern with dayOfMonth", () => {
			const result = recurringPatternSchema.safeParse({
				type: "monthly",
				dayOfMonth: 15,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.dayOfMonth).toBe(15);
			}
		});

		it("accepts dayOfMonth at boundaries (1 and 31)", () => {
			const result1 = recurringPatternSchema.safeParse({
				type: "monthly",
				dayOfMonth: 1,
			});
			const result31 = recurringPatternSchema.safeParse({
				type: "monthly",
				dayOfMonth: 31,
			});
			expect(result1.success).toBe(true);
			expect(result31.success).toBe(true);
		});

		it("rejects dayOfMonth outside valid range", () => {
			const result0 = recurringPatternSchema.safeParse({
				type: "monthly",
				dayOfMonth: 0,
			});
			const result32 = recurringPatternSchema.safeParse({
				type: "monthly",
				dayOfMonth: 32,
			});
			expect(result0.success).toBe(false);
			expect(result32.success).toBe(false);
		});

		it("accepts yearly pattern with monthOfYear", () => {
			const result = recurringPatternSchema.safeParse({
				type: "yearly",
				monthOfYear: 6,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.monthOfYear).toBe(6);
			}
		});

		it("accepts monthOfYear at boundaries (1 and 12)", () => {
			const result1 = recurringPatternSchema.safeParse({
				type: "yearly",
				monthOfYear: 1,
			});
			const result12 = recurringPatternSchema.safeParse({
				type: "yearly",
				monthOfYear: 12,
			});
			expect(result1.success).toBe(true);
			expect(result12.success).toBe(true);
		});

		it("rejects monthOfYear outside valid range", () => {
			const result0 = recurringPatternSchema.safeParse({
				type: "yearly",
				monthOfYear: 0,
			});
			const result13 = recurringPatternSchema.safeParse({
				type: "yearly",
				monthOfYear: 13,
			});
			expect(result0.success).toBe(false);
			expect(result13.success).toBe(false);
		});

		it("accepts pattern with endDate", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				endDate: "2026-12-31",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.endDate).toBe("2026-12-31");
			}
		});

		it("accepts pattern with occurrences", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				occurrences: 10,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.occurrences).toBe(10);
			}
		});

		it("rejects non-positive occurrences", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				occurrences: 0,
			});
			expect(result.success).toBe(false);
		});

		it("accepts complete pattern with all fields", () => {
			const result = recurringPatternSchema.safeParse({
				type: "yearly",
				interval: 2,
				monthOfYear: 1,
				dayOfMonth: 15,
				endDate: "2030-12-31",
				occurrences: 5,
			});
			expect(result.success).toBe(true);
		});

		// notifyAt field tests
		it("accepts pattern with valid notifyAt time (09:00)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				notifyAt: "09:00",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.notifyAt).toBe("09:00");
			}
		});

		it("accepts pattern with notifyAt at midnight (00:00)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				notifyAt: "00:00",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.notifyAt).toBe("00:00");
			}
		});

		it("accepts pattern with notifyAt at end of day (23:59)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				notifyAt: "23:59",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.notifyAt).toBe("23:59");
			}
		});

		it("accepts pattern with notifyAt afternoon time (14:30)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "weekly",
				daysOfWeek: [1, 3, 5],
				notifyAt: "14:30",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.notifyAt).toBe("14:30");
			}
		});

		it("accepts pattern without notifyAt (undefined)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.notifyAt).toBeUndefined();
			}
		});

		it("rejects notifyAt with invalid hour (24:00)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				notifyAt: "24:00",
			});
			expect(result.success).toBe(false);
		});

		it("rejects notifyAt with invalid minute (12:60)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				notifyAt: "12:60",
			});
			expect(result.success).toBe(false);
		});

		it("rejects notifyAt with incorrect format (9:00 instead of 09:00)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				notifyAt: "9:00",
			});
			expect(result.success).toBe(false);
		});

		it("rejects notifyAt with seconds (09:00:00)", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				notifyAt: "09:00:00",
			});
			expect(result.success).toBe(false);
		});

		it("rejects notifyAt with invalid string format", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				notifyAt: "morning",
			});
			expect(result.success).toBe(false);
		});

		it("rejects notifyAt with AM/PM format", () => {
			const result = recurringPatternSchema.safeParse({
				type: "daily",
				notifyAt: "9:00 AM",
			});
			expect(result.success).toBe(false);
		});

		it("accepts complete pattern with all fields including notifyAt", () => {
			const result = recurringPatternSchema.safeParse({
				type: "weekly",
				interval: 2,
				daysOfWeek: [1, 3, 5],
				endDate: "2030-12-31",
				occurrences: 10,
				notifyAt: "09:00",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.notifyAt).toBe("09:00");
			}
		});
	});

	describe("RECURRING_PATTERN_TYPES constant", () => {
		it("contains 5 pattern types", () => {
			expect(RECURRING_PATTERN_TYPES).toHaveLength(5);
		});

		it("includes all expected types", () => {
			expect(RECURRING_PATTERN_TYPES).toContain("daily");
			expect(RECURRING_PATTERN_TYPES).toContain("weekly");
			expect(RECURRING_PATTERN_TYPES).toContain("monthly");
			expect(RECURRING_PATTERN_TYPES).toContain("yearly");
			expect(RECURRING_PATTERN_TYPES).toContain("custom");
		});
	});
});

// ============================================================================
// Remote Input Schema Tests
// ============================================================================

describe("Create Todo Input Schema", () => {
	describe("createTodoInputSchema", () => {
		it("accepts valid input with text only", () => {
			const result = createTodoInputSchema.safeParse({ text: "Buy groceries" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.text).toBe("Buy groceries");
			}
		});

		it("rejects empty text", () => {
			const result = createTodoInputSchema.safeParse({ text: "" });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe("Todo text is required");
			}
		});

		it("accepts input with folderId", () => {
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				folderId: 1,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.folderId).toBe(1);
			}
		});

		it("accepts input with null folderId", () => {
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				folderId: null,
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with dueDate", () => {
			const dueDate = "2026-01-25T10:00:00.000Z";
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				dueDate,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.dueDate).toBe(dueDate);
			}
		});

		it("accepts input with null dueDate", () => {
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				dueDate: null,
			});
			expect(result.success).toBe(true);
		});

		it("rejects invalid dueDate format", () => {
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				dueDate: "not-a-date",
			});
			expect(result.success).toBe(false);
		});

		it("accepts input with reminderAt", () => {
			const reminderAt = "2026-01-25T09:00:00.000Z";
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				reminderAt,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.reminderAt).toBe(reminderAt);
			}
		});

		it("accepts input with null reminderAt", () => {
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				reminderAt: null,
			});
			expect(result.success).toBe(true);
		});

		it("rejects invalid reminderAt format", () => {
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				reminderAt: "tomorrow",
			});
			expect(result.success).toBe(false);
		});

		it("accepts input with recurringPattern", () => {
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				recurringPattern: { type: "daily" },
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.recurringPattern?.type).toBe("daily");
			}
		});

		it("accepts input with null recurringPattern", () => {
			const result = createTodoInputSchema.safeParse({
				text: "Task",
				recurringPattern: null,
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with all scheduling fields", () => {
			const result = createTodoInputSchema.safeParse({
				text: "Daily standup",
				folderId: 1,
				dueDate: "2026-01-25T09:00:00.000Z",
				reminderAt: "2026-01-25T08:45:00.000Z",
				recurringPattern: { type: "weekly", daysOfWeek: [1, 2, 3, 4, 5] },
			});
			expect(result.success).toBe(true);
		});
	});
});

describe("Toggle Todo Input Schema", () => {
	describe("toggleTodoInputSchema", () => {
		it("accepts valid input", () => {
			const result = toggleTodoInputSchema.safeParse({
				id: 1,
				completed: true,
			});
			expect(result.success).toBe(true);
		});

		it("accepts completed false", () => {
			const result = toggleTodoInputSchema.safeParse({
				id: 1,
				completed: false,
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing id", () => {
			const result = toggleTodoInputSchema.safeParse({ completed: true });
			expect(result.success).toBe(false);
		});

		it("rejects missing completed", () => {
			const result = toggleTodoInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = toggleTodoInputSchema.safeParse({
				id: "abc",
				completed: true,
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Delete Todo Input Schema", () => {
	describe("deleteTodoInputSchema", () => {
		it("accepts valid numeric id", () => {
			const result = deleteTodoInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(true);
		});

		it("rejects missing id", () => {
			const result = deleteTodoInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = deleteTodoInputSchema.safeParse({ id: "abc" });
			expect(result.success).toBe(false);
		});
	});
});

describe("Bulk Create Todos Input Schema", () => {
	describe("bulkCreateTodosInputSchema", () => {
		it("accepts valid input with basic todos", () => {
			const result = bulkCreateTodosInputSchema.safeParse({
				todos: [
					{ text: "Task 1", completed: false },
					{ text: "Task 2", completed: true },
				],
			});
			expect(result.success).toBe(true);
		});

		it("accepts empty todos array", () => {
			const result = bulkCreateTodosInputSchema.safeParse({ todos: [] });
			expect(result.success).toBe(true);
		});

		it("accepts todos with scheduling fields", () => {
			const result = bulkCreateTodosInputSchema.safeParse({
				todos: [
					{
						text: "Task 1",
						completed: false,
						folderId: 1,
						dueDate: "2026-01-25T10:00:00.000Z",
						reminderAt: "2026-01-25T09:00:00.000Z",
						recurringPattern: { type: "daily" },
					},
				],
			});
			expect(result.success).toBe(true);
		});

		it("accepts todos with null scheduling fields", () => {
			const result = bulkCreateTodosInputSchema.safeParse({
				todos: [
					{
						text: "Task 1",
						completed: false,
						folderId: null,
						dueDate: null,
						reminderAt: null,
						recurringPattern: null,
					},
				],
			});
			expect(result.success).toBe(true);
		});

		it("rejects todos with empty text", () => {
			const result = bulkCreateTodosInputSchema.safeParse({
				todos: [{ text: "", completed: false }],
			});
			expect(result.success).toBe(false);
		});

		it("rejects todos with invalid date format", () => {
			const result = bulkCreateTodosInputSchema.safeParse({
				todos: [{ text: "Task", completed: false, dueDate: "invalid-date" }],
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Update Todo Folder Input Schema", () => {
	describe("updateTodoFolderInputSchema", () => {
		it("accepts valid input", () => {
			const result = updateTodoFolderInputSchema.safeParse({
				id: 1,
				folderId: 2,
			});
			expect(result.success).toBe(true);
		});

		it("accepts null folderId", () => {
			const result = updateTodoFolderInputSchema.safeParse({
				id: 1,
				folderId: null,
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing id", () => {
			const result = updateTodoFolderInputSchema.safeParse({ folderId: 1 });
			expect(result.success).toBe(false);
		});

		it("rejects missing folderId", () => {
			const result = updateTodoFolderInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(false);
		});
	});
});

describe("Update Todo Schedule Input Schema", () => {
	describe("updateTodoScheduleInputSchema", () => {
		it("accepts valid input with dueDate", () => {
			const result = updateTodoScheduleInputSchema.safeParse({
				id: 1,
				dueDate: "2026-01-25T10:00:00.000Z",
			});
			expect(result.success).toBe(true);
		});

		it("accepts valid input with reminderAt", () => {
			const result = updateTodoScheduleInputSchema.safeParse({
				id: 1,
				reminderAt: "2026-01-25T09:00:00.000Z",
			});
			expect(result.success).toBe(true);
		});

		it("accepts valid input with recurringPattern", () => {
			const result = updateTodoScheduleInputSchema.safeParse({
				id: 1,
				recurringPattern: { type: "weekly", daysOfWeek: [1, 3, 5] },
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with all scheduling fields", () => {
			const result = updateTodoScheduleInputSchema.safeParse({
				id: 1,
				dueDate: "2026-01-25T10:00:00.000Z",
				reminderAt: "2026-01-25T09:00:00.000Z",
				recurringPattern: { type: "daily", interval: 2 },
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with null values to clear scheduling", () => {
			const result = updateTodoScheduleInputSchema.safeParse({
				id: 1,
				dueDate: null,
				reminderAt: null,
				recurringPattern: null,
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with only id (no updates)", () => {
			const result = updateTodoScheduleInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(true);
		});

		it("rejects missing id", () => {
			const result = updateTodoScheduleInputSchema.safeParse({
				dueDate: "2026-01-25T10:00:00.000Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid dueDate format", () => {
			const result = updateTodoScheduleInputSchema.safeParse({
				id: 1,
				dueDate: "tomorrow",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid recurringPattern", () => {
			const result = updateTodoScheduleInputSchema.safeParse({
				id: 1,
				recurringPattern: { type: "invalid" },
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Get Due In Range Input Schema", () => {
	describe("getDueInRangeInputSchema", () => {
		it("accepts valid date range", () => {
			const result = getDueInRangeInputSchema.safeParse({
				startDate: "2026-01-20T00:00:00.000Z",
				endDate: "2026-01-27T23:59:59.000Z",
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing startDate", () => {
			const result = getDueInRangeInputSchema.safeParse({
				endDate: "2026-01-27T23:59:59.000Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing endDate", () => {
			const result = getDueInRangeInputSchema.safeParse({
				startDate: "2026-01-20T00:00:00.000Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid startDate format", () => {
			const result = getDueInRangeInputSchema.safeParse({
				startDate: "yesterday",
				endDate: "2026-01-27T23:59:59.000Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid endDate format", () => {
			const result = getDueInRangeInputSchema.safeParse({
				startDate: "2026-01-20T00:00:00.000Z",
				endDate: "next week",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Complete Recurring Input Schema", () => {
	describe("completeRecurringInputSchema", () => {
		it("accepts valid input with id only", () => {
			const result = completeRecurringInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(true);
		});

		it("accepts valid input with completedOccurrences", () => {
			const result = completeRecurringInputSchema.safeParse({
				id: 1,
				completedOccurrences: 5,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.completedOccurrences).toBe(5);
			}
		});

		it("accepts completedOccurrences of 0", () => {
			const result = completeRecurringInputSchema.safeParse({
				id: 1,
				completedOccurrences: 0,
			});
			expect(result.success).toBe(true);
		});

		it("rejects negative completedOccurrences", () => {
			const result = completeRecurringInputSchema.safeParse({
				id: 1,
				completedOccurrences: -1,
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing id", () => {
			const result = completeRecurringInputSchema.safeParse({
				completedOccurrences: 5,
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = completeRecurringInputSchema.safeParse({ id: "abc" });
			expect(result.success).toBe(false);
		});

		it("rejects non-integer completedOccurrences", () => {
			const result = completeRecurringInputSchema.safeParse({
				id: 1,
				completedOccurrences: 2.5,
			});
			expect(result.success).toBe(false);
		});
	});
});

// ============================================================================
// Local Input Schema Tests
// ============================================================================

describe("Local Create Todo Input Schema", () => {
	describe("localCreateTodoInputSchema", () => {
		it("accepts valid input with text only", () => {
			const result = localCreateTodoInputSchema.safeParse({
				text: "Buy groceries",
			});
			expect(result.success).toBe(true);
		});

		it("rejects empty text", () => {
			const result = localCreateTodoInputSchema.safeParse({ text: "" });
			expect(result.success).toBe(false);
		});

		it("accepts input with string folderId", () => {
			const result = localCreateTodoInputSchema.safeParse({
				text: "Task",
				folderId: "uuid-123",
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with null folderId", () => {
			const result = localCreateTodoInputSchema.safeParse({
				text: "Task",
				folderId: null,
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with dueDate string", () => {
			const result = localCreateTodoInputSchema.safeParse({
				text: "Task",
				dueDate: "2026-01-25T10:00:00.000Z",
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with null dueDate", () => {
			const result = localCreateTodoInputSchema.safeParse({
				text: "Task",
				dueDate: null,
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with reminderAt string", () => {
			const result = localCreateTodoInputSchema.safeParse({
				text: "Task",
				reminderAt: "2026-01-25T09:00:00.000Z",
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with recurringPattern", () => {
			const result = localCreateTodoInputSchema.safeParse({
				text: "Task",
				recurringPattern: { type: "daily" },
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with all scheduling fields", () => {
			const result = localCreateTodoInputSchema.safeParse({
				text: "Daily standup",
				folderId: "uuid-123",
				dueDate: "2026-01-25T09:00:00.000Z",
				reminderAt: "2026-01-25T08:45:00.000Z",
				recurringPattern: { type: "weekly", daysOfWeek: [1, 2, 3, 4, 5] },
			});
			expect(result.success).toBe(true);
		});
	});
});

describe("Local Toggle Todo Input Schema", () => {
	describe("localToggleTodoInputSchema", () => {
		it("accepts valid input with string id", () => {
			const result = localToggleTodoInputSchema.safeParse({
				id: "uuid-123",
				completed: true,
			});
			expect(result.success).toBe(true);
		});

		it("rejects numeric id", () => {
			const result = localToggleTodoInputSchema.safeParse({
				id: 123,
				completed: true,
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing completed", () => {
			const result = localToggleTodoInputSchema.safeParse({ id: "uuid-123" });
			expect(result.success).toBe(false);
		});
	});
});

describe("Local Delete Todo Input Schema", () => {
	describe("localDeleteTodoInputSchema", () => {
		it("accepts valid string id", () => {
			const result = localDeleteTodoInputSchema.safeParse({ id: "uuid-123" });
			expect(result.success).toBe(true);
		});

		it("rejects numeric id", () => {
			const result = localDeleteTodoInputSchema.safeParse({ id: 123 });
			expect(result.success).toBe(false);
		});

		it("rejects missing id", () => {
			const result = localDeleteTodoInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});
});

describe("Local Update Todo Folder Input Schema", () => {
	describe("localUpdateTodoFolderInputSchema", () => {
		it("accepts valid input with string id", () => {
			const result = localUpdateTodoFolderInputSchema.safeParse({
				id: "uuid-123",
				folderId: "uuid-456",
			});
			expect(result.success).toBe(true);
		});

		it("accepts null folderId", () => {
			const result = localUpdateTodoFolderInputSchema.safeParse({
				id: "uuid-123",
				folderId: null,
			});
			expect(result.success).toBe(true);
		});

		it("rejects numeric id", () => {
			const result = localUpdateTodoFolderInputSchema.safeParse({
				id: 123,
				folderId: "uuid-456",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Local Update Todo Schedule Input Schema", () => {
	describe("localUpdateTodoScheduleInputSchema", () => {
		it("accepts valid input with string id", () => {
			const result = localUpdateTodoScheduleInputSchema.safeParse({
				id: "uuid-123",
				dueDate: "2026-01-25T10:00:00.000Z",
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with all scheduling fields", () => {
			const result = localUpdateTodoScheduleInputSchema.safeParse({
				id: "uuid-123",
				dueDate: "2026-01-25T10:00:00.000Z",
				reminderAt: "2026-01-25T09:00:00.000Z",
				recurringPattern: { type: "daily" },
			});
			expect(result.success).toBe(true);
		});

		it("accepts input with null values to clear scheduling", () => {
			const result = localUpdateTodoScheduleInputSchema.safeParse({
				id: "uuid-123",
				dueDate: null,
				reminderAt: null,
				recurringPattern: null,
			});
			expect(result.success).toBe(true);
		});

		it("rejects numeric id", () => {
			const result = localUpdateTodoScheduleInputSchema.safeParse({
				id: 123,
				dueDate: "2026-01-25T10:00:00.000Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing id", () => {
			const result = localUpdateTodoScheduleInputSchema.safeParse({
				dueDate: "2026-01-25T10:00:00.000Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid recurringPattern", () => {
			const result = localUpdateTodoScheduleInputSchema.safeParse({
				id: "uuid-123",
				recurringPattern: { type: "invalid" },
			});
			expect(result.success).toBe(false);
		});
	});
});

// ============================================================================
// Hook Return Type Tests
// ============================================================================

describe("UseTodoStorageReturn", () => {
	describe("toggle method signature", () => {
		it("accepts numeric id and completed boolean without options", () => {
			// Type test: ensure the signature accepts id and completed parameters
			const mockToggle: UseTodoStorageReturn["toggle"] = async (
				_id,
				_completed,
			) => {
				// Mock implementation
				return Promise.resolve();
			};

			// This should compile without errors
			mockToggle(1, true);
			mockToggle(123, false);

			expect(true).toBe(true);
		});

		it("accepts string id and completed boolean without options", () => {
			const mockToggle: UseTodoStorageReturn["toggle"] = async (
				_id,
				_completed,
			) => {
				return Promise.resolve();
			};

			// This should compile without errors
			mockToggle("uuid-123", true);
			mockToggle("local-id", false);

			expect(true).toBe(true);
		});

		it("accepts optional options parameter with virtualDate", () => {
			const mockToggle: UseTodoStorageReturn["toggle"] = async (
				_id,
				_completed,
				_options,
			) => {
				return Promise.resolve();
			};

			// This should compile without errors
			mockToggle(1, true, { virtualDate: "2026-01-25" });
			mockToggle("uuid-123", false, { virtualDate: "2026-02-01" });

			expect(true).toBe(true);
		});

		it("accepts options with undefined virtualDate", () => {
			const mockToggle: UseTodoStorageReturn["toggle"] = async (
				_id,
				_completed,
				_options,
			) => {
				return Promise.resolve();
			};

			// This should compile without errors
			mockToggle(1, true, { virtualDate: undefined });
			mockToggle("uuid-123", false, {});

			expect(true).toBe(true);
		});

		it("returns Promise<void>", async () => {
			const mockToggle: UseTodoStorageReturn["toggle"] = async () => {
				return Promise.resolve();
			};

			const result = mockToggle(1, true);
			expect(result).toBeInstanceOf(Promise);
			await result;
			expect(true).toBe(true);
		});
	});
});
