"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/lib/auth-client";
import type { LocalTodo } from "@/lib/local-todo-storage";
import * as localTodoStorage from "@/lib/local-todo-storage";
import { queryClient, trpc } from "@/utils/trpc";

export interface Todo {
	id: number | string;
	text: string;
	completed: boolean;
}

interface RemoteTodo {
	id: number;
	text: string;
	completed: boolean;
	userId: string;
}

interface UseTodoStorageReturn {
	todos: Todo[];
	create: (text: string) => Promise<void>;
	toggle: (id: number | string, completed: boolean) => Promise<void>;
	deleteTodo: (id: number | string) => Promise<void>;
	isLoading: boolean;
	isAuthenticated: boolean;
}

let localTodosListeners: Array<() => void> = [];

function subscribeToLocalTodos(callback: () => void) {
	localTodosListeners.push(callback);
	return () => {
		localTodosListeners = localTodosListeners.filter((l) => l !== callback);
	};
}

function notifyLocalTodosListeners() {
	for (const listener of localTodosListeners) {
		listener();
	}
}

function getLocalTodosSnapshot(): LocalTodo[] {
	return localTodoStorage.getAll();
}

function getLocalTodosServerSnapshot(): LocalTodo[] {
	return [];
}

export function useTodoStorage(): UseTodoStorageReturn {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	const localTodos = useSyncExternalStore(
		subscribeToLocalTodos,
		getLocalTodosSnapshot,
		getLocalTodosServerSnapshot,
	);

	const queryKey = trpc.todo.getAll.queryKey();

	const {
		data: remoteTodos,
		isLoading: isRemoteTodosLoading,
		refetch: refetchRemoteTodos,
	} = useQuery({
		...trpc.todo.getAll.queryOptions(),
		enabled: isAuthenticated,
	});

	const createMutation = useMutation({
		mutationFn: trpc.todo.create.mutationOptions().mutationFn,
		onMutate: async (newTodo: { text: string }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousTodos = queryClient.getQueryData<RemoteTodo[]>(queryKey);

			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) => [
				...(old ?? []),
				{
					id: -Date.now(),
					text: newTodo.text,
					completed: false,
					userId: session?.user?.id ?? "",
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

	const toggleMutation = useMutation({
		mutationFn: trpc.todo.toggle.mutationOptions().mutationFn,
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

	const deleteMutation = useMutation({
		mutationFn: trpc.todo.delete.mutationOptions().mutationFn,
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

	const create = useCallback(
		async (text: string) => {
			if (isAuthenticated) {
				await createMutation.mutateAsync({ text });
			} else {
				localTodoStorage.create(text);
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

	const todos: Todo[] = useMemo(() => {
		if (isAuthenticated) {
			return (remoteTodos ?? []).map((t) => ({
				id: t.id,
				text: t.text,
				completed: t.completed,
			}));
		}
		return localTodos.map((t) => ({
			id: t.id,
			text: t.text,
			completed: t.completed,
		}));
	}, [isAuthenticated, remoteTodos, localTodos]);

	const isLoading =
		isSessionPending ||
		(isAuthenticated && isRemoteTodosLoading) ||
		createMutation.isPending ||
		toggleMutation.isPending ||
		deleteMutation.isPending;

	return {
		todos,
		create,
		toggle,
		deleteTodo,
		isLoading,
		isAuthenticated,
	};
}
