import { z } from "zod";

// ============================================================================
// Input Schemas (Zod)
// ============================================================================

/**
 * Schema for analytics date range input
 */
export const getAnalyticsInputSchema = z.object({
	startDate: z.string().datetime(),
	endDate: z.string().datetime(),
});

/**
 * Schema for completion history date range input
 */
export const getCompletionHistoryInputSchema = z.object({
	startDate: z.string().datetime(),
	endDate: z.string().datetime(),
});

/**
 * Schema for updating past completion status
 */
export const updatePastCompletionInputSchema = z.object({
	todoId: z.number(),
	scheduledDate: z.string().datetime(),
	completed: z.boolean(),
});

// ============================================================================
// Input Types (inferred from Zod schemas)
// ============================================================================

export type GetAnalyticsInput = z.infer<typeof getAnalyticsInputSchema>;
export type GetCompletionHistoryInput = z.infer<
	typeof getCompletionHistoryInputSchema
>;
export type UpdatePastCompletionInput = z.infer<
	typeof updatePastCompletionInputSchema
>;

/**
 * Local storage compatible version of UpdatePastCompletionInput
 * that supports string todoId for local storage
 */
export interface UpdatePastCompletionInputLocal {
	todoId: string | number;
	scheduledDate: string;
	completed: boolean;
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Daily statistics breakdown for analytics
 */
export interface DailyStats {
	/** Date in YYYY-MM-DD format */
	date: string;
	/** Number of regular (non-recurring) todos completed on this day */
	regularCompleted: number;
	/** Number of recurring todo occurrences completed on this day */
	recurringCompleted: number;
	/** Number of recurring todo occurrences missed on this day */
	recurringMissed: number;
}

/**
 * Completion record for a todo occurrence
 */
export interface CompletionRecord {
	/** The ID of the todo */
	todoId: number;
	/** The text/title of the todo */
	todoText: string;
	/** The date the occurrence was scheduled for (ISO string) */
	scheduledDate: string;
	/** When the occurrence was completed (ISO string), null if not completed */
	completedAt: string | null;
	/** Whether this is a recurring todo */
	isRecurring: boolean;
}

/**
 * Complete analytics data for a date range
 */
export interface AnalyticsData {
	/** Total number of regular (non-recurring) todos completed */
	totalRegularCompleted: number;
	/** Total number of recurring todo occurrences completed */
	totalRecurringCompleted: number;
	/** Total number of recurring todo occurrences missed */
	totalRecurringMissed: number;
	/** Completion rate as a percentage (0-100) */
	completionRate: number;
	/** Current streak of consecutive days with at least one completion */
	currentStreak: number;
	/** Daily breakdown of completions and misses */
	dailyBreakdown: DailyStats[];
}

// ============================================================================
// Backend Response Types (matching tRPC procedure output)
// ============================================================================

/**
 * Raw completion history record from the backend
 */
export interface CompletionHistoryRecord {
	id: number;
	todoId: number;
	scheduledDate: Date;
	completedAt: Date | null;
	createdAt: Date;
	todoText: string;
}

/**
 * Unified completion history record that works for both local and remote storage.
 * Components should use this type and convert dates as needed using new Date().
 */
export interface UnifiedCompletionHistoryRecord {
	id: string | number;
	todoId: string | number;
	scheduledDate: string | Date;
	completedAt: string | Date | null;
	todoText?: string;
	createdAt?: string | Date;
}
