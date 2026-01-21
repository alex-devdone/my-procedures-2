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
import { useSubtaskRealtimeWithAuth } from "@/hooks/use-subtask-realtime";
import { useSession } from "@/lib/auth-client";
import * as localSubtaskStorage from "@/lib/local-subtask-storage";
import { queryClient } from "@/utils/trpc";
import {
	getBulkCreateSubtasksMutationOptions,
	getCreateSubtaskMutationOptions,
	getDeleteSubtaskMutationOptions,
	getReorderSubtaskMutationOptions,
	getSubtasksQueryKey,
	getSubtasksQueryOptions,
	getToggleSubtaskMutationOptions,
	getUpdateSubtaskMutationOptions,
} from "./subtask.api";
import type {
	LocalSubtask,
	RemoteSubtask,
	Subtask,
	SubtaskSyncAction,
	SubtaskSyncPromptState,
	UseSubtaskStorageReturn,
	UseSyncSubtasksReturn,
} from "./subtask.types";
import { notifyAllSubtasksListeners } from "./subtask-progress.hooks";

// ============================================================================
// Local Storage Sync (for useSyncExternalStore)
// ============================================================================

// Map of todoId -> listeners for that todo's subtasks
const localSubtasksListenersMap: Map<string, Array<() => void>> = new Map();

// Cached snapshots per todoId to prevent infinite loops in useSyncExternalStore
const cachedLocalSubtasksMap: Map<string, LocalSubtask[]> = new Map();
const cachedLocalSubtasksJsonMap: Map<string, string> = new Map();

// Cached empty array for server snapshot (must be stable reference)
const emptyLocalSubtasks: LocalSubtask[] = [];

function subscribeToLocalSubtasks(todoId: string) {
	return (callback: () => void) => {
		const listeners = localSubtasksListenersMap.get(todoId) ?? [];
		listeners.push(callback);
		localSubtasksListenersMap.set(todoId, listeners);

		return () => {
			const currentListeners = localSubtasksListenersMap.get(todoId) ?? [];
			localSubtasksListenersMap.set(
				todoId,
				currentListeners.filter((l) => l !== callback),
			);
		};
	};
}

export function notifyLocalSubtasksListeners(todoId: string) {
	const listeners = localSubtasksListenersMap.get(todoId) ?? [];
	for (const listener of listeners) {
		listener();
	}
	// Also notify the global listeners for subtask progress tracking
	notifyAllSubtasksListeners();
}

function getLocalSubtasksSnapshot(todoId: string) {
	return () => {
		const subtasks = localSubtaskStorage.getAll(todoId);
		const subtasksJson = JSON.stringify(subtasks);

		const cachedJson = cachedLocalSubtasksJsonMap.get(todoId);

		// Only return a new reference if the data actually changed
		if (subtasksJson !== cachedJson) {
			cachedLocalSubtasksJsonMap.set(todoId, subtasksJson);
			cachedLocalSubtasksMap.set(todoId, subtasks);
		}

		return cachedLocalSubtasksMap.get(todoId) ?? [];
	};
}

function getLocalSubtasksServerSnapshot(): LocalSubtask[] {
	return emptyLocalSubtasks;
}

// ============================================================================
// useSubtaskStorage Hook
// ============================================================================

/**
 * Unified hook for managing subtasks with dual-mode support:
 * - Authenticated users: subtasks stored remotely via tRPC
 * - Guest users: subtasks stored locally in browser localStorage
 *
 * @param todoId - The ID of the parent todo (number for remote, string for local)
 */
export function useSubtaskStorage(
	todoId: number | string,
): UseSubtaskStorageReturn {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	// Integrate realtime sync for authenticated users
	useSubtaskRealtimeWithAuth();

	// For local storage, we need string todoId
	const localTodoId = String(todoId);

	const localSubtasks = useSyncExternalStore(
		subscribeToLocalSubtasks(localTodoId),
		getLocalSubtasksSnapshot(localTodoId),
		getLocalSubtasksServerSnapshot,
	);

	// Only query remote if authenticated and todoId is a positive number
	// Negative IDs are optimistic/temporary IDs used during create operations
	const numericTodoId =
		typeof todoId === "number" && todoId > 0 ? todoId : null;
	const queryKey = numericTodoId ? getSubtasksQueryKey(numericTodoId) : [];

	const {
		data: remoteSubtasks,
		isLoading: isRemoteSubtasksLoading,
		refetch: refetchRemoteSubtasks,
	} = useQuery({
		...getSubtasksQueryOptions({ todoId: numericTodoId ?? 0 }),
		enabled: isAuthenticated && numericTodoId !== null,
	});

	// Create mutation with optimistic updates
	const createMutation = useMutation({
		mutationFn: getCreateSubtaskMutationOptions().mutationFn,
		onMutate: async (newSubtask: { todoId: number; text: string }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousSubtasks =
				queryClient.getQueryData<RemoteSubtask[]>(queryKey);

			const maxOrder = Math.max(
				-1,
				...(previousSubtasks ?? []).map((s) => s.order),
			);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) => [
				...(old ?? []),
				{
					id: -Date.now(),
					text: newSubtask.text,
					completed: false,
					todoId: newSubtask.todoId,
					order: maxOrder + 1,
				},
			]);

			return { previousSubtasks };
		},
		onError: (_err, _newSubtask, context) => {
			if (context?.previousSubtasks) {
				queryClient.setQueryData(queryKey, context.previousSubtasks);
			}
		},
		onSettled: () => {
			refetchRemoteSubtasks();
		},
	});

	// Update mutation with optimistic updates
	const updateMutation = useMutation({
		mutationFn: getUpdateSubtaskMutationOptions().mutationFn,
		onMutate: async (updatedSubtask: { id: number; text?: string }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousSubtasks =
				queryClient.getQueryData<RemoteSubtask[]>(queryKey);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) =>
				old?.map((subtask) =>
					subtask.id === updatedSubtask.id
						? {
								...subtask,
								...(updatedSubtask.text !== undefined && {
									text: updatedSubtask.text,
								}),
							}
						: subtask,
				),
			);

			return { previousSubtasks };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSubtasks) {
				queryClient.setQueryData(queryKey, context.previousSubtasks);
			}
		},
		onSettled: () => {
			refetchRemoteSubtasks();
		},
	});

	// Toggle mutation with optimistic updates
	const toggleMutation = useMutation({
		mutationFn: getToggleSubtaskMutationOptions().mutationFn,
		onMutate: async ({ id, completed }: { id: number; completed: boolean }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousSubtasks =
				queryClient.getQueryData<RemoteSubtask[]>(queryKey);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) =>
				old?.map((subtask) =>
					subtask.id === id ? { ...subtask, completed } : subtask,
				),
			);

			return { previousSubtasks };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSubtasks) {
				queryClient.setQueryData(queryKey, context.previousSubtasks);
			}
		},
		onSettled: () => {
			refetchRemoteSubtasks();
		},
	});

	// Delete mutation with optimistic updates
	const deleteMutation = useMutation({
		mutationFn: getDeleteSubtaskMutationOptions().mutationFn,
		onMutate: async ({ id }: { id: number }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousSubtasks =
				queryClient.getQueryData<RemoteSubtask[]>(queryKey);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) =>
				old?.filter((subtask) => subtask.id !== id),
			);

			return { previousSubtasks };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSubtasks) {
				queryClient.setQueryData(queryKey, context.previousSubtasks);
			}
		},
		onSettled: () => {
			refetchRemoteSubtasks();
		},
	});

	// Reorder mutation with optimistic updates
	const reorderMutation = useMutation({
		mutationFn: getReorderSubtaskMutationOptions().mutationFn,
		onMutate: async ({ id, newOrder }: { id: number; newOrder: number }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousSubtasks =
				queryClient.getQueryData<RemoteSubtask[]>(queryKey);

			if (previousSubtasks) {
				const subtaskToMove = previousSubtasks.find((s) => s.id === id);
				if (subtaskToMove) {
					const oldOrder = subtaskToMove.order;

					queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) => {
						if (!old) return old;
						return old
							.map((subtask) => {
								if (subtask.id === id) {
									return { ...subtask, order: newOrder };
								}
								// Adjust orders of other subtasks
								if (newOrder > oldOrder) {
									// Moving down: decrease order of subtasks between old and new position
									if (subtask.order > oldOrder && subtask.order <= newOrder) {
										return { ...subtask, order: subtask.order - 1 };
									}
								} else if (newOrder < oldOrder) {
									// Moving up: increase order of subtasks between new and old position
									if (subtask.order >= newOrder && subtask.order < oldOrder) {
										return { ...subtask, order: subtask.order + 1 };
									}
								}
								return subtask;
							})
							.sort((a, b) => a.order - b.order);
					});
				}
			}

			return { previousSubtasks };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousSubtasks) {
				queryClient.setQueryData(queryKey, context.previousSubtasks);
			}
		},
		onSettled: () => {
			refetchRemoteSubtasks();
		},
	});

	const create = useCallback(
		async (parentTodoId: number | string, text: string): Promise<Subtask> => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) todo IDs - they haven't been created yet
				if (typeof parentTodoId === "number" && parentTodoId < 0) {
					throw new Error("Cannot create subtask for pending todo");
				}
				const result = await createMutation.mutateAsync({
					todoId: parentTodoId as number,
					text,
				});
				return result;
			}
			const newSubtask = localSubtaskStorage.create(String(parentTodoId), text);
			notifyLocalSubtasksListeners(String(parentTodoId));
			return newSubtask;
		},
		[isAuthenticated, createMutation],
	);

	const update = useCallback(
		async (id: number | string, text: string): Promise<Subtask> => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) IDs - they haven't been created yet
				if (typeof id === "number" && id < 0) {
					throw new Error("Cannot update pending subtask");
				}
				const result = await updateMutation.mutateAsync({
					id: id as number,
					text,
				});
				return result;
			}
			const updatedSubtask = localSubtaskStorage.update(String(id), text);
			if (!updatedSubtask) {
				throw new Error(`Subtask with id ${id} not found`);
			}
			notifyLocalSubtasksListeners(localTodoId);
			return updatedSubtask;
		},
		[isAuthenticated, updateMutation, localTodoId],
	);

	const toggle = useCallback(
		async (id: number | string, completed: boolean): Promise<Subtask> => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) IDs - they haven't been created yet
				if (typeof id === "number" && id < 0) {
					throw new Error("Cannot toggle pending subtask");
				}
				const result = await toggleMutation.mutateAsync({
					id: id as number,
					completed,
				});
				return result;
			}
			const toggledSubtask = localSubtaskStorage.toggle(String(id), completed);
			if (!toggledSubtask) {
				throw new Error(`Subtask with id ${id} not found`);
			}
			notifyLocalSubtasksListeners(localTodoId);
			return toggledSubtask;
		},
		[isAuthenticated, toggleMutation, localTodoId],
	);

	const deleteSubtask = useCallback(
		async (id: number | string): Promise<void> => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) IDs - they haven't been created yet
				if (typeof id === "number" && id < 0) {
					return;
				}
				await deleteMutation.mutateAsync({ id: id as number });
			} else {
				localSubtaskStorage.deleteSubtask(String(id));
				notifyLocalSubtasksListeners(localTodoId);
			}
		},
		[isAuthenticated, deleteMutation, localTodoId],
	);

	const reorder = useCallback(
		async (id: number | string, newOrder: number): Promise<Subtask> => {
			if (isAuthenticated) {
				// Skip server call for optimistic (negative) IDs - they haven't been created yet
				if (typeof id === "number" && id < 0) {
					throw new Error("Cannot reorder pending subtask");
				}
				const result = await reorderMutation.mutateAsync({
					id: id as number,
					newOrder,
				});
				return result;
			}
			const reorderedSubtask = localSubtaskStorage.reorder(
				String(id),
				newOrder,
			);
			if (!reorderedSubtask) {
				throw new Error(`Subtask with id ${id} not found`);
			}
			notifyLocalSubtasksListeners(localTodoId);
			return reorderedSubtask;
		},
		[isAuthenticated, reorderMutation, localTodoId],
	);

	const subtasks: Subtask[] = useMemo(() => {
		if (isAuthenticated) {
			return (remoteSubtasks ?? [])
				.map((s) => ({
					id: s.id,
					text: s.text,
					completed: s.completed,
					todoId: s.todoId,
					order: s.order,
				}))
				.sort((a, b) => a.order - b.order);
		}
		return localSubtasks
			.map((s) => ({
				id: s.id,
				text: s.text,
				completed: s.completed,
				todoId: s.todoId,
				order: s.order,
			}))
			.sort((a, b) => a.order - b.order);
	}, [isAuthenticated, remoteSubtasks, localSubtasks]);

	// Initial loading state - only true during first data fetch
	// Does NOT include mutation pending states to allow optimistic updates to render
	const isLoading =
		isSessionPending || (isAuthenticated && isRemoteSubtasksLoading);

	return {
		subtasks,
		create,
		update,
		toggle,
		deleteSubtask,
		reorder,
		isLoading,
		isAuthenticated,
	};
}

// ============================================================================
// useSyncSubtasks Hook
// ============================================================================

/**
 * Hook for syncing local subtasks to server when user logs in.
 * Detects login transition and prompts user to sync, discard, or keep both.
 *
 * Note: Subtask sync requires a todoId mapping from local (string UUIDs) to
 * remote (numeric IDs). Without this mapping, subtasks can only be discarded.
 * The mapping should be provided by the todo sync process.
 */
export function useSyncSubtasks(): UseSyncSubtasksReturn {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;
	const previousAuthState = useRef<boolean | null>(null);

	const [syncPrompt, setSyncPrompt] = useState<SubtaskSyncPromptState>({
		isOpen: false,
		localSubtasksCount: 0,
		canSync: false,
	});

	const bulkCreateMutation = useMutation({
		mutationFn: getBulkCreateSubtasksMutationOptions().mutationFn,
	});

	const checkForLocalSubtasks = useCallback(() => {
		const allSubtasks = localSubtaskStorage.getAllGroupedByTodoId();
		let totalCount = 0;
		for (const subtasks of allSubtasks.values()) {
			totalCount += subtasks.length;
		}

		if (totalCount > 0) {
			setSyncPrompt({
				isOpen: true,
				localSubtasksCount: totalCount,
				// By default, we don't have a todoId mapping
				// The caller needs to provide it if they want to sync
				canSync: false,
			});
		}
	}, []);

	// Detect login transition (unauthenticated -> authenticated)
	useEffect(() => {
		if (isSessionPending) return;

		const wasAuthenticated = previousAuthState.current;
		const isNowAuthenticated = isAuthenticated;

		// Store current state for next comparison
		previousAuthState.current = isNowAuthenticated;

		// Only trigger on login transition (was not authenticated, now is)
		if (wasAuthenticated === false && isNowAuthenticated === true) {
			checkForLocalSubtasks();
		}
	}, [isAuthenticated, isSessionPending, checkForLocalSubtasks]);

	const handleSyncAction = useCallback(
		async (action: SubtaskSyncAction, todoIdMapping?: Map<string, number>) => {
			try {
				switch (action) {
					case "sync": {
						// Upload local subtasks to server with order preserved, then clear local storage
						if (todoIdMapping && todoIdMapping.size > 0) {
							const allSubtasks = localSubtaskStorage.getAllGroupedByTodoId();
							const subtasksToSync: Array<{
								todoId: number;
								text: string;
								completed: boolean;
								order: number;
							}> = [];

							for (const [localTodoId, subtasks] of allSubtasks) {
								const remoteTodoId = todoIdMapping.get(localTodoId);
								if (remoteTodoId !== undefined) {
									for (const subtask of subtasks) {
										subtasksToSync.push({
											todoId: remoteTodoId,
											text: subtask.text,
											completed: subtask.completed,
											order: subtask.order,
										});
									}
								}
							}

							if (subtasksToSync.length > 0) {
								await bulkCreateMutation.mutateAsync({
									subtasks: subtasksToSync,
								});
							}
						}
						// Clear all local subtasks regardless of whether we synced them
						localSubtaskStorage.clearAll();
						notifyAllSubtasksListeners();
						break;
					}
					case "discard": {
						// Just clear local storage without syncing
						localSubtaskStorage.clearAll();
						notifyAllSubtasksListeners();
						break;
					}
					case "keep_both": {
						// Upload local subtasks (server assigns order) and keep remote ones
						if (todoIdMapping && todoIdMapping.size > 0) {
							const allSubtasks = localSubtaskStorage.getAllGroupedByTodoId();
							const subtasksToSync: Array<{
								todoId: number;
								text: string;
								completed: boolean;
								// Don't pass order to let server assign new orders
								// This avoids order conflicts with existing remote subtasks
							}> = [];

							for (const [localTodoId, subtasks] of allSubtasks) {
								const remoteTodoId = todoIdMapping.get(localTodoId);
								if (remoteTodoId !== undefined) {
									for (const subtask of subtasks) {
										subtasksToSync.push({
											todoId: remoteTodoId,
											text: subtask.text,
											completed: subtask.completed,
										});
									}
								}
							}

							if (subtasksToSync.length > 0) {
								await bulkCreateMutation.mutateAsync({
									subtasks: subtasksToSync,
								});
							}
						}
						// Clear all local subtasks regardless of whether we synced them
						localSubtaskStorage.clearAll();
						notifyAllSubtasksListeners();
						break;
					}
				}
			} finally {
				setSyncPrompt({
					isOpen: false,
					localSubtasksCount: 0,
					canSync: false,
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
