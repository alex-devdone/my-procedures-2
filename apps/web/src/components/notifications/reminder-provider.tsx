"use client";

import { createContext, useContext, useMemo } from "react";
import { useTodoStorage } from "@/app/api/todo";
import type { DueReminder } from "@/hooks/use-reminder-checker";
import { useReminderChecker } from "@/hooks/use-reminder-checker";
import { ReminderToastManager } from "./reminder-toast";

// ============================================================================
// Context
// ============================================================================

interface ReminderContextValue {
	/** Set of todo IDs (as strings) that currently have due reminders */
	dueReminderIds: Set<string>;
	/** Full list of due reminders */
	dueReminders: DueReminder[];
	/** Dismiss a reminder by todo ID */
	dismissReminder: (todoId: number | string) => void;
}

const ReminderContext = createContext<ReminderContextValue | null>(null);

/**
 * Hook to access due reminder information.
 * Returns the set of todo IDs with due reminders.
 */
export function useDueReminders(): ReminderContextValue {
	const context = useContext(ReminderContext);
	if (!context) {
		// Return empty defaults if used outside provider
		return {
			dueReminderIds: new Set<string>(),
			dueReminders: [],
			dismissReminder: () => {},
		};
	}
	return context;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the ReminderProvider component
 */
export interface ReminderProviderProps {
	/** Child elements to render */
	children: React.ReactNode;
	/** Whether to enable reminder checking (default: true) */
	enabled?: boolean;
	/** Check interval in milliseconds (default: 30000 = 30 seconds) */
	checkInterval?: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Provider component that integrates reminder checking into the app.
 * Monitors todos for due reminders and displays browser notifications + in-app toasts.
 *
 * Features:
 * - Polls todos at configurable interval
 * - Shows browser notifications (if permission granted)
 * - Shows in-app toast notifications
 * - Works with both localStorage (guest) and remote (authenticated) todos
 *
 * @example
 * ```tsx
 * // In app layout
 * <Providers>
 *   <ReminderProvider>
 *     {children}
 *   </ReminderProvider>
 * </Providers>
 * ```
 */
export function ReminderProvider({
	children,
	enabled = true,
	checkInterval,
}: ReminderProviderProps) {
	const { todos, isLoading } = useTodoStorage();

	const { dueReminders, dismissReminder } = useReminderChecker(todos, {
		enabled: enabled && !isLoading,
		checkInterval,
	});

	// Create a Set of due reminder IDs for quick lookup (normalized to strings)
	const dueReminderIds = useMemo(() => {
		return new Set(dueReminders.map((r) => String(r.todoId)));
	}, [dueReminders]);

	const contextValue = useMemo(
		(): ReminderContextValue => ({
			dueReminderIds,
			dueReminders,
			dismissReminder,
		}),
		[dueReminderIds, dueReminders, dismissReminder],
	);

	return (
		<ReminderContext.Provider value={contextValue}>
			{children}
			<ReminderToastManager
				reminders={dueReminders}
				onDismiss={dismissReminder}
				enabled={enabled && !isLoading}
			/>
		</ReminderContext.Provider>
	);
}
