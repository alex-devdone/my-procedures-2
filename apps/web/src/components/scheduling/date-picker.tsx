"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DatePreset = {
	label: string;
	getValue: () => Date;
};

export const DEFAULT_DATE_PRESETS: DatePreset[] = [
	{
		label: "Today",
		getValue: () => {
			const date = new Date();
			date.setHours(23, 59, 59, 999);
			return date;
		},
	},
	{
		label: "Tomorrow",
		getValue: () => {
			const date = new Date();
			date.setDate(date.getDate() + 1);
			date.setHours(23, 59, 59, 999);
			return date;
		},
	},
	{
		label: "Next week",
		getValue: () => {
			const date = new Date();
			date.setDate(date.getDate() + 7);
			date.setHours(23, 59, 59, 999);
			return date;
		},
	},
];

export interface DatePickerProps {
	value: Date | null;
	onChange: (date: Date | null) => void;
	presets?: DatePreset[];
	placeholder?: string;
	disabled?: boolean;
	clearable?: boolean;
	className?: string;
	minDate?: Date;
	maxDate?: Date;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

function formatDate(date: Date): string {
	const today = new Date();
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);

	const isToday = isSameDay(date, today);
	const isTomorrow = isSameDay(date, tomorrow);

	if (isToday) return "Today";
	if (isTomorrow) return "Tomorrow";

	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
	return new Date(year, month, 1).getDay();
}

interface CalendarGridProps {
	currentMonth: Date;
	selectedDate: Date | null;
	onSelectDate: (date: Date) => void;
	minDate?: Date;
	maxDate?: Date;
}

function CalendarGrid({
	currentMonth,
	selectedDate,
	onSelectDate,
	minDate,
	maxDate,
}: CalendarGridProps) {
	const year = currentMonth.getFullYear();
	const month = currentMonth.getMonth();
	const daysInMonth = getDaysInMonth(year, month);
	const firstDay = getFirstDayOfMonth(year, month);
	const today = new Date();

	const days: (Date | null)[] = [];

	// Add empty cells for days before the first day of the month
	for (let i = 0; i < firstDay; i++) {
		days.push(null);
	}

	// Add days of the month
	for (let day = 1; day <= daysInMonth; day++) {
		const date = new Date(year, month, day);
		date.setHours(23, 59, 59, 999);
		days.push(date);
	}

	const isDateDisabled = (date: Date): boolean => {
		if (minDate && date < minDate) return true;
		if (maxDate && date > maxDate) return true;
		return false;
	};

	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: custom calendar grid needs aria-label for accessibility
		<div
			className="grid grid-cols-7 gap-0.5"
			data-testid="date-picker-calendar-grid"
			aria-label={`${MONTHS[month]} ${year}`}
		>
			{DAYS_OF_WEEK.map((day) => (
				<div
					key={day}
					className="flex h-7 w-7 items-center justify-center text-muted-foreground text-xs"
					aria-hidden="true"
				>
					{day}
				</div>
			))}
			{days.map((date, cellIndex) => {
				if (!date) {
					return (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: empty placeholder cells have stable positions within the month
							key={`empty-${year}-${month}-${cellIndex}`}
							className="h-7 w-7"
							aria-hidden="true"
						/>
					);
				}

				const isSelected = selectedDate && isSameDay(date, selectedDate);
				const isCurrentDay = isSameDay(date, today);
				const isDisabled = isDateDisabled(date);

				return (
					<button
						key={date.toISOString()}
						type="button"
						onClick={() => !isDisabled && onSelectDate(date)}
						disabled={isDisabled}
						data-testid={`date-picker-day-${date.getDate()}`}
						data-selected={isSelected || undefined}
						className={cn(
							"flex h-7 w-7 items-center justify-center text-xs transition-colors",
							"hover:bg-accent hover:text-accent-foreground",
							"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
							isSelected && "bg-primary text-primary-foreground",
							isCurrentDay && !isSelected && "font-medium text-primary",
							isDisabled && "pointer-events-none opacity-50",
						)}
						aria-pressed={isSelected || undefined}
						aria-current={isCurrentDay ? "date" : undefined}
						aria-disabled={isDisabled}
					>
						{date.getDate()}
					</button>
				);
			})}
		</div>
	);
}

export function DatePicker({
	value,
	onChange,
	presets = DEFAULT_DATE_PRESETS,
	placeholder = "Set due date",
	disabled = false,
	clearable = true,
	className,
	minDate,
	maxDate,
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const [currentMonth, setCurrentMonth] = useState<Date>(() => {
		return value ?? new Date();
	});

	const handleSelectDate = useCallback(
		(date: Date) => {
			onChange(date);
			setOpen(false);
		},
		[onChange],
	);

	const handleSelectPreset = useCallback(
		(preset: DatePreset) => {
			const date = preset.getValue();
			onChange(date);
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

	const handlePrevMonth = useCallback(() => {
		setCurrentMonth((prev) => {
			const newDate = new Date(prev);
			newDate.setMonth(newDate.getMonth() - 1);
			return newDate;
		});
	}, []);

	const handleNextMonth = useCallback(() => {
		setCurrentMonth((prev) => {
			const newDate = new Date(prev);
			newDate.setMonth(newDate.getMonth() + 1);
			return newDate;
		});
	}, []);

	const displayValue = useMemo(() => {
		if (!value) return null;
		return formatDate(value);
	}, [value]);

	const handleOpenChange = useCallback(
		(isOpen: boolean) => {
			setOpen(isOpen);
			if (isOpen) {
				// Reset to selected date's month or current month when opening
				setCurrentMonth(value ?? new Date());
			}
		},
		[value],
	);

	return (
		<div
			className={cn("inline-flex items-center gap-0.5", className)}
			data-testid="date-picker-container"
		>
			<PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
				<PopoverPrimitive.Trigger
					disabled={disabled}
					data-testid="date-picker-trigger"
					className={cn(
						"inline-flex h-8 items-center gap-1.5 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none transition-colors",
						"hover:bg-accent hover:text-accent-foreground",
						"focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
						"disabled:pointer-events-none disabled:opacity-50",
						value && "text-foreground",
						!value && "text-muted-foreground",
					)}
					aria-label={value ? `Due date: ${displayValue}` : placeholder}
				>
					<Calendar className="h-3.5 w-3.5" aria-hidden="true" />
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
							data-testid="date-picker-popover"
							className={cn(
								"data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95",
								"w-auto min-w-[280px] rounded-none border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none",
								"duration-100 data-closed:animate-out data-open:animate-in",
							)}
						>
							{/* Presets Section */}
							{presets.length > 0 && (
								<div
									className="mb-3 flex flex-wrap gap-1.5"
									data-testid="date-picker-presets"
								>
									{presets.map((preset) => (
										<Button
											key={preset.label}
											variant="outline"
											size="xs"
											onClick={() => handleSelectPreset(preset)}
											data-testid={`date-picker-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
										>
											<Clock className="h-3 w-3" data-icon="inline-start" />
											{preset.label}
										</Button>
									))}
								</div>
							)}

							{/* Calendar Navigation */}
							<div
								className="mb-2 flex items-center justify-between"
								data-testid="date-picker-navigation"
							>
								<Button
									variant="ghost"
									size="icon-xs"
									onClick={handlePrevMonth}
									data-testid="date-picker-prev-month"
									aria-label="Previous month"
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<span
									className="font-medium text-xs"
									data-testid="date-picker-current-month"
								>
									{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
								</span>
								<Button
									variant="ghost"
									size="icon-xs"
									onClick={handleNextMonth}
									data-testid="date-picker-next-month"
									aria-label="Next month"
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>

							{/* Calendar Grid */}
							<CalendarGrid
								currentMonth={currentMonth}
								selectedDate={value}
								onSelectDate={handleSelectDate}
								minDate={minDate}
								maxDate={maxDate}
							/>
						</PopoverPrimitive.Popup>
					</PopoverPrimitive.Positioner>
				</PopoverPrimitive.Portal>
			</PopoverPrimitive.Root>
			{value && clearable && !disabled && (
				<button
					type="button"
					onClick={handleClear}
					className="inline-flex h-8 w-8 items-center justify-center rounded-none opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					data-testid="date-picker-clear"
					aria-label="Clear due date"
				>
					<X className="h-3 w-3" aria-hidden="true" />
				</button>
			)}
		</div>
	);
}

export { formatDate, isSameDay, getDaysInMonth, getFirstDayOfMonth };
