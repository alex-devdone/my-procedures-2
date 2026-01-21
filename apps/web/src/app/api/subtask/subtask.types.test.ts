import { describe, expect, it } from "vitest";
import {
	areAllSubtasksCompleted,
	bulkCreateSubtasksInputSchema,
	calculateSubtaskProgress,
	createSubtaskInputSchema,
	deleteSubtaskInputSchema,
	listSubtasksInputSchema,
	localCreateSubtaskInputSchema,
	localDeleteSubtaskInputSchema,
	localListSubtasksInputSchema,
	localReorderSubtaskInputSchema,
	localToggleSubtaskInputSchema,
	localUpdateSubtaskInputSchema,
	reorderSubtaskInputSchema,
	type Subtask,
	toggleSubtaskInputSchema,
	updateSubtaskInputSchema,
} from "./subtask.types";

describe("Create Subtask Input Schema", () => {
	describe("createSubtaskInputSchema", () => {
		it("accepts valid input with todoId and text", () => {
			const result = createSubtaskInputSchema.safeParse({
				todoId: 1,
				text: "Buy groceries",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.todoId).toBe(1);
				expect(result.data.text).toBe("Buy groceries");
			}
		});

		it("rejects empty text", () => {
			const result = createSubtaskInputSchema.safeParse({
				todoId: 1,
				text: "",
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe("Subtask text is required");
			}
		});

		it("rejects text exceeding 500 characters", () => {
			const longText = "a".repeat(501);
			const result = createSubtaskInputSchema.safeParse({
				todoId: 1,
				text: longText,
			});
			expect(result.success).toBe(false);
		});

		it("accepts text with exactly 500 characters", () => {
			const maxText = "a".repeat(500);
			const result = createSubtaskInputSchema.safeParse({
				todoId: 1,
				text: maxText,
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing todoId", () => {
			const result = createSubtaskInputSchema.safeParse({
				text: "Buy groceries",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing text", () => {
			const result = createSubtaskInputSchema.safeParse({
				todoId: 1,
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric todoId", () => {
			const result = createSubtaskInputSchema.safeParse({
				todoId: "abc",
				text: "Buy groceries",
			});
			expect(result.success).toBe(false);
		});

		it("rejects string todoId", () => {
			const result = createSubtaskInputSchema.safeParse({
				todoId: "uuid-123",
				text: "Buy groceries",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Update Subtask Input Schema", () => {
	describe("updateSubtaskInputSchema", () => {
		it("accepts valid input with id and text", () => {
			const result = updateSubtaskInputSchema.safeParse({
				id: 1,
				text: "Updated task",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
				expect(result.data.text).toBe("Updated task");
			}
		});

		it("accepts valid input with only id (no text update)", () => {
			const result = updateSubtaskInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
				expect(result.data.text).toBeUndefined();
			}
		});

		it("rejects missing id", () => {
			const result = updateSubtaskInputSchema.safeParse({
				text: "Updated task",
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = updateSubtaskInputSchema.safeParse({
				id: "abc",
				text: "Updated task",
			});
			expect(result.success).toBe(false);
		});

		it("rejects empty text when provided", () => {
			const result = updateSubtaskInputSchema.safeParse({ id: 1, text: "" });
			expect(result.success).toBe(false);
		});

		it("rejects text exceeding 500 characters", () => {
			const longText = "a".repeat(501);
			const result = updateSubtaskInputSchema.safeParse({
				id: 1,
				text: longText,
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Delete Subtask Input Schema", () => {
	describe("deleteSubtaskInputSchema", () => {
		it("accepts valid numeric id", () => {
			const result = deleteSubtaskInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
			}
		});

		it("rejects missing id", () => {
			const result = deleteSubtaskInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = deleteSubtaskInputSchema.safeParse({ id: "abc" });
			expect(result.success).toBe(false);
		});

		it("rejects string id", () => {
			const result = deleteSubtaskInputSchema.safeParse({
				id: "uuid-123",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Toggle Subtask Input Schema", () => {
	describe("toggleSubtaskInputSchema", () => {
		it("accepts valid input with id and completed true", () => {
			const result = toggleSubtaskInputSchema.safeParse({
				id: 1,
				completed: true,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
				expect(result.data.completed).toBe(true);
			}
		});

		it("accepts valid input with id and completed false", () => {
			const result = toggleSubtaskInputSchema.safeParse({
				id: 1,
				completed: false,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
				expect(result.data.completed).toBe(false);
			}
		});

		it("rejects missing id", () => {
			const result = toggleSubtaskInputSchema.safeParse({ completed: true });
			expect(result.success).toBe(false);
		});

		it("rejects missing completed", () => {
			const result = toggleSubtaskInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(false);
		});

		it("rejects non-boolean completed", () => {
			const result = toggleSubtaskInputSchema.safeParse({
				id: 1,
				completed: "true",
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = toggleSubtaskInputSchema.safeParse({
				id: "abc",
				completed: true,
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Reorder Subtask Input Schema", () => {
	describe("reorderSubtaskInputSchema", () => {
		it("accepts valid input with id and newOrder", () => {
			const result = reorderSubtaskInputSchema.safeParse({
				id: 1,
				newOrder: 2,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
				expect(result.data.newOrder).toBe(2);
			}
		});

		it("accepts newOrder of 0", () => {
			const result = reorderSubtaskInputSchema.safeParse({
				id: 1,
				newOrder: 0,
			});
			expect(result.success).toBe(true);
		});

		it("rejects negative newOrder", () => {
			const result = reorderSubtaskInputSchema.safeParse({
				id: 1,
				newOrder: -1,
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing id", () => {
			const result = reorderSubtaskInputSchema.safeParse({ newOrder: 2 });
			expect(result.success).toBe(false);
		});

		it("rejects missing newOrder", () => {
			const result = reorderSubtaskInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = reorderSubtaskInputSchema.safeParse({
				id: "abc",
				newOrder: 2,
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric newOrder", () => {
			const result = reorderSubtaskInputSchema.safeParse({
				id: 1,
				newOrder: "second",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("List Subtasks Input Schema", () => {
	describe("listSubtasksInputSchema", () => {
		it("accepts valid numeric todoId", () => {
			const result = listSubtasksInputSchema.safeParse({ todoId: 1 });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.todoId).toBe(1);
			}
		});

		it("rejects missing todoId", () => {
			const result = listSubtasksInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric todoId", () => {
			const result = listSubtasksInputSchema.safeParse({ todoId: "abc" });
			expect(result.success).toBe(false);
		});

		it("rejects string todoId", () => {
			const result = listSubtasksInputSchema.safeParse({
				todoId: "uuid-123",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Local Subtask Input Schemas", () => {
	describe("localCreateSubtaskInputSchema", () => {
		it("accepts valid input with string todoId", () => {
			const result = localCreateSubtaskInputSchema.safeParse({
				todoId: "uuid-123",
				text: "Buy groceries",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.todoId).toBe("uuid-123");
				expect(result.data.text).toBe("Buy groceries");
			}
		});

		it("rejects numeric todoId", () => {
			const result = localCreateSubtaskInputSchema.safeParse({
				todoId: 123,
				text: "Buy groceries",
			});
			expect(result.success).toBe(false);
		});

		it("rejects empty text", () => {
			const result = localCreateSubtaskInputSchema.safeParse({
				todoId: "uuid-123",
				text: "",
			});
			expect(result.success).toBe(false);
		});

		it("rejects text exceeding 500 characters", () => {
			const longText = "a".repeat(501);
			const result = localCreateSubtaskInputSchema.safeParse({
				todoId: "uuid-123",
				text: longText,
			});
			expect(result.success).toBe(false);
		});
	});

	describe("localUpdateSubtaskInputSchema", () => {
		it("accepts valid input with string id", () => {
			const result = localUpdateSubtaskInputSchema.safeParse({
				id: "uuid-123",
				text: "Updated task",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe("uuid-123");
				expect(result.data.text).toBe("Updated task");
			}
		});

		it("rejects numeric id", () => {
			const result = localUpdateSubtaskInputSchema.safeParse({
				id: 123,
				text: "Updated task",
			});
			expect(result.success).toBe(false);
		});

		it("accepts valid input with only id (no text update)", () => {
			const result = localUpdateSubtaskInputSchema.safeParse({
				id: "uuid-123",
			});
			expect(result.success).toBe(true);
		});

		it("rejects empty text when provided", () => {
			const result = localUpdateSubtaskInputSchema.safeParse({
				id: "uuid-123",
				text: "",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("localDeleteSubtaskInputSchema", () => {
		it("accepts valid string id", () => {
			const result = localDeleteSubtaskInputSchema.safeParse({
				id: "uuid-123",
			});
			expect(result.success).toBe(true);
		});

		it("rejects numeric id", () => {
			const result = localDeleteSubtaskInputSchema.safeParse({ id: 123 });
			expect(result.success).toBe(false);
		});

		it("rejects missing id", () => {
			const result = localDeleteSubtaskInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe("localToggleSubtaskInputSchema", () => {
		it("accepts valid input with string id", () => {
			const result = localToggleSubtaskInputSchema.safeParse({
				id: "uuid-123",
				completed: true,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe("uuid-123");
				expect(result.data.completed).toBe(true);
			}
		});

		it("rejects numeric id", () => {
			const result = localToggleSubtaskInputSchema.safeParse({
				id: 123,
				completed: true,
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing completed", () => {
			const result = localToggleSubtaskInputSchema.safeParse({
				id: "uuid-123",
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-boolean completed", () => {
			const result = localToggleSubtaskInputSchema.safeParse({
				id: "uuid-123",
				completed: "yes",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("localReorderSubtaskInputSchema", () => {
		it("accepts valid input with string id", () => {
			const result = localReorderSubtaskInputSchema.safeParse({
				id: "uuid-123",
				newOrder: 2,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe("uuid-123");
				expect(result.data.newOrder).toBe(2);
			}
		});

		it("rejects numeric id", () => {
			const result = localReorderSubtaskInputSchema.safeParse({
				id: 123,
				newOrder: 2,
			});
			expect(result.success).toBe(false);
		});

		it("rejects negative newOrder", () => {
			const result = localReorderSubtaskInputSchema.safeParse({
				id: "uuid-123",
				newOrder: -1,
			});
			expect(result.success).toBe(false);
		});

		it("accepts newOrder of 0", () => {
			const result = localReorderSubtaskInputSchema.safeParse({
				id: "uuid-123",
				newOrder: 0,
			});
			expect(result.success).toBe(true);
		});
	});

	describe("localListSubtasksInputSchema", () => {
		it("accepts valid string todoId", () => {
			const result = localListSubtasksInputSchema.safeParse({
				todoId: "uuid-123",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.todoId).toBe("uuid-123");
			}
		});

		it("rejects numeric todoId", () => {
			const result = localListSubtasksInputSchema.safeParse({ todoId: 123 });
			expect(result.success).toBe(false);
		});

		it("rejects missing todoId", () => {
			const result = localListSubtasksInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});
});

describe("Subtask Progress Helper Functions", () => {
	describe("calculateSubtaskProgress", () => {
		it("calculates progress for empty array", () => {
			const progress = calculateSubtaskProgress([]);
			expect(progress.completed).toBe(0);
			expect(progress.total).toBe(0);
		});

		it("calculates progress for all incomplete subtasks", () => {
			const subtasks: Subtask[] = [
				{ id: 1, text: "Task 1", completed: false, todoId: 1, order: 0 },
				{ id: 2, text: "Task 2", completed: false, todoId: 1, order: 1 },
				{ id: 3, text: "Task 3", completed: false, todoId: 1, order: 2 },
			];
			const progress = calculateSubtaskProgress(subtasks);
			expect(progress.completed).toBe(0);
			expect(progress.total).toBe(3);
		});

		it("calculates progress for all completed subtasks", () => {
			const subtasks: Subtask[] = [
				{ id: 1, text: "Task 1", completed: true, todoId: 1, order: 0 },
				{ id: 2, text: "Task 2", completed: true, todoId: 1, order: 1 },
				{ id: 3, text: "Task 3", completed: true, todoId: 1, order: 2 },
			];
			const progress = calculateSubtaskProgress(subtasks);
			expect(progress.completed).toBe(3);
			expect(progress.total).toBe(3);
		});

		it("calculates progress for partially completed subtasks", () => {
			const subtasks: Subtask[] = [
				{ id: 1, text: "Task 1", completed: true, todoId: 1, order: 0 },
				{ id: 2, text: "Task 2", completed: false, todoId: 1, order: 1 },
				{ id: 3, text: "Task 3", completed: true, todoId: 1, order: 2 },
				{ id: 4, text: "Task 4", completed: false, todoId: 1, order: 3 },
				{ id: 5, text: "Task 5", completed: true, todoId: 1, order: 4 },
			];
			const progress = calculateSubtaskProgress(subtasks);
			expect(progress.completed).toBe(3);
			expect(progress.total).toBe(5);
		});

		it("handles subtasks with string IDs (local)", () => {
			const subtasks: Subtask[] = [
				{
					id: "uuid-1",
					text: "Task 1",
					completed: true,
					todoId: "todo-1",
					order: 0,
				},
				{
					id: "uuid-2",
					text: "Task 2",
					completed: false,
					todoId: "todo-1",
					order: 1,
				},
			];
			const progress = calculateSubtaskProgress(subtasks);
			expect(progress.completed).toBe(1);
			expect(progress.total).toBe(2);
		});
	});

	describe("areAllSubtasksCompleted", () => {
		it("returns false for empty array", () => {
			expect(areAllSubtasksCompleted([])).toBe(false);
		});

		it("returns false when some subtasks are incomplete", () => {
			const subtasks: Subtask[] = [
				{ id: 1, text: "Task 1", completed: true, todoId: 1, order: 0 },
				{ id: 2, text: "Task 2", completed: false, todoId: 1, order: 1 },
			];
			expect(areAllSubtasksCompleted(subtasks)).toBe(false);
		});

		it("returns true when all subtasks are completed", () => {
			const subtasks: Subtask[] = [
				{ id: 1, text: "Task 1", completed: true, todoId: 1, order: 0 },
				{ id: 2, text: "Task 2", completed: true, todoId: 1, order: 1 },
				{ id: 3, text: "Task 3", completed: true, todoId: 1, order: 2 },
			];
			expect(areAllSubtasksCompleted(subtasks)).toBe(true);
		});

		it("returns false when all subtasks are incomplete", () => {
			const subtasks: Subtask[] = [
				{ id: 1, text: "Task 1", completed: false, todoId: 1, order: 0 },
				{ id: 2, text: "Task 2", completed: false, todoId: 1, order: 1 },
			];
			expect(areAllSubtasksCompleted(subtasks)).toBe(false);
		});

		it("returns true for single completed subtask", () => {
			const subtasks: Subtask[] = [
				{ id: 1, text: "Task 1", completed: true, todoId: 1, order: 0 },
			];
			expect(areAllSubtasksCompleted(subtasks)).toBe(true);
		});

		it("returns false for single incomplete subtask", () => {
			const subtasks: Subtask[] = [
				{ id: 1, text: "Task 1", completed: false, todoId: 1, order: 0 },
			];
			expect(areAllSubtasksCompleted(subtasks)).toBe(false);
		});

		it("handles subtasks with string IDs (local)", () => {
			const subtasks: Subtask[] = [
				{
					id: "uuid-1",
					text: "Task 1",
					completed: true,
					todoId: "todo-1",
					order: 0,
				},
				{
					id: "uuid-2",
					text: "Task 2",
					completed: true,
					todoId: "todo-1",
					order: 1,
				},
			];
			expect(areAllSubtasksCompleted(subtasks)).toBe(true);
		});
	});
});

describe("Bulk Create Subtasks Input Schema", () => {
	describe("bulkCreateSubtasksInputSchema", () => {
		it("accepts valid input with single subtask", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: "Buy groceries",
					},
				],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.subtasks).toHaveLength(1);
				expect(result.data.subtasks[0].todoId).toBe(1);
				expect(result.data.subtasks[0].text).toBe("Buy groceries");
			}
		});

		it("accepts valid input with multiple subtasks", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{ todoId: 1, text: "Task 1" },
					{ todoId: 1, text: "Task 2" },
					{ todoId: 2, text: "Task 3" },
				],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.subtasks).toHaveLength(3);
			}
		});

		it("accepts empty subtasks array", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.subtasks).toHaveLength(0);
			}
		});

		it("accepts subtask with optional completed field", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: "Completed task",
						completed: true,
					},
				],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.subtasks[0].completed).toBe(true);
			}
		});

		it("accepts subtask with optional order field", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: "Ordered task",
						order: 5,
					},
				],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.subtasks[0].order).toBe(5);
			}
		});

		it("accepts subtask with all optional fields", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: "Full task",
						completed: true,
						order: 3,
					},
				],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.subtasks[0]).toMatchObject({
					todoId: 1,
					text: "Full task",
					completed: true,
					order: 3,
				});
			}
		});

		it("rejects empty text", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: "",
					},
				],
			});
			expect(result.success).toBe(false);
		});

		it("rejects text exceeding 500 characters", () => {
			const longText = "a".repeat(501);
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: longText,
					},
				],
			});
			expect(result.success).toBe(false);
		});

		it("accepts text with exactly 500 characters", () => {
			const maxText = "a".repeat(500);
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: maxText,
					},
				],
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing todoId", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						text: "Task without todoId",
					},
				],
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing text", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
					},
				],
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric todoId", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: "uuid-123",
						text: "Task",
					},
				],
			});
			expect(result.success).toBe(false);
		});

		it("rejects negative order", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: "Task",
						order: -1,
					},
				],
			});
			expect(result.success).toBe(false);
		});

		it("accepts order of 0", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: "Task",
						order: 0,
					},
				],
			});
			expect(result.success).toBe(true);
		});

		it("rejects non-boolean completed", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{
						todoId: 1,
						text: "Task",
						completed: "yes",
					},
				],
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing subtasks array", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("validates all subtasks in array", () => {
			const result = bulkCreateSubtasksInputSchema.safeParse({
				subtasks: [
					{ todoId: 1, text: "Valid task" },
					{ todoId: 2, text: "" }, // Invalid: empty text
				],
			});
			expect(result.success).toBe(false);
		});
	});
});
