import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getTodosQueryKey } from "@/app/api/todo/todo.api";
import type { RemoteTodo } from "@/app/api/todo/todo.types";
import { useSession } from "@/lib/auth-client";
import type { RealtimePayload } from "@/lib/supabase";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Result object returned by useTodoRealtime hook.
 */
export interface UseTodoRealtimeReturn {
	/**
	 * Whether Supabase is properly configured.
	 */
	isConfigured: boolean;
	/**
	 * Whether the subscription is currently active.
	 */
	isSubscribed: boolean;
	/**
	 * Clean up the realtime subscription.
	 */
	unsubscribe: () => void;
}

/**
 * React hook for subscribing to Supabase Realtime changes to the todo table
 * and updating the React Query cache automatically.
 *
 * This hook:
 * - Subscribes to INSERT, UPDATE, and DELETE events on the todo table
 * - Filters by user_id to only receive changes for the current user
 * - Updates the React Query cache directly when changes are detected
 * - Automatically handles cleanup on unmount
 *
 * @example
 * ```ts
 * useTodoRealtime(userId);
 * ```
 */
export function useTodoRealtime(
	userId: string | undefined,
): UseTodoRealtimeReturn {
	const queryClient = useQueryClient();
	const queryKey = getTodosQueryKey();

	const isConfigured = isSupabaseConfigured();
	const isSubscribedRef = useRef(false);
	const channelRef = useRef<RealtimeChannel | null>(null);

	// Handle INSERT events - add new todo to cache
	const handleInsert = useCallback(
		(payload: RealtimePayload<RemoteTodo>) => {
			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) => {
				if (!old) return [payload.new];
				// Avoid duplicates if the todo already exists
				if (old.some((todo) => todo.id === payload.new.id)) {
					return old.map((todo) =>
						todo.id === payload.new.id ? payload.new : todo,
					);
				}
				return [...old, payload.new];
			});
		},
		[queryClient, queryKey],
	);

	// Handle UPDATE events - update todo in cache
	const handleUpdate = useCallback(
		(payload: RealtimePayload<RemoteTodo>) => {
			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.map((todo) => (todo.id === payload.new.id ? payload.new : todo)),
			);
		},
		[queryClient, queryKey],
	);

	// Handle DELETE events - remove todo from cache
	const handleDelete = useCallback(
		(payload: RealtimePayload<RemoteTodo>) => {
			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.filter((todo) => todo.id !== payload.old.id),
			);
		},
		[queryClient, queryKey],
	);

	// Unified event handler
	const handleChange = useCallback(
		(payload: RealtimePayload<RemoteTodo>) => {
			switch (payload.eventType) {
				case "INSERT":
					handleInsert(payload);
					break;
				case "UPDATE":
					handleUpdate(payload);
					break;
				case "DELETE":
					handleDelete(payload);
					break;
			}
		},
		[handleInsert, handleUpdate, handleDelete],
	);

	// Manage subscription lifecycle
	useEffect(() => {
		if (!isConfigured || !userId) {
			return;
		}

		// Create channel with user filter
		const channel = supabase.channel(`todo:user_id=eq.${userId}`);
		channelRef.current = channel;

		// Subscribe to postgres changes
		// biome-ignore lint/suspicious/noExplicitAny: Supabase's typed overloads don't match runtime behavior
		const subscription = (channel as any).on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "todo",
				filter: `user_id=eq.${userId}`,
			},
			handleChange,
		);

		// Subscribe to the channel
		subscription.subscribe((status: string) => {
			if (status === "SUBSCRIBED") {
				isSubscribedRef.current = true;
			} else if (status === "CHANNEL_ERROR") {
				isSubscribedRef.current = false;
			}
		});

		// Cleanup function
		return () => {
			isSubscribedRef.current = false;
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		};
	}, [isConfigured, userId, handleChange]);

	// Manual unsubscribe function
	const unsubscribe = useCallback(() => {
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
			isSubscribedRef.current = false;
		}
	}, []);

	return useMemo(
		() => ({
			isConfigured,
			isSubscribed: isSubscribedRef.current,
			unsubscribe,
		}),
		[isConfigured, unsubscribe],
	);
}

/**
 * Higher-order hook that integrates useTodoRealtime with useSession.
 * Automatically subscribes to realtime updates when the user is authenticated.
 *
 * @example
 * ```ts
 * const { isConfigured, isSubscribed } = useTodoRealtimeWithAuth();
 * ```
 */
export function useTodoRealtimeWithAuth(): UseTodoRealtimeReturn {
	const { data: session } = useSession();
	const userId = session?.user?.id;
	const queryClient = useQueryClient();
	const queryKey = getTodosQueryKey();

	const isConfigured = isSupabaseConfigured();
	const isSubscribedRef = useRef(false);
	const channelRef = useRef<RealtimeChannel | null>(null);

	// Event handlers
	const handleInsert = useCallback(
		(payload: RealtimePayload<RemoteTodo>) => {
			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) => {
				if (!old) return [payload.new];
				if (old.some((todo) => todo.id === payload.new.id)) {
					return old.map((todo) =>
						todo.id === payload.new.id ? payload.new : todo,
					);
				}
				return [...old, payload.new];
			});
		},
		[queryClient, queryKey],
	);

	const handleUpdate = useCallback(
		(payload: RealtimePayload<RemoteTodo>) => {
			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.map((todo) => (todo.id === payload.new.id ? payload.new : todo)),
			);
		},
		[queryClient, queryKey],
	);

	const handleDelete = useCallback(
		(payload: RealtimePayload<RemoteTodo>) => {
			queryClient.setQueryData<RemoteTodo[]>(queryKey, (old) =>
				old?.filter((todo) => todo.id !== payload.old.id),
			);
		},
		[queryClient, queryKey],
	);

	const handleChange = useCallback(
		(payload: RealtimePayload<RemoteTodo>) => {
			switch (payload.eventType) {
				case "INSERT":
					handleInsert(payload);
					break;
				case "UPDATE":
					handleUpdate(payload);
					break;
				case "DELETE":
					handleDelete(payload);
					break;
			}
		},
		[handleInsert, handleUpdate, handleDelete],
	);

	// Manage subscription lifecycle
	useEffect(() => {
		if (!isConfigured || !userId) {
			return;
		}

		// Create channel with user filter
		const channel = supabase.channel(`todo:user_id=eq.${userId}`);
		channelRef.current = channel;

		// Subscribe to postgres changes
		// biome-ignore lint/suspicious/noExplicitAny: Supabase's typed overloads don't match runtime behavior
		const subscription = (channel as any).on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "todo",
				filter: `user_id=eq.${userId}`,
			},
			handleChange,
		);

		// Subscribe to the channel
		subscription.subscribe((status: string) => {
			if (status === "SUBSCRIBED") {
				isSubscribedRef.current = true;
			} else if (status === "CHANNEL_ERROR") {
				isSubscribedRef.current = false;
			}
		});

		// Cleanup function
		return () => {
			isSubscribedRef.current = false;
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		};
	}, [isConfigured, userId, handleChange]);

	// Manual unsubscribe function
	const unsubscribe = useCallback(() => {
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
			isSubscribedRef.current = false;
		}
	}, []);

	return useMemo(
		() => ({
			isConfigured,
			isSubscribed: isSubscribedRef.current,
			unsubscribe,
		}),
		[isConfigured, unsubscribe],
	);
}
