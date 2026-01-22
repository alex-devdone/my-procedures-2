// API
export {
	getAnalyticsQueryKey,
	getAnalyticsQueryOptions,
	getCompletionHistoryQueryKey,
	getCompletionHistoryQueryOptions,
	getUpdatePastCompletionMutationOptions,
} from "./analytics.api";
// Hooks
export {
	notifyLocalAnalyticsListeners,
	useAnalytics,
	useCompletionHistory,
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
	UnifiedCompletionHistoryRecord,
	UpdatePastCompletionInput,
} from "./analytics.types";
export {
	getAnalyticsInputSchema,
	getCompletionHistoryInputSchema,
	updatePastCompletionInputSchema,
} from "./analytics.types";
