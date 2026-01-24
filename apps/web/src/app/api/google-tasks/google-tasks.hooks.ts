"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { queryClient } from "@/utils/trpc";
import {
	getClearCompletedMutationOptions,
	getCreateTaskListMutationOptions,
	getDeleteTaskMutationOptions,
	getDisableIntegrationMutationOptions,
	getEnableIntegrationMutationOptions,
	getStatusQueryKey,
	getStatusQueryOptions,
	getTaskQueryOptions,
	getUpdateLastSyncedMutationOptions,
	getUpdateSettingsMutationOptions,
	listTaskListsQueryKey,
	listTaskListsQueryOptions,
	listTasksQueryOptions,
} from "./google-tasks.api";
import type {
	ClearCompletedInput,
	CreateTaskListInput,
	DeleteTaskInput,
	EnableIntegrationInput,
	GetTaskInput,
	ListTasksInput,
	Task,
	TaskList,
	UpdateSettingsInput,
} from "./google-tasks.types";

// ============================================================================
// useGoogleTasksStatus Hook
// ============================================================================

/**
 * Hook for fetching Google Tasks integration status.
 *
 * Provides the integration status including whether it's enabled,
 * sync status, last sync time, and default task list.
 */
export function useGoogleTasksStatus() {
	const query = useQuery(getStatusQueryOptions());

	const refetch = useCallback(() => {
		return query.refetch();
	}, [query.refetch]);

	const result = useMemo(
		() => ({
			status: query.data ?? null,
			isLoading: query.isLoading,
			error: query.error ?? null,
			refetch,
		}),
		[query.data, query.isLoading, query.error, refetch],
	);

	return result;
}

// ============================================================================
// useGoogleTaskLists Hook
// ============================================================================

/**
 * Hook for fetching all Google Tasks lists.
 *
 * Returns all task lists from the user's Google Tasks account.
 */
export function useGoogleTaskLists() {
	const query = useQuery(listTaskListsQueryOptions());

	const refetch = useCallback(() => {
		return query.refetch();
	}, [query.refetch]);

	const result = useMemo(
		() => ({
			taskLists: query.data ?? null,
			isLoading: query.isLoading,
			error: query.error ?? null,
			refetch,
		}),
		[query.data, query.isLoading, query.error, refetch],
	);

	return result;
}

// ============================================================================
// useGoogleTasks Hook
// ============================================================================

/**
 * Hook for fetching tasks from a specific Google Tasks list.
 *
 * @param input - The task list ID and optional filters
 */
export function useGoogleTasks(input: ListTasksInput) {
	const query = useQuery(listTasksQueryOptions(input));

	const refetch = useCallback(() => {
		return query.refetch();
	}, [query.refetch]);

	const result = useMemo(
		() => ({
			tasks: query.data ?? null,
			isLoading: query.isLoading,
			error: query.error ?? null,
			refetch,
		}),
		[query.data, query.isLoading, query.error, refetch],
	);

	return result;
}

// ============================================================================
// useGoogleTask Hook
// ============================================================================

/**
 * Hook for fetching a single Google Task.
 *
 * @param input - The task list ID and task ID
 */
export function useGoogleTask(input: GetTaskInput) {
	const query = useQuery(getTaskQueryOptions(input));

	const refetch = useCallback(() => {
		return query.refetch();
	}, [query.refetch]);

	const result = useMemo(
		() => ({
			task: query.data ?? null,
			isLoading: query.isLoading,
			error: query.error ?? null,
			refetch,
		}),
		[query.data, query.isLoading, query.error, refetch],
	);

	return result;
}

// ============================================================================
// useEnableGoogleTasksIntegration Hook
// ============================================================================

/**
 * Hook for enabling Google Tasks integration.
 *
 * Creates or updates the integration record with OAuth tokens.
 */
export function useEnableGoogleTasksIntegration() {
	const queryKey = getStatusQueryKey();

	const mutation = useMutation({
		...getEnableIntegrationMutationOptions(),
		onSuccess: () => {
			// Invalidate status query to refresh integration state
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const result = useMemo(
		() => ({
			enableIntegration: async (input: EnableIntegrationInput) => {
				return mutation.mutateAsync(input);
			},
			isPending: mutation.isPending,
			error: mutation.error ?? null,
			reset: () => mutation.reset(),
		}),
		[mutation],
	);

	return result;
}

// ============================================================================
// useDisableGoogleTasksIntegration Hook
// ============================================================================

/**
 * Hook for disabling Google Tasks integration.
 *
 * Sets the enabled flag to false but keeps the integration record.
 */
export function useDisableGoogleTasksIntegration() {
	const queryKey = getStatusQueryKey();

	const mutation = useMutation({
		...getDisableIntegrationMutationOptions(),
		onSuccess: () => {
			// Invalidate status query to refresh integration state
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const result = useMemo(
		() => ({
			disableIntegration: async () => {
				return mutation.mutateAsync();
			},
			isPending: mutation.isPending,
			error: mutation.error ?? null,
			reset: () => mutation.reset(),
		}),
		[mutation],
	);

	return result;
}

// ============================================================================
// useUpdateGoogleTasksSettings Hook
// ============================================================================

/**
 * Hook for updating Google Tasks integration settings.
 *
 * Allows updating enabled, syncEnabled, and defaultListId settings.
 */
export function useUpdateGoogleTasksSettings() {
	const queryKey = getStatusQueryKey();

	const mutation = useMutation({
		...getUpdateSettingsMutationOptions(),
		onSuccess: () => {
			// Invalidate status query to refresh integration state
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const result = useMemo(
		() => ({
			updateSettings: async (input: UpdateSettingsInput) => {
				return mutation.mutateAsync(input);
			},
			isPending: mutation.isPending,
			error: mutation.error ?? null,
			reset: () => mutation.reset(),
		}),
		[mutation],
	);

	return result;
}

// ============================================================================
// useUpdateGoogleTasksLastSynced Hook
// ============================================================================

/**
 * Hook for updating the last synced timestamp.
 *
 * Typically called after a successful sync operation.
 */
export function useUpdateGoogleTasksLastSynced() {
	const queryKey = getStatusQueryKey();

	const mutation = useMutation({
		...getUpdateLastSyncedMutationOptions(),
		onSuccess: () => {
			// Invalidate status query to refresh integration state
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const result = useMemo(
		() => ({
			updateLastSynced: async () => {
				return mutation.mutateAsync();
			},
			isPending: mutation.isPending,
			error: mutation.error ?? null,
			reset: () => mutation.reset(),
		}),
		[mutation],
	);

	return result;
}

// ============================================================================
// useCreateGoogleTaskList Hook
// ============================================================================

/**
 * Hook for creating a new Google Tasks list.
 *
 * Creates a new task list in the user's Google Tasks account.
 */
export function useCreateGoogleTaskList() {
	const queryKey = listTaskListsQueryKey();

	const mutation = useMutation({
		...getCreateTaskListMutationOptions(),
		onSuccess: () => {
			// Invalidate task lists query to refresh the list
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const result = useMemo(
		() => ({
			createTaskList: async (input: CreateTaskListInput) => {
				return mutation.mutateAsync(input);
			},
			isPending: mutation.isPending,
			error: mutation.error ?? null,
			reset: () => mutation.reset(),
		}),
		[mutation],
	);

	return result;
}

// ============================================================================
// useDeleteGoogleTask Hook
// ============================================================================

/**
 * Hook for deleting a Google Task.
 *
 * Permanently deletes a task from a Google Tasks list.
 */
export function useDeleteGoogleTask() {
	const mutation = useMutation({
		...getDeleteTaskMutationOptions(),
	});

	const result = useMemo(
		() => ({
			deleteTask: async (input: DeleteTaskInput) => {
				return mutation.mutateAsync(input);
			},
			isPending: mutation.isPending,
			error: mutation.error ?? null,
			reset: () => mutation.reset(),
		}),
		[mutation],
	);

	return result;
}

// ============================================================================
// useClearGoogleTasksCompleted Hook
// ============================================================================

/**
 * Hook for clearing completed tasks from a Google Tasks list.
 *
 * Removes all completed tasks from the specified task list.
 */
export function useClearGoogleTasksCompleted() {
	const mutation = useMutation({
		...getClearCompletedMutationOptions(),
	});

	const result = useMemo(
		() => ({
			clearCompleted: async (input: ClearCompletedInput) => {
				return mutation.mutateAsync(input);
			},
			isPending: mutation.isPending,
			error: mutation.error ?? null,
			reset: () => mutation.reset(),
		}),
		[mutation],
	);

	return result;
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
	ClearCompletedInput,
	CreateTaskListInput,
	DeleteTaskInput,
	EnableIntegrationInput,
	GetTaskInput,
	ListTasksInput,
	Task,
	TaskList,
	UpdateSettingsInput,
};
