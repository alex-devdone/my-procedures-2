import { z } from "zod";

// ============================================================================
// Recurring Pattern Types
// ============================================================================

/**
 * Recurring pattern type for cron-style scheduling
 */
export const RECURRING_PATTERN_TYPES = [
	"daily",
	"weekly",
	"monthly",
	"yearly",
	"custom",
] as const;

export type RecurringPatternType = (typeof RECURRING_PATTERN_TYPES)[number];

/**
 * Recurring pattern schema for validation
 */
export const recurringPatternSchema = z.object({
	type: z.enum(RECURRING_PATTERN_TYPES),
	interval: z.number().int().positive().optional(),
	daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
	dayOfMonth: z.number().int().min(1).max(31).optional(),
	monthOfYear: z.number().int().min(1).max(12).optional(),
	endDate: z.string().optional(),
	occurrences: z.number().int().positive().optional(),
	/** Time of day to send notification in HH:mm format (e.g., "09:00") */
	notifyAt: z
		.string()
		.regex(
			/^([01]\d|2[0-3]):([0-5]\d)$/,
			"Must be in HH:mm format (00:00-23:59)",
		)
		.optional(),
});

export type RecurringPattern = z.infer<typeof recurringPatternSchema>;

// ============================================================================
// Base Types
// ============================================================================

/**
 * Unified todo type for frontend use.
 * Supports both local (string UUID) and remote (numeric) IDs.
 * Includes optional scheduling fields.
 */
export interface Todo {
	id: number | string;
	text: string;
	completed: boolean;
	folderId?: number | string | null;
	dueDate?: string | null;
	reminderAt?: string | null;
	recurringPattern?: RecurringPattern | null;
}

/**
 * Virtual todo entry representing a recurring pattern instance on a specific date.
 * Used in views like Upcoming to show recurring todos on each matching date.
 */
export interface VirtualTodo extends Todo {
	/** Indicates this is a virtual entry generated from a recurring pattern */
	isRecurringInstance: true;
	/** The date this virtual instance represents (YYYY-MM-DD format) */
	virtualDate: string;
	/** Unique key for this virtual instance (originalId-virtualDate) */
	virtualKey: string;
	/** Whether this specific occurrence was completed (from completion history) */
	occurrenceCompleted?: boolean;
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
	recurringPattern: RecurringPattern | null;
}

/**
 * Local todo stored in browser localStorage.
 * Includes optional scheduling fields for offline-first support.
 */
export interface LocalTodo {
	id: string;
	text: string;
	completed: boolean;
	folderId?: string | null;
	dueDate?: string | null;
	reminderAt?: string | null;
	recurringPattern?: RecurringPattern | null;
}

// ============================================================================
// Input Schemas (Zod) - Remote (tRPC) Operations
// ============================================================================

export const createTodoInputSchema = z.object({
	text: z.string().min(1, "Todo text is required"),
	folderId: z.number().nullable().optional(),
	dueDate: z.string().datetime().nullable().optional(),
	reminderAt: z.string().datetime().nullable().optional(),
	recurringPattern: recurringPatternSchema.nullable().optional(),
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
			dueDate: z.string().datetime().nullable().optional(),
			reminderAt: z.string().datetime().nullable().optional(),
			recurringPattern: recurringPatternSchema.nullable().optional(),
		}),
	),
});

export const updateTodoFolderInputSchema = z.object({
	id: z.number(),
	folderId: z.number().nullable(),
});

export const updateTodoScheduleInputSchema = z.object({
	id: z.number(),
	dueDate: z.string().datetime().nullable().optional(),
	reminderAt: z.string().datetime().nullable().optional(),
	recurringPattern: recurringPatternSchema.nullable().optional(),
});

export const getDueInRangeInputSchema = z.object({
	startDate: z.string().datetime(),
	endDate: z.string().datetime(),
});

export const completeRecurringInputSchema = z.object({
	id: z.number(),
	completedOccurrences: z.number().int().nonnegative().optional(),
});

// ============================================================================
// Input Schemas (Zod) - Local (localStorage) Operations
// ============================================================================

export const localCreateTodoInputSchema = z.object({
	text: z.string().min(1, "Todo text is required"),
	folderId: z.string().nullable().optional(),
	dueDate: z.string().nullable().optional(),
	reminderAt: z.string().nullable().optional(),
	recurringPattern: recurringPatternSchema.nullable().optional(),
});

export const localToggleTodoInputSchema = z.object({
	id: z.string(),
	completed: z.boolean(),
});

export const localDeleteTodoInputSchema = z.object({
	id: z.string(),
});

export const localUpdateTodoFolderInputSchema = z.object({
	id: z.string(),
	folderId: z.string().nullable(),
});

export const localUpdateTodoScheduleInputSchema = z.object({
	id: z.string(),
	dueDate: z.string().nullable().optional(),
	reminderAt: z.string().nullable().optional(),
	recurringPattern: recurringPatternSchema.nullable().optional(),
});

// ============================================================================
// Input Types (inferred from Zod schemas) - Remote
// ============================================================================

export type CreateTodoInput = z.infer<typeof createTodoInputSchema>;
export type ToggleTodoInput = z.infer<typeof toggleTodoInputSchema>;
export type DeleteTodoInput = z.infer<typeof deleteTodoInputSchema>;
export type BulkCreateTodosInput = z.infer<typeof bulkCreateTodosInputSchema>;
export type UpdateTodoFolderInput = z.infer<typeof updateTodoFolderInputSchema>;
export type UpdateTodoScheduleInput = z.infer<
	typeof updateTodoScheduleInputSchema
>;
export type GetDueInRangeInput = z.infer<typeof getDueInRangeInputSchema>;
export type CompleteRecurringInput = z.infer<
	typeof completeRecurringInputSchema
>;

// ============================================================================
// Input Types (inferred from Zod schemas) - Local
// ============================================================================

export type LocalCreateTodoInput = z.infer<typeof localCreateTodoInputSchema>;
export type LocalToggleTodoInput = z.infer<typeof localToggleTodoInputSchema>;
export type LocalDeleteTodoInput = z.infer<typeof localDeleteTodoInputSchema>;
export type LocalUpdateTodoFolderInput = z.infer<
	typeof localUpdateTodoFolderInputSchema
>;
export type LocalUpdateTodoScheduleInput = z.infer<
	typeof localUpdateTodoScheduleInputSchema
>;

// ============================================================================
// Output Types
// ============================================================================

export interface BulkCreateTodosOutput {
	count: number;
}

export interface CompleteRecurringOutput {
	completed: boolean;
	nextTodo: RemoteTodo | null;
	message: string | null;
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
	create: (
		text: string,
		folderId?: number | string | null,
		scheduling?: {
			dueDate?: string | null;
			reminderAt?: string | null;
			recurringPattern?: RecurringPattern | null;
		},
	) => Promise<void>;
	toggle: (id: number | string, completed: boolean) => Promise<void>;
	deleteTodo: (id: number | string) => Promise<void>;
	updateFolder: (
		id: number | string,
		folderId: number | string | null,
	) => Promise<void>;
	updateSchedule: (
		id: number | string,
		scheduling: {
			dueDate?: string | null;
			reminderAt?: string | null;
			recurringPattern?: RecurringPattern | null;
		},
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
