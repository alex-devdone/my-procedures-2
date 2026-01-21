import { trpc } from "@/utils/trpc";

// ============================================================================
// Query Options
// ============================================================================

/**
 * Get query options for fetching all folders.
 */
export function getAllFoldersQueryOptions() {
	return trpc.folder.list.queryOptions();
}

/**
 * Get query key for folder list.
 */
export function getFoldersQueryKey() {
	return trpc.folder.list.queryKey();
}

// ============================================================================
// Mutation Options
// ============================================================================

/**
 * Get mutation options for creating a folder.
 */
export function getCreateFolderMutationOptions() {
	return trpc.folder.create.mutationOptions();
}

/**
 * Get mutation options for updating a folder.
 */
export function getUpdateFolderMutationOptions() {
	return trpc.folder.update.mutationOptions();
}

/**
 * Get mutation options for deleting a folder.
 */
export function getDeleteFolderMutationOptions() {
	return trpc.folder.delete.mutationOptions();
}

/**
 * Get mutation options for reordering a folder.
 */
export function getReorderFolderMutationOptions() {
	return trpc.folder.reorder.mutationOptions();
}

/**
 * Get mutation options for bulk creating folders.
 */
export function getBulkCreateFoldersMutationOptions() {
	return trpc.folder.bulkCreate.mutationOptions();
}
