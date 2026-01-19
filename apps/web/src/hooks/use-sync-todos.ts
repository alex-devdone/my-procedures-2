"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import * as localTodoStorage from "@/lib/local-todo-storage";
import { queryClient, trpc } from "@/utils/trpc";

export type SyncAction = "sync" | "discard" | "keep_both";

interface SyncPromptState {
	isOpen: boolean;
	localTodosCount: number;
	remoteTodosCount: number;
}

interface UseSyncTodosReturn {
	syncPrompt: SyncPromptState;
	handleSyncAction: (action: SyncAction) => Promise<void>;
	isSyncing: boolean;
}

export function useSyncTodos(): UseSyncTodosReturn {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;
	const previousAuthState = useRef<boolean | null>(null);

	const [syncPrompt, setSyncPrompt] = useState<SyncPromptState>({
		isOpen: false,
		localTodosCount: 0,
		remoteTodosCount: 0,
	});

	const queryKey = trpc.todo.getAll.queryKey();

	const { data: remoteTodos, isLoading: isRemoteTodosLoading } = useQuery({
		...trpc.todo.getAll.queryOptions(),
		enabled: isAuthenticated,
	});

	const bulkCreateMutation = useMutation({
		mutationFn: trpc.todo.bulkCreate.mutationOptions().mutationFn,
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
