import type {
	RealtimeChannel,
	RealtimePresenceState,
} from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import type { RealtimePayload } from "@/lib/supabase";
import {
	createSupabaseChannel,
	isSupabaseConfigured,
	supabase,
} from "@/lib/supabase";

/**
 * Configuration options for a Supabase Realtime subscription.
 */
export interface RealtimeSubscriptionConfig<T = unknown> {
	/**
	 * The database table to subscribe to (e.g., 'todo', 'folder', 'subtask')
	 */
	table: string;
	/**
	 * Filter to apply to the subscription (e.g., 'user_id=eq.123')
	 * @see https://supabase.com/docs/guides/realtime#filtering
	 */
	filter?: string;
	/**
	 * Event types to listen for. Default is all events.
	 */
	events?: Array<"INSERT" | "UPDATE" | "DELETE">;
	/**
	 * Callback invoked when a matching event occurs.
	 */
	onChange: (payload: RealtimePayload<T>) => void;
	/**
	 * Callback invoked when the subscription is successfully established.
	 */
	onSubscribe?: () => void;
	/**
	 * Callback invoked when the subscription fails or is disconnected.
	 */
	onError?: (error: Error) => void;
}

/**
 * Result object returned by useSupabaseRealtime hook.
 */
export interface UseSupabaseRealtimeReturn {
	/**
	 * Whether Supabase is properly configured.
	 */
	isConfigured: boolean;
	/**
	 * Whether the subscription is currently active.
	 */
	isSubscribed: boolean;
}

/**
 * React hook for subscribing to Supabase Realtime database changes.
 *
 * This hook automatically manages the subscription lifecycle, including:
 * - Creating and subscribing to the channel on mount
 * - Unsubscribing and cleaning up on unmount
 * - Re-subscribing when dependencies change
 *
 * @example
 * ```ts
 * useSupabaseRealtime({
 *   table: 'todo',
 *   filter: `user_id=eq.${userId}`,
 *   onChange: (payload) => {
 *     if (payload.eventType === 'INSERT') {
 *       queryClient.setQueryData(['todos'], (old) => [...old, payload.new]);
 *     }
 *   }
 * });
 * ```
 */
export function useSupabaseRealtime<T = unknown>(
	config: RealtimeSubscriptionConfig<T>,
): UseSupabaseRealtimeReturn {
	const {
		table,
		filter,
		events = ["INSERT", "UPDATE", "DELETE"],
		onChange,
		onSubscribe,
		onError,
	} = config;

	const channelRef = useRef<RealtimeChannel | null>(null);
	const isSubscribedRef = useRef(false);

	// Stable reference to callbacks to avoid re-subscribing on callback changes
	const onChangeRef = useRef(onChange);
	const onSubscribeRef = useRef(onSubscribe);
	const onErrorRef = useRef(onError);

	// Update callback refs when they change
	onChangeRef.current = onChange;
	onSubscribeRef.current = onSubscribe;
	onErrorRef.current = onError;

	const isConfigured = isSupabaseConfigured();

	useEffect(() => {
		if (!isConfigured) {
			return;
		}

		// Create a unique channel name based on table and filter
		const channelName = filter ? `${table}:${filter}` : table;

		// Create the channel
		const channel = createSupabaseChannel(channelName);
		channelRef.current = channel;

		// Build the subscription configuration
		const subscriptionConfig = {
			event: "*" as const,
			schema: "public",
			table,
			...(filter && { filter }),
		};

		// Subscribe to changes
		// biome-ignore lint/suspicious/noExplicitAny: Supabase's typed overloads don't match runtime behavior
		const subscription = (channel as any).on(
			"postgres_changes",
			subscriptionConfig,
			(payload: RealtimePayload<T>) => {
				// Only process events that match the requested types
				if (events.includes(payload.eventType)) {
					onChangeRef.current(payload);
				}
			},
		);

		// Subscribe to the channel
		subscription.subscribe((status: string) => {
			if (status === "SUBSCRIBED") {
				isSubscribedRef.current = true;
				onSubscribeRef.current?.();
			} else if (status === "CHANNEL_ERROR") {
				isSubscribedRef.current = false;
				onErrorRef.current?.(new Error(`Channel error: ${channelName}`));
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
	}, [isConfigured, table, filter, events]);

	return {
		isConfigured,
		isSubscribed: isSubscribedRef.current,
	};
}

/**
 * React hook for subscribing to Supabase Realtime presence state.
 * Useful for tracking online/offline status of users.
 *
 * @param channel - The channel to subscribe to
 * @param key - The presence key to track (e.g., user ID)
 * @param onChange - Callback when presence state changes
 */
export function useSupabasePresence<
	T extends Record<string, unknown> = Record<string, unknown>,
>(
	channel: string,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: key reserved for future use
	key: string,
	onChange: (state: RealtimePresenceState<T>) => void,
): void {
	useEffect(() => {
		if (!isSupabaseConfigured()) {
			return;
		}

		const presenceChannel = createSupabaseChannel(channel);

		// biome-ignore lint/suspicious/noExplicitAny: Supabase's typed overloads don't match runtime behavior
		const subscription = (presenceChannel as any).on(
			"presence",
			{ event: "sync" },
			() => {
				const state = presenceChannel.presenceState<T>();
				onChange(state);
			},
		);

		subscription.subscribe();

		return () => {
			supabase.removeChannel(presenceChannel);
		};
	}, [channel, onChange]);
}
