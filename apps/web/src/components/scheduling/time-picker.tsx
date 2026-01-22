"use client";

import { Clock, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type TimePreset = {
	label: string;
	value: string; // HH:mm format
};

export const DEFAULT_TIME_PRESETS: TimePreset[] = [
	{ label: "Morning", value: "09:00" },
	{ label: "Noon", value: "12:00" },
	{ label: "Evening", value: "18:00" },
];

export interface TimePickerProps {
	value: string | null;
	onChange: (time: string | null) => void;
	presets?: TimePreset[];
	placeholder?: string;
	disabled?: boolean;
	clearable?: boolean;
	className?: string;
}

/**
 * Validates if a string is in HH:mm format (24-hour)
 */
export function isValidTimeFormat(time: string): boolean {
	const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
	return timeRegex.test(time);
}

/**
 * Formats a time string to ensure HH:mm format with leading zeros
 */
export function formatTimeValue(time: string): string {
	if (!isValidTimeFormat(time)) return time;
	const [hours, minutes] = time.split(":");
	return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

/**
 * Formats time for display (e.g., "9:00 AM" for "09:00")
 */
export function formatTimeDisplay(time: string): string {
	if (!isValidTimeFormat(time)) return time;
	const [hours, minutes] = time.split(":").map(Number);
	const period = hours >= 12 ? "PM" : "AM";
	const displayHours = hours % 12 || 12;
	return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function TimePicker({
	value,
	onChange,
	presets = DEFAULT_TIME_PRESETS,
	placeholder = "Set time",
	disabled = false,
	clearable = true,
	className,
}: TimePickerProps) {
	const [inputValue, setInputValue] = useState(value ?? "");
	const isFocusedRef = useRef(false);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value;
			setInputValue(newValue);

			// Only call onChange if the value is valid or empty
			if (newValue === "") {
				onChange(null);
			} else if (isValidTimeFormat(newValue)) {
				onChange(formatTimeValue(newValue));
			}
		},
		[onChange],
	);

	const handleInputFocus = useCallback(() => {
		isFocusedRef.current = true;
	}, []);

	const handleInputBlur = useCallback(() => {
		isFocusedRef.current = false;
		// On blur, format the input value if valid, otherwise reset to last valid value
		if (inputValue === "") {
			return;
		}
		if (isValidTimeFormat(inputValue)) {
			const formatted = formatTimeValue(inputValue);
			setInputValue(formatted);
			onChange(formatted);
		} else {
			// Reset to the last valid value or empty
			setInputValue(value ?? "");
		}
	}, [inputValue, value, onChange]);

	const handlePresetClick = useCallback(
		(preset: TimePreset) => {
			const formatted = formatTimeValue(preset.value);
			setInputValue(formatted);
			onChange(formatted);
		},
		[onChange],
	);

	const handleClear = useCallback(() => {
		setInputValue("");
		onChange(null);
	}, [onChange]);

	const displayValue = useMemo(() => {
		if (!value) return null;
		return formatTimeDisplay(value);
	}, [value]);

	// Sync internal state with external value changes (only when not focused)
	useEffect(() => {
		if (isFocusedRef.current) {
			return;
		}
		// Sync inputValue to match external value
		setInputValue(value ?? "");
	}, [value]);

	return (
		<div
			className={cn("flex flex-col gap-2", className)}
			data-testid="time-picker-container"
		>
			{/* Time Input */}
			<div className="flex items-center gap-1">
				<div className="relative flex-1">
					<Clock
						className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input
						type="text"
						value={inputValue}
						onChange={handleInputChange}
						onFocus={handleInputFocus}
						onBlur={handleInputBlur}
						placeholder={placeholder}
						disabled={disabled}
						className="pl-7"
						data-testid="time-picker-input"
						aria-label={value ? `Time: ${displayValue}` : placeholder}
						aria-invalid={
							inputValue !== "" && !isValidTimeFormat(inputValue)
								? "true"
								: undefined
						}
					/>
				</div>
				{value && clearable && !disabled && (
					<button
						type="button"
						onClick={handleClear}
						className="inline-flex h-8 w-8 items-center justify-center rounded-none opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						data-testid="time-picker-clear"
						aria-label="Clear time"
					>
						<X className="h-3 w-3" aria-hidden="true" />
					</button>
				)}
			</div>

			{/* Presets */}
			{presets.length > 0 && (
				<div
					className="flex flex-wrap gap-1.5"
					data-testid="time-picker-presets"
				>
					{presets.map((preset) => (
						<Button
							key={preset.value}
							variant="outline"
							size="xs"
							onClick={() => handlePresetClick(preset)}
							disabled={disabled}
							data-testid={`time-picker-preset-${preset.label.toLowerCase()}`}
							data-selected={value === preset.value || undefined}
							className={cn(
								value === preset.value && "border-primary bg-primary/10",
							)}
						>
							{preset.label}
						</Button>
					))}
				</div>
			)}
		</div>
	);
}
