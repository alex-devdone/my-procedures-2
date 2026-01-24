import { trpc } from "@/utils/trpc";
import type { GetTaskInput, ListTasksInput } from "./google-tasks.types";

// ============================================================================
// Query Options
// ============================================================================

/**
 * Get query options for fetching Google Tasks integration status.
 */
export function getStatusQueryOptions() {
	return trpc.googleTasks.getStatus.queryOptions();
}

/**
 * Get query key for status.
 */
export function getStatusQueryKey() {
	return trpc.googleTasks.getStatus.queryKey();
}

/**
 * Get query options for listing all task lists.
 */
export function listTaskListsQueryOptions() {
	return trpc.googleTasks.listTaskLists.queryOptions();
}

/**
 * Get query key for task lists.
 */
export function listTaskListsQueryKey() {
	return trpc.googleTasks.listTaskLists.queryKey();
}

/**
 * Get query options for listing tasks from a specific task list.
 */
export function listTasksQueryOptions(input: ListTasksInput) {
	return trpc.googleTasks.listTasks.queryOptions(input);
}

/**
 * Get query key for tasks list.
 */
export function listTasksQueryKey(input: ListTasksInput) {
	return trpc.googleTasks.listTasks.queryKey(input);
}

/**
 * Get query options for fetching a single task.
 */
export function getTaskQueryOptions(input: GetTaskInput) {
	return trpc.googleTasks.getTask.queryOptions(input);
}

/**
 * Get query key for a single task.
 */
export function getTaskQueryKey(input: GetTaskInput) {
	return trpc.googleTasks.getTask.queryKey(input);
}

// ============================================================================
// Mutation Options
// ============================================================================

/**
 * Get mutation options for enabling Google Tasks integration.
 */
export function getEnableIntegrationMutationOptions() {
	return trpc.googleTasks.enableIntegration.mutationOptions();
}

/**
 * Get mutation options for disabling Google Tasks integration.
 */
export function getDisableIntegrationMutationOptions() {
	return trpc.googleTasks.disableIntegration.mutationOptions();
}

/**
 * Get mutation options for updating integration settings.
 */
export function getUpdateSettingsMutationOptions() {
	return trpc.googleTasks.updateSettings.mutationOptions();
}

/**
 * Get mutation options for updating the last synced timestamp.
 */
export function getUpdateLastSyncedMutationOptions() {
	return trpc.googleTasks.updateLastSynced.mutationOptions();
}

/**
 * Get mutation options for creating a new task list.
 */
export function getCreateTaskListMutationOptions() {
	return trpc.googleTasks.createTaskList.mutationOptions();
}

/**
 * Get mutation options for deleting a task.
 */
export function getDeleteTaskMutationOptions() {
	return trpc.googleTasks.deleteTask.mutationOptions();
}

/**
 * Get mutation options for clearing completed tasks.
 */
export function getClearCompletedMutationOptions() {
	return trpc.googleTasks.clearCompleted.mutationOptions();
}
