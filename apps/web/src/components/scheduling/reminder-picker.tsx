"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Bell, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Represents a reminder offset from a due date.
 * Offset is in minutes (negative means before due date).
 */
export type ReminderOffset = {
	label: string;
	/** Offset in minutes. 0 = at time, -15 = 15 min before, -60 = 1 hour before, etc. */
	offsetMinutes: number;
};

export const DEFAULT_REMINDER_OFFSETS: ReminderOffset[] = [
	{ label: "At time", offsetMinutes: 0 },
	{ label: "15 min before", offsetMinutes: -15 },
	{ label: "30 min before", offsetMinutes: -30 },
	{ label: "1 hour before", offsetMinutes: -60 },
	{ label: "2 hours before", offsetMinutes: -120 },
	{ label: "1 day before", offsetMinutes: -1440 },
];

export interface ReminderPickerProps {
	/** The reminder date/time. If null, no reminder is set. */
	value: Date | null;
	/** The due date that the reminder is relative to. Required to calculate offsets. */
	dueDate: Date | null;
	/** Called when the reminder value changes. */
	onChange: (reminderAt: Date | null) => void;
	/** Available reminder offsets. Defaults to DEFAULT_REMINDER_OFFSETS. */
	offsets?: ReminderOffset[];
	/** Placeholder text when no reminder is set. */
	placeholder?: string;
	/** Whether the picker is disabled. */
	disabled?: boolean;
	/** Whether the value can be cleared. */
	clearable?: boolean;
	/** Additional CSS classes for the container. */
	className?: string;
}

/**
 * Calculates the reminder date from a due date and offset in minutes.
 */
export function calculateReminderDate(
	dueDate: Date,
	offsetMinutes: number,
): Date {
	const reminder = new Date(dueDate);
	reminder.setMinutes(reminder.getMinutes() + offsetMinutes);
	return reminder;
}

/**
 * Calculates the offset in minutes between a reminder and due date.
 * Returns null if either date is null.
 */
export function calculateOffsetMinutes(
	reminderAt: Date | null,
	dueDate: Date | null,
): number | null {
	if (!reminderAt || !dueDate) return null;
	const diffMs = reminderAt.getTime() - dueDate.getTime();
	return Math.round(diffMs / (1000 * 60));
}

/**
 * Formats a reminder offset for display.
 * Returns a human-readable string like "15 min before" or "At time".
 */
export function formatReminderOffset(offsetMinutes: number): string {
	if (offsetMinutes === 0) return "At time";
	if (offsetMinutes > 0) {
		if (offsetMinutes < 60) return `${offsetMinutes} min after`;
		if (offsetMinutes < 1440) {
			const hours = Math.round(offsetMinutes / 60);
			return `${hours} hour${hours >= 2 ? "s" : ""} after`;
		}
		const days = Math.round(offsetMinutes / 1440);
		return `${days} day${days >= 2 ? "s" : ""} after`;
	}
	const absOffset = Math.abs(offsetMinutes);
	if (absOffset < 60) return `${absOffset} min before`;
	if (absOffset < 1440) {
		const hours = Math.round(absOffset / 60);
		return `${hours} hour${hours >= 2 ? "s" : ""} before`;
	}
	const days = Math.round(absOffset / 1440);
	return `${days} day${days >= 2 ? "s" : ""} before`;
}

/**
 * Formats a reminder time for display in the trigger.
 */
export function formatReminderTime(
	reminderAt: Date | null,
	dueDate: Date | null,
): string | null {
	if (!reminderAt) return null;

	const offset = calculateOffsetMinutes(reminderAt, dueDate);
	if (offset !== null) {
		// Try to find a matching preset label
		const preset = DEFAULT_REMINDER_OFFSETS.find(
			(p) => p.offsetMinutes === offset,
		);
		if (preset) return preset.label;
		// Format the offset
		return formatReminderOffset(offset);
	}

	// No due date, show the absolute time
	return reminderAt.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

/**
 * Finds the closest matching offset from available offsets.
 */
export function findClosestOffset(
	offsetMinutes: number,
	offsets: ReminderOffset[],
): ReminderOffset | null {
	if (offsets.length === 0) return null;

	let closest = offsets[0];
	let minDiff = Math.abs(closest.offsetMinutes - offsetMinutes);

	for (const offset of offsets) {
		const diff = Math.abs(offset.offsetMinutes - offsetMinutes);
		if (diff < minDiff) {
			minDiff = diff;
			closest = offset;
		}
	}

	return closest;
}

export function ReminderPicker({
	value,
	dueDate,
	onChange,
	offsets = DEFAULT_REMINDER_OFFSETS,
	placeholder = "Set reminder",
	disabled = false,
	clearable = true,
	className,
}: ReminderPickerProps) {
	const [open, setOpen] = useState(false);

	const handleSelectOffset = useCallback(
		(offset: ReminderOffset) => {
			if (!dueDate) {
				// If no due date, we can't calculate the reminder time
				// Close the popover without changing the value
				setOpen(false);
				return;
			}
			const reminderAt = calculateReminderDate(dueDate, offset.offsetMinutes);
			onChange(reminderAt);
			setOpen(false);
		},
		[dueDate, onChange],
	);

	const handleClear = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onChange(null);
		},
		[onChange],
	);

	const displayValue = useMemo(() => {
		return formatReminderTime(value, dueDate);
	}, [value, dueDate]);

	const currentOffset = useMemo(() => {
		return calculateOffsetMinutes(value, dueDate);
	}, [value, dueDate]);

	const handleOpenChange = useCallback((isOpen: boolean) => {
		setOpen(isOpen);
	}, []);

	const isDisabledWithoutDueDate = disabled || !dueDate;

	return (
		<div
			className={cn("inline-flex items-center gap-0.5", className)}
			data-testid="reminder-picker-container"
		>
			<PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
				<PopoverPrimitive.Trigger
					disabled={isDisabledWithoutDueDate}
					data-testid="reminder-picker-trigger"
					className={cn(
						"inline-flex h-8 items-center gap-1.5 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none transition-colors",
						"hover:bg-accent hover:text-accent-foreground",
						"focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
						"disabled:pointer-events-none disabled:opacity-50",
						value && "text-foreground",
						!value && "text-muted-foreground",
					)}
					aria-label={value ? `Reminder: ${displayValue}` : placeholder}
				>
					<Bell className="h-3.5 w-3.5" aria-hidden="true" />
					<span>{displayValue ?? placeholder}</span>
				</PopoverPrimitive.Trigger>

				<PopoverPrimitive.Portal>
					<PopoverPrimitive.Positioner
						side="bottom"
						sideOffset={4}
						align="start"
						className="z-50"
					>
						<PopoverPrimitive.Popup
							data-testid="reminder-picker-popover"
							className={cn(
								"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95",
								"w-auto min-w-[180px] rounded-none border border-border bg-popover p-2 text-popover-foreground shadow-md outline-none",
								"duration-100 data-closed:animate-out data-open:animate-in",
							)}
						>
							{/* Due date required message */}
							{!dueDate && (
								<div
									className="px-2 py-1.5 text-muted-foreground text-xs"
									data-testid="reminder-picker-no-due-date"
								>
									Set a due date first
								</div>
							)}

							{/* Offset options */}
							{dueDate && offsets.length > 0 && (
								<div
									className="flex flex-col gap-0.5"
									data-testid="reminder-picker-offsets"
								>
									{offsets.map((offset) => {
										const isSelected = currentOffset === offset.offsetMinutes;
										return (
											<button
												key={offset.offsetMinutes}
												type="button"
												onClick={() => handleSelectOffset(offset)}
												data-testid={`reminder-picker-offset-${offset.offsetMinutes}`}
												data-selected={isSelected || undefined}
												className={cn(
													"flex w-full items-center gap-2 rounded-none px-2 py-1.5 text-left text-xs transition-colors",
													"hover:bg-accent hover:text-accent-foreground",
													"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
													isSelected && "bg-accent text-accent-foreground",
												)}
												aria-pressed={isSelected || undefined}
											>
												<Bell
													className={cn(
														"h-3 w-3",
														isSelected
															? "text-accent-foreground"
															: "text-muted-foreground",
													)}
													aria-hidden="true"
												/>
												<span>{offset.label}</span>
											</button>
										);
									})}
								</div>
							)}

							{/* Empty state when no offsets provided */}
							{dueDate && offsets.length === 0 && (
								<div
									className="px-2 py-1.5 text-muted-foreground text-xs"
									data-testid="reminder-picker-no-offsets"
								>
									No reminder options available
								</div>
							)}
						</PopoverPrimitive.Popup>
					</PopoverPrimitive.Positioner>
				</PopoverPrimitive.Portal>
			</PopoverPrimitive.Root>

			{value && clearable && !disabled && (
				<button
					type="button"
					onClick={handleClear}
					className="inline-flex h-8 w-8 items-center justify-center rounded-none opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					data-testid="reminder-picker-clear"
					aria-label="Clear reminder"
				>
					<X className="h-3 w-3" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}

export {
	calculateReminderDate as getReminderDate,
	calculateOffsetMinutes as getOffsetMinutes,
};
