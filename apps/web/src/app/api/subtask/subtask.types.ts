import { z } from "zod";

// ============================================================================
// Base Types
// ============================================================================

/**
 * Unified subtask type for frontend use.
 * Supports both local (string UUID) and remote (numeric) IDs.
 */
export interface Subtask {
	id: number | string;
	text: string;
	completed: boolean;
	todoId: number | string;
	order: number;
}

/**
 * Remote subtask from the database (via tRPC).
 */
export interface RemoteSubtask {
	id: number;
	text: string;
	completed: boolean;
	todoId: number;
	order: number;
}

/**
 * Local subtask stored in browser localStorage.
 */
export interface LocalSubtask {
	id: string;
	text: string;
	completed: boolean;
	todoId: string;
	order: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

// Remote (numeric ID) schemas
export const createSubtaskInputSchema = z.object({
	todoId: z.number(),
	text: z.string().min(1, "Subtask text is required").max(500),
});

export const updateSubtaskInputSchema = z.object({
	id: z.number(),
	text: z.string().min(1, "Subtask text is required").max(500).optional(),
});

export const deleteSubtaskInputSchema = z.object({
	id: z.number(),
});

export const toggleSubtaskInputSchema = z.object({
	id: z.number(),
	completed: z.boolean(),
});

export const reorderSubtaskInputSchema = z.object({
	id: z.number(),
	newOrder: z.number().min(0),
});

export const listSubtasksInputSchema = z.object({
	todoId: z.number(),
});

// Local (string UUID) schemas
export const localCreateSubtaskInputSchema = z.object({
	todoId: z.string(),
	text: z.string().min(1, "Subtask text is required").max(500),
});

export const localUpdateSubtaskInputSchema = z.object({
	id: z.string(),
	text: z.string().min(1, "Subtask text is required").max(500).optional(),
});

export const localDeleteSubtaskInputSchema = z.object({
	id: z.string(),
});

export const localToggleSubtaskInputSchema = z.object({
	id: z.string(),
	completed: z.boolean(),
});

export const localReorderSubtaskInputSchema = z.object({
	id: z.string(),
	newOrder: z.number().min(0),
});

export const localListSubtasksInputSchema = z.object({
	todoId: z.string(),
});

// ============================================================================
// Input Types (inferred from Zod schemas)
// ============================================================================

export type CreateSubtaskInput = z.infer<typeof createSubtaskInputSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskInputSchema>;
export type DeleteSubtaskInput = z.infer<typeof deleteSubtaskInputSchema>;
export type ToggleSubtaskInput = z.infer<typeof toggleSubtaskInputSchema>;
export type ReorderSubtaskInput = z.infer<typeof reorderSubtaskInputSchema>;
export type ListSubtasksInput = z.infer<typeof listSubtasksInputSchema>;

export type LocalCreateSubtaskInput = z.infer<
	typeof localCreateSubtaskInputSchema
>;
export type LocalUpdateSubtaskInput = z.infer<
	typeof localUpdateSubtaskInputSchema
>;
export type LocalDeleteSubtaskInput = z.infer<
	typeof localDeleteSubtaskInputSchema
>;
export type LocalToggleSubtaskInput = z.infer<
	typeof localToggleSubtaskInputSchema
>;
export type LocalReorderSubtaskInput = z.infer<
	typeof localReorderSubtaskInputSchema
>;
export type LocalListSubtasksInput = z.infer<
	typeof localListSubtasksInputSchema
>;

// ============================================================================
// Output Types
// ============================================================================

export interface DeleteSubtaskOutput {
	success: boolean;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseSubtaskStorageReturn {
	subtasks: Subtask[];
	create: (todoId: number | string, text: string) => Promise<Subtask>;
	update: (id: number | string, text: string) => Promise<Subtask>;
	toggle: (id: number | string, completed: boolean) => Promise<Subtask>;
	deleteSubtask: (id: number | string) => Promise<void>;
	reorder: (id: number | string, newOrder: number) => Promise<Subtask>;
	isLoading: boolean;
	isAuthenticated: boolean;
}

/**
 * Progress indicator for subtask completion within a todo.
 */
export interface SubtaskProgress {
	completed: number;
	total: number;
}

/**
 * Helper to calculate subtask progress.
 */
export function calculateSubtaskProgress(subtasks: Subtask[]): SubtaskProgress {
	return {
		completed: subtasks.filter((s) => s.completed).length,
		total: subtasks.length,
	};
}

/**
 * Check if all subtasks are completed.
 */
export function areAllSubtasksCompleted(subtasks: Subtask[]): boolean {
	return subtasks.length > 0 && subtasks.every((s) => s.completed);
}
