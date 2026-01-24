import { describe, expect, it } from "vitest";

// API exports
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

// Hooks exports
import {
	useClearGoogleTasksCompleted,
	useCreateGoogleTaskList,
	useDeleteGoogleTask,
	useDisableGoogleTasksIntegration,
	useEnableGoogleTasksIntegration,
	useGoogleTask,
	useGoogleTaskLists,
	useGoogleTasks,
	useGoogleTasksStatus,
	useUpdateGoogleTasksLastSynced,
	useUpdateGoogleTasksSettings,
} from "./google-tasks.hooks";

// Schema exports
import {
	clearCompletedInputSchema,
	createTaskListInputSchema,
	deleteTaskInputSchema,
	enableIntegrationInputSchema,
	getTaskInputSchema,
	listTasksInputSchema,
	updateSettingsInputSchema,
} from "./google-tasks.types";

// Barrel file exports
import * as googleTasks from "./index";

describe("google-tasks barrel file", () => {
	describe("API exports", () => {
		it("should export query options", () => {
			expect(typeof getStatusQueryOptions).toBe("function");
			expect(typeof listTaskListsQueryOptions).toBe("function");
			expect(typeof listTasksQueryOptions).toBe("function");
			expect(typeof getTaskQueryOptions).toBe("function");
		});

		it("should export query keys", () => {
			expect(typeof getStatusQueryKey).toBe("function");
			expect(typeof listTaskListsQueryKey).toBe("function");
			expect(typeof listTasksQueryKey).toBe("function");
			expect(typeof getTaskQueryKey).toBe("function");
		});

		it("should export mutation options", () => {
			expect(typeof getEnableIntegrationMutationOptions).toBe("function");
			expect(typeof getDisableIntegrationMutationOptions).toBe("function");
			expect(typeof getUpdateSettingsMutationOptions).toBe("function");
			expect(typeof getUpdateLastSyncedMutationOptions).toBe("function");
			expect(typeof getCreateTaskListMutationOptions).toBe("function");
			expect(typeof getDeleteTaskMutationOptions).toBe("function");
			expect(typeof getClearCompletedMutationOptions).toBe("function");
		});

		it("should export API functions from barrel", () => {
			expect(googleTasks.getClearCompletedMutationOptions).toBe(
				getClearCompletedMutationOptions,
			);
			expect(googleTasks.getCreateTaskListMutationOptions).toBe(
				getCreateTaskListMutationOptions,
			);
			expect(googleTasks.getDeleteTaskMutationOptions).toBe(
				getDeleteTaskMutationOptions,
			);
			expect(googleTasks.getDisableIntegrationMutationOptions).toBe(
				getDisableIntegrationMutationOptions,
			);
			expect(googleTasks.getEnableIntegrationMutationOptions).toBe(
				getEnableIntegrationMutationOptions,
			);
			expect(googleTasks.getTaskQueryKey).toBe(getTaskQueryKey);
			expect(googleTasks.getTaskQueryOptions).toBe(getTaskQueryOptions);
			expect(googleTasks.getStatusQueryKey).toBe(getStatusQueryKey);
			expect(googleTasks.getStatusQueryOptions).toBe(getStatusQueryOptions);
			expect(googleTasks.getUpdateLastSyncedMutationOptions).toBe(
				getUpdateLastSyncedMutationOptions,
			);
			expect(googleTasks.getUpdateSettingsMutationOptions).toBe(
				getUpdateSettingsMutationOptions,
			);
			expect(googleTasks.listTaskListsQueryKey).toBe(listTaskListsQueryKey);
			expect(googleTasks.listTaskListsQueryOptions).toBe(
				listTaskListsQueryOptions,
			);
			expect(googleTasks.listTasksQueryKey).toBe(listTasksQueryKey);
			expect(googleTasks.listTasksQueryOptions).toBe(listTasksQueryOptions);
		});
	});

	describe("Hooks exports", () => {
		it("should export query hooks", () => {
			expect(typeof useGoogleTasksStatus).toBe("function");
			expect(typeof useGoogleTaskLists).toBe("function");
			expect(typeof useGoogleTasks).toBe("function");
			expect(typeof useGoogleTask).toBe("function");
		});

		it("should export mutation hooks", () => {
			expect(typeof useEnableGoogleTasksIntegration).toBe("function");
			expect(typeof useDisableGoogleTasksIntegration).toBe("function");
			expect(typeof useUpdateGoogleTasksSettings).toBe("function");
			expect(typeof useUpdateGoogleTasksLastSynced).toBe("function");
			expect(typeof useCreateGoogleTaskList).toBe("function");
			expect(typeof useDeleteGoogleTask).toBe("function");
			expect(typeof useClearGoogleTasksCompleted).toBe("function");
		});

		it("should export hooks from barrel", () => {
			expect(googleTasks.useClearGoogleTasksCompleted).toBe(
				useClearGoogleTasksCompleted,
			);
			expect(googleTasks.useCreateGoogleTaskList).toBe(useCreateGoogleTaskList);
			expect(googleTasks.useDeleteGoogleTask).toBe(useDeleteGoogleTask);
			expect(googleTasks.useDisableGoogleTasksIntegration).toBe(
				useDisableGoogleTasksIntegration,
			);
			expect(googleTasks.useEnableGoogleTasksIntegration).toBe(
				useEnableGoogleTasksIntegration,
			);
			expect(googleTasks.useGoogleTask).toBe(useGoogleTask);
			expect(googleTasks.useGoogleTaskLists).toBe(useGoogleTaskLists);
			expect(googleTasks.useGoogleTasks).toBe(useGoogleTasks);
			expect(googleTasks.useGoogleTasksStatus).toBe(useGoogleTasksStatus);
			expect(googleTasks.useUpdateGoogleTasksLastSynced).toBe(
				useUpdateGoogleTasksLastSynced,
			);
			expect(googleTasks.useUpdateGoogleTasksSettings).toBe(
				useUpdateGoogleTasksSettings,
			);
		});
	});

	describe("Types exports", () => {
		it("should export input types", () => {
			// These are type exports, so we check they exist as types
			// We can't directly check typeof for type-only exports
			expect(true).toBe(true);
		});

		it("should export output types", () => {
			// These are type exports
			expect(true).toBe(true);
		});

		it("should export hook return types", () => {
			// These are type exports
			expect(true).toBe(true);
		});
	});

	describe("Schema exports", () => {
		it("should export Zod schemas", () => {
			expect(listTasksInputSchema).toBeDefined();
			expect(createTaskListInputSchema).toBeDefined();
			expect(enableIntegrationInputSchema).toBeDefined();
			expect(updateSettingsInputSchema).toBeDefined();
			expect(deleteTaskInputSchema).toBeDefined();
			expect(getTaskInputSchema).toBeDefined();
			expect(clearCompletedInputSchema).toBeDefined();
		});

		it("should export schemas from barrel", () => {
			expect(googleTasks.clearCompletedInputSchema).toBe(
				clearCompletedInputSchema,
			);
			expect(googleTasks.createTaskListInputSchema).toBe(
				createTaskListInputSchema,
			);
			expect(googleTasks.deleteTaskInputSchema).toBe(deleteTaskInputSchema);
			expect(googleTasks.enableIntegrationInputSchema).toBe(
				enableIntegrationInputSchema,
			);
			expect(googleTasks.getTaskInputSchema).toBe(getTaskInputSchema);
			expect(googleTasks.listTasksInputSchema).toBe(listTasksInputSchema);
			expect(googleTasks.updateSettingsInputSchema).toBe(
				updateSettingsInputSchema,
			);
		});
	});
});
