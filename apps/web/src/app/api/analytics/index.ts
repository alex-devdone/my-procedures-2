// API
export {
	getAnalyticsQueryKey,
	getAnalyticsQueryOptions,
	getCompletionHistoryQueryKey,
	getCompletionHistoryQueryOptions,
	getRecurringOccurrencesQueryKey,
	getRecurringOccurrencesQueryOptions,
	getUpdatePastCompletionMutationOptions,
} from "./analytics.api";
// Hooks
export {
	notifyLocalAnalyticsListeners,
	useAnalytics,
	useCompletionHistory,
	useRecurringOccurrencesWithStatus,
	useUpdatePastCompletion,
} from "./analytics.hooks";
// Types
export type {
	AnalyticsData,
	CompletionHistoryRecord,
	CompletionRecord,
	DailyStats,
	GetAnalyticsInput,
	GetCompletionHistoryInput,
	GetRecurringOccurrencesInput,
	RecurringOccurrenceWithStatus,
	UnifiedCompletionHistoryRecord,
	UpdatePastCompletionInput,
} from "./analytics.types";
export {
	getAnalyticsInputSchema,
	getCompletionHistoryInputSchema,
	getRecurringOccurrencesInputSchema,
	updatePastCompletionInputSchema,
} from "./analytics.types";
