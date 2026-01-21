// Types and schemas

// API functions
export {
	getAnalyticsQueryKey,
	getAnalyticsQueryOptions,
	getCompletionHistoryQueryKey,
	getCompletionHistoryQueryOptions,
	getUpdatePastCompletionMutationOptions,
} from "./analytics.api";
// Hooks
export {
	useAnalytics,
	useCompletionHistory,
	useUpdatePastCompletion,
} from "./analytics.hooks";
export {
	type AnalyticsData,
	type CompletionHistoryRecord,
	type CompletionRecord,
	type DailyStats,
	type GetAnalyticsInput,
	type GetCompletionHistoryInput,
	getAnalyticsInputSchema,
	getCompletionHistoryInputSchema,
	type UpdatePastCompletionInput,
	updatePastCompletionInputSchema,
} from "./analytics.types";
