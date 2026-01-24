import { describe, expect, it } from "vitest";
import {
	clearCompletedInputSchema,
	createTaskListInputSchema,
	deleteTaskInputSchema,
	enableIntegrationInputSchema,
	type GoogleTask,
	type GoogleTaskList,
	type GoogleTaskStatus,
	type GoogleTasksIntegrationStatus,
	getTaskInputSchema,
	listTasksInputSchema,
	type Task,
	type TaskList,
	type UpdateLastSyncedOutput,
	updateSettingsInputSchema,
} from "./google-tasks.types";

describe("Google Tasks Input Schemas", () => {
	describe("listTasksInputSchema", () => {
		it("accepts valid input with all fields", () => {
			const result = listTasksInputSchema.safeParse({
				taskListId: "MDAwMDAwMDAxMjM0NTY3ODkw",
				showDeleted: true,
				showHidden: false,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.taskListId).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
				expect(result.data.showDeleted).toBe(true);
				expect(result.data.showHidden).toBe(false);
			}
		});

		it("accepts valid input with default values", () => {
			const result = listTasksInputSchema.safeParse({
				taskListId: "MDAwMDAwMDAxMjM0NTY3ODkw",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.taskListId).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
				expect(result.data.showDeleted).toBe(false);
				expect(result.data.showHidden).toBe(false);
			}
		});

		it("rejects empty taskListId", () => {
			const result = listTasksInputSchema.safeParse({
				taskListId: "",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing taskListId", () => {
			const result = listTasksInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("accepts boolean flags", () => {
			const result = listTasksInputSchema.safeParse({
				taskListId: "list123",
				showDeleted: false,
				showHidden: true,
			});
			expect(result.success).toBe(true);
		});
	});

	describe("createTaskListInputSchema", () => {
		it("accepts valid task list name", () => {
			const result = createTaskListInputSchema.safeParse({
				name: "My Tasks",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe("My Tasks");
			}
		});

		it("accepts task list name with special characters", () => {
			const result = createTaskListInputSchema.safeParse({
				name: "Work Tasks 2024 - Important!",
			});
			expect(result.success).toBe(true);
		});

		it("rejects empty name", () => {
			const result = createTaskListInputSchema.safeParse({
				name: "",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing name", () => {
			const result = createTaskListInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("rejects whitespace-only name", () => {
			const result = createTaskListInputSchema.safeParse({
				name: "   ",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("enableIntegrationInputSchema", () => {
		it("accepts valid input with all fields", () => {
			const result = enableIntegrationInputSchema.safeParse({
				accessToken: "ya29.a0AfH6...",
				refreshToken: "refresh_token_value",
				expiresIn: 3600,
				defaultListId: "MDAwMDAwMDAxMjM0NTY3ODkw",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.accessToken).toBe("ya29.a0AfH6...");
				expect(result.data.refreshToken).toBe("refresh_token_value");
				expect(result.data.expiresIn).toBe(3600);
				expect(result.data.defaultListId).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
			}
		});

		it("accepts valid input without optional fields", () => {
			const result = enableIntegrationInputSchema.safeParse({
				accessToken: "ya29.a0AfH6...",
				expiresIn: 3600,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.accessToken).toBe("ya29.a0AfH6...");
			}
		});

		it("accepts input with only accessToken and expiresIn", () => {
			const result = enableIntegrationInputSchema.safeParse({
				accessToken: "ya29.a0AfH6...",
				expiresIn: 7200,
			});
			expect(result.success).toBe(true);
		});

		it("rejects empty accessToken", () => {
			const result = enableIntegrationInputSchema.safeParse({
				accessToken: "",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing accessToken", () => {
			const result = enableIntegrationInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("rejects non-positive expiresIn", () => {
			const result = enableIntegrationInputSchema.safeParse({
				accessToken: "ya29.a0AfH6...",
				expiresIn: 0,
			});
			expect(result.success).toBe(false);
		});

		it("rejects negative expiresIn", () => {
			const result = enableIntegrationInputSchema.safeParse({
				accessToken: "ya29.a0AfH6...",
				expiresIn: -100,
			});
			expect(result.success).toBe(false);
		});
	});

	describe("updateSettingsInputSchema", () => {
		it("accepts empty object (no updates)", () => {
			const result = updateSettingsInputSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it("accepts update with enabled flag", () => {
			const result = updateSettingsInputSchema.safeParse({
				enabled: true,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.enabled).toBe(true);
			}
		});

		it("accepts update with syncEnabled flag", () => {
			const result = updateSettingsInputSchema.safeParse({
				syncEnabled: false,
			});
			expect(result.success).toBe(true);
		});

		it("accepts update with defaultListId set to string", () => {
			const result = updateSettingsInputSchema.safeParse({
				defaultListId: "MDAwMDAwMDAxMjM0NTY3ODkw",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.defaultListId).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
			}
		});

		it("accepts update with defaultListId set to null", () => {
			const result = updateSettingsInputSchema.safeParse({
				defaultListId: null,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.defaultListId).toBeNull();
			}
		});

		it("accepts update with all fields", () => {
			const result = updateSettingsInputSchema.safeParse({
				enabled: true,
				syncEnabled: false,
				defaultListId: "list123",
			});
			expect(result.success).toBe(true);
		});

		it("accepts update with enabled false and null defaultListId", () => {
			const result = updateSettingsInputSchema.safeParse({
				enabled: false,
				defaultListId: null,
			});
			expect(result.success).toBe(true);
		});
	});

	describe("deleteTaskInputSchema", () => {
		it("accepts valid input", () => {
			const result = deleteTaskInputSchema.safeParse({
				taskListId: "MDAwMDAwMDAxMjM0NTY3ODkw",
				taskId: "TEFHS0RFRl9UQVNLX0lE",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.taskListId).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
				expect(result.data.taskId).toBe("TEFHS0RFRl9UQVNLX0lE");
			}
		});

		it("rejects empty taskListId", () => {
			const result = deleteTaskInputSchema.safeParse({
				taskListId: "",
				taskId: "task123",
			});
			expect(result.success).toBe(false);
		});

		it("rejects empty taskId", () => {
			const result = deleteTaskInputSchema.safeParse({
				taskListId: "list123",
				taskId: "",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing taskListId", () => {
			const result = deleteTaskInputSchema.safeParse({
				taskId: "task123",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing taskId", () => {
			const result = deleteTaskInputSchema.safeParse({
				taskListId: "list123",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("getTaskInputSchema", () => {
		it("accepts valid input", () => {
			const result = getTaskInputSchema.safeParse({
				taskListId: "MDAwMDAwMDAxMjM0NTY3ODkw",
				taskId: "TEFHS0RFRl9UQVNLX0lE",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.taskListId).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
				expect(result.data.taskId).toBe("TEFHS0RFRl9UQVNLX0lE");
			}
		});

		it("rejects empty taskListId", () => {
			const result = getTaskInputSchema.safeParse({
				taskListId: "",
				taskId: "task123",
			});
			expect(result.success).toBe(false);
		});

		it("rejects empty taskId", () => {
			const result = getTaskInputSchema.safeParse({
				taskListId: "list123",
				taskId: "",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing fields", () => {
			const result = getTaskInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe("clearCompletedInputSchema", () => {
		it("accepts valid taskListId", () => {
			const result = clearCompletedInputSchema.safeParse({
				taskListId: "MDAwMDAwMDAxMjM0NTY3ODkw",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.taskListId).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
			}
		});

		it("rejects empty taskListId", () => {
			const result = clearCompletedInputSchema.safeParse({
				taskListId: "",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing taskListId", () => {
			const result = clearCompletedInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});
});

describe("Google Tasks Type Interfaces", () => {
	describe("GoogleTaskStatus type", () => {
		it("accepts 'needsAction' as valid status", () => {
			const status: GoogleTaskStatus = "needsAction";
			expect(status).toBe("needsAction");
		});

		it("accepts 'completed' as valid status", () => {
			const status: GoogleTaskStatus = "completed";
			expect(status).toBe("completed");
		});
	});

	describe("GoogleTaskList interface", () => {
		it("can represent a complete task list", () => {
			const taskList: GoogleTaskList = {
				kind: "tasks#taskList",
				id: "MDAwMDAwMDAxMjM0NTY3ODkw",
				title: "My Tasks",
				updated: "2024-01-15T10:30:00.000Z",
				selfLink:
					"https://www.googleapis.com/tasks/v1/users/@me/lists/MDAwMDAwMDAxMjM0NTY3ODkw",
			};

			expect(taskList.kind).toBe("tasks#taskList");
			expect(taskList.id).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
			expect(taskList.title).toBe("My Tasks");
			expect(taskList.updated).toBe("2024-01-15T10:30:00.000Z");
			expect(taskList.selfLink).toContain("googleapis.com");
		});
	});

	describe("GoogleTask interface", () => {
		it("can represent a complete task", () => {
			const task: GoogleTask = {
				kind: "tasks#task",
				id: "TEFHS0RFRl9UQVNLX0lE",
				etag: '"1234567890"',
				title: "Complete project report",
				updated: "2024-01-15T10:30:00.000Z",
				selfLink:
					"https://www.googleapis.com/tasks/v1/lists/MDAwMDAwMDAxMjM0NTY3ODkw/tasks/TEFHS0RFRl9UQVNLX0lE",
				parent: "PARENT_TASK_ID",
				position: "00000000000000000001",
				notes: "Include all sections",
				status: "needsAction",
				due: "2024-01-20T00:00:00.000Z",
			};

			expect(task.kind).toBe("tasks#task");
			expect(task.title).toBe("Complete project report");
			expect(task.status).toBe("needsAction");
			expect(task.due).toBe("2024-01-20T00:00:00.000Z");
			expect(task.completed).toBeUndefined();
		});

		it("can represent a completed task", () => {
			const task: GoogleTask = {
				kind: "tasks#task",
				id: "TEFHS0RFRl9UQVNLX0lE",
				etag: '"1234567890"',
				title: "Done task",
				updated: "2024-01-15T10:30:00.000Z",
				selfLink:
					"https://www.googleapis.com/tasks/v1/lists/MDAwMDAwMDAxMjM0NTY3ODkw/tasks/TEFHS0RFRl9UQVNLX0lE",
				status: "completed",
				completed: "2024-01-15T11:00:00.000Z",
			};

			expect(task.status).toBe("completed");
			expect(task.completed).toBe("2024-01-15T11:00:00.000Z");
		});

		it("can represent a deleted/hidden task", () => {
			const task: GoogleTask = {
				kind: "tasks#task",
				id: "TEFHS0RFRl9UQVNLX0lE",
				etag: '"1234567890"',
				title: "Old task",
				updated: "2024-01-15T10:30:00.000Z",
				selfLink:
					"https://www.googleapis.com/tasks/v1/lists/MDAwMDAwMDAxMjM0NTY3ODkw/tasks/TEFHS0RFRl9UQVNLX0lE",
				status: "needsAction",
				deleted: true,
				hidden: true,
			};

			expect(task.deleted).toBe(true);
			expect(task.hidden).toBe(true);
		});
	});

	describe("GoogleTasksIntegrationStatus interface", () => {
		it("can represent enabled integration", () => {
			const status: GoogleTasksIntegrationStatus = {
				enabled: true,
				syncEnabled: true,
				lastSyncedAt: "2024-01-15T10:30:00.000Z",
				defaultListId: "MDAwMDAwMDAxMjM0NTY3ODkw",
				linked: true,
			};

			expect(status.enabled).toBe(true);
			expect(status.syncEnabled).toBe(true);
			expect(status.linked).toBe(true);
			expect(status.lastSyncedAt).toBe("2024-01-15T10:30:00.000Z");
			expect(status.defaultListId).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
		});

		it("can represent disabled integration", () => {
			const status: GoogleTasksIntegrationStatus = {
				enabled: false,
				syncEnabled: false,
				lastSyncedAt: null,
				defaultListId: null,
				linked: false,
			};

			expect(status.enabled).toBe(false);
			expect(status.linked).toBe(false);
			expect(status.lastSyncedAt).toBeNull();
			expect(status.defaultListId).toBeNull();
		});

		it("can represent integration with sync disabled", () => {
			const status: GoogleTasksIntegrationStatus = {
				enabled: true,
				syncEnabled: false,
				lastSyncedAt: "2024-01-10T15:45:00.000Z",
				defaultListId: null,
				linked: true,
			};

			expect(status.enabled).toBe(true);
			expect(status.syncEnabled).toBe(false);
			expect(status.defaultListId).toBeNull();
		});
	});

	describe("TaskList interface", () => {
		it("can represent a task list", () => {
			const taskList: TaskList = {
				id: "MDAwMDAwMDAxMjM0NTY3ODkw",
				title: "Work Tasks",
				updated: "2024-01-15T10:30:00.000Z",
			};

			expect(taskList.id).toBe("MDAwMDAwMDAxMjM0NTY3ODkw");
			expect(taskList.title).toBe("Work Tasks");
			expect(taskList.updated).toBe("2024-01-15T10:30:00.000Z");
		});
	});

	describe("Task interface", () => {
		it("can represent a pending task with due date", () => {
			const task: Task = {
				id: "TEFHS0RFRl9UQVNLX0lE",
				title: "Complete documentation",
				notes: "Include API reference",
				status: "needsAction",
				due: "2024-01-20T00:00:00.000Z",
				completed: null,
				updated: "2024-01-15T10:30:00.000Z",
				position: "00000000000000000001",
				parent: null,
				deleted: false,
				hidden: false,
			};

			expect(task.status).toBe("needsAction");
			expect(task.due).toBe("2024-01-20T00:00:00.000Z");
			expect(task.completed).toBeNull();
			expect(task.notes).toBe("Include API reference");
		});

		it("can represent a completed task", () => {
			const task: Task = {
				id: "TEFHS0RFRl9UQVNLX0lE",
				title: "Done task",
				notes: null,
				status: "completed",
				due: null,
				completed: "2024-01-15T11:00:00.000Z",
				updated: "2024-01-15T11:00:00.000Z",
				position: "00000000000000000002",
				parent: null,
				deleted: false,
				hidden: false,
			};

			expect(task.status).toBe("completed");
			expect(task.completed).toBe("2024-01-15T11:00:00.000Z");
			expect(task.notes).toBeNull();
		});

		it("can represent a subtask", () => {
			const task: Task = {
				id: "U1VCVEFTS19JRA",
				title: "Subtask step 1",
				notes: null,
				status: "needsAction",
				due: null,
				completed: null,
				updated: "2024-01-15T10:30:00.000Z",
				position: "00000000000000000003",
				parent: "UEFSRU5UX0lE",
				deleted: false,
				hidden: false,
			};

			expect(task.parent).toBe("UEFSRU5UX0lE");
		});

		it("can represent a deleted task", () => {
			const task: Task = {
				id: "REVMTVRFRA",
				title: "Deleted task",
				notes: null,
				status: "needsAction",
				due: null,
				completed: null,
				updated: "2024-01-15T10:30:00.000Z",
				position: null,
				parent: null,
				deleted: true,
				hidden: false,
			};

			expect(task.deleted).toBe(true);
		});
	});

	describe("UpdateLastSyncedOutput interface", () => {
		it("can represent successful update with timestamp", () => {
			const output: UpdateLastSyncedOutput = {
				lastSyncedAt: "2024-01-15T10:30:00.000Z",
			};

			expect(output.lastSyncedAt).toBe("2024-01-15T10:30:00.000Z");
		});

		it("can represent output with null timestamp", () => {
			const output: UpdateLastSyncedOutput = {
				lastSyncedAt: null,
			};

			expect(output.lastSyncedAt).toBeNull();
		});
	});
});
