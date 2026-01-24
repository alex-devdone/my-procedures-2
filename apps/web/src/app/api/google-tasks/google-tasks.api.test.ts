import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/utils/trpc";
import {
	getClearCompletedMutationOptions,
	getCreateTaskListMutationOptions,
	getDeleteTaskMutationOptions,
	getDisableIntegrationMutationOptions,
	getEnableIntegrationMutationOptions,
	getStatusQueryKey,
	getStatusQueryOptions,
	getTaskQueryKey,
	getTaskQueryOptions,
	getUpdateLastSyncedMutationOptions,
	getUpdateSettingsMutationOptions,
	listTaskListsQueryKey,
	listTaskListsQueryOptions,
	listTasksQueryKey,
	listTasksQueryOptions,
} from "./google-tasks.api";

// Mock trpc
vi.mock("@/utils/trpc", () => ({
	trpc: {
		googleTasks: {
			getStatus: {
				queryOptions: vi.fn(() => ({ queryKey: ["googleTasks", "getStatus"] })),
				queryKey: vi.fn(() => ["googleTasks", "getStatus"]),
			},
			listTaskLists: {
				queryOptions: vi.fn(() => ({
					queryKey: ["googleTasks", "listTaskLists"],
				})),
				queryKey: vi.fn(() => ["googleTasks", "listTaskLists"]),
			},
			listTasks: {
				queryOptions: vi.fn(() => ({
					queryKey: ["googleTasks", "listTasks", "input"],
				})),
				queryKey: vi.fn(() => ["googleTasks", "listTasks", "input"]),
			},
			getTask: {
				queryOptions: vi.fn(() => ({
					queryKey: ["googleTasks", "getTask", "input"],
				})),
				queryKey: vi.fn(() => ["googleTasks", "getTask", "input"]),
			},
			enableIntegration: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["googleTasks", "enableIntegration"],
				})),
			},
			disableIntegration: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["googleTasks", "disableIntegration"],
				})),
			},
			updateSettings: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["googleTasks", "updateSettings"],
				})),
			},
			updateLastSynced: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["googleTasks", "updateLastSynced"],
				})),
			},
			createTaskList: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["googleTasks", "createTaskList"],
				})),
			},
			deleteTask: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["googleTasks", "deleteTask"],
				})),
			},
			clearCompleted: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["googleTasks", "clearCompleted"],
				})),
			},
		},
	},
}));

describe("google-tasks.api", () => {
	describe("Query Options", () => {
		describe("getStatusQueryOptions", () => {
			it("should return query options for status", () => {
				const result = getStatusQueryOptions();
				expect(trpc.googleTasks.getStatus.queryOptions).toHaveBeenCalled();
				expect(result).toEqual({ queryKey: ["googleTasks", "getStatus"] });
			});
		});

		describe("getStatusQueryKey", () => {
			it("should return query key for status", () => {
				const result = getStatusQueryKey();
				expect(trpc.googleTasks.getStatus.queryKey).toHaveBeenCalled();
				expect(result).toEqual(["googleTasks", "getStatus"]);
			});
		});

		describe("listTaskListsQueryOptions", () => {
			it("should return query options for listing task lists", () => {
				const result = listTaskListsQueryOptions();
				expect(trpc.googleTasks.listTaskLists.queryOptions).toHaveBeenCalled();
				expect(result).toEqual({ queryKey: ["googleTasks", "listTaskLists"] });
			});
		});

		describe("listTaskListsQueryKey", () => {
			it("should return query key for task lists", () => {
				const result = listTaskListsQueryKey();
				expect(trpc.googleTasks.listTaskLists.queryKey).toHaveBeenCalled();
				expect(result).toEqual(["googleTasks", "listTaskLists"]);
			});
		});

		describe("listTasksQueryOptions", () => {
			it("should return query options for listing tasks with input", () => {
				const input = {
					taskListId: "list-123",
					showDeleted: false,
					showHidden: false,
				};
				const result = listTasksQueryOptions(input);
				expect(trpc.googleTasks.listTasks.queryOptions).toHaveBeenCalledWith(
					input,
				);
				expect(result).toEqual({
					queryKey: ["googleTasks", "listTasks", "input"],
				});
			});
		});

		describe("listTasksQueryKey", () => {
			it("should return query key for tasks list", () => {
				const input = {
					taskListId: "list-123",
					showDeleted: false,
					showHidden: false,
				};
				const result = listTasksQueryKey(input);
				expect(trpc.googleTasks.listTasks.queryKey).toHaveBeenCalledWith(input);
				expect(result).toEqual(["googleTasks", "listTasks", "input"]);
			});
		});

		describe("getTaskQueryOptions", () => {
			it("should return query options for getting a single task", () => {
				const input = { taskListId: "list-123", taskId: "task-456" };
				const result = getTaskQueryOptions(input);
				expect(trpc.googleTasks.getTask.queryOptions).toHaveBeenCalledWith(
					input,
				);
				expect(result).toEqual({
					queryKey: ["googleTasks", "getTask", "input"],
				});
			});
		});

		describe("getTaskQueryKey", () => {
			it("should return query key for a single task", () => {
				const input = { taskListId: "list-123", taskId: "task-456" };
				const result = getTaskQueryKey(input);
				expect(trpc.googleTasks.getTask.queryKey).toHaveBeenCalledWith(input);
				expect(result).toEqual(["googleTasks", "getTask", "input"]);
			});
		});
	});

	describe("Mutation Options", () => {
		describe("getEnableIntegrationMutationOptions", () => {
			it("should return mutation options for enabling integration", () => {
				const result = getEnableIntegrationMutationOptions();
				expect(
					trpc.googleTasks.enableIntegration.mutationOptions,
				).toHaveBeenCalled();
				expect(result).toEqual({
					mutationKey: ["googleTasks", "enableIntegration"],
				});
			});
		});

		describe("getDisableIntegrationMutationOptions", () => {
			it("should return mutation options for disabling integration", () => {
				const result = getDisableIntegrationMutationOptions();
				expect(
					trpc.googleTasks.disableIntegration.mutationOptions,
				).toHaveBeenCalled();
				expect(result).toEqual({
					mutationKey: ["googleTasks", "disableIntegration"],
				});
			});
		});

		describe("getUpdateSettingsMutationOptions", () => {
			it("should return mutation options for updating settings", () => {
				const result = getUpdateSettingsMutationOptions();
				expect(
					trpc.googleTasks.updateSettings.mutationOptions,
				).toHaveBeenCalled();
				expect(result).toEqual({
					mutationKey: ["googleTasks", "updateSettings"],
				});
			});
		});

		describe("getUpdateLastSyncedMutationOptions", () => {
			it("should return mutation options for updating last synced", () => {
				const result = getUpdateLastSyncedMutationOptions();
				expect(
					trpc.googleTasks.updateLastSynced.mutationOptions,
				).toHaveBeenCalled();
				expect(result).toEqual({
					mutationKey: ["googleTasks", "updateLastSynced"],
				});
			});
		});

		describe("getCreateTaskListMutationOptions", () => {
			it("should return mutation options for creating a task list", () => {
				const result = getCreateTaskListMutationOptions();
				expect(
					trpc.googleTasks.createTaskList.mutationOptions,
				).toHaveBeenCalled();
				expect(result).toEqual({
					mutationKey: ["googleTasks", "createTaskList"],
				});
			});
		});

		describe("getDeleteTaskMutationOptions", () => {
			it("should return mutation options for deleting a task", () => {
				const result = getDeleteTaskMutationOptions();
				expect(trpc.googleTasks.deleteTask.mutationOptions).toHaveBeenCalled();
				expect(result).toEqual({ mutationKey: ["googleTasks", "deleteTask"] });
			});
		});

		describe("getClearCompletedMutationOptions", () => {
			it("should return mutation options for clearing completed tasks", () => {
				const result = getClearCompletedMutationOptions();
				expect(
					trpc.googleTasks.clearCompleted.mutationOptions,
				).toHaveBeenCalled();
				expect(result).toEqual({
					mutationKey: ["googleTasks", "clearCompleted"],
				});
			});
		});
	});
});
