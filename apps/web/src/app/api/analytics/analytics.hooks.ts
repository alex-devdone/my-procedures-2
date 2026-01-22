"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { useSession } from "@/lib/auth-client";
import * as localTodoStorage from "@/lib/local-todo-storage";
import { queryClient } from "@/utils/trpc";
import {
	getAnalyticsQueryOptions,
	getCompletionHistoryQueryOptions,
	getUpdatePastCompletionMutationOptions,
} from "./analytics.api";
import type {
	AnalyticsData,
	CompletionHistoryRecord,
	UnifiedCompletionHistoryRecord,
	UpdatePastCompletionInput,
	UpdatePastCompletionInputLocal,
} from "./analytics.types";

// ============================================================================
// Local Storage Sync (for useSyncExternalStore)
// ============================================================================

let localAnalyticsListeners: Array<() => void> = [];

function subscribeToLocalAnalytics(callback: () => void) {
	localAnalyticsListeners.push(callback);
	return () => {
		localAnalyticsListeners = localAnalyticsListeners.filter(
			(l) => l !== callback,
		);
	};
}

export function notifyLocalAnalyticsListeners() {
	for (const listener of localAnalyticsListeners) {
		listener();
	}
}

// Cached snapshots to prevent infinite loops in useSyncExternalStore
let cachedLocalAnalytics: localTodoStorage.LocalAnalyticsData | undefined;
let cachedLocalAnalyticsKey = "";

let cachedLocalCompletionHistory: localTodoStorage.CompletionHistoryEntry[] =
	[];
let cachedLocalCompletionHistoryKey = "";

// Server snapshot returns undefined (no local data on server)
function getLocalAnalyticsServerSnapshot():
	| localTodoStorage.LocalAnalyticsData
	| undefined {
	return undefined;
}

// ============================================================================
// useAnalytics Hook
// ============================================================================

/**
 * Hook for fetching analytics data for a date range.
 * Uses local storage for unauthenticated users, remote API for authenticated users.
 *
 * @param startDate - Start of date range (ISO datetime string)
 * @param endDate - End of date range (ISO datetime string)
 * @returns Query result with analytics data
 */
export function useAnalytics(startDate: string, endDate: string) {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	const query = useQuery({
		...getAnalyticsQueryOptions({ startDate, endDate }),
		enabled: isAuthenticated,
	});

	// For unauthenticated users, use local storage with useSyncExternalStore
	// to react to changes when updateLocalPastCompletion is called
	const getLocalAnalyticsSnapshot = useCallback(():
		| localTodoStorage.LocalAnalyticsData
		| undefined => {
		// Return undefined for authenticated users - they use the remote query
		if (isAuthenticated) return undefined;

		const key = `${startDate}-${endDate}`;
		const analytics = localTodoStorage.getLocalAnalytics(startDate, endDate);
		const analyticsJson = JSON.stringify(analytics);

		// Only return a new reference if the data actually changed
		if (
			key !== cachedLocalAnalyticsKey ||
			analyticsJson !== JSON.stringify(cachedLocalAnalytics)
		) {
			cachedLocalAnalyticsKey = key;
			cachedLocalAnalytics = analytics;
		}

		return cachedLocalAnalytics;
	}, [isAuthenticated, startDate, endDate]);

	const localAnalytics = useSyncExternalStore(
		subscribeToLocalAnalytics,
		getLocalAnalyticsSnapshot,
		getLocalAnalyticsServerSnapshot,
	);

	return {
		...query,
		data: isAuthenticated ? query.data : localAnalytics,
		isLoading: isSessionPending || (isAuthenticated && query.isLoading),
		isPending: isSessionPending || (isAuthenticated && query.isPending),
	};
}

// ============================================================================
// useCompletionHistory Hook
// ============================================================================

// Local completion history mapped to same shape as remote
interface LocalCompletionHistoryMapped {
	id: string;
	todoId: string;
	scheduledDate: string;
	completedAt: string | null;
}

let cachedLocalCompletionHistoryMapped: LocalCompletionHistoryMapped[] = [];

// Empty array for server snapshot - must be stable reference
const emptyLocalCompletionHistory: LocalCompletionHistoryMapped[] = [];

/**
 * Hook for fetching completion history for a date range.
 * Uses local storage for unauthenticated users, remote API for authenticated users.
 *
 * @param startDate - Start of date range (ISO datetime string)
 * @param endDate - End of date range (ISO datetime string)
 * @returns Query result with completion history records
 */
export function useCompletionHistory(startDate: string, endDate: string) {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	const query = useQuery({
		...getCompletionHistoryQueryOptions({ startDate, endDate }),
		enabled: isAuthenticated,
	});

	// For unauthenticated users, use local storage with useSyncExternalStore
	// to react to changes when updateLocalPastCompletion is called
	const getLocalCompletionHistorySnapshot =
		useCallback((): LocalCompletionHistoryMapped[] => {
			// Return empty array for authenticated users - they use the remote query
			if (isAuthenticated) return emptyLocalCompletionHistory;

			const key = `${startDate}-${endDate}`;
			const history = localTodoStorage.getLocalCompletionHistory(
				startDate,
				endDate,
			);
			const historyJson = JSON.stringify(history);

			// Only return a new reference if the data actually changed
			if (
				key !== cachedLocalCompletionHistoryKey ||
				historyJson !== JSON.stringify(cachedLocalCompletionHistory)
			) {
				cachedLocalCompletionHistoryKey = key;
				cachedLocalCompletionHistory = history;
				// Map to the same shape as remote completion history
				cachedLocalCompletionHistoryMapped = history.map((entry) => ({
					id: `${entry.todoId}-${entry.scheduledDate}`,
					todoId: entry.todoId,
					scheduledDate: entry.scheduledDate,
					completedAt: entry.completedAt,
				}));
			}

			return cachedLocalCompletionHistoryMapped;
		}, [isAuthenticated, startDate, endDate]);

	const localCompletionHistory = useSyncExternalStore(
		subscribeToLocalAnalytics,
		getLocalCompletionHistorySnapshot,
		() => emptyLocalCompletionHistory,
	);

	// Cast to unified type to support both local and remote data
	const data: UnifiedCompletionHistoryRecord[] | undefined = isAuthenticated
		? query.data
		: localCompletionHistory;

	return {
		...query,
		data,
		isLoading: isSessionPending || (isAuthenticated && query.isLoading),
		isPending: isSessionPending || (isAuthenticated && query.isPending),
	};
}

// ============================================================================
// useUpdatePastCompletion Hook
// ============================================================================

/**
 * Hook for updating past completion status of recurring todos.
 * Uses local storage for unauthenticated users, remote API for authenticated users.
 * Implements optimistic updates for authenticated users.
 *
 * @returns Mutation with optimistic cache updates
 */
export function useUpdatePastCompletion() {
	const { data: session } = useSession();
	const isAuthenticated = !!session?.user;

	const remoteMutation = useMutation({
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

	const updatePastCompletion = useCallback(
		async (input: UpdatePastCompletionInputLocal) => {
			if (isAuthenticated) {
				// For authenticated users, ensure todoId is a number
				await remoteMutation.mutateAsync({
					todoId:
						typeof input.todoId === "number"
							? input.todoId
							: Number.parseInt(input.todoId, 10),
					scheduledDate: input.scheduledDate,
					completed: input.completed,
				} as UpdatePastCompletionInput);
			} else {
				// For local storage, use the local storage function with string todoId
				localTodoStorage.updateLocalPastCompletion(
					typeof input.todoId === "string"
						? input.todoId
						: String(input.todoId),
					input.scheduledDate,
					input.completed,
				);
				// Notify listeners to trigger re-renders in useAnalytics and useCompletionHistory
				notifyLocalAnalyticsListeners();
			}
		},
		[isAuthenticated, remoteMutation],
	);

	return {
		mutate: updatePastCompletion,
		mutateAsync: updatePastCompletion,
		isPending: remoteMutation.isPending,
		isSuccess: remoteMutation.isSuccess,
		isError: remoteMutation.isError,
		error: remoteMutation.error,
		reset: remoteMutation.reset,
	};
}
