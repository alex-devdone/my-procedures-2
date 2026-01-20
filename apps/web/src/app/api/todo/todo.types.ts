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
	folderId?: number | string | null;
}

/**
 * Remote todo from the database (via tRPC).
 * Includes scheduling fields from the database schema.
 */
export interface RemoteTodo {
	id: number;
	text: string;
	completed: boolean;
	userId: string;
	folderId: number | null;
	dueDate: string | null;
	reminderAt: string | null;
	recurringPattern?: unknown;
}

/**
 * Local todo stored in browser localStorage.
 */
export interface LocalTodo {
	id: string;
	text: string;
	completed: boolean;
	folderId?: string | null;
}

// ============================================================================
// Input Schemas (Zod)
// ============================================================================

export const createTodoInputSchema = z.object({
	text: z.string().min(1, "Todo text is required"),
	folderId: z.number().nullable().optional(),
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
			folderId: z.number().nullable().optional(),
		}),
	),
});

export const updateTodoFolderInputSchema = z.object({
	id: z.number(),
	folderId: z.number().nullable(),
});

// ============================================================================
// Input Types (inferred from Zod schemas)
// ============================================================================

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;
export type ToggleTodoInput = z.infer<typeof toggleTodoInputSchema>;
export type DeleteTodoInput = z.infer<typeof deleteTodoInputSchema>;
export type BulkCreateTodosInput = z.infer<typeof bulkCreateTodosInputSchema>;
export type UpdateTodoFolderInput = z.infer<typeof updateTodoFolderInputSchema>;

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

/** Selected folder ID type - can be "inbox" for unassigned todos, or a folder ID */
export type SelectedFolderId = "inbox" | number | string;

export interface UseTodoStorageReturn {
	todos: Todo[];
	create: (text: string, folderId?: number | string | null) => Promise<void>;
	toggle: (id: number | string, completed: boolean) => Promise<void>;
	deleteTodo: (id: number | string) => Promise<void>;
	updateFolder: (
		id: number | string,
		folderId: number | string | null,
	) => Promise<void>;
	isLoading: boolean;
	isAuthenticated: boolean;
	selectedFolderId: SelectedFolderId;
	setSelectedFolderId: (folderId: SelectedFolderId) => void;
	filteredTodos: Todo[];
}

export interface UseSyncTodosReturn {
	syncPrompt: SyncPromptState;
	handleSyncAction: (action: SyncAction) => Promise<void>;
	isSyncing: boolean;
}
