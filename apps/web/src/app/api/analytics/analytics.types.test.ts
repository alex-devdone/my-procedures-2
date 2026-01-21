import { describe, expect, it } from "vitest";
import {
	type AnalyticsData,
	type CompletionRecord,
	type DailyStats,
	getAnalyticsInputSchema,
	getCompletionHistoryInputSchema,
} from "./analytics.types";

describe("Analytics Input Schemas", () => {
	describe("getAnalyticsInputSchema", () => {
		it("accepts valid date range with ISO datetime strings", () => {
			const result = getAnalyticsInputSchema.safeParse({
				startDate: "2024-01-01T00:00:00.000Z",
				endDate: "2024-01-31T23:59:59.999Z",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.startDate).toBe("2024-01-01T00:00:00.000Z");
				expect(result.data.endDate).toBe("2024-01-31T23:59:59.999Z");
			}
		});

		it("rejects date range with timezone offset (requires UTC Z format)", () => {
			const result = getAnalyticsInputSchema.safeParse({
				startDate: "2024-01-01T00:00:00+05:00",
				endDate: "2024-01-31T23:59:59-08:00",
			});
			expect(result.success).toBe(false);
		});

		it("accepts date range without milliseconds", () => {
			const result = getAnalyticsInputSchema.safeParse({
				startDate: "2024-01-01T00:00:00Z",
				endDate: "2024-01-31T23:59:59Z",
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing startDate", () => {
			const result = getAnalyticsInputSchema.safeParse({
				endDate: "2024-01-31T23:59:59.999Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing endDate", () => {
			const result = getAnalyticsInputSchema.safeParse({
				startDate: "2024-01-01T00:00:00.000Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects empty object", () => {
			const result = getAnalyticsInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("rejects invalid date format (non-ISO)", () => {
			const result = getAnalyticsInputSchema.safeParse({
				startDate: "2024-01-01",
				endDate: "2024-01-31",
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid date format (text)", () => {
			const result = getAnalyticsInputSchema.safeParse({
				startDate: "January 1, 2024",
				endDate: "January 31, 2024",
			});
			expect(result.success).toBe(false);
		});

		it("rejects non-string date values", () => {
			const result = getAnalyticsInputSchema.safeParse({
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
			});
			expect(result.success).toBe(false);
		});

		it("rejects numeric timestamps", () => {
			const result = getAnalyticsInputSchema.safeParse({
				startDate: 1704067200000,
				endDate: 1706745599999,
			});
			expect(result.success).toBe(false);
		});
	});

	describe("getCompletionHistoryInputSchema", () => {
		it("accepts valid date range with ISO datetime strings", () => {
			const result = getCompletionHistoryInputSchema.safeParse({
				startDate: "2024-01-01T00:00:00.000Z",
				endDate: "2024-01-31T23:59:59.999Z",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.startDate).toBe("2024-01-01T00:00:00.000Z");
				expect(result.data.endDate).toBe("2024-01-31T23:59:59.999Z");
			}
		});

		it("rejects date range with timezone offset (requires UTC Z format)", () => {
			const result = getCompletionHistoryInputSchema.safeParse({
				startDate: "2024-06-15T08:30:00+02:00",
				endDate: "2024-06-30T18:00:00-05:00",
			});
			expect(result.success).toBe(false);
		});

		it("accepts date range without milliseconds", () => {
			const result = getCompletionHistoryInputSchema.safeParse({
				startDate: "2024-06-15T08:30:00Z",
				endDate: "2024-06-30T18:00:00Z",
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing startDate", () => {
			const result = getCompletionHistoryInputSchema.safeParse({
				endDate: "2024-01-31T23:59:59.999Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing endDate", () => {
			const result = getCompletionHistoryInputSchema.safeParse({
				startDate: "2024-01-01T00:00:00.000Z",
			});
			expect(result.success).toBe(false);
		});

		it("rejects empty object", () => {
			const result = getCompletionHistoryInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("rejects invalid date format (date only)", () => {
			const result = getCompletionHistoryInputSchema.safeParse({
				startDate: "2024-01-01",
				endDate: "2024-01-31",
			});
			expect(result.success).toBe(false);
		});

		it("rejects null values", () => {
			const result = getCompletionHistoryInputSchema.safeParse({
				startDate: null,
				endDate: null,
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Analytics Type Interfaces", () => {
	describe("DailyStats interface", () => {
		it("can be used as a valid type", () => {
			const stats: DailyStats = {
				date: "2024-01-15",
				regularCompleted: 5,
				recurringCompleted: 3,
				recurringMissed: 1,
			};

			expect(stats.date).toBe("2024-01-15");
			expect(stats.regularCompleted).toBe(5);
			expect(stats.recurringCompleted).toBe(3);
			expect(stats.recurringMissed).toBe(1);
		});

		it("allows zero values for all counters", () => {
			const stats: DailyStats = {
				date: "2024-01-15",
				regularCompleted: 0,
				recurringCompleted: 0,
				recurringMissed: 0,
			};

			expect(stats.regularCompleted).toBe(0);
			expect(stats.recurringCompleted).toBe(0);
			expect(stats.recurringMissed).toBe(0);
		});
	});

	describe("CompletionRecord interface", () => {
		it("can be used for completed regular todo", () => {
			const record: CompletionRecord = {
				todoId: 123,
				todoText: "Complete project report",
				scheduledDate: "2024-01-15T09:00:00.000Z",
				completedAt: "2024-01-15T10:30:00.000Z",
				isRecurring: false,
			};

			expect(record.todoId).toBe(123);
			expect(record.todoText).toBe("Complete project report");
			expect(record.completedAt).toBe("2024-01-15T10:30:00.000Z");
			expect(record.isRecurring).toBe(false);
		});

		it("can be used for incomplete recurring todo", () => {
			const record: CompletionRecord = {
				todoId: 456,
				todoText: "Daily standup",
				scheduledDate: "2024-01-15T09:00:00.000Z",
				completedAt: null,
				isRecurring: true,
			};

			expect(record.todoId).toBe(456);
			expect(record.completedAt).toBeNull();
			expect(record.isRecurring).toBe(true);
		});

		it("can be used for completed recurring todo", () => {
			const record: CompletionRecord = {
				todoId: 789,
				todoText: "Morning exercise",
				scheduledDate: "2024-01-15T06:00:00.000Z",
				completedAt: "2024-01-15T07:15:00.000Z",
				isRecurring: true,
			};

			expect(record.completedAt).toBe("2024-01-15T07:15:00.000Z");
			expect(record.isRecurring).toBe(true);
		});
	});

	describe("AnalyticsData interface", () => {
		it("can be used with complete analytics data", () => {
			const analytics: AnalyticsData = {
				totalRegularCompleted: 25,
				totalRecurringCompleted: 15,
				totalRecurringMissed: 5,
				completionRate: 80,
				currentStreak: 7,
				dailyBreakdown: [
					{
						date: "2024-01-15",
						regularCompleted: 3,
						recurringCompleted: 2,
						recurringMissed: 0,
					},
					{
						date: "2024-01-16",
						regularCompleted: 4,
						recurringCompleted: 1,
						recurringMissed: 1,
					},
				],
			};

			expect(analytics.totalRegularCompleted).toBe(25);
			expect(analytics.totalRecurringCompleted).toBe(15);
			expect(analytics.totalRecurringMissed).toBe(5);
			expect(analytics.completionRate).toBe(80);
			expect(analytics.currentStreak).toBe(7);
			expect(analytics.dailyBreakdown).toHaveLength(2);
		});

		it("can be used with empty daily breakdown", () => {
			const analytics: AnalyticsData = {
				totalRegularCompleted: 0,
				totalRecurringCompleted: 0,
				totalRecurringMissed: 0,
				completionRate: 100,
				currentStreak: 0,
				dailyBreakdown: [],
			};

			expect(analytics.dailyBreakdown).toHaveLength(0);
			expect(analytics.completionRate).toBe(100);
		});

		it("can be used with 100% completion rate", () => {
			const analytics: AnalyticsData = {
				totalRegularCompleted: 10,
				totalRecurringCompleted: 20,
				totalRecurringMissed: 0,
				completionRate: 100,
				currentStreak: 30,
				dailyBreakdown: [],
			};

			expect(analytics.completionRate).toBe(100);
			expect(analytics.totalRecurringMissed).toBe(0);
		});

		it("can be used with 0% completion rate", () => {
			const analytics: AnalyticsData = {
				totalRegularCompleted: 0,
				totalRecurringCompleted: 0,
				totalRecurringMissed: 10,
				completionRate: 0,
				currentStreak: 0,
				dailyBreakdown: [],
			};

			expect(analytics.completionRate).toBe(0);
			expect(analytics.currentStreak).toBe(0);
		});
	});
});
