import { useMemo } from "react";
import type { Todo } from "@/app/api/todo";

/**
 * Hook to sort todos by time descending (latest first).
 * Logic prioritizes recurring notifyAt, then reminderAt, then dueDate time.
 */
export function useTimeSortedTodos<
	T extends Pick<Todo, "recurringPattern" | "reminderAt" | "dueDate">,
>(todos: T[]): T[] {
	return useMemo(() => {
		const getTime = (todo: T): number | null => {
			// Check recurring pattern notifyAt first (e.g., "09:00", "21:00")
			if (todo.recurringPattern?.notifyAt) {
				const [hours, minutes] = todo.recurringPattern.notifyAt
					.split(":")
					.map(Number);
				return hours * 60 + minutes;
			}
			// Check reminderAt (it has explicit time)
			if (todo.reminderAt) {
				const date = new Date(todo.reminderAt);
				return date.getHours() * 60 + date.getMinutes();
			}
			// Check if dueDate has a time component (not midnight)
			if (todo.dueDate) {
				const date = new Date(todo.dueDate);
				const minutes = date.getHours() * 60 + date.getMinutes();
				// If it's not midnight (00:00), consider it has a time
				if (minutes > 0) {
					return minutes;
				}
			}
			return null;
		};

		return [...todos].sort((a, b) => {
			const aTime = getTime(a);
			const bTime = getTime(b);

			// Both have time: sort by time descending (latest first)
			if (aTime !== null && bTime !== null) {
				return bTime - aTime;
			}

			// Only a has time: a comes first
			if (aTime !== null) {
				return -1;
			}

			// Only b has time: b comes first
			if (bTime !== null) {
				return 1;
			}

			// Neither has time: maintain original order
			return 0;
		});
	}, [todos]);
}
