import { env } from "@my-procedures-2/env/web";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client for Realtime subscriptions and other client-side operations.
 *
 * This uses the anon key which is safe for public exposure as long as RLS (Row Level Security)
 * is properly configured on the Supabase database.
 *
 * For realtime subscriptions, use:
 * ```ts
 * const channel = supabase
 *   .channel('custom-channel')
 *   .on('postgres_changes', { event: '*', schema: 'public', table: 'todo' }, (payload) => {
 *     console.log('Change received!', payload)
 *   })
 *   .subscribe()
 * ```
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: false,
		autoRefreshToken: false,
	},
});

/**
 * Creates a Supabase channel for realtime subscriptions.
 * Automatically handles cleanup on unmount when used in a useEffect.
 *
 * @param channelName - Unique name for the channel
 * @returns Supabase RealtimeChannel
 */
export function createSupabaseChannel(channelName: string) {
	return supabase.channel(channelName);
}

/**
 * Helper type for Realtime payload types.
 */
export type RealtimePayload<T = unknown> = {
	/**
	 * The event type: INSERT, UPDATE, or DELETE
	 */
	eventType: "INSERT" | "UPDATE" | "DELETE";
	/**
	 * The new record (for INSERT and UPDATE)
	 */
	new: T;
	/**
	 * The old record (for UPDATE and DELETE)
	 */
	old: T;
	/**
	 * Additional metadata
	 */
	errors: unknown[] | null;
};

/**
 * Checks if Supabase is properly configured.
 * Returns true if both URL and anon key are set.
 */
export function isSupabaseConfigured(): boolean {
	return (
		typeof supabaseUrl === "string" &&
		supabaseUrl.length > 0 &&
		typeof supabaseAnonKey === "string" &&
		supabaseAnonKey.length > 0
	);
}
