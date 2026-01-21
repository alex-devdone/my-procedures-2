"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/utils/trpc";
import {
	getAnalyticsQueryOptions,
	getCompletionHistoryQueryOptions,
	getUpdatePastCompletionMutationOptions,
} from "./analytics.api";
import type {
	AnalyticsData,
	CompletionHistoryRecord,
	UpdatePastCompletionInput,
} from "./analytics.types";

// ============================================================================
// useAnalytics Hook
// ============================================================================

/**
 * Hook for fetching analytics data for a date range.
 *
 * @param startDate - Start of date range (ISO datetime string)
 * @param endDate - End of date range (ISO datetime string)
 * @returns Query result with analytics data
 */
export function useAnalytics(startDate: string, endDate: string) {
	return useQuery({
		...getAnalyticsQueryOptions({ startDate, endDate }),
	});
}

// ============================================================================
// useCompletionHistory Hook
// ============================================================================

/**
 * Hook for fetching completion history for a date range.
 *
 * @param startDate - Start of date range (ISO datetime string)
 * @param endDate - End of date range (ISO datetime string)
 * @returns Query result with completion history records
 */
export function useCompletionHistory(startDate: string, endDate: string) {
	return useQuery({
		...getCompletionHistoryQueryOptions({ startDate, endDate }),
	});
}

// ============================================================================
// useUpdatePastCompletion Hook
// ============================================================================

/**
 * Hook for updating past completion status of recurring todos.
 * Implements optimistic updates for both analytics and completion history caches.
 *
 * @returns Mutation with optimistic cache updates
 */
export function useUpdatePastCompletion() {
	return useMutation({
		...getUpdatePastCompletionMutationOptions(),
		onMutate: async (input: UpdatePastCompletionInput) => {
			// Cancel any outgoing refetches to prevent overwriting optimistic update
			await queryClient.cancelQueries({
				predicate: (query) => {
					const key = query.queryKey;
					// Match both analytics and completion history queries
					return (
						Array.isArray(key) &&
						key.length > 0 &&
						typeof key[0] === "object" &&
						key[0] !== null &&
						"path" in key[0] &&
						Array.isArray((key[0] as { path: string[] }).path) &&
						(key[0] as { path: string[] }).path[0] === "todo" &&
						((key[0] as { path: string[] }).path[1] === "getAnalytics" ||
							(key[0] as { path: string[] }).path[1] === "getCompletionHistory")
					);
				},
			});

			// Store all previous data for rollback
			const previousData: {
				analytics: Map<string, AnalyticsData | undefined>;
				completionHistory: Map<string, CompletionHistoryRecord[] | undefined>;
			} = {
				analytics: new Map(),
				completionHistory: new Map(),
			};

			// Get the scheduled date for matching
			const scheduledDateStr = new Date(input.scheduledDate)
				.toISOString()
				.split("T")[0];

			// Update all analytics caches optimistically
			const analyticsQueries = queryClient.getQueriesData<AnalyticsData>({
				predicate: (query) => {
					const key = query.queryKey;
					return (
						Array.isArray(key) &&
						key.length > 0 &&
						typeof key[0] === "object" &&
						key[0] !== null &&
						"path" in key[0] &&
						Array.isArray((key[0] as { path: string[] }).path) &&
						(key[0] as { path: string[] }).path[0] === "todo" &&
						(key[0] as { path: string[] }).path[1] === "getAnalytics"
					);
				},
			});

			for (const [queryKey, data] of analyticsQueries) {
				if (data) {
					const keyStr = JSON.stringify(queryKey);
					previousData.analytics.set(keyStr, data);

					queryClient.setQueryData<AnalyticsData>(queryKey, (old) => {
						if (!old) return old;

						// Calculate the delta for totals
						const completedDelta = input.completed ? 1 : -1;
						const missedDelta = input.completed ? -1 : 1;

						// Update daily breakdown
						const updatedDailyBreakdown = old.dailyBreakdown.map((day) => {
							if (day.date === scheduledDateStr) {
								return {
									...day,
									recurringCompleted: Math.max(
										0,
										day.recurringCompleted + completedDelta,
									),
									recurringMissed: Math.max(
										0,
										day.recurringMissed + missedDelta,
									),
								};
							}
							return day;
						});

						// Recalculate totals
						const totalRecurringCompleted = Math.max(
							0,
							old.totalRecurringCompleted + completedDelta,
						);
						const totalRecurringMissed = Math.max(
							0,
							old.totalRecurringMissed + missedDelta,
						);

						// Recalculate completion rate
						const totalCompleted =
							old.totalRegularCompleted + totalRecurringCompleted;
						const totalExpected =
							old.totalRegularCompleted +
							totalRecurringCompleted +
							totalRecurringMissed;
						const completionRate =
							totalExpected > 0
								? Math.round((totalCompleted / totalExpected) * 100)
								: 100;

						return {
							...old,
							totalRecurringCompleted,
							totalRecurringMissed,
							completionRate,
							dailyBreakdown: updatedDailyBreakdown,
						};
					});
				}
			}

			// Update all completion history caches optimistically
			const completionHistoryQueries = queryClient.getQueriesData<
				CompletionHistoryRecord[]
			>({
				predicate: (query) => {
					const key = query.queryKey;
					return (
						Array.isArray(key) &&
						key.length > 0 &&
						typeof key[0] === "object" &&
						key[0] !== null &&
						"path" in key[0] &&
						Array.isArray((key[0] as { path: string[] }).path) &&
						(key[0] as { path: string[] }).path[0] === "todo" &&
						(key[0] as { path: string[] }).path[1] === "getCompletionHistory"
					);
				},
			});

			for (const [queryKey, data] of completionHistoryQueries) {
				if (data) {
					const keyStr = JSON.stringify(queryKey);
					previousData.completionHistory.set(keyStr, data);

					queryClient.setQueryData<CompletionHistoryRecord[]>(
						queryKey,
						(old) => {
							if (!old) return old;

							return old.map((record) => {
								// Match by todoId and scheduledDate
								const recordScheduledDate = new Date(record.scheduledDate)
									.toISOString()
									.split("T")[0];

								if (
									record.todoId === input.todoId &&
									recordScheduledDate === scheduledDateStr
								) {
									return {
										...record,
										completedAt: input.completed ? new Date() : null,
									};
								}
								return record;
							});
						},
					);
				}
			}

			return { previousData };
		},
		onError: (_err, _input, context) => {
			// Rollback analytics caches
			if (context?.previousData.analytics) {
				for (const [keyStr, data] of context.previousData.analytics) {
					const queryKey = JSON.parse(keyStr);
					queryClient.setQueryData(queryKey, data);
				}
			}

			// Rollback completion history caches
			if (context?.previousData.completionHistory) {
				for (const [keyStr, data] of context.previousData.completionHistory) {
					const queryKey = JSON.parse(keyStr);
					queryClient.setQueryData(queryKey, data);
				}
			}
		},
		onSettled: () => {
			// Invalidate queries to refetch fresh data from server
			queryClient.invalidateQueries({
				predicate: (query) => {
					const key = query.queryKey;
					return (
						Array.isArray(key) &&
						key.length > 0 &&
						typeof key[0] === "object" &&
						key[0] !== null &&
						"path" in key[0] &&
						Array.isArray((key[0] as { path: string[] }).path) &&
						(key[0] as { path: string[] }).path[0] === "todo" &&
						((key[0] as { path: string[] }).path[1] === "getAnalytics" ||
							(key[0] as { path: string[] }).path[1] === "getCompletionHistory")
					);
				},
			});
		},
	});
}
