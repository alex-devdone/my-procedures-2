"use client";

import { AlertCircle, Calendar, Repeat } from "lucide-react";
import { useMemo } from "react";

import type { RecurringPattern } from "@/app/api/todo/todo.types";
import { cn } from "@/lib/utils";
import { formatRecurringPattern } from "./recurring-picker";

export interface DueDateBadgeProps {
	/** Due date as ISO string or Date */
	dueDate?: string | Date | null;
	/** Recurring pattern if this is a recurring todo */
	recurringPattern?: RecurringPattern | null;
	/** Whether the parent todo is completed */
	isCompleted?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Checks if a date is in the past (overdue).
 * Compares only the date portion, ignoring time.
 */
export function isOverdue(
	dueDate: Date | string,
	isCompleted = false,
): boolean {
	if (isCompleted) return false;

	const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
	const today = new Date();

	// Set both dates to start of day for comparison
	const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
	const todayDay = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
	);

	return dueDay < todayDay;
}

/**
 * Checks if a date is today.
 */
export function isToday(date: Date | string): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	const today = new Date();
	return (
		d.getFullYear() === today.getFullYear() &&
		d.getMonth() === today.getMonth() &&
		d.getDate() === today.getDate()
	);
}

/**
 * Checks if a date is tomorrow.
 */
export function isTomorrow(date: Date | string): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return (
		d.getFullYear() === tomorrow.getFullYear() &&
		d.getMonth() === tomorrow.getMonth() &&
		d.getDate() === tomorrow.getDate()
	);
}

/**
 * Formats a due date for display.
 * Returns "Today", "Tomorrow", "Yesterday", or a formatted date string.
 */
export function formatDueDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	if (isToday(d)) return "Today";
	if (isTomorrow(d)) return "Tomorrow";

	// Check for yesterday
	if (
		d.getFullYear() === yesterday.getFullYear() &&
		d.getMonth() === yesterday.getMonth() &&
		d.getDate() === yesterday.getDate()
	) {
		return "Yesterday";
	}

	// Check if it's within this week (next 7 days from today)
	const weekFromNow = new Date();
	weekFromNow.setDate(weekFromNow.getDate() + 7);
	if (d > today && d < weekFromNow) {
		return d.toLocaleDateString("en-US", { weekday: "short" });
	}

	// Default format for other dates
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

/**
 * A compact badge showing the due date and/or recurring pattern.
 *
 * Features:
 * - Shows overdue styling (red) for past due dates on incomplete todos
 * - Shows "Today" styling (accent) for todos due today
 * - Shows recurring icon for recurring patterns
 * - Compact display with calendar icon
 */
export function DueDateBadge({
	dueDate,
	recurringPattern,
	isCompleted = false,
	className,
}: DueDateBadgeProps) {
	const dueDateObj = useMemo(() => {
		if (!dueDate) return null;
		return typeof dueDate === "string" ? new Date(dueDate) : dueDate;
	}, [dueDate]);

	const overdue = useMemo(() => {
		if (!dueDateObj) return false;
		return isOverdue(dueDateObj, isCompleted);
	}, [dueDateObj, isCompleted]);

	const today = useMemo(() => {
		if (!dueDateObj) return false;
		return isToday(dueDateObj);
	}, [dueDateObj]);

	const formattedDate = useMemo(() => {
		if (!dueDateObj) return null;
		return formatDueDate(dueDateObj);
	}, [dueDateObj]);

	const formattedRecurring = useMemo(() => {
		if (!recurringPattern) return null;
		return formatRecurringPattern(recurringPattern);
	}, [recurringPattern]);

	// Return null if there's no date and no recurring pattern
	if (!dueDate && !recurringPattern) {
		return null;
	}

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
				// Default styling
				"bg-muted text-muted-foreground",
				// Overdue styling - red
				overdue && "bg-red-500/10 text-red-600 dark:text-red-400",
				// Today styling - accent
				today && !overdue && "bg-accent/10 text-accent",
				// Completed styling - muted
				isCompleted && "bg-muted/50 text-muted-foreground/70",
				className,
			)}
			data-testid="due-date-badge"
			data-overdue={overdue || undefined}
			data-today={today || undefined}
		>
			{/* Icon: Alert for overdue, Calendar for normal, Repeat for recurring-only */}
			{overdue ? (
				<AlertCircle
					className="h-3 w-3"
					aria-hidden="true"
					data-testid="overdue-icon"
				/>
			) : recurringPattern && !dueDate ? (
				<Repeat
					className="h-3 w-3"
					aria-hidden="true"
					data-testid="recurring-icon"
				/>
			) : (
				<Calendar
					className="h-3 w-3"
					aria-hidden="true"
					data-testid="calendar-icon"
				/>
			)}

			{/* Date text */}
			{formattedDate && (
				<span data-testid="due-date-text">{formattedDate}</span>
			)}

			{/* Recurring indicator (if both date and recurring) */}
			{recurringPattern && dueDate && (
				<Repeat
					className="h-2.5 w-2.5"
					aria-hidden="true"
					data-testid="recurring-indicator"
				/>
			)}

			{/* Recurring text (if only recurring, no date) */}
			{formattedRecurring && !dueDate && (
				<span data-testid="recurring-text">{formattedRecurring}</span>
			)}
		</span>
	);
}
