import { describe, expect, it } from "vitest";
import {
	formatRecurringPattern,
	getNextNotificationTime,
	getNextOccurrence,
	isPatternExpired,
	parseRecurringDescription,
	type RecurringPattern,
	recurringPatternSchema,
} from "./recurring";

describe("recurringPatternSchema", () => {
	it("validates daily pattern", () => {
		const result = recurringPatternSchema.safeParse({ type: "daily" });
		expect(result.success).toBe(true);
	});

	it("validates weekly pattern with interval", () => {
		const result = recurringPatternSchema.safeParse({
			type: "weekly",
			interval: 2,
		});
		expect(result.success).toBe(true);
	});

	it("validates weekly pattern with daysOfWeek", () => {
		const result = recurringPatternSchema.safeParse({
			type: "weekly",
			daysOfWeek: [1, 3, 5],
		});
		expect(result.success).toBe(true);
	});

	it("validates monthly pattern with dayOfMonth", () => {
		const result = recurringPatternSchema.safeParse({
			type: "monthly",
			dayOfMonth: 15,
		});
		expect(result.success).toBe(true);
	});

	it("validates yearly pattern with monthOfYear and dayOfMonth", () => {
		const result = recurringPatternSchema.safeParse({
			type: "yearly",
			monthOfYear: 1,
			dayOfMonth: 1,
		});
		expect(result.success).toBe(true);
	});

	it("validates custom pattern", () => {
		const result = recurringPatternSchema.safeParse({
			type: "custom",
			daysOfWeek: [2, 4],
			interval: 2,
		});
		expect(result.success).toBe(true);
	});

	it("validates pattern with endDate", () => {
		const result = recurringPatternSchema.safeParse({
			type: "daily",
			endDate: "2026-12-31",
		});
		expect(result.success).toBe(true);
	});

	it("validates pattern with occurrences", () => {
		const result = recurringPatternSchema.safeParse({
			type: "daily",
			occurrences: 10,
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid type", () => {
		const result = recurringPatternSchema.safeParse({ type: "invalid" });
		expect(result.success).toBe(false);
	});

	it("rejects daysOfWeek outside range 0-6", () => {
		const result = recurringPatternSchema.safeParse({
			type: "weekly",
			daysOfWeek: [7],
		});
		expect(result.success).toBe(false);
	});

	it("rejects negative daysOfWeek", () => {
		const result = recurringPatternSchema.safeParse({
			type: "weekly",
			daysOfWeek: [-1],
		});
		expect(result.success).toBe(false);
	});

	it("rejects dayOfMonth outside range 1-31", () => {
		const result = recurringPatternSchema.safeParse({
			type: "monthly",
			dayOfMonth: 32,
		});
		expect(result.success).toBe(false);
	});

	it("rejects monthOfYear outside range 1-12", () => {
		const result = recurringPatternSchema.safeParse({
			type: "yearly",
			monthOfYear: 13,
		});
		expect(result.success).toBe(false);
	});

	it("rejects zero interval", () => {
		const result = recurringPatternSchema.safeParse({
			type: "daily",
			interval: 0,
		});
		expect(result.success).toBe(false);
	});

	it("rejects negative interval", () => {
		const result = recurringPatternSchema.safeParse({
			type: "daily",
			interval: -1,
		});
		expect(result.success).toBe(false);
	});

	it("rejects zero occurrences", () => {
		const result = recurringPatternSchema.safeParse({
			type: "daily",
			occurrences: 0,
		});
		expect(result.success).toBe(false);
	});
});

describe("isPatternExpired", () => {
	it("returns false for pattern without end conditions", () => {
		const pattern: RecurringPattern = { type: "daily" };
		const result = isPatternExpired(pattern, new Date("2026-01-15"), 5);
		expect(result).toBe(false);
	});

	it("returns true when fromDate exceeds endDate", () => {
		const pattern: RecurringPattern = {
			type: "daily",
			endDate: "2026-01-10",
		};
		const result = isPatternExpired(pattern, new Date("2026-01-15"), 0);
		expect(result).toBe(true);
	});

	it("returns false when fromDate is before endDate", () => {
		const pattern: RecurringPattern = {
			type: "daily",
			endDate: "2026-01-20",
		};
		const result = isPatternExpired(pattern, new Date("2026-01-15"), 0);
		expect(result).toBe(false);
	});

	it("returns true when completedOccurrences reaches max occurrences", () => {
		const pattern: RecurringPattern = {
			type: "daily",
			occurrences: 5,
		};
		const result = isPatternExpired(pattern, new Date("2026-01-15"), 5);
		expect(result).toBe(true);
	});

	it("returns false when completedOccurrences is below max", () => {
		const pattern: RecurringPattern = {
			type: "daily",
			occurrences: 5,
		};
		const result = isPatternExpired(pattern, new Date("2026-01-15"), 3);
		expect(result).toBe(false);
	});

	it("returns true when both conditions are met (endDate)", () => {
		const pattern: RecurringPattern = {
			type: "daily",
			endDate: "2026-01-10",
			occurrences: 10,
		};
		const result = isPatternExpired(pattern, new Date("2026-01-15"), 3);
		expect(result).toBe(true);
	});

	it("returns true when both conditions are met (occurrences)", () => {
		const pattern: RecurringPattern = {
			type: "daily",
			endDate: "2026-01-20",
			occurrences: 5,
		};
		const result = isPatternExpired(pattern, new Date("2026-01-15"), 5);
		expect(result).toBe(true);
	});
});

describe("getNextOccurrence", () => {
	describe("daily patterns", () => {
		it("returns next day for simple daily pattern", () => {
			const pattern: RecurringPattern = { type: "daily" };
			const fromDate = new Date("2026-01-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getFullYear()).toBe(2026);
			expect(result?.getMonth()).toBe(0); // January
			expect(result?.getDate()).toBe(16);
		});

		it("returns correct date for daily with interval 3", () => {
			const pattern: RecurringPattern = { type: "daily", interval: 3 };
			const fromDate = new Date("2026-01-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(18);
		});

		it("handles month boundary correctly", () => {
			const pattern: RecurringPattern = { type: "daily" };
			const fromDate = new Date("2026-01-31T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getMonth()).toBe(1); // February
			expect(result?.getDate()).toBe(1);
		});

		it("handles year boundary correctly", () => {
			const pattern: RecurringPattern = { type: "daily" };
			const fromDate = new Date("2026-12-31T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getFullYear()).toBe(2027);
			expect(result?.getMonth()).toBe(0);
			expect(result?.getDate()).toBe(1);
		});

		it("returns null when pattern is expired by occurrences", () => {
			const pattern: RecurringPattern = { type: "daily", occurrences: 5 };
			const result = getNextOccurrence(pattern, new Date("2026-01-15"), 5);
			expect(result).toBeNull();
		});

		it("returns null when next occurrence would exceed endDate", () => {
			const pattern: RecurringPattern = {
				type: "daily",
				endDate: "2026-01-15",
			};
			const result = getNextOccurrence(pattern, new Date("2026-01-15"), 0);
			expect(result).toBeNull();
		});
	});

	describe("weekly patterns", () => {
		it("returns next week for simple weekly pattern", () => {
			const pattern: RecurringPattern = { type: "weekly" };
			const fromDate = new Date("2026-01-15T10:00:00Z"); // Wednesday
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(22);
		});

		it("returns correct date for weekly with interval 2", () => {
			const pattern: RecurringPattern = { type: "weekly", interval: 2 };
			const fromDate = new Date("2026-01-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(29);
		});

		it("finds next matching day in current week", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [5], // Friday
			};
			const fromDate = new Date("2026-01-15T10:00:00Z"); // Thursday (day 4)
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDay()).toBe(5); // Friday
			expect(result?.getDate()).toBe(16); // Jan 16, 2026 is Friday
		});

		it("finds next matching day in next week when no days left in current week", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [1], // Monday
			};
			const fromDate = new Date("2026-01-15T10:00:00Z"); // Wednesday
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDay()).toBe(1); // Monday
			expect(result?.getDate()).toBe(19); // Next Monday
		});

		it("handles multiple days of week", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
			};
			const fromDate = new Date("2026-01-15T10:00:00Z"); // Wednesday
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDay()).toBe(5); // Friday (next matching day)
		});

		it("skips weeks with interval when moving to next week", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				interval: 2,
				daysOfWeek: [1], // Monday
			};
			const fromDate = new Date("2026-01-15T10:00:00Z"); // Wednesday
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			// Should skip to Monday 2 weeks later (accounting for current week)
			expect(result?.getDay()).toBe(1);
		});
	});

	describe("monthly patterns", () => {
		it("returns next month for simple monthly pattern", () => {
			const pattern: RecurringPattern = { type: "monthly" };
			const fromDate = new Date("2026-01-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getMonth()).toBe(1); // February
			expect(result?.getDate()).toBe(15);
		});

		it("returns correct date for monthly with interval 3", () => {
			const pattern: RecurringPattern = { type: "monthly", interval: 3 };
			const fromDate = new Date("2026-01-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getMonth()).toBe(3); // April
		});

		it("uses specified dayOfMonth", () => {
			const pattern: RecurringPattern = { type: "monthly", dayOfMonth: 1 };
			const fromDate = new Date("2026-01-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getMonth()).toBe(1); // February
			expect(result?.getDate()).toBe(1);
		});

		it("handles months with fewer days", () => {
			const pattern: RecurringPattern = { type: "monthly", dayOfMonth: 31 };
			const fromDate = new Date("2026-01-31T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getMonth()).toBe(1); // February
			expect(result?.getDate()).toBe(28); // Last day of Feb 2026
		});

		it("handles year boundary", () => {
			const pattern: RecurringPattern = { type: "monthly" };
			const fromDate = new Date("2026-12-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getFullYear()).toBe(2027);
			expect(result?.getMonth()).toBe(0); // January
		});
	});

	describe("yearly patterns", () => {
		it("returns next year for simple yearly pattern", () => {
			const pattern: RecurringPattern = { type: "yearly" };
			const fromDate = new Date("2026-01-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getFullYear()).toBe(2027);
			expect(result?.getMonth()).toBe(0);
			expect(result?.getDate()).toBe(15);
		});

		it("returns correct date for yearly with interval 2", () => {
			const pattern: RecurringPattern = { type: "yearly", interval: 2 };
			const fromDate = new Date("2026-01-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getFullYear()).toBe(2028);
		});

		it("uses specified monthOfYear and dayOfMonth", () => {
			const pattern: RecurringPattern = {
				type: "yearly",
				monthOfYear: 7, // July
				dayOfMonth: 4,
			};
			const fromDate = new Date("2026-01-15T10:00:00Z");
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getFullYear()).toBe(2027);
			expect(result?.getMonth()).toBe(6); // July (0-indexed)
			expect(result?.getDate()).toBe(4);
		});

		it("handles Feb 29 in non-leap year", () => {
			const pattern: RecurringPattern = {
				type: "yearly",
				monthOfYear: 2,
				dayOfMonth: 29,
			};
			const fromDate = new Date("2026-02-28T10:00:00Z"); // 2026 is not a leap year
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getMonth()).toBe(1); // February
			// Should be 28 in 2027 (non-leap year)
			expect(result?.getDate()).toBe(28);
		});
	});

	describe("custom patterns", () => {
		it("behaves like weekly with specific days", () => {
			const pattern: RecurringPattern = {
				type: "custom",
				daysOfWeek: [2, 5], // Tuesday, Friday
			};
			const fromDate = new Date("2026-01-15T10:00:00Z"); // Thursday (day 4)
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDay()).toBe(5); // Friday (next matching day after Thursday)
		});

		it("respects interval for custom patterns", () => {
			const pattern: RecurringPattern = {
				type: "custom",
				daysOfWeek: [1], // Monday
				interval: 2,
			};
			const fromDate = new Date("2026-01-15T10:00:00Z"); // Wednesday
			const result = getNextOccurrence(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDay()).toBe(1); // Monday
		});
	});

	describe("edge cases", () => {
		it("returns null for expired pattern", () => {
			const pattern: RecurringPattern = {
				type: "daily",
				endDate: "2026-01-10",
			};
			const result = getNextOccurrence(pattern, new Date("2026-01-15"), 0);
			expect(result).toBeNull();
		});

		it("handles completedOccurrences check correctly", () => {
			const pattern: RecurringPattern = { type: "daily", occurrences: 3 };
			// 1 completed, next would be 2nd occurrence
			const result = getNextOccurrence(pattern, new Date("2026-01-15"), 1);
			expect(result).not.toBeNull();

			// 2 completed, next would be 3rd (last allowed)
			const result2 = getNextOccurrence(pattern, new Date("2026-01-15"), 2);
			expect(result2).not.toBeNull();

			// 3 completed, next would be 4th, which exceeds max
			const result3 = getNextOccurrence(pattern, new Date("2026-01-15"), 3);
			expect(result3).toBeNull();
		});
	});
});

describe("parseRecurringDescription", () => {
	describe("daily patterns", () => {
		it('parses "daily"', () => {
			const result = parseRecurringDescription("daily");
			expect(result).toEqual({ type: "daily" });
		});

		it('parses "every day"', () => {
			const result = parseRecurringDescription("every day");
			expect(result).toEqual({ type: "daily" });
		});

		it('parses "Every Day" (case insensitive)', () => {
			const result = parseRecurringDescription("Every Day");
			expect(result).toEqual({ type: "daily" });
		});

		it('parses "every 3 days"', () => {
			const result = parseRecurringDescription("every 3 days");
			expect(result).toEqual({ type: "daily", interval: 3 });
		});

		it('parses "every 1 day" (singular)', () => {
			const result = parseRecurringDescription("every 1 day");
			expect(result).toEqual({ type: "daily", interval: 1 });
		});
	});

	describe("weekly patterns", () => {
		it('parses "weekly"', () => {
			const result = parseRecurringDescription("weekly");
			expect(result).toEqual({ type: "weekly" });
		});

		it('parses "every week"', () => {
			const result = parseRecurringDescription("every week");
			expect(result).toEqual({ type: "weekly" });
		});

		it('parses "every 2 weeks"', () => {
			const result = parseRecurringDescription("every 2 weeks");
			expect(result).toEqual({ type: "weekly", interval: 2 });
		});

		it('parses "every Monday"', () => {
			const result = parseRecurringDescription("every Monday");
			expect(result).toEqual({ type: "weekly", daysOfWeek: [1] });
		});

		it('parses "every mon" (short name)', () => {
			const result = parseRecurringDescription("every mon");
			expect(result).toEqual({ type: "weekly", daysOfWeek: [1] });
		});

		it('parses "every Mon, Wed, Fri"', () => {
			const result = parseRecurringDescription("every Mon, Wed, Fri");
			expect(result).toEqual({ type: "weekly", daysOfWeek: [1, 3, 5] });
		});

		it('parses "every Tuesday and Thursday"', () => {
			const result = parseRecurringDescription("every Tuesday and Thursday");
			expect(result).toEqual({ type: "weekly", daysOfWeek: [2, 4] });
		});

		it('parses "every Sun"', () => {
			const result = parseRecurringDescription("every Sun");
			expect(result).toEqual({ type: "weekly", daysOfWeek: [0] });
		});

		it('parses "every Saturday"', () => {
			const result = parseRecurringDescription("every Saturday");
			expect(result).toEqual({ type: "weekly", daysOfWeek: [6] });
		});

		it("deduplicates days of week", () => {
			const result = parseRecurringDescription("every Mon, Monday");
			expect(result).toEqual({ type: "weekly", daysOfWeek: [1] });
		});
	});

	describe("monthly patterns", () => {
		it('parses "monthly"', () => {
			const result = parseRecurringDescription("monthly");
			expect(result).toEqual({ type: "monthly" });
		});

		it('parses "every month"', () => {
			const result = parseRecurringDescription("every month");
			expect(result).toEqual({ type: "monthly" });
		});

		it('parses "every 3 months"', () => {
			const result = parseRecurringDescription("every 3 months");
			expect(result).toEqual({ type: "monthly", interval: 3 });
		});

		it('parses "every month on the 15th"', () => {
			const result = parseRecurringDescription("every month on the 15th");
			expect(result).toEqual({ type: "monthly", dayOfMonth: 15 });
		});

		it('parses "every month on 1st"', () => {
			const result = parseRecurringDescription("every month on 1st");
			expect(result).toEqual({ type: "monthly", dayOfMonth: 1 });
		});

		it('parses "every month on the 2nd"', () => {
			const result = parseRecurringDescription("every month on the 2nd");
			expect(result).toEqual({ type: "monthly", dayOfMonth: 2 });
		});

		it('parses "every month on the 3rd"', () => {
			const result = parseRecurringDescription("every month on the 3rd");
			expect(result).toEqual({ type: "monthly", dayOfMonth: 3 });
		});

		it('parses "every month on the 31" (no suffix)', () => {
			const result = parseRecurringDescription("every month on the 31");
			expect(result).toEqual({ type: "monthly", dayOfMonth: 31 });
		});
	});

	describe("yearly patterns", () => {
		it('parses "yearly"', () => {
			const result = parseRecurringDescription("yearly");
			expect(result).toEqual({ type: "yearly" });
		});

		it('parses "every year"', () => {
			const result = parseRecurringDescription("every year");
			expect(result).toEqual({ type: "yearly" });
		});

		it('parses "every 2 years"', () => {
			const result = parseRecurringDescription("every 2 years");
			expect(result).toEqual({ type: "yearly", interval: 2 });
		});
	});

	describe("invalid patterns", () => {
		it("returns null for unrecognized pattern", () => {
			const result = parseRecurringDescription("sometimes");
			expect(result).toBeNull();
		});

		it("returns null for empty string", () => {
			const result = parseRecurringDescription("");
			expect(result).toBeNull();
		});

		it("returns null for invalid day of month (32)", () => {
			const result = parseRecurringDescription("every month on the 32nd");
			expect(result).toBeNull();
		});

		it("returns null for invalid day of month (0)", () => {
			const result = parseRecurringDescription("every month on the 0th");
			expect(result).toBeNull();
		});
	});
});

describe("formatRecurringPattern", () => {
	describe("daily patterns", () => {
		it('formats simple daily as "Daily"', () => {
			const pattern: RecurringPattern = { type: "daily" };
			expect(formatRecurringPattern(pattern)).toBe("Daily");
		});

		it('formats interval 1 as "Daily"', () => {
			const pattern: RecurringPattern = { type: "daily", interval: 1 };
			expect(formatRecurringPattern(pattern)).toBe("Daily");
		});

		it('formats interval > 1 as "Every N days"', () => {
			const pattern: RecurringPattern = { type: "daily", interval: 3 };
			expect(formatRecurringPattern(pattern)).toBe("Every 3 days");
		});
	});

	describe("weekly patterns", () => {
		it('formats simple weekly as "Weekly"', () => {
			const pattern: RecurringPattern = { type: "weekly" };
			expect(formatRecurringPattern(pattern)).toBe("Weekly");
		});

		it('formats weekly with interval as "Every N weeks"', () => {
			const pattern: RecurringPattern = { type: "weekly", interval: 2 };
			expect(formatRecurringPattern(pattern)).toBe("Every 2 weeks");
		});

		it('formats weekly with days as "Weekly on ..."', () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [1, 3, 5],
			};
			expect(formatRecurringPattern(pattern)).toBe("Weekly on Mon, Wed, Fri");
		});

		it('formats weekly with days and interval as "Every N weeks on ..."', () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				interval: 2,
				daysOfWeek: [2, 4],
			};
			expect(formatRecurringPattern(pattern)).toBe("Every 2 weeks on Tue, Thu");
		});

		it("formats Sunday correctly", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [0],
			};
			expect(formatRecurringPattern(pattern)).toBe("Weekly on Sun");
		});

		it("formats Saturday correctly", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [6],
			};
			expect(formatRecurringPattern(pattern)).toBe("Weekly on Sat");
		});
	});

	describe("monthly patterns", () => {
		it('formats simple monthly as "Monthly"', () => {
			const pattern: RecurringPattern = { type: "monthly" };
			expect(formatRecurringPattern(pattern)).toBe("Monthly");
		});

		it('formats monthly with interval as "Every N months"', () => {
			const pattern: RecurringPattern = { type: "monthly", interval: 3 };
			expect(formatRecurringPattern(pattern)).toBe("Every 3 months");
		});

		it('formats monthly with dayOfMonth as "Monthly on the Nth"', () => {
			const pattern: RecurringPattern = { type: "monthly", dayOfMonth: 15 };
			expect(formatRecurringPattern(pattern)).toBe("Monthly on the 15th");
		});

		it("formats ordinals correctly (1st, 2nd, 3rd)", () => {
			expect(formatRecurringPattern({ type: "monthly", dayOfMonth: 1 })).toBe(
				"Monthly on the 1st",
			);
			expect(formatRecurringPattern({ type: "monthly", dayOfMonth: 2 })).toBe(
				"Monthly on the 2nd",
			);
			expect(formatRecurringPattern({ type: "monthly", dayOfMonth: 3 })).toBe(
				"Monthly on the 3rd",
			);
			expect(formatRecurringPattern({ type: "monthly", dayOfMonth: 4 })).toBe(
				"Monthly on the 4th",
			);
			expect(formatRecurringPattern({ type: "monthly", dayOfMonth: 11 })).toBe(
				"Monthly on the 11th",
			);
			expect(formatRecurringPattern({ type: "monthly", dayOfMonth: 21 })).toBe(
				"Monthly on the 21st",
			);
			expect(formatRecurringPattern({ type: "monthly", dayOfMonth: 22 })).toBe(
				"Monthly on the 22nd",
			);
			expect(formatRecurringPattern({ type: "monthly", dayOfMonth: 23 })).toBe(
				"Monthly on the 23rd",
			);
		});

		it('formats monthly with interval and dayOfMonth as "Every N months on the Nth"', () => {
			const pattern: RecurringPattern = {
				type: "monthly",
				interval: 2,
				dayOfMonth: 1,
			};
			expect(formatRecurringPattern(pattern)).toBe("Every 2 months on the 1st");
		});
	});

	describe("yearly patterns", () => {
		it('formats simple yearly as "Yearly"', () => {
			const pattern: RecurringPattern = { type: "yearly" };
			expect(formatRecurringPattern(pattern)).toBe("Yearly");
		});

		it('formats yearly with interval as "Every N years"', () => {
			const pattern: RecurringPattern = { type: "yearly", interval: 2 };
			expect(formatRecurringPattern(pattern)).toBe("Every 2 years");
		});

		it('formats yearly with monthOfYear and dayOfMonth as "Yearly on Month Day"', () => {
			const pattern: RecurringPattern = {
				type: "yearly",
				monthOfYear: 7,
				dayOfMonth: 4,
			};
			expect(formatRecurringPattern(pattern)).toBe("Yearly on Jul 4");
		});

		it("formats yearly with interval, monthOfYear, and dayOfMonth", () => {
			const pattern: RecurringPattern = {
				type: "yearly",
				interval: 4,
				monthOfYear: 11,
				dayOfMonth: 8,
			};
			expect(formatRecurringPattern(pattern)).toBe("Every 4 years on Nov 8");
		});
	});

	describe("custom patterns", () => {
		it('formats custom without days as "Custom"', () => {
			const pattern: RecurringPattern = { type: "custom" };
			expect(formatRecurringPattern(pattern)).toBe("Custom");
		});

		it('formats custom with days as "Custom: ..."', () => {
			const pattern: RecurringPattern = {
				type: "custom",
				daysOfWeek: [2, 4],
			};
			expect(formatRecurringPattern(pattern)).toBe("Custom: Tue, Thu");
		});

		it('formats custom with days and interval as "Custom: ... every N weeks"', () => {
			const pattern: RecurringPattern = {
				type: "custom",
				daysOfWeek: [1, 3, 5],
				interval: 2,
			};
			expect(formatRecurringPattern(pattern)).toBe(
				"Custom: Mon, Wed, Fri every 2 weeks",
			);
		});
	});
});

describe("getNextNotificationTime", () => {
	describe("patterns without notifyAt", () => {
		it("returns null when notifyAt is not set", () => {
			const pattern: RecurringPattern = { type: "daily" };
			const result = getNextNotificationTime(
				pattern,
				new Date("2026-01-15T10:00:00"),
			);
			expect(result).toBeNull();
		});

		it("returns null for weekly pattern without notifyAt", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [1, 3, 5],
			};
			const result = getNextNotificationTime(
				pattern,
				new Date("2026-01-15T10:00:00"),
			);
			expect(result).toBeNull();
		});
	});

	describe("daily patterns with notifyAt", () => {
		it("returns tomorrow at specified time for daily pattern", () => {
			const pattern: RecurringPattern = { type: "daily", notifyAt: "09:00" };
			const fromDate = new Date("2026-01-15T10:00:00");
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getFullYear()).toBe(2026);
			expect(result?.getMonth()).toBe(0); // January
			expect(result?.getDate()).toBe(16);
			expect(result?.getHours()).toBe(9);
			expect(result?.getMinutes()).toBe(0);
			expect(result?.getSeconds()).toBe(0);
		});

		it("returns next occurrence at notifyAt time when calculated time is in past", () => {
			// fromDate is Jan 15 at 10:00, daily pattern with 09:00 notifyAt
			// Next occurrence would be Jan 16 at 09:00
			const pattern: RecurringPattern = { type: "daily", notifyAt: "09:00" };
			const fromDate = new Date("2026-01-15T10:00:00");
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(16);
			expect(result?.getHours()).toBe(9);
		});

		it("returns correct time for daily with interval 3", () => {
			const pattern: RecurringPattern = {
				type: "daily",
				interval: 3,
				notifyAt: "14:30",
			};
			const fromDate = new Date("2026-01-15T08:00:00");
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(18); // 15 + 3
			expect(result?.getHours()).toBe(14);
			expect(result?.getMinutes()).toBe(30);
		});

		it("handles midnight notifyAt (00:00)", () => {
			const pattern: RecurringPattern = { type: "daily", notifyAt: "00:00" };
			const fromDate = new Date("2026-01-15T10:00:00");
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(16);
			expect(result?.getHours()).toBe(0);
			expect(result?.getMinutes()).toBe(0);
		});

		it("handles end of day notifyAt (23:59)", () => {
			const pattern: RecurringPattern = { type: "daily", notifyAt: "23:59" };
			const fromDate = new Date("2026-01-15T10:00:00");
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDate()).toBe(16);
			expect(result?.getHours()).toBe(23);
			expect(result?.getMinutes()).toBe(59);
		});
	});

	describe("weekly patterns with notifyAt", () => {
		it("returns correct day and time for weekly pattern", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [5], // Friday
				notifyAt: "12:00",
			};
			const fromDate = new Date("2026-01-15T10:00:00"); // Thursday
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDay()).toBe(5); // Friday
			expect(result?.getDate()).toBe(16); // Jan 16, 2026 is Friday
			expect(result?.getHours()).toBe(12);
			expect(result?.getMinutes()).toBe(0);
		});

		it("returns next week when no matching day in current week", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [1], // Monday
				notifyAt: "09:00",
			};
			const fromDate = new Date("2026-01-15T10:00:00"); // Thursday
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDay()).toBe(1); // Monday
			expect(result?.getDate()).toBe(19); // Next Monday
			expect(result?.getHours()).toBe(9);
		});

		it("handles multiple days of week with notifyAt", () => {
			const pattern: RecurringPattern = {
				type: "weekly",
				daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
				notifyAt: "08:00",
			};
			const fromDate = new Date("2026-01-15T10:00:00"); // Thursday
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getDay()).toBe(5); // Friday
			expect(result?.getHours()).toBe(8);
		});
	});

	describe("monthly patterns with notifyAt", () => {
		it("returns next month with specified day and time", () => {
			const pattern: RecurringPattern = {
				type: "monthly",
				dayOfMonth: 1,
				notifyAt: "08:00",
			};
			const fromDate = new Date("2026-01-15T10:00:00");
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getMonth()).toBe(1); // February
			expect(result?.getDate()).toBe(1);
			expect(result?.getHours()).toBe(8);
			expect(result?.getMinutes()).toBe(0);
		});

		it("handles months with fewer days", () => {
			const pattern: RecurringPattern = {
				type: "monthly",
				dayOfMonth: 31,
				notifyAt: "09:00",
			};
			const fromDate = new Date("2026-01-31T10:00:00");
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getMonth()).toBe(1); // February
			expect(result?.getDate()).toBe(28); // Last day of Feb 2026
			expect(result?.getHours()).toBe(9);
		});
	});

	describe("yearly patterns with notifyAt", () => {
		it("returns next year with specified month, day, and time", () => {
			const pattern: RecurringPattern = {
				type: "yearly",
				monthOfYear: 7, // July
				dayOfMonth: 4,
				notifyAt: "10:00",
			};
			const fromDate = new Date("2026-01-15T10:00:00");
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getFullYear()).toBe(2027);
			expect(result?.getMonth()).toBe(6); // July (0-indexed)
			expect(result?.getDate()).toBe(4);
			expect(result?.getHours()).toBe(10);
		});
	});

	describe("edge cases", () => {
		it("returns null for expired pattern", () => {
			const pattern: RecurringPattern = {
				type: "daily",
				endDate: "2026-01-10",
				notifyAt: "09:00",
			};
			const result = getNextNotificationTime(
				pattern,
				new Date("2026-01-15T10:00:00"),
			);
			expect(result).toBeNull();
		});

		it("returns null when next occurrence with time would exceed endDate", () => {
			const pattern: RecurringPattern = {
				type: "daily",
				endDate: "2026-01-15",
				notifyAt: "09:00",
			};
			const result = getNextNotificationTime(
				pattern,
				new Date("2026-01-15T10:00:00"),
			);
			expect(result).toBeNull();
		});

		it("uses current date when fromDate is not provided", () => {
			const pattern: RecurringPattern = { type: "daily", notifyAt: "09:00" };
			const result = getNextNotificationTime(pattern);

			expect(result).not.toBeNull();
			// Result should be in the future
			expect(result?.getTime()).toBeGreaterThan(Date.now());
		});

		it("sets seconds and milliseconds to zero", () => {
			const pattern: RecurringPattern = { type: "daily", notifyAt: "14:30" };
			const fromDate = new Date("2026-01-15T10:00:00.123");
			const result = getNextNotificationTime(pattern, fromDate);

			expect(result).not.toBeNull();
			expect(result?.getSeconds()).toBe(0);
			expect(result?.getMilliseconds()).toBe(0);
		});
	});
});
