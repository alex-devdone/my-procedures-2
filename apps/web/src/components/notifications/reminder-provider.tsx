"use client";

import { useTodoStorage } from "@/app/api/todo";
import { useReminderChecker } from "@/hooks/use-reminder-checker";
import { ReminderToastManager } from "./reminder-toast";

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

	return (
		<>
			{children}
			<ReminderToastManager
				reminders={dueReminders}
				onDismiss={dismissReminder}
				enabled={enabled && !isLoading}
			/>
		</>
	);
}
