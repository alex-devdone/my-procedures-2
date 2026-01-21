import { trpc } from "@/utils/trpc";

import type { ListSubtasksInput } from "./subtask.types";

// ============================================================================
// Query Options
// ============================================================================

/**
 * Get query options for fetching subtasks for a specific todo.
 */
export function getSubtasksQueryOptions(input: ListSubtasksInput) {
	return trpc.subtask.list.queryOptions(input);
}

/**
 * Get query key for subtasks list for a specific todo.
 */
export function getSubtasksQueryKey(todoId: number) {
	return trpc.subtask.list.queryKey({ todoId });
}

// ============================================================================
// Mutation Options
// ============================================================================

/**
 * Get mutation options for creating a subtask.
 */
export function getCreateSubtaskMutationOptions() {
	return trpc.subtask.create.mutationOptions();
}

/**
 * Get mutation options for updating a subtask.
 */
export function getUpdateSubtaskMutationOptions() {
	return trpc.subtask.update.mutationOptions();
}

/**
 * Get mutation options for deleting a subtask.
 */
export function getDeleteSubtaskMutationOptions() {
	return trpc.subtask.delete.mutationOptions();
}

/**
 * Get mutation options for toggling a subtask's completion status.
 */
export function getToggleSubtaskMutationOptions() {
	return trpc.subtask.toggle.mutationOptions();
}

/**
 * Get mutation options for reordering a subtask.
 */
export function getReorderSubtaskMutationOptions() {
	return trpc.subtask.reorder.mutationOptions();
}

/**
 * Get mutation options for bulk creating subtasks.
 * Used during subtask sync when user logs in.
 */
export function getBulkCreateSubtasksMutationOptions() {
	return trpc.subtask.bulkCreate.mutationOptions();
}
