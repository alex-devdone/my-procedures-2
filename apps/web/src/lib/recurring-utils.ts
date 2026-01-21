/**
 * Utility functions for recurring pattern matching.
 * Separated to avoid circular dependencies with hooks.
 */

/**
 * Check if a date matches a recurring pattern.
 * Returns true if the date is a valid day for the pattern to trigger.
 */
export function isDateMatchingPattern(
	pattern: {
		type?: string;
		daysOfWeek?: number[];
		dayOfMonth?: number;
		monthOfYear?: number;
	},
	currentTime: Date,
): boolean {
	const currentDayOfWeek = currentTime.getDay();
	const currentDayOfMonth = currentTime.getDate();
	const currentMonth = currentTime.getMonth() + 1; // 1-indexed

	switch (pattern.type) {
		case "daily":
			// Daily patterns match every day
			return true;

		case "weekly":
			// Weekly patterns match if today's day of week is in the list (or any day if no list)
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				return pattern.daysOfWeek.includes(currentDayOfWeek);
			}
			return true;

		case "monthly":
			// Monthly patterns match if today's day of month matches
			if (pattern.dayOfMonth !== undefined) {
				return currentDayOfMonth === pattern.dayOfMonth;
			}
			return true;

		case "yearly":
			// Yearly patterns match if both month and day match
			if (
				pattern.monthOfYear !== undefined &&
				pattern.dayOfMonth !== undefined
			) {
				return (
					currentMonth === pattern.monthOfYear &&
					currentDayOfMonth === pattern.dayOfMonth
				);
			}
			if (pattern.monthOfYear !== undefined) {
				return currentMonth === pattern.monthOfYear;
			}
			if (pattern.dayOfMonth !== undefined) {
				return currentDayOfMonth === pattern.dayOfMonth;
			}
			return true;

		case "custom":
			// Custom patterns use daysOfWeek
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				return pattern.daysOfWeek.includes(currentDayOfWeek);
			}
			return true;

		default:
			return true;
	}
}
