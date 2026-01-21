import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { RemoteSubtask } from "@/app/api/subtask/subtask.types";
import { useSession } from "@/lib/auth-client";
import type { RealtimePayload } from "@/lib/supabase";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Result object returned by useSubtaskRealtime hook.
 */
export interface UseSubtaskRealtimeReturn {
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
 * Get the query key for a specific todo's subtasks.
 * tRPC TanStack Query uses the pattern: [['subtask', 'list'], { input: { todoId } }]
 * We use exact match with the input object for cache updates.
 */
function getSubtaskQueryKeyForTodo(todoId: number): unknown[] {
	return [["subtask", "list"], { input: { todoId } }];
}

/**
 * React hook for subscribing to Supabase Realtime changes to the subtask table
 * and updating the React Query cache automatically.
 *
 * This hook:
 * - Subscribes to INSERT, UPDATE, and DELETE events on the subtask table
 * - Updates all cached subtask lists across different todos
 * - Handles subtask changes affecting parent todo auto-completion
 * - Automatically handles cleanup on unmount
 *
 * @example
 * ```ts
 * useSubtaskRealtime(userId);
 * ```
 */
export function useSubtaskRealtime(
	userId: string | undefined,
): UseSubtaskRealtimeReturn {
	const queryClient = useQueryClient();

	const isConfigured = isSupabaseConfigured();
	const isSubscribedRef = useRef(false);
	const channelRef = useRef<RealtimeChannel | null>(null);

	// Handle INSERT events - add new subtask to the appropriate todo's subtask list
	const handleInsert = useCallback(
		(payload: RealtimePayload<RemoteSubtask>) => {
			const queryKey = getSubtaskQueryKeyForTodo(payload.new.todoId);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) => {
				if (!old) return [payload.new];
				// Avoid duplicates if the subtask already exists
				if (old.some((subtask) => subtask.id === payload.new.id)) {
					return old.map((subtask) =>
						subtask.id === payload.new.id ? payload.new : subtask,
					);
				}
				return [...old, payload.new];
			});
		},
		[queryClient],
	);

	// Handle UPDATE events - update subtask in the appropriate todo's subtask list
	const handleUpdate = useCallback(
		(payload: RealtimePayload<RemoteSubtask>) => {
			const queryKey = getSubtaskQueryKeyForTodo(payload.new.todoId);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) =>
				old?.map((subtask) =>
					subtask.id === payload.new.id ? payload.new : subtask,
				),
			);
		},
		[queryClient],
	);

	// Handle DELETE events - remove subtask from the appropriate todo's subtask list
	const handleDelete = useCallback(
		(payload: RealtimePayload<RemoteSubtask>) => {
			const queryKey = getSubtaskQueryKeyForTodo(payload.old.todoId);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) =>
				old?.filter((subtask) => subtask.id !== payload.old.id),
			);
		},
		[queryClient],
	);

	// Unified event handler
	const handleChange = useCallback(
		(payload: RealtimePayload<RemoteSubtask>) => {
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

		// Create channel with user filter (via todo ownership)
		const channel = supabase.channel(`subtask:user_id=eq.${userId}`);
		channelRef.current = channel;

		// Subscribe to postgres changes
		// biome-ignore lint/suspicious/noExplicitAny: Supabase's typed overloads don't match runtime behavior
		const subscription = (channel as any).on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "subtask",
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
 * Higher-order hook that integrates useSubtaskRealtime with useSession.
 * Automatically subscribes to realtime updates when the user is authenticated.
 *
 * @example
 * ```ts
 * const { isConfigured, isSubscribed } = useSubtaskRealtimeWithAuth();
 * ```
 */
export function useSubtaskRealtimeWithAuth(): UseSubtaskRealtimeReturn {
	const { data: session } = useSession();
	const userId = session?.user?.id;
	const queryClient = useQueryClient();

	const isConfigured = isSupabaseConfigured();
	const isSubscribedRef = useRef(false);
	const channelRef = useRef<RealtimeChannel | null>(null);

	// Event handlers
	const handleInsert = useCallback(
		(payload: RealtimePayload<RemoteSubtask>) => {
			const queryKey = getSubtaskQueryKeyForTodo(payload.new.todoId);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) => {
				if (!old) return [payload.new];
				if (old.some((subtask) => subtask.id === payload.new.id)) {
					return old.map((subtask) =>
						subtask.id === payload.new.id ? payload.new : subtask,
					);
				}
				return [...old, payload.new];
			});
		},
		[queryClient],
	);

	const handleUpdate = useCallback(
		(payload: RealtimePayload<RemoteSubtask>) => {
			const queryKey = getSubtaskQueryKeyForTodo(payload.new.todoId);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) =>
				old?.map((subtask) =>
					subtask.id === payload.new.id ? payload.new : subtask,
				),
			);
		},
		[queryClient],
	);

	const handleDelete = useCallback(
		(payload: RealtimePayload<RemoteSubtask>) => {
			const queryKey = getSubtaskQueryKeyForTodo(payload.old.todoId);

			queryClient.setQueryData<RemoteSubtask[]>(queryKey, (old) =>
				old?.filter((subtask) => subtask.id !== payload.old.id),
			);
		},
		[queryClient],
	);

	const handleChange = useCallback(
		(payload: RealtimePayload<RemoteSubtask>) => {
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

		// Create channel with user filter (via todo ownership)
		const channel = supabase.channel(`subtask:user_id=eq.${userId}`);
		channelRef.current = channel;

		// Subscribe to postgres changes
		// biome-ignore lint/suspicious/noExplicitAny: Supabase's typed overloads don't match runtime behavior
		const subscription = (channel as any).on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "subtask",
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
