"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/lib/auth-client";
import * as localTodoStorage from "@/lib/local-todo-storage";
import { queryClient } from "@/utils/trpc";
import {
	getAnalyticsQueryOptions,
	getCompletionHistoryQueryOptions,
	getRecurringOccurrencesQueryOptions,
	getUpdatePastCompletionMutationOptions,
} from "./analytics.api";
import type {
	AnalyticsData,
	CompletionHistoryRecord,
	RecurringOccurrenceWithStatus,
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
					// Match analytics, completion history, and recurring occurrences queries
					return (
						Array.isArray(key) &&
						key.length > 0 &&
						typeof key[0] === "object" &&
						key[0] !== null &&
						"path" in key[0] &&
						Array.isArray((key[0] as { path: string[] }).path) &&
						(key[0] as { path: string[] }).path[0] === "todo" &&
						((key[0] as { path: string[] }).path[1] === "getAnalytics" ||
							(key[0] as { path: string[] }).path[1] ===
								"getCompletionHistory" ||
							(key[0] as { path: string[] }).path[1] ===
								"getRecurringTodosForDateRange")
					);
				},
			});

			// Store all previous data for rollback
			const previousData: {
				analytics: Map<string, AnalyticsData | undefined>;
				completionHistory: Map<string, CompletionHistoryRecord[] | undefined>;
				recurringOccurrences: Map<
					string,
					{ todo: unknown; matchingDates: string[] }[] | undefined
				>;
			} = {
				analytics: new Map(),
				completionHistory: new Map(),
				recurringOccurrences: new Map(),
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

			// Update recurring occurrences - this is used by the completion history list
			// The data structure is an array of { todo, matchingDates }
			// We don't need to update this because it's just the pattern matches
			// The actual completion status comes from completionHistory query above
			// which we already updated optimistically

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
		(input: UpdatePastCompletionInputLocal) => {
			if (isAuthenticated) {
				// For authenticated users, ensure todoId is a number and use remoteMutation.mutate
				// This triggers the optimistic updates in onMutate
				remoteMutation.mutate({
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
		isPending: remoteMutation.isPending,
		isSuccess: remoteMutation.isSuccess,
		isError: remoteMutation.isError,
		error: remoteMutation.error,
		reset: remoteMutation.reset,
	};
}

// ============================================================================
// useRecurringOccurrencesWithStatus Hook
// ============================================================================

/**
 * Determine the status of a recurring occurrence based on its completion record
 * and scheduled date relative to today.
 */
function getOccurrenceStatus(
	completedAt: Date | null,
	scheduledDate: Date,
	today: Date,
): RecurringOccurrenceWithStatus["status"] {
	if (completedAt) {
		return "completed";
	}

	// Normalize dates to start of day for comparison
	const scheduledDay = new Date(scheduledDate);
	scheduledDay.setHours(0, 0, 0, 0);

	const todayDay = new Date(today);
	todayDay.setHours(0, 0, 0, 0);

	if (scheduledDay < todayDay) {
		return "missed";
	}

	return "pending";
}

/**
 * Hook for fetching all recurring todo occurrences with their completion status
 * for a date range. This merges expected occurrences (from pattern matching) with
 * actual completion records to show a complete history.
 *
 * @param startDate - Start of date range (ISO datetime string)
 * @param endDate - End of date range (ISO datetime string)
 * @returns Query result with recurring occurrences and their status
 */
export function useRecurringOccurrencesWithStatus(
	startDate: string,
	endDate: string,
) {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	// Fetch expected occurrences from recurring patterns
	const recurringQuery = useQuery({
		...getRecurringOccurrencesQueryOptions({ startDate, endDate }),
		enabled: isAuthenticated,
	});

	// Fetch actual completion records
	const completionQuery = useQuery({
		...getCompletionHistoryQueryOptions({ startDate, endDate }),
		enabled: isAuthenticated,
	});

	// For local storage (unauthenticated users), we need to generate occurrences manually
	// Cache the snapshot using useMemo instead of useCallback to avoid infinite loop
	const localOccurrencesSnapshot =
		useMemo((): RecurringOccurrenceWithStatus[] => {
			if (isAuthenticated) return [];

			const todos = localTodoStorage.getAll();
			const history = localTodoStorage.getLocalCompletionHistory(
				startDate,
				endDate,
			);
			const today = new Date();
			const start = new Date(startDate);
			const end = new Date(endDate);

			// Get all recurring todos
			const recurringTodos = todos.filter((t) => t.recurringPattern);
			const occurrences: RecurringOccurrenceWithStatus[] = [];

			// Create a map of completion records for fast lookup
			const completionMap = new Map<
				string,
				localTodoStorage.CompletionHistoryEntry
			>();
			for (const record of history) {
				const key = `${record.todoId}-${new Date(record.scheduledDate).toISOString().split("T")[0]}`;
				completionMap.set(key, record);
			}

			// Generate occurrences for each recurring todo
			for (const todo of recurringTodos) {
				if (!todo.recurringPattern) continue;

				const pattern = todo.recurringPattern;
				const todoStartDate = todo.dueDate ? new Date(todo.dueDate) : null;

				// Iterate through each date in the range
				const currentDate = new Date(start);
				currentDate.setHours(0, 0, 0, 0);

				while (currentDate <= end) {
					// Skip dates before the todo's start date
					if (todoStartDate) {
						const normalizedTodoStart = new Date(todoStartDate);
						normalizedTodoStart.setHours(0, 0, 0, 0);
						if (currentDate < normalizedTodoStart) {
							currentDate.setDate(currentDate.getDate() + 1);
							continue;
						}
					}

					// Check if pattern has expired
					if (pattern.endDate) {
						const patternEndDate = new Date(pattern.endDate);
						if (currentDate > patternEndDate) {
							break;
						}
					}

					// Check if the current date matches the pattern using local isDateMatchingPattern
					if (isDateMatchingPatternLocal(pattern, currentDate)) {
						const scheduledDate = new Date(currentDate);
						const dateKey = scheduledDate.toISOString().split("T")[0];
						const lookupKey = `${todo.id}-${dateKey}`;
						const completionRecord = completionMap.get(lookupKey);
						const completedAt = completionRecord?.completedAt
							? new Date(completionRecord.completedAt)
							: null;

						occurrences.push({
							id: lookupKey,
							todoId: todo.id,
							todoText: todo.text,
							scheduledDate,
							completedAt,
							status: getOccurrenceStatus(completedAt, scheduledDate, today),
							hasCompletionRecord: !!completionRecord,
						});
					}

					currentDate.setDate(currentDate.getDate() + 1);
				}
			}

			// Sort by scheduled date (newest first)
			return occurrences.sort(
				(a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime(),
			);
		}, [isAuthenticated, startDate, endDate]);

	// Create stable snapshot getters
	const getLocalOccurrencesSnapshot = useCallback(
		() => localOccurrencesSnapshot,
		[localOccurrencesSnapshot],
	);

	// Cache the server snapshot to avoid infinite loop
	const serverSnapshot = useMemo(
		() => [] as RecurringOccurrenceWithStatus[],
		[],
	);
	const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);

	const localOccurrences = useSyncExternalStore(
		subscribeToLocalAnalytics,
		getLocalOccurrencesSnapshot,
		getServerSnapshot,
	);

	// Merge remote data when authenticated
	const mergedData = useMemo((): RecurringOccurrenceWithStatus[] => {
		if (!isAuthenticated) {
			return localOccurrences;
		}

		if (!recurringQuery.data) {
			return [];
		}

		const today = new Date();
		const occurrences: RecurringOccurrenceWithStatus[] = [];

		// Create a map of completion records for fast lookup
		const completionMap = new Map<string, CompletionHistoryRecord>();
		if (completionQuery.data) {
			for (const record of completionQuery.data) {
				const dateKey = new Date(record.scheduledDate)
					.toISOString()
					.split("T")[0];
				const key = `${record.todoId}-${dateKey}`;
				completionMap.set(key, record);
			}
		}

		// Process each recurring todo and its matching dates
		for (const { todo, matchingDates } of recurringQuery.data) {
			for (const date of matchingDates) {
				const scheduledDate = new Date(date);
				const dateKey = scheduledDate.toISOString().split("T")[0];
				const lookupKey = `${todo.id}-${dateKey}`;
				const completionRecord = completionMap.get(lookupKey);
				const completedAt = completionRecord?.completedAt
					? new Date(completionRecord.completedAt)
					: null;

				occurrences.push({
					id: lookupKey,
					todoId: todo.id,
					todoText: todo.text,
					scheduledDate,
					completedAt,
					status: getOccurrenceStatus(completedAt, scheduledDate, today),
					hasCompletionRecord: !!completionRecord,
				});
			}
		}

		// Sort by scheduled date (newest first)
		return occurrences.sort(
			(a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime(),
		);
	}, [
		isAuthenticated,
		localOccurrences,
		recurringQuery.data,
		completionQuery.data,
	]);

	const isLoading =
		isSessionPending ||
		(isAuthenticated &&
			(recurringQuery.isLoading || completionQuery.isLoading));
	const isPending =
		isSessionPending ||
		(isAuthenticated &&
			(recurringQuery.isPending || completionQuery.isPending));
	const isError =
		isAuthenticated && (recurringQuery.isError || completionQuery.isError);
	const error = recurringQuery.error || completionQuery.error;

	return {
		data: mergedData,
		isLoading,
		isPending,
		isError,
		error,
	};
}

/**
 * Local pattern matching function (simplified version for client-side use)
 */
function isDateMatchingPatternLocal(
	pattern: {
		type?: string;
		daysOfWeek?: number[];
		dayOfMonth?: number;
		monthOfYear?: number;
	},
	date: Date,
): boolean {
	const dayOfWeek = date.getDay();
	const dayOfMonth = date.getDate();
	const month = date.getMonth() + 1; // 1-indexed

	switch (pattern.type) {
		case "daily":
			return true;

		case "weekly":
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				return pattern.daysOfWeek.includes(dayOfWeek);
			}
			return true;

		case "monthly":
			if (pattern.dayOfMonth !== undefined) {
				return dayOfMonth === pattern.dayOfMonth;
			}
			return true;

		case "yearly":
			if (
				pattern.monthOfYear !== undefined &&
				pattern.dayOfMonth !== undefined
			) {
				return (
					month === pattern.monthOfYear && dayOfMonth === pattern.dayOfMonth
				);
			}
			if (pattern.monthOfYear !== undefined) {
				return month === pattern.monthOfYear;
			}
			if (pattern.dayOfMonth !== undefined) {
				return dayOfMonth === pattern.dayOfMonth;
			}
			return true;

		case "custom":
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				return pattern.daysOfWeek.includes(dayOfWeek);
			}
			return true;

		default:
			return true;
	}
}
