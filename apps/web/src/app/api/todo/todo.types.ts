import { z } from "zod";

// ============================================================================
// Base Types
// ============================================================================

/**
 * Unified todo type for frontend use.
 * Supports both local (string UUID) and remote (numeric) IDs.
 */
export interface Todo {
	id: number | string;
	text: string;
	completed: boolean;
}

/**
 * Remote todo from the database (via tRPC).
 */
export interface RemoteTodo {
	id: number;
	text: string;
	completed: boolean;
	userId: string;
}

/**
 * Local todo stored in browser localStorage.
 */
export interface LocalTodo {
	id: string;
	text: string;
	completed: boolean;
}

// ============================================================================
// Input Schemas (Zod)
// ============================================================================

export const createTodoInputSchema = z.object({
	text: z.string().min(1, "Todo text is required"),
});

export const toggleTodoInputSchema = z.object({
	id: z.number(),
	completed: z.boolean(),
});

export const deleteTodoInputSchema = z.object({
	id: z.number(),
});

export const bulkCreateTodosInputSchema = z.object({
	todos: z.array(
		z.object({
			text: z.string().min(1),
			completed: z.boolean(),
		}),
	),
});

// ============================================================================
// Input Types (inferred from Zod schemas)
// ============================================================================

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;
export type ToggleTodoInput = z.infer<typeof toggleTodoInputSchema>;
export type DeleteTodoInput = z.infer<typeof deleteTodoInputSchema>;
export type BulkCreateTodosInput = z.infer<typeof bulkCreateTodosInputSchema>;

// ============================================================================
// Output Types
// ============================================================================

export interface BulkCreateTodosOutput {
	count: number;
}

// ============================================================================
// Sync Types
// ============================================================================

export type SyncAction = "sync" | "discard" | "keep_both";

export interface SyncPromptState {
	isOpen: boolean;
	localTodosCount: number;
	remoteTodosCount: number;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseTodoStorageReturn {
	todos: Todo[];
	create: (text: string) => Promise<void>;
	toggle: (id: number | string, completed: boolean) => Promise<void>;
	deleteTodo: (id: number | string) => Promise<void>;
	isLoading: boolean;
	isAuthenticated: boolean;
}

export interface UseSyncTodosReturn {
	syncPrompt: SyncPromptState;
	handleSyncAction: (action: SyncAction) => Promise<void>;
	isSyncing: boolean;
}
