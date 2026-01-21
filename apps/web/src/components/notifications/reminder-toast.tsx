"use client";

import { Bell, Calendar, CheckCircle2, Clock, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import type { DueReminder } from "@/hooks/use-reminder-checker";
import { formatReminderNotificationBody } from "@/hooks/use-reminder-checker";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for individual ReminderToast content
 */
export interface ReminderToastContentProps {
	/** The reminder to display */
	reminder: DueReminder;
	/** Callback when dismiss button is clicked */
	onDismiss?: () => void;
	/** Callback when the toast is clicked (navigate to todo) */
	onClick?: () => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Props for the ReminderToastManager component
 */
export interface ReminderToastManagerProps {
	/** Array of due reminders to show */
	reminders: DueReminder[];
	/** Callback when a reminder is dismissed */
	onDismiss?: (todoId: number | string) => void;
	/** Callback when a reminder toast is clicked */
	onReminderClick?: (reminder: DueReminder) => void;
	/** Whether the manager is enabled */
	enabled?: boolean;
}

/**
 * Return type for useReminderToast hook
 */
export interface UseReminderToastReturn {
	/** Show a reminder toast */
	showReminderToast: (reminder: DueReminder) => string | number;
	/** Dismiss a reminder toast by toast ID */
	dismissToast: (toastId: string | number) => void;
	/** Dismiss all reminder toasts */
	dismissAllToasts: () => void;
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Formats the reminder time for display.
 * Shows relative time like "Due in 15 min" or "Overdue by 1 hour"
 */
export function formatReminderTime(reminder: DueReminder): string {
	return formatReminderNotificationBody(reminder);
}

/**
 * Determines if a reminder is overdue based on its due date.
 */
export function isReminderOverdue(reminder: DueReminder): boolean {
	if (!reminder.dueDate) return false;
	return new Date(reminder.dueDate) < new Date();
}

/**
 * Generates a unique toast ID for a reminder.
 */
export function getReminderToastId(todoId: number | string): string {
	return `reminder-toast-${todoId}`;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Content component for a reminder toast.
 * Displays the reminder with action buttons for dismiss and navigation.
 */
export function ReminderToastContent({
	reminder,
	onDismiss,
	onClick,
	className,
}: ReminderToastContentProps) {
	const isOverdue = isReminderOverdue(reminder);
	const timeInfo = formatReminderTime(reminder);

	return (
		<div
			className={cn("flex w-full items-start gap-3 rounded-lg p-1", className)}
			data-testid="reminder-toast-content"
		>
			{/* Icon */}
			<div
				className={cn(
					"flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
					isOverdue
						? "bg-red-500/10 text-red-600 dark:text-red-400"
						: "bg-accent/10 text-accent",
				)}
				data-testid="reminder-toast-icon"
			>
				{isOverdue ? (
					<Clock className="h-4 w-4" aria-hidden="true" />
				) : (
					<Bell className="h-4 w-4" aria-hidden="true" />
				)}
			</div>

			{/* Content */}
			<div className="min-w-0 flex-1">
				{/* Todo text */}
				<p
					className="truncate font-medium text-foreground text-sm"
					data-testid="reminder-toast-title"
				>
					{reminder.todoText}
				</p>

				{/* Time info */}
				<p
					className={cn(
						"text-xs",
						isOverdue
							? "text-red-600 dark:text-red-400"
							: "text-muted-foreground",
					)}
					data-testid="reminder-toast-body"
				>
					{timeInfo}
				</p>

				{/* Due date if available */}
				{reminder.dueDate && (
					<div
						className="mt-1 flex items-center gap-1 text-muted-foreground text-xs"
						data-testid="reminder-toast-due-date"
					>
						<Calendar className="h-3 w-3" aria-hidden="true" />
						<span>
							{new Date(reminder.dueDate).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
								hour: "numeric",
								minute: "2-digit",
							})}
						</span>
					</div>
				)}
			</div>

			{/* Action buttons */}
			<div className="flex flex-shrink-0 items-center gap-1">
				{/* View/Navigate button */}
				{onClick && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onClick();
						}}
						className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label="View todo"
						data-testid="reminder-toast-view-button"
					>
						<CheckCircle2 className="h-4 w-4" />
					</button>
				)}

				{/* Dismiss button */}
				{onDismiss && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDismiss();
						}}
						className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label="Dismiss reminder"
						data-testid="reminder-toast-dismiss-button"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for showing reminder toasts using sonner.
 *
 * @param onDismiss - Callback when a reminder is dismissed
 * @param onReminderClick - Callback when a reminder is clicked
 * @returns Functions to show and dismiss reminder toasts
 *
 * @example
 * ```tsx
 * const { showReminderToast, dismissToast } = useReminderToast({
 *   onDismiss: (todoId) => console.log('Dismissed:', todoId),
 *   onReminderClick: (reminder) => navigateTo(reminder.todoId),
 * });
 *
 * // Show a toast for a reminder
 * showReminderToast(dueReminder);
 * ```
 */
export function useReminderToast(options?: {
	onDismiss?: (todoId: number | string) => void;
	onReminderClick?: (reminder: DueReminder) => void;
}): UseReminderToastReturn {
	const { onDismiss, onReminderClick } = options ?? {};

	// Track active toast IDs to avoid duplicates
	const activeToastsRef = useRef<Set<string>>(new Set());

	const showReminderToast = useCallback(
		(reminder: DueReminder): string | number => {
			const toastId = getReminderToastId(reminder.todoId);

			// Don't show duplicate toasts
			if (activeToastsRef.current.has(toastId)) {
				return toastId;
			}

			activeToastsRef.current.add(toastId);

			const handleDismiss = () => {
				toast.dismiss(toastId);
				activeToastsRef.current.delete(toastId);
				onDismiss?.(reminder.todoId);
			};

			const handleClick = () => {
				toast.dismiss(toastId);
				activeToastsRef.current.delete(toastId);
				onReminderClick?.(reminder);
			};

			return toast.custom(
				() => (
					<ReminderToastContent
						reminder={reminder}
						onDismiss={handleDismiss}
						onClick={onReminderClick ? handleClick : undefined}
					/>
				),
				{
					id: toastId,
					duration: Number.POSITIVE_INFINITY, // Don't auto-dismiss reminders
					onDismiss: () => {
						activeToastsRef.current.delete(toastId);
					},
				},
			);
		},
		[onDismiss, onReminderClick],
	);

	const dismissToast = useCallback((toastId: string | number) => {
		toast.dismiss(toastId);
		activeToastsRef.current.delete(String(toastId));
	}, []);

	const dismissAllToasts = useCallback(() => {
		for (const id of activeToastsRef.current) {
			toast.dismiss(id);
		}
		activeToastsRef.current.clear();
	}, []);

	return {
		showReminderToast,
		dismissToast,
		dismissAllToasts,
	};
}

/**
 * Component that manages showing reminder toasts for an array of reminders.
 * Integrates with useReminderChecker to display in-app notifications.
 *
 * @example
 * ```tsx
 * const { dueReminders, dismissReminder } = useReminderChecker(todos);
 *
 * return (
 *   <ReminderToastManager
 *     reminders={dueReminders}
 *     onDismiss={dismissReminder}
 *     onReminderClick={(r) => scrollToTodo(r.todoId)}
 *   />
 * );
 * ```
 */
export function ReminderToastManager({
	reminders,
	onDismiss,
	onReminderClick,
	enabled = true,
}: ReminderToastManagerProps) {
	const { showReminderToast } = useReminderToast({
		onDismiss,
		onReminderClick,
	});

	// Track which reminders we've shown toasts for
	const shownRemindersRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!enabled) return;

		// Show toasts for any new reminders
		for (const reminder of reminders) {
			const reminderId = String(reminder.todoId);

			if (!shownRemindersRef.current.has(reminderId)) {
				shownRemindersRef.current.add(reminderId);
				showReminderToast(reminder);
			}
		}

		// Clean up tracking for reminders that are no longer in the list
		const currentIds = new Set(reminders.map((r) => String(r.todoId)));
		for (const id of shownRemindersRef.current) {
			if (!currentIds.has(id)) {
				shownRemindersRef.current.delete(id);
			}
		}
	}, [enabled, reminders, showReminderToast]);

	// This component doesn't render anything - toasts are rendered by Sonner
	return null;
}
