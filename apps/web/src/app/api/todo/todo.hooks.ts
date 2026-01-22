"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { notifyLocalAnalyticsListeners } from "@/app/api/analytics";
import { useTodoRealtimeWithAuth } from "@/hooks/use-todo-realtime";
import { useSession } from "@/lib/auth-client";
import * as localTodoStorage from "@/lib/local-todo-storage";
import { queryClient } from "@/utils/trpc";
import {
	getAllTodosQueryOptions,
	getBulkCreateTodosMutationOptions,
	getCompleteRecurringMutationOptions,
	getCreateTodoMutationOptions,
	getDeleteTodoMutationOptions,
	getTodosQueryKey,
	getToggleTodoMutationOptions,
	getUpdatePastCompletionMutationOptions,
	getUpdateTodoFolderMutationOptions,
	getUpdateTodoScheduleMutationOptions,
} from "./todo.api";
import type {
	LocalTodo,
	RecurringPattern,
	RemoteTodo,
	SelectedFolderId,
	SyncAction,
	SyncPromptState,
	Todo,
	UseSyncTodosReturn,
	UseTodoStorageReturn,
} from "./todo.types";

// ============================================================================
// Local Storage Sync (for useSyncExternalStore)
// ============================================================================

let localTodosListeners: Array<() => void> = [];

// Cached snapshot to prevent infinite loops in useSyncExternalStore
// React requires getSnapshot to return a cached value when data hasn't changed
let cachedLocalTodos: LocalTodo[] = [];
let cachedLocalTodosJson = "";

// Cached empty array for server snapshot (must be stable reference)
const emptyLocalTodos: LocalTodo[] = [];

function subscribeToLocalTodos(callback: () => void) {
	localTodosListeners.push(callback);
	return () => {
		localTodosListeners = localTodosListeners.filter((l) => l !== callback);
	};
}

export function notifyLocalTodosListeners() {
	for (const listener of localTodosListeners) {
		listener();
	}
}

function getLocalTodosSnapshot(): LocalTodo[] {
	const todos = localTodoStorage.getAll();
	const todosJson = JSON.stringify(todos);

	// Only return a new reference if the data actually changed
	if (todosJson !== cachedLocalTodosJson) {
		cachedLocalTodosJson = todosJson;
		cachedLocalTodos = todos;
	}

	return cachedLocalTodos;
}

function getLocalTodosServerSnapshot(): LocalTodo[] {
	return emptyLocalTodos;
}

// ============================================================================
// useTodoStorage Hook
// ============================================================================

/**
 * Unified hook for managing todos with dual-mode support:
 * - Authenticated users: todos stored remotely via tRPC
 * - Guest users: todos stored locally in browser localStorage
 *
 * Also provides folder filtering capabilities.
 */
export function useTodoStorage(): UseTodoStorageReturn {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;
	const [selectedFolderId, setSelectedFolderId] =
		useState<SelectedFolderId>("inbox");

	const localTodos = useSyncExternalStore(
		subscribeToLocalTodos,
		getLocalTodosSnapshot,
		getLocalTodosServerSnapshot,
	);

	const queryKey = getTodosQueryKey();

	const {
		data: remoteTodos,
		isLoading: isRemoteTodosLoading,
		refetch: refetchRemoteTodos,
	} = useQuery({
		...getAllTodosQueryOptions(),
		enabled: isAuthenticated,
	});

	// Create mutation with optimistic updates
	const createMutation = useMutation({
		mutationFn: getCreateTodoMutationOptions().mutationFn,
		onMutate: async (newTodo: {
			text: string;
			folderId?: number | null;
			dueDate?: string | null;
			reminderAt?: string | null;
			recurringPattern?: RecurringPattern | null;
		}) => {
			await queryClient.cancelQueries({ queryKey });

			const previousTodos = queryClient.getQueryData<RemoteTodo[]>(queryKey);

			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) => [
				...(old ?? []),
				{
					id: -Date.now(),
					text: newTodo.text,
					completed: false,
					userId: session?.user?.id ?? "",
					folderId: newTodo.folderId ?? null,
					dueDate: newTodo.dueDate ?? null,
					reminderAt: newTodo.reminderAt ?? null,
					recurringPattern: newTodo.recurringPattern ?? null,
				},
			]);

			return { previousTodos };
		},
		onError: (_err, _newTodo, context) => {
			if (context?.previousTodos) {
				queryClient.setQueryData(queryKey, context.previousTodos);
			}
		},
		onSettled: () => {
			refetchRemoteTodos();
		},
	});

	// Toggle mutation with optimistic updates
	const toggleMutation = useMutation({
		mutationFn: getToggleTodoMutationOptions().mutationFn,
		onMutate: async ({ id, completed }: { id: number; completed: boolean }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousTodos = queryClient.getQueryData<RemoteTodo[]>(queryKey);

			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.map((todo) => (todo.id === id ? { ...todo, completed } : todo)),
			);

			return { previousTodos };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousTodos) {
				queryClient.setQueryData(queryKey, context.previousTodos);
			}
		},
		onSettled: () => {
			refetchRemoteTodos();
		},
	});

	// Delete mutation with optimistic updates
	const deleteMutation = useMutation({
		mutationFn: getDeleteTodoMutationOptions().mutationFn,
		onMutate: async ({ id }: { id: number }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousTodos = queryClient.getQueryData<RemoteTodo[]>(queryKey);

			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.filter((todo) => todo.id !== id),
			);

			return { previousTodos };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousTodos) {
				queryClient.setQueryData(queryKey, context.previousTodos);
			}
		},
		onSettled: () => {
			refetchRemoteTodos();
		},
	});

	// Update folder mutation with optimistic updates
	const updateFolderMutation = useMutation({
		mutationFn: getUpdateTodoFolderMutationOptions().mutationFn,
		onMutate: async ({
			id,
			folderId,
		}: {
			id: number;
			folderId: number | null;
		}) => {
			await queryClient.cancelQueries({ queryKey });

			const previousTodos = queryClient.getQueryData<RemoteTodo[]>(queryKey);

			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.map((todo) => (todo.id === id ? { ...todo, folderId } : todo)),
			);

			return { previousTodos };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousTodos) {
				queryClient.setQueryData(queryKey, context.previousTodos);
			}
		},
		onSettled: () => {
			refetchRemoteTodos();
		},
	});

	// Update schedule mutation with optimistic updates
	const updateScheduleMutation = useMutation({
		mutationFn: getUpdateTodoScheduleMutationOptions().mutationFn,
		onMutate: async ({
			id,
			dueDate,
			reminderAt,
			recurringPattern,
		}: {
			id: number;
			dueDate?: string | null;
			reminderAt?: string | null;
			recurringPattern?: RecurringPattern | null;
		}) => {
			await queryClient.cancelQueries({ queryKey });

			const previousTodos = queryClient.getQueryData<RemoteTodo[]>(queryKey);

			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.map((todo) =>
					todo.id === id
						? {
								...todo,
								...(dueDate !== undefined && { dueDate }),
								...(reminderAt !== undefined && { reminderAt }),
								...(recurringPattern !== undefined && { recurringPattern }),
							}
						: todo,
				),
			);

			return { previousTodos };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousTodos) {
				queryClient.setQueryData(queryKey, context.previousTodos);
			}
		},
		onSettled: () => {
			refetchRemoteTodos();
		},
	});

	// Complete recurring mutation with optimistic updates
	const completeRecurringMutation = useMutation({
		...getCompleteRecurringMutationOptions(),
		onMutate: async ({ id }: { id: number }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey });

			// Snapshot previous value
			const previousTodos = queryClient.getQueryData<RemoteTodo[]>(queryKey);

			// Optimistically mark the todo as completed
			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.map((todo) =>
					todo.id === id ? { ...todo, completed: true } : todo,
				),
			);

			return { previousTodos };
		},
		onError: (_err, _variables, context) => {
			// Rollback on error
			if (context?.previousTodos) {
				queryClient.setQueryData(queryKey, context.previousTodos);
			}
		},
		onSettled: () => {
			// Refetch to get the new occurrence created by the backend
			refetchRemoteTodos();
		},
	});

	// Update past completion mutation with optimistic updates
	const updatePastCompletionMutation = useMutation({
		mutationFn: getUpdatePastCompletionMutationOptions().mutationFn,
		onMutate: async ({
			todoId,
			scheduledDate: _scheduledDate,
			completed,
		}: {
			todoId: number;
			scheduledDate: string;
			completed: boolean;
		}) => {
			await queryClient.cancelQueries({ queryKey });

			const previousTodos = queryClient.getQueryData<RemoteTodo[]>(queryKey);

			// Optimistically update the todo's completed status for past occurrences
			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.map((todo) =>
					todo.id === todoId ? { ...todo, completed } : todo,
				),
			);

			return { previousTodos };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousTodos) {
				queryClient.setQueryData(queryKey, context.previousTodos);
			}
		},
		onSettled: () => {
			refetchRemoteTodos();
		},
	});

	const create = useCallback(
		async (
			text: string,
			folderId?: number | string | null,
			scheduling?: {
				dueDate?: string | null;
				reminderAt?: string | null;
				recurringPattern?: RecurringPattern | null;
			},
		) => {
			// Convert folderId to appropriate type for storage
			const numericFolderId =
				folderId === "inbox" || folderId === null || folderId === undefined
					? null
					: typeof folderId === "string"
						? folderId // Keep as string for local storage
						: folderId;

			if (isAuthenticated) {
				await createMutation.mutateAsync({
					text,
					folderId:
						typeof numericFolderId === "number" ? numericFolderId : null,
					dueDate: scheduling?.dueDate ?? null,
					reminderAt: scheduling?.reminderAt ?? null,
					recurringPattern: scheduling?.recurringPattern ?? null,
				});
			} else {
				localTodoStorage.create(
					text,
					typeof numericFolderId === "string" ? numericFolderId : null,
					scheduling,
				);
				notifyLocalTodosListeners();
			}
		},
		[isAuthenticated, createMutation],
	);

	const toggle = useCallback(
		async (
			id: number | string,
			completed: boolean,
			options?: { virtualDate?: string },
		) => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) IDs - they haven't been created yet
				if (typeof id === "number" && id < 0) {
					return;
				}

				// For recurring todos, handle special completion/uncompletion logic
				const currentTodos = remoteTodos || [];
				const todo = currentTodos.find((t) => t.id === id);

				if (todo?.recurringPattern) {
					// Check if the virtualDate matches the todo's actual dueDate
					// If so, we should use completeRecurring to create the next occurrence
					const todoDateKey = todo.dueDate ? todo.dueDate.split("T")[0] : null;
					const isCurrentOccurrence =
						options?.virtualDate && todoDateKey === options.virtualDate;

					// Check if the virtualDate is in the past (overdue)
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
					const isOverdueOccurrence =
						options?.virtualDate && options.virtualDate < todayKey;

					// If virtualDate is provided but does NOT match the todo's dueDate,
					// use updatePastCompletion for pattern-generated virtual occurrences
					if (options?.virtualDate && !isCurrentOccurrence) {
						await updatePastCompletionMutation.mutateAsync({
							todoId: id as number,
							scheduledDate: options.virtualDate,
							completed,
						});
						// For overdue occurrences, also advance the recurring pattern
						// by calling completeRecurring to create the next occurrence
						if (isOverdueOccurrence && completed) {
							await completeRecurringMutation.mutateAsync({
								id: id as number,
							});
						}
						return;
					}

					// For current occurrence or no virtualDate
					if (completed) {
						// Complete the recurring todo and create next occurrence
						await completeRecurringMutation.mutateAsync({ id: id as number });
					} else {
						// For uncompleting without virtualDate, just toggle normally
						await toggleMutation.mutateAsync({ id: id as number, completed });
					}
					return;
				}

				// Regular toggle for non-recurring todos
				await toggleMutation.mutateAsync({ id: id as number, completed });
			} else {
				// For recurring todos being completed, use completeRecurring to create next occurrence
				const localTodos = localTodoStorage.getAll();
				const todo = localTodos.find((t) => t.id === id);

				if (todo?.recurringPattern) {
					// Check if the virtualDate matches the todo's actual dueDate
					// If so, we should use completeRecurring to create the next occurrence
					const todoDateKey = todo.dueDate ? todo.dueDate.split("T")[0] : null;
					const isCurrentOccurrence =
						options?.virtualDate && todoDateKey === options.virtualDate;

					// Check if the virtualDate is in the past (overdue)
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
					const isOverdueOccurrence =
						options?.virtualDate && options.virtualDate < todayKey;

					// If virtualDate is provided but does NOT match the todo's dueDate,
					// toggle specific occurrence in completion history
					if (options?.virtualDate && !isCurrentOccurrence) {
						localTodoStorage.toggleLocalOccurrence(
							id as string,
							options.virtualDate,
							completed,
						);
						// Also notify analytics listeners since completion history changed
						notifyLocalAnalyticsListeners();
						// For overdue occurrences, also advance the recurring pattern
						// by calling completeRecurring to create the next occurrence
						if (isOverdueOccurrence && completed) {
							localTodoStorage.completeRecurring(id as string);
						}
					} else if (completed) {
						// Complete the recurring todo and create next occurrence
						localTodoStorage.completeRecurring(id as string);
					} else {
						// For uncompleting without virtualDate, just toggle normally
						localTodoStorage.toggle(id as string);
					}
				} else {
					// Regular toggle for non-recurring todos
					localTodoStorage.toggle(id as string);
				}
				notifyLocalTodosListeners();
			}
		},
		[
			isAuthenticated,
			toggleMutation,
			remoteTodos,
			completeRecurringMutation,
			updatePastCompletionMutation,
		],
	);

	const deleteTodo = useCallback(
		async (id: number | string) => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) IDs - they haven't been created yet
				if (typeof id === "number" && id < 0) {
					return;
				}
				await deleteMutation.mutateAsync({ id: id as number });
			} else {
				localTodoStorage.deleteTodo(id as string);
				notifyLocalTodosListeners();
			}
		},
		[isAuthenticated, deleteMutation],
	);

	const updateFolder = useCallback(
		async (id: number | string, folderId: number | string | null) => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) IDs - they haven't been created yet
				if (typeof id === "number" && id < 0) {
					return;
				}
				await updateFolderMutation.mutateAsync({
					id: id as number,
					folderId: typeof folderId === "number" ? folderId : null,
				});
			} else {
				localTodoStorage.updateFolder(
					id as string,
					typeof folderId === "string" ? folderId : null,
				);
				notifyLocalTodosListeners();
			}
		},
		[isAuthenticated, updateFolderMutation],
	);

	const updateSchedule = useCallback(
		async (
			id: number | string,
			scheduling: {
				dueDate?: string | null;
				reminderAt?: string | null;
				recurringPattern?: RecurringPattern | null;
			},
		) => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) IDs - they haven't been created yet
				if (typeof id === "number" && id < 0) {
					return;
				}
				await updateScheduleMutation.mutateAsync({
					id: id as number,
					...scheduling,
				});
			} else {
				localTodoStorage.updateSchedule(id as string, scheduling);
				notifyLocalTodosListeners();
			}
		},
		[isAuthenticated, updateScheduleMutation],
	);

	const updatePastCompletion = useCallback(
		async (
			todoId: number | string,
			scheduledDate: string,
			completed: boolean,
		) => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) IDs - they haven't been created yet
				if (typeof todoId === "number" && todoId < 0) {
					return;
				}
				await updatePastCompletionMutation.mutateAsync({
					todoId: todoId as number,
					scheduledDate,
					completed,
				});
			}
			// Note: Local storage does not support past completion updates
			// This feature is only available for authenticated users
		},
		[isAuthenticated, updatePastCompletionMutation],
	);

	const todos: Todo[] = useMemo(() => {
		if (isAuthenticated) {
			return (remoteTodos ?? []).map((t) => ({
				id: t.id,
				text: t.text,
				completed: t.completed,
				folderId: t.folderId,
				dueDate: t.dueDate,
				reminderAt: t.reminderAt,
				recurringPattern:
					(t.recurringPattern as RecurringPattern | null) ?? null,
			}));
		}
		return localTodos.map((t) => ({
			id: t.id,
			text: t.text,
			completed: t.completed,
			folderId: t.folderId ?? null,
			dueDate: t.dueDate ?? null,
			reminderAt: t.reminderAt ?? null,
			recurringPattern: t.recurringPattern ?? null,
		}));
	}, [isAuthenticated, remoteTodos, localTodos]);

	// Filter todos by selected folder
	const filteredTodos: Todo[] = useMemo(() => {
		if (selectedFolderId === "inbox") {
			// Inbox shows todos without a folder
			return todos.filter(
				(todo) => todo.folderId === null || todo.folderId === undefined,
			);
		}
		// Filter by specific folder ID
		return todos.filter((todo) => todo.folderId === selectedFolderId);
	}, [todos, selectedFolderId]);

	// Initial loading state - only true during first data fetch
	// Does NOT include mutation pending states to allow optimistic updates to render
	const isLoading =
		isSessionPending || (isAuthenticated && isRemoteTodosLoading);

	// Enable realtime sync for authenticated users
	// This hook automatically subscribes to Supabase Realtime updates
	// and keeps the React Query cache in sync across multiple devices/tabs
	useTodoRealtimeWithAuth();

	return {
		todos,
		create,
		toggle,
		deleteTodo,
		updateFolder,
		updateSchedule,
		updatePastCompletion,
		isLoading,
		isAuthenticated,
		selectedFolderId,
		setSelectedFolderId,
		filteredTodos,
	};
}

// ============================================================================
// useSyncTodos Hook
// ============================================================================

/**
 * Hook for syncing local todos to server when user logs in.
 * Detects login transition and prompts user to sync, discard, or keep both.
 */
export function useSyncTodos(): UseSyncTodosReturn {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;
	const previousAuthState = useRef<boolean | null>(null);

	const [syncPrompt, setSyncPrompt] = useState<SyncPromptState>({
		isOpen: false,
		localTodosCount: 0,
		remoteTodosCount: 0,
	});

	const queryKey = getTodosQueryKey();

	const { data: remoteTodos, isLoading: isRemoteTodosLoading } = useQuery({
		...getAllTodosQueryOptions(),
		enabled: isAuthenticated,
	});

	const bulkCreateMutation = useMutation({
		mutationFn: getBulkCreateTodosMutationOptions().mutationFn,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const checkForLocalTodos = useCallback(() => {
		const localTodos = localTodoStorage.getAll();
		if (localTodos.length > 0) {
			setSyncPrompt({
				isOpen: true,
				localTodosCount: localTodos.length,
				remoteTodosCount: remoteTodos?.length ?? 0,
			});
		}
	}, [remoteTodos?.length]);

	// Detect login transition (unauthenticated -> authenticated)
	useEffect(() => {
		if (isSessionPending || isRemoteTodosLoading) return;

		const wasAuthenticated = previousAuthState.current;
		const isNowAuthenticated = isAuthenticated;

		// Store current state for next comparison
		previousAuthState.current = isNowAuthenticated;

		// Only trigger on login transition (was not authenticated, now is)
		if (wasAuthenticated === false && isNowAuthenticated === true) {
			checkForLocalTodos();
		}
	}, [
		isAuthenticated,
		isSessionPending,
		isRemoteTodosLoading,
		checkForLocalTodos,
	]);

	const handleSyncAction = useCallback(
		async (action: SyncAction) => {
			const localTodos = localTodoStorage.getAll();

			try {
				switch (action) {
					case "sync": {
						// Upload local todos to server with all fields, then clear local storage
						if (localTodos.length > 0) {
							await bulkCreateMutation.mutateAsync({
								todos: localTodos.map((t) => ({
									text: t.text,
									completed: t.completed,
									// Note: folderId is not synced because local folders use string UUIDs
									// while remote folders use numeric IDs - folder sync is handled separately
									folderId: null,
									dueDate: t.dueDate ?? null,
									reminderAt: t.reminderAt ?? null,
									recurringPattern: t.recurringPattern ?? null,
								})),
							});
						}
						localTodoStorage.clearAll();
						break;
					}
					case "discard": {
						// Just clear local storage without syncing
						localTodoStorage.clearAll();
						break;
					}
					case "keep_both": {
						// Upload local todos with all fields and keep remote ones (they're already there)
						if (localTodos.length > 0) {
							await bulkCreateMutation.mutateAsync({
								todos: localTodos.map((t) => ({
									text: t.text,
									completed: t.completed,
									// Note: folderId is not synced because local folders use string UUIDs
									// while remote folders use numeric IDs - folder sync is handled separately
									folderId: null,
									dueDate: t.dueDate ?? null,
									reminderAt: t.reminderAt ?? null,
									recurringPattern: t.recurringPattern ?? null,
								})),
							});
						}
						localTodoStorage.clearAll();
						break;
					}
				}
			} finally {
				setSyncPrompt({
					isOpen: false,
					localTodosCount: 0,
					remoteTodosCount: 0,
				});
			}
		},
		[bulkCreateMutation],
	);

	return {
		syncPrompt,
		handleSyncAction,
		isSyncing: bulkCreateMutation.isPending,
	};
}
