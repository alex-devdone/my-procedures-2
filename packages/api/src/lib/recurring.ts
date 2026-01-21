import z from "zod";

/**
 * Recurring pattern types and utilities for cron-style scheduling
 *
 * Supports: daily, weekly, monthly, yearly, and custom patterns
 * with intervals, specific days of week, day of month, and end conditions
 */

// Re-export the schema from todo router for consistency
export const recurringPatternSchema = z.object({
	type: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
	interval: z.number().int().positive().optional(),
	daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
	dayOfMonth: z.number().int().min(1).max(31).optional(),
	monthOfYear: z.number().int().min(1).max(12).optional(),
	endDate: z.string().optional(),
	occurrences: z.number().int().positive().optional(),
});

export type RecurringPattern = z.infer<typeof recurringPatternSchema>;

/**
 * Check if a recurring pattern has reached its end condition
 */
export function isPatternExpired(
	pattern: RecurringPattern,
	fromDate: Date,
	completedOccurrences: number,
): boolean {
	// Check end date
	if (pattern.endDate) {
		const endDate = new Date(pattern.endDate);
		if (fromDate > endDate) {
			return true;
		}
	}

	// Check max occurrences
	// If we've completed >= max occurrences, pattern is expired
	if (pattern.occurrences !== undefined) {
		if (completedOccurrences >= pattern.occurrences) {
			return true;
		}
	}

	return false;
}

/**
 * Get the next occurrence date for a daily pattern
 */
function getNextDailyOccurrence(fromDate: Date, interval: number): Date {
	const next = new Date(fromDate);
	next.setDate(next.getDate() + interval);
	return next;
}

/**
 * Get the next occurrence date for a weekly pattern
 * If daysOfWeek is specified, finds the next matching day
 */
function getNextWeeklyOccurrence(
	fromDate: Date,
	interval: number,
	daysOfWeek?: number[],
): Date {
	const next = new Date(fromDate);

	if (daysOfWeek && daysOfWeek.length > 0) {
		// Sort days to process in order
		const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
		const currentDay = fromDate.getDay();

		// Find the next day in the current week or next interval week
		let foundInCurrentWeek = false;
		for (const day of sortedDays) {
			if (day > currentDay) {
				// Found a day later this week
				next.setDate(next.getDate() + (day - currentDay));
				foundInCurrentWeek = true;
				break;
			}
		}

		if (!foundInCurrentWeek) {
			// Move to first matching day of next interval week
			const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
			const additionalWeeks = (interval - 1) * 7;
			next.setDate(next.getDate() + daysUntilNextWeek + additionalWeeks);
		}
	} else {
		// No specific days, just add interval weeks
		next.setDate(next.getDate() + interval * 7);
	}

	return next;
}

/**
 * Get the next occurrence date for a monthly pattern
 */
function getNextMonthlyOccurrence(
	fromDate: Date,
	interval: number,
	dayOfMonth?: number,
): Date {
	const next = new Date(fromDate);
	const targetDay = dayOfMonth ?? fromDate.getDate();

	// Set day to 1 first to avoid month rollover issues (e.g., Jan 31 -> Feb 31 -> Mar 3)
	next.setDate(1);

	// Move to the next month
	next.setMonth(next.getMonth() + interval);

	// Handle day of month
	const maxDaysInMonth = new Date(
		next.getFullYear(),
		next.getMonth() + 1,
		0,
	).getDate();

	// If target day exceeds max days, use last day of month
	next.setDate(Math.min(targetDay, maxDaysInMonth));

	return next;
}

/**
 * Get the next occurrence date for a yearly pattern
 */
function getNextYearlyOccurrence(
	fromDate: Date,
	interval: number,
	monthOfYear?: number,
	dayOfMonth?: number,
): Date {
	const next = new Date(fromDate);
	const targetMonth = monthOfYear ? monthOfYear - 1 : fromDate.getMonth(); // 0-indexed
	const targetDay = dayOfMonth ?? fromDate.getDate();

	// Set to next interval year
	next.setFullYear(next.getFullYear() + interval);
	next.setMonth(targetMonth);

	// Handle day of month
	const maxDaysInMonth = new Date(
		next.getFullYear(),
		next.getMonth() + 1,
		0,
	).getDate();
	next.setDate(Math.min(targetDay, maxDaysInMonth));

	// If we're still on or before the fromDate, add another interval
	if (next <= fromDate) {
		next.setFullYear(next.getFullYear() + interval);
		const newMaxDays = new Date(
			next.getFullYear(),
			next.getMonth() + 1,
			0,
		).getDate();
		next.setDate(Math.min(targetDay, newMaxDays));
	}

	return next;
}

/**
 * Get the next occurrence date for a custom pattern
 * Custom patterns use daysOfWeek similar to weekly, but can have different intervals
 */
function getNextCustomOccurrence(
	fromDate: Date,
	interval: number,
	daysOfWeek?: number[],
): Date {
	// Custom behaves like weekly with specific days
	return getNextWeeklyOccurrence(fromDate, interval, daysOfWeek);
}

/**
 * Calculate the next occurrence date based on a recurring pattern
 *
 * @param pattern - The recurring pattern definition
 * @param fromDate - The date to calculate from (typically the current due date)
 * @param completedOccurrences - Number of times this recurring task has been completed (for occurrence limit checking)
 * @returns The next occurrence date, or null if the pattern has expired
 */
export function getNextOccurrence(
	pattern: RecurringPattern,
	fromDate: Date,
	completedOccurrences = 0,
): Date | null {
	// Check if pattern has expired (already completed max occurrences)
	if (isPatternExpired(pattern, fromDate, completedOccurrences)) {
		return null;
	}

	const interval = pattern.interval ?? 1;

	let nextDate: Date;

	switch (pattern.type) {
		case "daily":
			nextDate = getNextDailyOccurrence(fromDate, interval);
			break;
		case "weekly":
			nextDate = getNextWeeklyOccurrence(
				fromDate,
				interval,
				pattern.daysOfWeek,
			);
			break;
		case "monthly":
			nextDate = getNextMonthlyOccurrence(
				fromDate,
				interval,
				pattern.dayOfMonth,
			);
			break;
		case "yearly":
			nextDate = getNextYearlyOccurrence(
				fromDate,
				interval,
				pattern.monthOfYear,
				pattern.dayOfMonth,
			);
			break;
		case "custom":
			nextDate = getNextCustomOccurrence(
				fromDate,
				interval,
				pattern.daysOfWeek,
			);
			break;
		default:
			// Should never happen with proper TypeScript
			throw new Error(
				`Unknown recurring pattern type: ${(pattern as RecurringPattern).type}`,
			);
	}

	// Final check: make sure the calculated date doesn't exceed endDate
	if (pattern.endDate) {
		const endDate = new Date(pattern.endDate);
		if (nextDate > endDate) {
			return null;
		}
	}

	return nextDate;
}

/**
 * Parse a human-readable recurring description into a RecurringPattern
 * Supports common formats like:
 * - "daily" / "every day"
 * - "every 3 days"
 * - "weekly" / "every week"
 * - "every Monday" / "every Mon, Wed, Fri"
 * - "monthly" / "every month"
 * - "every month on the 15th"
 * - "yearly" / "every year"
 *
 * @param description - Human-readable recurring description
 * @returns Parsed RecurringPattern or null if not recognized
 */
export function parseRecurringDescription(
	description: string,
): RecurringPattern | null {
	const normalized = description.toLowerCase().trim();

	// Day name mapping
	const dayNames: Record<string, number> = {
		sunday: 0,
		sun: 0,
		monday: 1,
		mon: 1,
		tuesday: 2,
		tue: 2,
		tues: 2,
		wednesday: 3,
		wed: 3,
		thursday: 4,
		thu: 4,
		thur: 4,
		thurs: 4,
		friday: 5,
		fri: 5,
		saturday: 6,
		sat: 6,
	};

	// Daily patterns
	if (normalized === "daily" || normalized === "every day") {
		return { type: "daily" };
	}

	// Every N days
	const everyNDaysMatch = normalized.match(/^every\s+(\d+)\s+days?$/);
	if (everyNDaysMatch) {
		return { type: "daily", interval: Number.parseInt(everyNDaysMatch[1], 10) };
	}

	// Weekly patterns
	if (normalized === "weekly" || normalized === "every week") {
		return { type: "weekly" };
	}

	// Every N weeks
	const everyNWeeksMatch = normalized.match(/^every\s+(\d+)\s+weeks?$/);
	if (everyNWeeksMatch) {
		return {
			type: "weekly",
			interval: Number.parseInt(everyNWeeksMatch[1], 10),
		};
	}

	// Every specific day(s) of week
	const everyDayMatch = normalized.match(/^every\s+(.+)$/);
	if (everyDayMatch) {
		const daysStr = everyDayMatch[1];
		// Split by common separators: comma, "and", whitespace
		const dayParts = daysStr.split(/[,\s]+(?:and\s+)?|(?:\s+and\s+)/);
		const days: number[] = [];

		for (const part of dayParts) {
			const trimmed = part.trim();
			if (dayNames[trimmed] !== undefined) {
				days.push(dayNames[trimmed]);
			}
		}

		if (days.length > 0) {
			return {
				type: "weekly",
				daysOfWeek: [...new Set(days)].sort((a, b) => a - b),
			};
		}
	}

	// Monthly patterns
	if (normalized === "monthly" || normalized === "every month") {
		return { type: "monthly" };
	}

	// Every N months
	const everyNMonthsMatch = normalized.match(/^every\s+(\d+)\s+months?$/);
	if (everyNMonthsMatch) {
		return {
			type: "monthly",
			interval: Number.parseInt(everyNMonthsMatch[1], 10),
		};
	}

	// Every month on the Nth
	const monthlyOnDayMatch = normalized.match(
		/^every\s+month\s+on\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?$/,
	);
	if (monthlyOnDayMatch) {
		const day = Number.parseInt(monthlyOnDayMatch[1], 10);
		if (day >= 1 && day <= 31) {
			return { type: "monthly", dayOfMonth: day };
		}
	}

	// Yearly patterns
	if (normalized === "yearly" || normalized === "every year") {
		return { type: "yearly" };
	}

	// Every N years
	const everyNYearsMatch = normalized.match(/^every\s+(\d+)\s+years?$/);
	if (everyNYearsMatch) {
		return {
			type: "yearly",
			interval: Number.parseInt(everyNYearsMatch[1], 10),
		};
	}

	return null;
}

/**
 * Format a RecurringPattern into a human-readable string
 *
 * @param pattern - The recurring pattern to format
 * @returns Human-readable description of the pattern
 */
export function formatRecurringPattern(pattern: RecurringPattern): string {
	const interval = pattern.interval ?? 1;

	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const monthNames = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];

	const formatOrdinal = (n: number): string => {
		const s = ["th", "st", "nd", "rd"];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	};

	switch (pattern.type) {
		case "daily":
			if (interval === 1) {
				return "Daily";
			}
			return `Every ${interval} days`;

		case "weekly":
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				const days = pattern.daysOfWeek.map((d) => dayNames[d]).join(", ");
				if (interval === 1) {
					return `Weekly on ${days}`;
				}
				return `Every ${interval} weeks on ${days}`;
			}
			if (interval === 1) {
				return "Weekly";
			}
			return `Every ${interval} weeks`;

		case "monthly":
			if (pattern.dayOfMonth) {
				if (interval === 1) {
					return `Monthly on the ${formatOrdinal(pattern.dayOfMonth)}`;
				}
				return `Every ${interval} months on the ${formatOrdinal(pattern.dayOfMonth)}`;
			}
			if (interval === 1) {
				return "Monthly";
			}
			return `Every ${interval} months`;

		case "yearly":
			if (pattern.monthOfYear && pattern.dayOfMonth) {
				const month = monthNames[pattern.monthOfYear - 1];
				if (interval === 1) {
					return `Yearly on ${month} ${pattern.dayOfMonth}`;
				}
				return `Every ${interval} years on ${month} ${pattern.dayOfMonth}`;
			}
			if (interval === 1) {
				return "Yearly";
			}
			return `Every ${interval} years`;

		case "custom":
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				const days = pattern.daysOfWeek.map((d) => dayNames[d]).join(", ");
				if (interval === 1) {
					return `Custom: ${days}`;
				}
				return `Custom: ${days} every ${interval} weeks`;
			}
			return "Custom";

		default:
			return "Unknown pattern";
	}
}
