import { z } from "zod";

// ============================================================================
// Google Tasks API Types (from Google Tasks API)
// ============================================================================

/**
 * Status values for Google Tasks
 */
export const GOOGLE_TASK_STATUS = ["needsAction", "completed"] as const;

export type GoogleTaskStatus = (typeof GOOGLE_TASK_STATUS)[number];

/**
 * Google Task List resource from Google Tasks API
 */
export interface GoogleTaskList {
	kind: "tasks#taskList";
	id: string;
	title: string;
	updated: string;
	selfLink: string;
}

/**
 * Google Task resource from Google Tasks API
 */
export interface GoogleTask {
	kind: "tasks#task";
	id: string;
	etag: string;
	title: string;
	updated: string;
	selfLink: string;
	parent?: string;
	position?: string;
	notes?: string;
	status: GoogleTaskStatus;
	due?: string;
	completed?: string;
	deleted?: boolean;
	hidden?: boolean;
}

// ============================================================================
// Input Schemas (Zod) - Google Tasks Integration
// ============================================================================

/**
 * Schema for listing tasks from a specific task list
 */
export const listTasksInputSchema = z.object({
	taskListId: z.string().min(1, "Task list ID is required"),
	showDeleted: z.boolean().optional().default(false),
	showHidden: z.boolean().optional().default(false),
});

/**
 * Schema for creating a new task list
 */
export const createTaskListInputSchema = z.object({
	name: z.string().trim().min(1, "Task list name is required"),
});

/**
 * Schema for enabling Google Tasks integration
 */
export const enableIntegrationInputSchema = z.object({
	accessToken: z.string().min(1, "Access token is required"),
	refreshToken: z.string().optional(),
	expiresIn: z
		.number()
		.positive("Expiration time must be a positive number")
		.optional(),
	defaultListId: z.string().optional(),
});

/**
 * Schema for updating Google Tasks integration settings
 */
export const updateSettingsInputSchema = z.object({
	enabled: z.boolean().optional(),
	syncEnabled: z.boolean().optional(),
	defaultListId: z.string().nullable().optional(),
});

/**
 * Schema for deleting a task from Google Tasks
 */
export const deleteTaskInputSchema = z.object({
	taskListId: z.string().min(1, "Task list ID is required"),
	taskId: z.string().min(1, "Task ID is required"),
});

/**
 * Schema for getting a single task from Google Tasks
 */
export const getTaskInputSchema = z.object({
	taskListId: z.string().min(1, "Task list ID is required"),
	taskId: z.string().min(1, "Task ID is required"),
});

/**
 * Schema for clearing completed tasks from a task list
 */
export const clearCompletedInputSchema = z.object({
	taskListId: z.string().min(1, "Task list ID is required"),
});

// ============================================================================
// Input Types (inferred from Zod schemas)
// ============================================================================

export type ListTasksInput = z.infer<typeof listTasksInputSchema>;
export type CreateTaskListInput = z.infer<typeof createTaskListInputSchema>;
export type EnableIntegrationInput = z.infer<
	typeof enableIntegrationInputSchema
>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;
export type GetTaskInput = z.infer<typeof getTaskInputSchema>;
export type ClearCompletedInput = z.infer<typeof clearCompletedInputSchema>;

// ============================================================================
// Output Types - Integration Status
// ============================================================================

/**
 * Status of the Google Tasks integration for a user
 */
export interface GoogleTasksIntegrationStatus {
	/** Whether the integration is enabled */
	enabled: boolean;
	/** Whether automatic sync is enabled */
	syncEnabled: boolean;
	/** ISO timestamp of last sync, or null if never synced */
	lastSyncedAt: string | null;
	/** Default task list ID, or null if not set */
	defaultListId: string | null;
	/** Whether a Google account is linked */
	linked: boolean;
}

/**
 * Task list for use in the frontend
 */
export interface TaskList {
	/** Unique identifier for the task list */
	id: string;
	/** Title/name of the task list */
	title: string;
	/** ISO timestamp of last update */
	updated: string;
}

/**
 * Task for use in the frontend
 */
export interface Task {
	/** Unique identifier for the task */
	id: string;
	/** Title of the task */
	title: string;
	/** Additional notes/description */
	notes: string | null;
	/** Current status of the task */
	status: GoogleTaskStatus;
	/** ISO due date string, or null if not set */
	due: string | null;
	/** ISO completion timestamp, or null if not completed */
	completed: string | null;
	/** ISO timestamp of last update */
	updated: string;
	/** Position for ordering */
	position: string | null;
	/** Parent task ID for subtasks */
	parent: string | null;
	/** Whether the task is marked as deleted */
	deleted: boolean;
	/** Whether the task is hidden */
	hidden: boolean;
}

// ============================================================================
// Output Types - Mutation Responses
// ============================================================================

/**
 * Response from enabling integration
 */
export interface EnableIntegrationOutput {
	/** Integration record ID */
	id: number;
	/** Whether the integration is enabled */
	enabled: boolean;
	/** Default task list ID */
	defaultListId: string | null;
}

/**
 * Response from updating settings
 */
export interface UpdateSettingsOutput {
	/** Whether the integration is enabled */
	enabled: boolean;
	/** Whether automatic sync is enabled */
	syncEnabled: boolean;
	/** Default task list ID */
	defaultListId: string | null;
}

/**
 * Response from updating last synced timestamp
 */
export interface UpdateLastSyncedOutput {
	/** ISO timestamp of last sync */
	lastSyncedAt: string | null;
}

/**
 * Generic success response
 */
export interface SuccessOutput {
	success: true;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * Return type for useGoogleTasksStatus hook
 */
export interface UseGoogleTasksStatusReturn {
	/** Integration status data */
	status: GoogleTasksIntegrationStatus | null;
	/** Whether the status is being fetched */
	isLoading: boolean;
	/** Whether there was an error fetching status */
	error: Error | null;
	/** Function to refetch the status */
	refetch: () => void;
}

/**
 * Return type for useGoogleTasksList hook
 */
export interface UseGoogleTasksListReturn<TData = unknown> {
	/** List data */
	data: TData | null;
	/** Whether the data is being fetched */
	isLoading: boolean;
	/** Whether there was an error fetching data */
	error: Error | null;
	/** Function to refetch the data */
	refetch: () => void;
}

/**
 * Return type for useGoogleTasksMutation hook
 */
export interface UseGoogleTasksMutationReturn<
	TData = unknown,
	TVariables = unknown,
> {
	/** Mutation function */
	mutate: (variables: TVariables) => void;
	/** Mutation function that returns a promise */
	mutateAsync: (variables: TVariables) => Promise<TData>;
	/** Whether the mutation is in progress */
	isPending: boolean;
	/** Error from the last mutation, if any */
	error: Error | null;
	/** Reset the mutation state */
	reset: () => void;
}
