import { trpc } from "@/utils/trpc";

// ============================================================================
// Query Options
// ============================================================================

/**
 * Get query options for fetching all todos.
 */
export function getAllTodosQueryOptions() {
	return trpc.todo.getAll.queryOptions();
}

/**
 * Get query key for todo list.
 */
export function getTodosQueryKey() {
	return trpc.todo.getAll.queryKey();
}

// ============================================================================
// Mutation Options
// ============================================================================

/**
 * Get mutation options for creating a todo.
 */
export function getCreateTodoMutationOptions() {
	return trpc.todo.create.mutationOptions();
}

/**
 * Get mutation options for toggling a todo.
 */
export function getToggleTodoMutationOptions() {
	return trpc.todo.toggle.mutationOptions();
}

/**
 * Get mutation options for deleting a todo.
 */
export function getDeleteTodoMutationOptions() {
	return trpc.todo.delete.mutationOptions();
}

/**
 * Get mutation options for bulk creating todos.
 */
export function getBulkCreateTodosMutationOptions() {
	return trpc.todo.bulkCreate.mutationOptions();
}

/**
 * Get mutation options for updating a todo's folder.
 */
export function getUpdateTodoFolderMutationOptions() {
	return trpc.todo.updateFolder.mutationOptions();
}

/**
 * Get mutation options for updating a todo's schedule (dueDate, reminderAt, recurringPattern).
 */
export function getUpdateTodoScheduleMutationOptions() {
	return trpc.todo.updateSchedule.mutationOptions();
}
