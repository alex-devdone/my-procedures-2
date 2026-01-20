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
import { useSession } from "@/lib/auth-client";
import * as localTodoStorage from "@/lib/local-todo-storage";
import { queryClient } from "@/utils/trpc";

import {
	getAllTodosQueryOptions,
	getBulkCreateTodosMutationOptions,
	getCreateTodoMutationOptions,
	getDeleteTodoMutationOptions,
	getTodosQueryKey,
	getToggleTodoMutationOptions,
	getUpdateTodoFolderMutationOptions,
} from "./todo.api";
import type {
	LocalTodo,
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
		onMutate: async (newTodo: { text: string; folderId?: number | null }) => {
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

	const create = useCallback(
		async (text: string, folderId?: number | string | null) => {
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
				});
			} else {
				localTodoStorage.create(
					text,
					typeof numericFolderId === "string" ? numericFolderId : null,
				);
				notifyLocalTodosListeners();
			}
		},
		[isAuthenticated, createMutation],
	);

	const toggle = useCallback(
		async (id: number | string, completed: boolean) => {
			if (isAuthenticated) {
				await toggleMutation.mutateAsync({ id: id as number, completed });
			} else {
				localTodoStorage.toggle(id as string);
				notifyLocalTodosListeners();
			}
		},
		[isAuthenticated, toggleMutation],
	);

	const deleteTodo = useCallback(
		async (id: number | string) => {
			if (isAuthenticated) {
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

	const todos: Todo[] = useMemo(() => {
		if (isAuthenticated) {
			return (remoteTodos ?? []).map((t) => ({
				id: t.id,
				text: t.text,
				completed: t.completed,
				folderId: t.folderId,
			}));
		}
		return localTodos.map((t) => ({
			id: t.id,
			text: t.text,
			completed: t.completed,
			folderId: t.folderId ?? null,
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

	return {
		todos,
		create,
		toggle,
		deleteTodo,
		updateFolder,
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
						// Upload local todos to server, then clear local storage
						if (localTodos.length > 0) {
							await bulkCreateMutation.mutateAsync({
								todos: localTodos.map((t) => ({
									text: t.text,
									completed: t.completed,
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
						// Upload local todos and keep remote ones (they're already there)
						if (localTodos.length > 0) {
							await bulkCreateMutation.mutateAsync({
								todos: localTodos.map((t) => ({
									text: t.text,
									completed: t.completed,
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
