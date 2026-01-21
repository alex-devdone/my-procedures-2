"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Todo } from "@/app/api/todo";
import { useNotifications } from "./use-notifications";

// ============================================================================
// Types
// ============================================================================

/**
 * A reminder that is due to be shown
 */
export interface DueReminder {
	todoId: number | string;
	todoText: string;
	reminderAt: string;
	dueDate: string | null;
}

/**
 * Configuration options for the reminder checker
 */
export interface ReminderCheckerOptions {
	/** Interval in milliseconds to check for due reminders (default: 30000 = 30 seconds) */
	checkInterval?: number;
	/** Tolerance in milliseconds for considering a reminder "due" (default: 60000 = 1 minute) */
	tolerance?: number;
	/** Whether the checker is enabled (default: true) */
	enabled?: boolean;
}

/**
 * Return type for the useReminderChecker hook
 */
export interface UseReminderCheckerReturn {
	/** Currently due reminders that haven't been dismissed */
	dueReminders: DueReminder[];
	/** Dismiss a specific reminder */
	dismissReminder: (todoId: number | string) => void;
	/** Dismiss all reminders */
	dismissAllReminders: () => void;
	/** Number of reminders shown in this session */
	shownCount: number;
	/** Whether the checker is currently active */
	isChecking: boolean;
}

/**
 * Callback function type for when a reminder is triggered
 */
export type OnReminderCallback = (reminder: DueReminder) => void;

// ============================================================================
// Constants
// ============================================================================

/** Default interval for checking reminders (30 seconds) */
export const DEFAULT_CHECK_INTERVAL = 30000;

/** Default tolerance for considering a reminder due (1 minute) */
export const DEFAULT_TOLERANCE = 60000;

/** Storage key for tracking shown reminder IDs */
export const SHOWN_REMINDERS_STORAGE_KEY = "flowdo_shown_reminders";

// ============================================================================
// Pure Functions (for testing)
// ============================================================================

/**
 * Check if a reminder is currently due based on the current time.
 * A reminder is due if reminderAt time has passed and is within tolerance window.
 *
 * @param reminderAt - ISO datetime string of when the reminder should trigger
 * @param currentTime - Current time to compare against
 * @param tolerance - Window in milliseconds to consider a reminder "due"
 * @returns true if the reminder is due
 */
export function isReminderDue(
	reminderAt: string,
	currentTime: Date,
	tolerance: number = DEFAULT_TOLERANCE,
): boolean {
	const reminderTime = new Date(reminderAt).getTime();
	const currentMs = currentTime.getTime();

	// Reminder is due if:
	// 1. Reminder time has passed (reminderTime <= currentMs)
	// 2. Reminder time is within tolerance window (currentMs - reminderTime <= tolerance)
	return reminderTime <= currentMs && currentMs - reminderTime <= tolerance;
}

/**
 * Filter todos to get only those with due reminders.
 *
 * @param todos - Array of todos to check
 * @param currentTime - Current time to compare against
 * @param shownIds - Set of todo IDs that have already been shown
 * @param tolerance - Window in milliseconds to consider a reminder "due"
 * @returns Array of due reminders
 */
export function getDueReminders(
	todos: Todo[],
	currentTime: Date,
	shownIds: Set<string>,
	tolerance: number = DEFAULT_TOLERANCE,
): DueReminder[] {
	return todos
		.filter((todo) => {
			// Must have a reminder set
			if (!todo.reminderAt) return false;

			// Must not be completed
			if (todo.completed) return false;

			// Must not have been shown already
			const todoIdStr = String(todo.id);
			if (shownIds.has(todoIdStr)) return false;

			// Must be due
			return isReminderDue(todo.reminderAt, currentTime, tolerance);
		})
		.map((todo) => ({
			todoId: todo.id,
			todoText: todo.text,
			reminderAt: todo.reminderAt as string,
			dueDate: todo.dueDate ?? null,
		}));
}

/**
 * Get shown reminder IDs from storage.
 *
 * @param storage - Storage object (localStorage) or null for SSR
 * @returns Set of shown reminder IDs
 */
export function getShownRemindersFromStorage(
	storage: Storage | null,
): Set<string> {
	if (!storage) return new Set();

	try {
		const stored = storage.getItem(SHOWN_REMINDERS_STORAGE_KEY);
		if (!stored) return new Set();

		const parsed = JSON.parse(stored);
		if (!Array.isArray(parsed)) return new Set();

		return new Set(parsed.filter((id): id is string => typeof id === "string"));
	} catch {
		return new Set();
	}
}

/**
 * Save shown reminder IDs to storage.
 *
 * @param storage - Storage object (localStorage) or null for SSR
 * @param shownIds - Set of shown reminder IDs to save
 */
export function saveShownRemindersToStorage(
	storage: Storage | null,
	shownIds: Set<string>,
): void {
	if (!storage) return;

	try {
		storage.setItem(
			SHOWN_REMINDERS_STORAGE_KEY,
			JSON.stringify(Array.from(shownIds)),
		);
	} catch {
		// Ignore storage errors (e.g., quota exceeded)
	}
}

/**
 * Add a reminder ID to the shown set and save to storage.
 *
 * @param storage - Storage object (localStorage) or null for SSR
 * @param shownIds - Current set of shown IDs
 * @param todoId - Todo ID to add
 * @returns New set with the added ID
 */
export function markReminderAsShown(
	storage: Storage | null,
	shownIds: Set<string>,
	todoId: number | string,
): Set<string> {
	const todoIdStr = String(todoId);
	const newShownIds = new Set(shownIds);
	newShownIds.add(todoIdStr);
	saveShownRemindersToStorage(storage, newShownIds);
	return newShownIds;
}

/**
 * Format a reminder notification body.
 *
 * @param reminder - The due reminder
 * @returns Formatted notification body string
 */
export function formatReminderNotificationBody(reminder: DueReminder): string {
	if (reminder.dueDate) {
		const dueDate = new Date(reminder.dueDate);
		const now = new Date();

		if (dueDate < now) {
			return "This task is overdue!";
		}

		const diffMs = dueDate.getTime() - now.getTime();
		const diffHours = Math.round(diffMs / (1000 * 60 * 60));

		if (diffHours < 1) {
			return "Due in less than an hour";
		}
		if (diffHours === 1) {
			return "Due in 1 hour";
		}
		if (diffHours < 24) {
			return `Due in ${diffHours} hours`;
		}

		const diffDays = Math.round(diffHours / 24);
		if (diffDays === 1) {
			return "Due tomorrow";
		}
		return `Due in ${diffDays} days`;
	}

	return "Reminder for your task";
}

/**
 * Clean up old shown reminders from storage.
 * Removes IDs for reminders that are no longer relevant (todo completed or deleted).
 *
 * @param storage - Storage object (localStorage) or null for SSR
 * @param todos - Current list of todos
 * @param shownIds - Current set of shown IDs
 * @returns Cleaned set of shown IDs
 */
export function cleanupShownReminders(
	storage: Storage | null,
	todos: Todo[],
	shownIds: Set<string>,
): Set<string> {
	const todoIds = new Set(todos.map((t) => String(t.id)));
	const cleanedIds = new Set<string>();

	for (const shownId of shownIds) {
		// Keep the ID if the todo still exists and is not completed
		const todo = todos.find((t) => String(t.id) === shownId);
		if (todo && !todo.completed && todoIds.has(shownId)) {
			cleanedIds.add(shownId);
		}
	}

	if (cleanedIds.size !== shownIds.size) {
		saveShownRemindersToStorage(storage, cleanedIds);
	}

	return cleanedIds;
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook for checking and triggering reminders for todos.
 *
 * Features:
 * - Polls todos for due reminders at configurable interval
 * - Shows browser notifications when reminders are due
 * - Tracks shown reminders to avoid duplicates
 * - Supports dismissing individual or all reminders
 * - Works with both local (guest) and remote (authenticated) todos
 *
 * @param todos - Array of todos to monitor for reminders
 * @param options - Configuration options
 * @param onReminder - Optional callback when a reminder is triggered
 *
 * @example
 * ```tsx
 * const { dueReminders, dismissReminder } = useReminderChecker(todos, {
 *   checkInterval: 30000,
 *   onReminder: (reminder) => toast.info(`Reminder: ${reminder.todoText}`)
 * });
 *
 * return (
 *   <div>
 *     {dueReminders.map(r => (
 *       <div key={String(r.todoId)}>
 *         {r.todoText}
 *         <button onClick={() => dismissReminder(r.todoId)}>Dismiss</button>
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useReminderChecker(
	todos: Todo[],
	options: ReminderCheckerOptions = {},
	onReminder?: OnReminderCallback,
): UseReminderCheckerReturn {
	const {
		checkInterval = DEFAULT_CHECK_INTERVAL,
		tolerance = DEFAULT_TOLERANCE,
		enabled = true,
	} = options;

	const { permission, showNotification } = useNotifications();

	const [dueReminders, setDueReminders] = useState<DueReminder[]>([]);
	const [shownCount, setShownCount] = useState(0);
	const [isChecking, setIsChecking] = useState(false);

	// Use refs for mutable state that doesn't need to trigger re-renders
	const shownIdsRef = useRef<Set<string>>(new Set());
	const onReminderRef = useRef(onReminder);

	// Keep callback ref up to date
	useEffect(() => {
		onReminderRef.current = onReminder;
	}, [onReminder]);

	// Load shown IDs from storage on mount
	useEffect(() => {
		const storage = typeof window !== "undefined" ? localStorage : null;
		shownIdsRef.current = getShownRemindersFromStorage(storage);
	}, []);

	// Check for due reminders
	const checkReminders = useCallback(() => {
		if (!enabled) return;

		setIsChecking(true);

		const storage = typeof window !== "undefined" ? localStorage : null;
		const currentTime = new Date();

		// Clean up old shown reminders
		shownIdsRef.current = cleanupShownReminders(
			storage,
			todos,
			shownIdsRef.current,
		);

		// Get newly due reminders
		const newlyDue = getDueReminders(
			todos,
			currentTime,
			shownIdsRef.current,
			tolerance,
		);

		// Process each new reminder
		for (const reminder of newlyDue) {
			// Mark as shown
			shownIdsRef.current = markReminderAsShown(
				storage,
				shownIdsRef.current,
				reminder.todoId,
			);

			// Show browser notification if permission granted
			if (permission === "granted") {
				showNotification(reminder.todoText, {
					body: formatReminderNotificationBody(reminder),
					tag: `reminder-${reminder.todoId}`,
					data: { todoId: reminder.todoId },
				});
			}

			// Call onReminder callback
			if (onReminderRef.current) {
				onReminderRef.current(reminder);
			}

			// Update shown count
			setShownCount((c) => c + 1);
		}

		// Update due reminders state
		// Include previously due reminders that haven't been dismissed
		setDueReminders((prev) => {
			const existingIds = new Set(newlyDue.map((r) => String(r.todoId)));
			const stillRelevant = prev.filter((r) => {
				// Keep if not in newly due (already shown) and todo still exists with reminder
				const todo = todos.find((t) => t.id === r.todoId);
				return (
					!existingIds.has(String(r.todoId)) &&
					todo &&
					!todo.completed &&
					todo.reminderAt
				);
			});
			return [...stillRelevant, ...newlyDue];
		});

		setIsChecking(false);
	}, [enabled, todos, tolerance, permission, showNotification]);

	// Set up polling interval
	useEffect(() => {
		if (!enabled) {
			setDueReminders([]);
			return;
		}

		// Run immediately on mount/enable
		checkReminders();

		// Then run at interval
		const interval = setInterval(checkReminders, checkInterval);

		return () => clearInterval(interval);
	}, [enabled, checkInterval, checkReminders]);

	// Dismiss a specific reminder
	const dismissReminder = useCallback((todoId: number | string) => {
		setDueReminders((prev) => prev.filter((r) => r.todoId !== todoId));
	}, []);

	// Dismiss all reminders
	const dismissAllReminders = useCallback(() => {
		setDueReminders([]);
	}, []);

	return {
		dueReminders,
		dismissReminder,
		dismissAllReminders,
		shownCount,
		isChecking,
	};
}
