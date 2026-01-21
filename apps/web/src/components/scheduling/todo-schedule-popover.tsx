"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Calendar, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import type { RecurringPattern } from "@/app/api/todo";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

import {
	DatePicker,
	type DatePreset,
	DEFAULT_DATE_PRESETS,
	formatDate,
} from "./date-picker";
import {
	DEFAULT_RECURRING_PRESETS,
	formatRecurringPattern,
	RecurringPicker,
	type RecurringPreset,
} from "./recurring-picker";
import {
	DEFAULT_REMINDER_OFFSETS,
	formatReminderTime,
	type ReminderOffset,
	ReminderPicker,
} from "./reminder-picker";

// ============================================================================
// Types
// ============================================================================

export interface ScheduleValue {
	dueDate: Date | null;
	reminderAt: Date | null;
	recurringPattern: RecurringPattern | null;
}

export interface TodoSchedulePopoverProps {
	/** The current schedule values. */
	value: ScheduleValue;
	/** Called when any schedule value changes. */
	onChange: (value: ScheduleValue) => void;
	/** Placeholder text when no scheduling is set. */
	placeholder?: string;
	/** Whether the picker is disabled. */
	disabled?: boolean;
	/** Whether the value can be cleared. */
	clearable?: boolean;
	/** Additional CSS classes for the container. */
	className?: string;
	/** Date picker presets. */
	datePresets?: DatePreset[];
	/** Reminder offset options. */
	reminderOffsets?: ReminderOffset[];
	/** Recurring pattern presets. */
	recurringPresets?: RecurringPreset[];
	/** Min date for due date selection. */
	minDate?: Date;
	/** Max date for due date selection. */
	maxDate?: Date;
	/** Render as a compact trigger (icon only). */
	compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats the combined schedule for display in the trigger.
 */
export function formatScheduleValue(value: ScheduleValue): string | null {
	const parts: string[] = [];

	if (value.dueDate) {
		parts.push(formatDate(value.dueDate));
	}

	if (value.recurringPattern) {
		parts.push(formatRecurringPattern(value.recurringPattern));
	}

	if (parts.length === 0) return null;
	return parts.join(" · ");
}

/**
 * Checks if any schedule value is set.
 */
export function hasSchedule(value: ScheduleValue): boolean {
	return (
		value.dueDate !== null ||
		value.reminderAt !== null ||
		value.recurringPattern !== null
	);
}

/**
 * Creates an empty schedule value.
 */
export function emptyScheduleValue(): ScheduleValue {
	return {
		dueDate: null,
		reminderAt: null,
		recurringPattern: null,
	};
}

// ============================================================================
// Main Component
// ============================================================================

export function TodoSchedulePopover({
	value,
	onChange,
	placeholder = "Schedule",
	disabled = false,
	clearable = true,
	className,
	datePresets = DEFAULT_DATE_PRESETS,
	reminderOffsets = DEFAULT_REMINDER_OFFSETS,
	recurringPresets = DEFAULT_RECURRING_PRESETS,
	minDate,
	maxDate,
	compact = false,
}: TodoSchedulePopoverProps) {
	const [open, setOpen] = useState(false);
	const { permission, requestPermission } = useNotifications();

	const handleDueDateChange = useCallback(
		(dueDate: Date | null) => {
			// If clearing due date, also clear reminder (since it's relative to due date)
			if (!dueDate && value.reminderAt) {
				onChange({
					...value,
					dueDate: null,
					reminderAt: null,
				});
			} else {
				onChange({
					...value,
					dueDate,
				});
			}
		},
		[onChange, value],
	);

	const handleReminderChange = useCallback(
		(reminderAt: Date | null) => {
			// Request notification permission when setting a reminder
			if (reminderAt && permission === "default") {
				requestPermission();
			}
			onChange({
				...value,
				reminderAt,
			});
		},
		[onChange, value, permission, requestPermission],
	);

	const handleRecurringChange = useCallback(
		(recurringPattern: RecurringPattern | null) => {
			// Request notification permission when setting a recurring pattern with notifyAt
			if (recurringPattern?.notifyAt && permission === "default") {
				requestPermission();
			}
			onChange({
				...value,
				recurringPattern,
			});
		},
		[onChange, value, permission, requestPermission],
	);

	const handleClear = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onChange(emptyScheduleValue());
		},
		[onChange],
	);

	const handleClearAll = useCallback(() => {
		onChange(emptyScheduleValue());
		setOpen(false);
	}, [onChange]);

	const handleOpenChange = useCallback((isOpen: boolean) => {
		setOpen(isOpen);
	}, []);

	const displayValue = useMemo(() => {
		return formatScheduleValue(value);
	}, [value]);

	const hasAnySchedule = hasSchedule(value);

	const reminderDisplayValue = useMemo(() => {
		return formatReminderTime(value.reminderAt, value.dueDate);
	}, [value.reminderAt, value.dueDate]);

	return (
		<div
			className={cn("inline-flex items-center gap-0.5", className)}
			data-testid="todo-schedule-popover-container"
		>
			<PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
				<PopoverPrimitive.Trigger
					disabled={disabled}
					data-testid="todo-schedule-popover-trigger"
					className={cn(
						"inline-flex items-center gap-1.5 rounded-none border border-input bg-transparent text-xs outline-none transition-colors",
						"hover:bg-accent hover:text-accent-foreground",
						"focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
						"disabled:pointer-events-none disabled:opacity-50",
						compact ? "h-8 w-8 justify-center px-0" : "h-8 px-2.5",
						hasAnySchedule && "text-foreground",
						!hasAnySchedule && "text-muted-foreground",
					)}
					aria-label={
						hasAnySchedule ? `Schedule: ${displayValue}` : placeholder
					}
				>
					<Calendar className="h-3.5 w-3.5" aria-hidden="true" />
					{!compact && <span>{displayValue ?? placeholder}</span>}
				</PopoverPrimitive.Trigger>

				<PopoverPrimitive.Portal>
					<PopoverPrimitive.Positioner
						side="bottom"
						sideOffset={4}
						align="start"
						className="z-50"
					>
						<PopoverPrimitive.Popup
							data-testid="todo-schedule-popover"
							className={cn(
								"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95",
								"w-auto min-w-[320px] rounded-none border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none",
								"duration-100 data-closed:animate-out data-open:animate-in",
							)}
						>
							{/* Header */}
							<div
								className="mb-4 flex items-center justify-between"
								data-testid="todo-schedule-popover-header"
							>
								<h3 className="font-medium text-sm">Schedule</h3>
								{hasAnySchedule && (
									<Button
										variant="ghost"
										size="xs"
										onClick={handleClearAll}
										data-testid="todo-schedule-popover-clear-all"
									>
										Clear all
									</Button>
								)}
							</div>

							{/* Schedule Sections */}
							<div className="space-y-4">
								{/* Due Date Section */}
								<div
									className="space-y-1.5"
									data-testid="todo-schedule-popover-due-date-section"
								>
									<span className="block text-muted-foreground text-xs">
										Due date
									</span>
									<DatePicker
										value={value.dueDate}
										onChange={handleDueDateChange}
										presets={datePresets}
										placeholder="Set due date"
										minDate={minDate}
										maxDate={maxDate}
										clearable
										className="w-full"
									/>
								</div>

								{/* Reminder Section */}
								<div
									className="space-y-1.5"
									data-testid="todo-schedule-popover-reminder-section"
								>
									<span className="block text-muted-foreground text-xs">
										Reminder
									</span>
									<ReminderPicker
										value={value.reminderAt}
										dueDate={value.dueDate}
										onChange={handleReminderChange}
										offsets={reminderOffsets}
										placeholder="Set reminder"
										clearable
										className="w-full"
									/>
									{!value.dueDate && value.reminderAt === null && (
										<p
											className="text-muted-foreground text-xs"
											data-testid="todo-schedule-popover-reminder-hint"
										>
											Set a due date first to add a reminder
										</p>
									)}
								</div>

								{/* Recurring Section */}
								<div
									className="space-y-1.5"
									data-testid="todo-schedule-popover-recurring-section"
								>
									<span className="block text-muted-foreground text-xs">
										Repeat
									</span>
									<RecurringPicker
										value={value.recurringPattern}
										onChange={handleRecurringChange}
										presets={recurringPresets}
										placeholder="Set recurrence"
										clearable
										className="w-full"
									/>
								</div>
							</div>

							{/* Summary (when has schedule) */}
							{hasAnySchedule && (
								<div
									className="mt-4 rounded-none border border-border bg-muted/50 p-2"
									data-testid="todo-schedule-popover-summary"
								>
									<p className="text-muted-foreground text-xs">
										{value.dueDate && (
											<span data-testid="todo-schedule-popover-summary-due">
												Due: {formatDate(value.dueDate)}
											</span>
										)}
										{value.dueDate && value.reminderAt && (
											<span className="mx-1">·</span>
										)}
										{value.reminderAt && (
											<span data-testid="todo-schedule-popover-summary-reminder">
												Reminder: {reminderDisplayValue}
											</span>
										)}
										{(value.dueDate || value.reminderAt) &&
											value.recurringPattern && <span className="mx-1">·</span>}
										{value.recurringPattern && (
											<span data-testid="todo-schedule-popover-summary-recurring">
												{formatRecurringPattern(value.recurringPattern)}
											</span>
										)}
									</p>
								</div>
							)}
						</PopoverPrimitive.Popup>
					</PopoverPrimitive.Positioner>
				</PopoverPrimitive.Portal>
			</PopoverPrimitive.Root>

			{hasAnySchedule && clearable && !disabled && !compact && (
				<button
					type="button"
					onClick={handleClear}
					className="inline-flex h-8 w-8 items-center justify-center rounded-none opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					data-testid="todo-schedule-popover-clear"
					aria-label="Clear schedule"
				>
					<X className="h-3 w-3" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}

// Re-export types for convenience
export type { DatePreset, ReminderOffset, RecurringPreset };
