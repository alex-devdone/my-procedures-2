import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SupabaseCompletionRecord } from "@/app/api/analytics/analytics.supabase";
import { useSession } from "@/lib/auth-client";
import type { RealtimePayload } from "@/lib/supabase";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * Result object returned by useCompletionRealtime hook.
 */
export interface UseCompletionRealtimeReturn {
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
 * React hook for subscribing to Supabase Realtime changes to the recurring_todo_completion table
 * and invalidating the React Query cache automatically.
 *
 * This hook:
 * - Subscribes to INSERT, UPDATE, and DELETE events on the recurring_todo_completion table
 * - Filters by user_id to only receive changes for the current user
 * - Invalidates React Query cache when changes are detected (no direct cache updates needed)
 * - Automatically handles cleanup on unmount
 *
 * @example
 * ```ts
 * useCompletionRealtime(userId);
 * ```
 */
export function useCompletionRealtime(
	userId: string | undefined,
): UseCompletionRealtimeReturn {
	const queryClient = useQueryClient();

	const isConfigured = isSupabaseConfigured();
	const isSubscribedRef = useRef(false);
	const channelRef = useRef<RealtimeChannel | null>(null);

	// Handle any change event - just invalidate the completion history queries
	const handleChange = useCallback(
		(_payload: RealtimePayload<SupabaseCompletionRecord>) => {
			// Invalidate all completion history queries to trigger refetch
			// This uses the custom query key format: ["completionHistory", userId, startDate, endDate]
			queryClient.invalidateQueries({
				queryKey: ["completionHistory"],
			});
		},
		[queryClient],
	);

	// Manage subscription lifecycle
	useEffect(() => {
		if (!isConfigured || !userId) {
			return;
		}

		// Create channel with user filter
		const channel = supabase.channel(
			`recurring_todo_completion:user_id=eq.${userId}`,
		);
		channelRef.current = channel;

		// Subscribe to postgres changes
		// biome-ignore lint/suspicious/noExplicitAny: Supabase's typed overloads don't match runtime behavior
		const subscription = (channel as any).on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "recurring_todo_completion",
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
 * Higher-order hook that integrates useCompletionRealtime with useSession.
 * Automatically subscribes to realtime updates when the user is authenticated.
 *
 * @example
 * ```ts
 * const { isConfigured, isSubscribed } = useCompletionRealtimeWithAuth();
 * ```
 */
export function useCompletionRealtimeWithAuth(): UseCompletionRealtimeReturn {
	const { data: session } = useSession();
	const userId = session?.user?.id;
	const queryClient = useQueryClient();

	const isConfigured = isSupabaseConfigured();
	const isSubscribedRef = useRef(false);
	const channelRef = useRef<RealtimeChannel | null>(null);

	// Handle any change event - just invalidate the completion history queries
	const handleChange = useCallback(
		(_payload: RealtimePayload<SupabaseCompletionRecord>) => {
			// Invalidate all completion history queries to trigger refetch
			// This uses the custom query key format: ["completionHistory", userId, startDate, endDate]
			queryClient.invalidateQueries({
				queryKey: ["completionHistory"],
			});
		},
		[queryClient],
	);

	// Manage subscription lifecycle
	useEffect(() => {
		if (!isConfigured || !userId) {
			return;
		}

		// Create channel with user filter
		const channel = supabase.channel(
			`recurring_todo_completion:user_id=eq.${userId}`,
		);
		channelRef.current = channel;

		// Subscribe to postgres changes
		// biome-ignore lint/suspicious/noExplicitAny: Supabase's typed overloads don't match runtime behavior
		const subscription = (channel as any).on(
			"postgres_changes",
			{
				event: "*",
				schema: "public",
				table: "recurring_todo_completion",
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
