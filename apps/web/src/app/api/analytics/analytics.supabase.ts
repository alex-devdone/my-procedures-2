import { supabase } from "@/lib/supabase";

/**
 * Completion history record from Supabase.
 * Matches the recurring_todo_completion table schema.
 */
export interface SupabaseCompletionRecord {
	id: number;
	todo_id: number;
	scheduled_date: string;
	completed_at: string | null;
	user_id: string;
}

/**
 * Fetches completion history for recurring todos from Supabase.
 * This is used instead of tRPC to enable Realtime subscriptions.
 *
 * @param userId - The user ID to filter by
 * @param startDate - Start of date range (ISO datetime string)
 * @param endDate - End of date range (ISO datetime string)
 * @returns Array of completion records
 */
export async function getCompletionHistorySupabase(
	userId: string,
	startDate: string,
	endDate: string,
): Promise<SupabaseCompletionRecord[]> {
	const { data, error } = await supabase
		.from("recurring_todo_completion")
		.select("id, todo_id, scheduled_date, completed_at, user_id")
		.eq("user_id", userId)
		.gte("scheduled_date", startDate)
		.lte("scheduled_date", endDate);

	if (error) {
		throw new Error(`Failed to fetch completion history: ${error.message}`);
	}

	return data ?? [];
}
