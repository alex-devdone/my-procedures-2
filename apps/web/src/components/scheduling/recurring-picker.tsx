"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Check, ChevronDown, Repeat, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { RecurringPattern, RecurringPatternType } from "@/app/api/todo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTimeDisplay, TimePicker } from "./time-picker";

// ============================================================================
// Types
// ============================================================================

export interface RecurringPreset {
	label: string;
	pattern: RecurringPattern;
}

export const DEFAULT_RECURRING_PRESETS: RecurringPreset[] = [
	{ label: "Daily", pattern: { type: "daily" } },
	{ label: "Weekly", pattern: { type: "weekly" } },
	{
		label: "Weekdays",
		pattern: { type: "weekly", daysOfWeek: [1, 2, 3, 4, 5] },
	},
	{ label: "Monthly", pattern: { type: "monthly" } },
	{ label: "Yearly", pattern: { type: "yearly" } },
];

export const PATTERN_TYPE_LABELS: Record<RecurringPatternType, string> = {
	daily: "Daily",
	weekly: "Weekly",
	monthly: "Monthly",
	yearly: "Yearly",
	custom: "Custom",
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const FULL_DAY_LABELS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

export interface RecurringPickerProps {
	/** The current recurring pattern. If null, no recurrence is set. */
	value: RecurringPattern | null;
	/** Called when the recurring pattern changes. */
	onChange: (pattern: RecurringPattern | null) => void;
	/** Available quick presets. Defaults to DEFAULT_RECURRING_PRESETS. */
	presets?: RecurringPreset[];
	/** Placeholder text when no recurrence is set. */
	placeholder?: string;
	/** Whether the picker is disabled. */
	disabled?: boolean;
	/** Whether the value can be cleared. */
	clearable?: boolean;
	/** Additional CSS classes for the container. */
	className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a recurring pattern for display in the trigger.
 */
export function formatRecurringPattern(pattern: RecurringPattern): string {
	const interval = pattern.interval ?? 1;
	let base: string;

	switch (pattern.type) {
		case "daily":
			base = interval === 1 ? "Daily" : `Every ${interval} days`;
			break;

		case "weekly":
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				const days = pattern.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ");
				if (interval === 1) {
					// Check for common patterns
					const sortedDays = [...pattern.daysOfWeek].sort((a, b) => a - b);
					if (
						sortedDays.length === 5 &&
						sortedDays.every((d, i) => d === i + 1)
					) {
						base = "Weekdays";
					} else if (
						sortedDays.length === 2 &&
						sortedDays[0] === 0 &&
						sortedDays[1] === 6
					) {
						base = "Weekends";
					} else {
						base = `Weekly on ${days}`;
					}
				} else {
					base = `Every ${interval} weeks on ${days}`;
				}
			} else {
				base = interval === 1 ? "Weekly" : `Every ${interval} weeks`;
			}
			break;

		case "monthly":
			if (pattern.dayOfMonth) {
				const ordinal = formatOrdinal(pattern.dayOfMonth);
				base =
					interval === 1
						? `Monthly on the ${ordinal}`
						: `Every ${interval} months on the ${ordinal}`;
			} else {
				base = interval === 1 ? "Monthly" : `Every ${interval} months`;
			}
			break;

		case "yearly":
			base = interval === 1 ? "Yearly" : `Every ${interval} years`;
			break;

		case "custom":
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				const days = pattern.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ");
				base = `Custom: ${days}`;
			} else {
				base = "Custom";
			}
			break;

		default:
			base = "Recurring";
	}

	// Append notification time if set
	if (pattern.notifyAt) {
		return `${base} at ${formatTimeDisplay(pattern.notifyAt)}`;
	}

	return base;
}

/**
 * Formats a number as an ordinal (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(n: number): string {
	const s = ["th", "st", "nd", "rd"];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Checks if two recurring patterns are equal
 */
export function patternsEqual(
	a: RecurringPattern | null,
	b: RecurringPattern | null,
): boolean {
	if (a === null && b === null) return true;
	if (a === null || b === null) return false;

	if (a.type !== b.type) return false;
	if ((a.interval ?? 1) !== (b.interval ?? 1)) return false;

	// Compare daysOfWeek
	const aDays = a.daysOfWeek ?? [];
	const bDays = b.daysOfWeek ?? [];
	if (aDays.length !== bDays.length) return false;
	const sortedA = [...aDays].sort((x, y) => x - y);
	const sortedB = [...bDays].sort((x, y) => x - y);
	if (!sortedA.every((d, i) => d === sortedB[i])) return false;

	if ((a.dayOfMonth ?? null) !== (b.dayOfMonth ?? null)) return false;
	if ((a.monthOfYear ?? null) !== (b.monthOfYear ?? null)) return false;

	return true;
}

// ============================================================================
// Sub-components
// ============================================================================

interface DaySelectorProps {
	selectedDays: number[];
	onChange: (days: number[]) => void;
	disabled?: boolean;
}

function DaySelector({ selectedDays, onChange, disabled }: DaySelectorProps) {
	const toggleDay = useCallback(
		(day: number) => {
			if (selectedDays.includes(day)) {
				onChange(selectedDays.filter((d) => d !== day));
			} else {
				onChange([...selectedDays, day].sort((a, b) => a - b));
			}
		},
		[selectedDays, onChange],
	);

	return (
		// biome-ignore lint/a11y/useSemanticElements: fieldset styling not ideal for inline day buttons
		<div
			className="flex flex-wrap gap-1"
			role="group"
			aria-label="Days of week"
			data-testid="recurring-picker-day-selector"
		>
			{DAY_LABELS.map((label, index) => {
				const isSelected = selectedDays.includes(index);
				return (
					<button
						// biome-ignore lint/suspicious/noArrayIndexKey: day indices are stable (0-6 for Sun-Sat)
						key={index}
						type="button"
						disabled={disabled}
						onClick={() => toggleDay(index)}
						data-testid={`recurring-picker-day-${index}`}
						className={cn(
							"flex h-7 w-9 items-center justify-center rounded-none text-xs transition-colors",
							"border border-input",
							"hover:bg-accent hover:text-accent-foreground",
							"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
							"disabled:pointer-events-none disabled:opacity-50",
							isSelected && "border-primary bg-primary text-primary-foreground",
						)}
						aria-pressed={isSelected}
						aria-label={FULL_DAY_LABELS[index]}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
}

interface IntervalInputProps {
	value: number;
	onChange: (value: number) => void;
	type: RecurringPatternType;
	disabled?: boolean;
}

function IntervalInput({
	value,
	onChange,
	type,
	disabled,
}: IntervalInputProps) {
	const unitLabel = useMemo(() => {
		switch (type) {
			case "daily":
				return value === 1 ? "day" : "days";
			case "weekly":
				return value === 1 ? "week" : "weeks";
			case "monthly":
				return value === 1 ? "month" : "months";
			case "yearly":
				return value === 1 ? "year" : "years";
			default:
				return value === 1 ? "time" : "times";
		}
	}, [type, value]);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const num = Number.parseInt(e.target.value, 10);
			if (!Number.isNaN(num) && num >= 1) {
				onChange(num);
			}
		},
		[onChange],
	);

	return (
		<div
			className="flex items-center gap-2"
			data-testid="recurring-picker-interval"
		>
			<span className="text-muted-foreground text-xs">Every</span>
			<input
				type="number"
				min={1}
				max={99}
				value={value}
				onChange={handleChange}
				disabled={disabled}
				data-testid="recurring-picker-interval-input"
				className={cn(
					"h-7 w-12 rounded-none border border-input bg-transparent px-2 text-center text-xs",
					"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
					"disabled:pointer-events-none disabled:opacity-50",
				)}
				aria-label="Interval value"
			/>
			<span className="text-muted-foreground text-xs">{unitLabel}</span>
		</div>
	);
}

interface DayOfMonthInputProps {
	value: number | undefined;
	onChange: (value: number | undefined) => void;
	disabled?: boolean;
}

function DayOfMonthInput({ value, onChange, disabled }: DayOfMonthInputProps) {
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const num = Number.parseInt(e.target.value, 10);
			if (e.target.value === "") {
				onChange(undefined);
			} else if (!Number.isNaN(num) && num >= 1 && num <= 31) {
				onChange(num);
			}
		},
		[onChange],
	);

	return (
		<div
			className="flex items-center gap-2"
			data-testid="recurring-picker-day-of-month"
		>
			<span className="text-muted-foreground text-xs">On day</span>
			<input
				type="number"
				min={1}
				max={31}
				value={value ?? ""}
				onChange={handleChange}
				disabled={disabled}
				placeholder="—"
				data-testid="recurring-picker-day-of-month-input"
				className={cn(
					"h-7 w-12 rounded-none border border-input bg-transparent px-2 text-center text-xs",
					"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
					"disabled:pointer-events-none disabled:opacity-50",
				)}
				aria-label="Day of month"
			/>
		</div>
	);
}

interface PatternTypeSelectorProps {
	value: RecurringPatternType;
	onChange: (type: RecurringPatternType) => void;
	disabled?: boolean;
}

function PatternTypeSelector({
	value,
	onChange,
	disabled,
}: PatternTypeSelectorProps) {
	const [dropdownOpen, setDropdownOpen] = useState(false);

	return (
		<PopoverPrimitive.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
			<PopoverPrimitive.Trigger
				disabled={disabled}
				data-testid="recurring-picker-type-trigger"
				className={cn(
					"inline-flex h-7 items-center gap-1 rounded-none border border-input bg-transparent px-2 text-xs",
					"hover:bg-accent hover:text-accent-foreground",
					"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
					"disabled:pointer-events-none disabled:opacity-50",
				)}
				aria-label={`Pattern type: ${PATTERN_TYPE_LABELS[value]}`}
			>
				{PATTERN_TYPE_LABELS[value]}
				<ChevronDown className="h-3 w-3" aria-hidden="true" />
			</PopoverPrimitive.Trigger>

			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Positioner
					side="bottom"
					sideOffset={4}
					align="start"
					className="z-50"
				>
					<PopoverPrimitive.Popup
						data-testid="recurring-picker-type-dropdown"
						className={cn(
							"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95",
							"w-auto min-w-[120px] rounded-none border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
							"duration-100 data-closed:animate-out data-open:animate-in",
						)}
					>
						{(["daily", "weekly", "monthly", "yearly", "custom"] as const).map(
							(type) => (
								<button
									key={type}
									type="button"
									onClick={() => {
										onChange(type);
										setDropdownOpen(false);
									}}
									data-testid={`recurring-picker-type-${type}`}
									className={cn(
										"flex w-full items-center gap-2 rounded-none px-2 py-1.5 text-left text-xs transition-colors",
										"hover:bg-accent hover:text-accent-foreground",
										"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
										value === type && "bg-accent text-accent-foreground",
									)}
									aria-pressed={value === type}
								>
									<Check
										className={cn(
											"h-3 w-3",
											value === type ? "opacity-100" : "opacity-0",
										)}
										aria-hidden="true"
									/>
									{PATTERN_TYPE_LABELS[type]}
								</button>
							),
						)}
					</PopoverPrimitive.Popup>
				</PopoverPrimitive.Positioner>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}

// ============================================================================
// Main Component
// ============================================================================

export function RecurringPicker({
	value,
	onChange,
	presets = DEFAULT_RECURRING_PRESETS,
	placeholder = "Set recurrence",
	disabled = false,
	clearable = true,
	className,
}: RecurringPickerProps) {
	const [open, setOpen] = useState(false);

	// Editing state for custom pattern building
	const [editingPattern, setEditingPattern] = useState<RecurringPattern>(
		() => value ?? { type: "daily" },
	);

	const handleSelectPreset = useCallback(
		(preset: RecurringPreset) => {
			onChange(preset.pattern);
			setOpen(false);
		},
		[onChange],
	);

	const handleClear = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onChange(null);
		},
		[onChange],
	);

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			setOpen(isOpen);
			if (isOpen) {
				// Reset editing pattern to current value when opening
				setEditingPattern(value ?? { type: "daily" });
			}
		},
		[value],
	);

	const handlePatternTypeChange = useCallback((type: RecurringPatternType) => {
		setEditingPattern((prev) => {
			// Preserve interval and notifyAt when switching types
			const newPattern: RecurringPattern = {
				type,
				interval: prev.interval,
				notifyAt: prev.notifyAt,
			};

			// Clear type-specific fields
			if (type === "weekly" || type === "custom") {
				// Preserve daysOfWeek if switching between weekly/custom
				if (prev.type === "weekly" || prev.type === "custom") {
					newPattern.daysOfWeek = prev.daysOfWeek;
				}
			}
			if (type === "monthly") {
				if (prev.type === "monthly") {
					newPattern.dayOfMonth = prev.dayOfMonth;
				}
			}

			return newPattern;
		});
	}, []);

	const handleIntervalChange = useCallback((interval: number) => {
		setEditingPattern((prev) => ({
			...prev,
			interval: interval === 1 ? undefined : interval,
		}));
	}, []);

	const handleDaysOfWeekChange = useCallback((days: number[]) => {
		setEditingPattern((prev) => ({
			...prev,
			daysOfWeek: days.length > 0 ? days : undefined,
		}));
	}, []);

	const handleDayOfMonthChange = useCallback((day: number | undefined) => {
		setEditingPattern((prev) => ({
			...prev,
			dayOfMonth: day,
		}));
	}, []);

	const handleNotifyAtChange = useCallback((time: string | null) => {
		setEditingPattern((prev) => ({
			...prev,
			notifyAt: time ?? undefined,
		}));
	}, []);

	const handleApplyPattern = useCallback(() => {
		onChange(editingPattern);
		setOpen(false);
	}, [editingPattern, onChange]);

	const displayValue = useMemo(() => {
		if (!value) return null;
		return formatRecurringPattern(value);
	}, [value]);

	const showDaySelector =
		editingPattern.type === "weekly" || editingPattern.type === "custom";
	const showDayOfMonth = editingPattern.type === "monthly";

	return (
		<div
			className={cn("inline-flex items-center gap-0.5", className)}
			data-testid="recurring-picker-container"
		>
			<PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
				<PopoverPrimitive.Trigger
					disabled={disabled}
					data-testid="recurring-picker-trigger"
					className={cn(
						"inline-flex h-8 items-center gap-1.5 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none transition-colors",
						"hover:bg-accent hover:text-accent-foreground",
						"focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
						"disabled:pointer-events-none disabled:opacity-50",
						value && "text-foreground",
						!value && "text-muted-foreground",
					)}
					aria-label={value ? `Recurrence: ${displayValue}` : placeholder}
				>
					<Repeat className="h-3.5 w-3.5" aria-hidden="true" />
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
							data-testid="recurring-picker-popover"
							className={cn(
								"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95",
								"w-auto min-w-[280px] rounded-none border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none",
								"duration-100 data-closed:animate-out data-open:animate-in",
							)}
						>
							{/* Quick Presets */}
							{presets.length > 0 && (
								<div
									className="mb-3 flex flex-wrap gap-1.5"
									data-testid="recurring-picker-presets"
								>
									{presets.map((preset) => {
										const isSelected = patternsEqual(value, preset.pattern);
										return (
											<Button
												key={preset.label}
												variant={isSelected ? "default" : "outline"}
												size="xs"
												onClick={() => handleSelectPreset(preset)}
												data-testid={`recurring-picker-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
												aria-pressed={isSelected}
											>
												{isSelected && (
													<Check
														className="h-3 w-3"
														data-icon="inline-start"
														aria-hidden="true"
													/>
												)}
												{preset.label}
											</Button>
										);
									})}
								</div>
							)}

							{/* Divider */}
							<div className="mb-3 border-border border-t" />

							{/* Custom Pattern Builder */}
							<div className="space-y-3" data-testid="recurring-picker-custom">
								{/* Pattern Type & Interval Row */}
								<div className="flex items-center gap-3">
									<PatternTypeSelector
										value={editingPattern.type}
										onChange={handlePatternTypeChange}
									/>
									<IntervalInput
										value={editingPattern.interval ?? 1}
										onChange={handleIntervalChange}
										type={editingPattern.type}
									/>
								</div>

								{/* Days of Week (for weekly/custom) */}
								{showDaySelector && (
									<DaySelector
										selectedDays={editingPattern.daysOfWeek ?? []}
										onChange={handleDaysOfWeekChange}
									/>
								)}

								{/* Day of Month (for monthly) */}
								{showDayOfMonth && (
									<DayOfMonthInput
										value={editingPattern.dayOfMonth}
										onChange={handleDayOfMonthChange}
									/>
								)}

								{/* Notification Time */}
								<div data-testid="recurring-picker-time">
									<TimePicker
										value={editingPattern.notifyAt ?? null}
										onChange={handleNotifyAtChange}
										placeholder="Notify at (HH:mm)"
										className="w-full"
									/>
								</div>

								{/* Apply Button */}
								<div className="flex justify-end pt-1">
									<Button
										size="sm"
										onClick={handleApplyPattern}
										data-testid="recurring-picker-apply"
									>
										Apply
									</Button>
								</div>
							</div>
						</PopoverPrimitive.Popup>
					</PopoverPrimitive.Positioner>
				</PopoverPrimitive.Portal>
			</PopoverPrimitive.Root>

			{value && clearable && !disabled && (
				<button
					type="button"
					onClick={handleClear}
					className="inline-flex h-8 w-8 items-center justify-center rounded-none opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					data-testid="recurring-picker-clear"
					aria-label="Clear recurrence"
				>
					<X className="h-3 w-3" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}

// Additional export alias for use elsewhere
export { formatRecurringPattern as formatPattern };
