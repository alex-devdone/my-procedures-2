import { trpc } from "@/utils/trpc";

import type {
	GetAnalyticsInput,
	GetCompletionHistoryInput,
	GetRecurringOccurrencesInput,
} from "./analytics.types";

// ============================================================================
// Query Options
// ============================================================================

/**
 * Get query options for fetching analytics data for a date range.
 */
export function getAnalyticsQueryOptions(input: GetAnalyticsInput) {
	return trpc.todo.getAnalytics.queryOptions(input);
}

/**
 * Get query key for analytics data.
 */
export function getAnalyticsQueryKey(input: GetAnalyticsInput) {
	return trpc.todo.getAnalytics.queryKey(input);
}

/**
 * Get query options for fetching completion history for a date range.
 */
export function getCompletionHistoryQueryOptions(
	input: GetCompletionHistoryInput,
) {
	return trpc.todo.getCompletionHistory.queryOptions(input);
}

/**
 * Get query key for completion history.
 */
export function getCompletionHistoryQueryKey(input: GetCompletionHistoryInput) {
	return trpc.todo.getCompletionHistory.queryKey(input);
}

// ============================================================================
// Mutation Options
// ============================================================================

/**
 * Get query options for fetching recurring todos with matching dates for a date range.
 */
export function getRecurringOccurrencesQueryOptions(
	input: GetRecurringOccurrencesInput,
) {
	return trpc.todo.getRecurringTodosForDateRange.queryOptions(input);
}

/**
 * Get query key for recurring occurrences.
 */
export function getRecurringOccurrencesQueryKey(
	input: GetRecurringOccurrencesInput,
) {
	return trpc.todo.getRecurringTodosForDateRange.queryKey(input);
}

// ============================================================================
// Mutation Options
// ============================================================================

/**
 * Get mutation options for updating past completion status.
 * Used to retroactively mark a recurring todo occurrence as completed or not completed.
 */
export function getUpdatePastCompletionMutationOptions() {
	return trpc.todo.updatePastCompletion.mutationOptions();
}
