import { describe, expect, it, vi } from "vitest";

// Mock the tRPC module
vi.mock("@/utils/trpc", () => ({
	trpc: {
		todo: {
			getAnalytics: {
				queryOptions: vi.fn((input) => ({
					queryKey: ["todo", "getAnalytics", input],
					queryFn: vi.fn(),
				})),
				queryKey: vi.fn((input) => ["todo", "getAnalytics", input]),
			},
			getCompletionHistory: {
				queryOptions: vi.fn((input) => ({
					queryKey: ["todo", "getCompletionHistory", input],
					queryFn: vi.fn(),
				})),
				queryKey: vi.fn((input) => ["todo", "getCompletionHistory", input]),
			},
			updatePastCompletion: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["todo", "updatePastCompletion"],
					mutationFn: vi.fn(),
				})),
			},
		},
	},
}));

import {
	getAnalyticsQueryKey,
	getAnalyticsQueryOptions,
	getCompletionHistoryQueryKey,
	getCompletionHistoryQueryOptions,
	getUpdatePastCompletionMutationOptions,
} from "./analytics.api";

describe("Analytics API", () => {
	describe("Query Options", () => {
		describe("getAnalyticsQueryOptions", () => {
			it("returns query options for fetching analytics data", () => {
				const input = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const options = getAnalyticsQueryOptions(input);

				expect(options).toBeDefined();
				expect(options).toHaveProperty("queryKey");
				expect(options).toHaveProperty("queryFn");
			});

			it("includes date range input in query options", () => {
				const input = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const options = getAnalyticsQueryOptions(input);

				expect(options.queryKey).toContain("todo");
				expect(options.queryKey).toContain("getAnalytics");
				expect(options.queryKey).toContainEqual(input);
			});

			it("handles different date ranges", () => {
				const weekInput = {
					startDate: "2026-01-15T00:00:00.000Z",
					endDate: "2026-01-21T23:59:59.999Z",
				};
				const options = getAnalyticsQueryOptions(weekInput);

				expect(options).toBeDefined();
				expect(options.queryKey).toContainEqual(weekInput);
			});
		});

		describe("getAnalyticsQueryKey", () => {
			it("returns query key for analytics data", () => {
				const input = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const queryKey = getAnalyticsQueryKey(input);

				expect(queryKey).toBeDefined();
				expect(Array.isArray(queryKey)).toBe(true);
			});

			it("includes date range in query key", () => {
				const input = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const queryKey = getAnalyticsQueryKey(input);

				expect(queryKey).toContain("todo");
				expect(queryKey).toContain("getAnalytics");
				expect(queryKey).toContainEqual(input);
			});

			it("generates different keys for different date ranges", () => {
				const input1 = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const input2 = {
					startDate: "2026-02-01T00:00:00.000Z",
					endDate: "2026-02-28T23:59:59.999Z",
				};
				const queryKey1 = getAnalyticsQueryKey(input1);
				const queryKey2 = getAnalyticsQueryKey(input2);

				expect(queryKey1).toContainEqual(input1);
				expect(queryKey2).toContainEqual(input2);
			});
		});

		describe("getCompletionHistoryQueryOptions", () => {
			it("returns query options for fetching completion history", () => {
				const input = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const options = getCompletionHistoryQueryOptions(input);

				expect(options).toBeDefined();
				expect(options).toHaveProperty("queryKey");
				expect(options).toHaveProperty("queryFn");
			});

			it("includes date range input in query options", () => {
				const input = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const options = getCompletionHistoryQueryOptions(input);

				expect(options.queryKey).toContain("todo");
				expect(options.queryKey).toContain("getCompletionHistory");
				expect(options.queryKey).toContainEqual(input);
			});

			it("handles single day date range", () => {
				const todayInput = {
					startDate: "2026-01-15T00:00:00.000Z",
					endDate: "2026-01-15T23:59:59.999Z",
				};
				const options = getCompletionHistoryQueryOptions(todayInput);

				expect(options).toBeDefined();
				expect(options.queryKey).toContainEqual(todayInput);
			});
		});

		describe("getCompletionHistoryQueryKey", () => {
			it("returns query key for completion history", () => {
				const input = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const queryKey = getCompletionHistoryQueryKey(input);

				expect(queryKey).toBeDefined();
				expect(Array.isArray(queryKey)).toBe(true);
			});

			it("includes date range in query key", () => {
				const input = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const queryKey = getCompletionHistoryQueryKey(input);

				expect(queryKey).toContain("todo");
				expect(queryKey).toContain("getCompletionHistory");
				expect(queryKey).toContainEqual(input);
			});

			it("generates different keys for different date ranges", () => {
				const input1 = {
					startDate: "2026-01-01T00:00:00.000Z",
					endDate: "2026-01-15T23:59:59.999Z",
				};
				const input2 = {
					startDate: "2026-01-16T00:00:00.000Z",
					endDate: "2026-01-31T23:59:59.999Z",
				};
				const queryKey1 = getCompletionHistoryQueryKey(input1);
				const queryKey2 = getCompletionHistoryQueryKey(input2);

				expect(queryKey1).toContainEqual(input1);
				expect(queryKey2).toContainEqual(input2);
			});
		});
	});

	describe("Mutation Options", () => {
		describe("getUpdatePastCompletionMutationOptions", () => {
			it("returns mutation options for updating past completion", () => {
				const options = getUpdatePastCompletionMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getUpdatePastCompletionMutationOptions();

				expect(options.mutationKey).toContain("todo");
				expect(options.mutationKey).toContain("updatePastCompletion");
			});
		});
	});

	describe("Module Exports", () => {
		it("exports all query option functions", () => {
			expect(typeof getAnalyticsQueryOptions).toBe("function");
			expect(typeof getAnalyticsQueryKey).toBe("function");
			expect(typeof getCompletionHistoryQueryOptions).toBe("function");
			expect(typeof getCompletionHistoryQueryKey).toBe("function");
		});

		it("exports all mutation option functions", () => {
			expect(typeof getUpdatePastCompletionMutationOptions).toBe("function");
		});
	});
});
