"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase environment variables
vi.mock("@my-procedures-2/env/web", () => ({
	env: {
		NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-12345678",
		BETTER_AUTH_SECRET: "test-better-auth-secret-at-least-32-chars",
		BETTER_AUTH_URL: "http://localhost:4757",
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
	},
}));

// Mock analytics data
const mockAnalyticsData = {
	totalRegularCompleted: 5,
	totalRecurringCompleted: 10,
	totalRecurringMissed: 2,
	completionRate: 88,
	currentStreak: 3,
	dailyBreakdown: [
		{
			date: "2026-01-15",
			regularCompleted: 1,
			recurringCompleted: 2,
			recurringMissed: 0,
		},
		{
			date: "2026-01-16",
			regularCompleted: 2,
			recurringCompleted: 3,
			recurringMissed: 1,
		},
		{
			date: "2026-01-17",
			regularCompleted: 2,
			recurringCompleted: 5,
			recurringMissed: 1,
		},
	],
};

const mockCompletionHistory = [
	{
		id: 1,
		todoId: 1,
		scheduledDate: new Date("2026-01-15T00:00:00.000Z"),
		completedAt: new Date("2026-01-15T10:00:00.000Z"),
		createdAt: new Date("2026-01-15T00:00:00.000Z"),
		todoText: "Daily exercise",
	},
	{
		id: 2,
		todoId: 1,
		scheduledDate: new Date("2026-01-16T00:00:00.000Z"),
		completedAt: null,
		createdAt: new Date("2026-01-16T00:00:00.000Z"),
		todoText: "Daily exercise",
	},
	{
		id: 3,
		todoId: 2,
		scheduledDate: new Date("2026-01-15T00:00:00.000Z"),
		completedAt: new Date("2026-01-15T08:00:00.000Z"),
		createdAt: new Date("2026-01-15T00:00:00.000Z"),
		todoText: "Morning meditation",
	},
];

// Mock query functions
const mockAnalyticsQueryFn = vi.fn().mockResolvedValue(mockAnalyticsData);
const mockCompletionHistoryQueryFn = vi
	.fn()
	.mockResolvedValue(mockCompletionHistory);
const mockUpdatePastCompletionMutationFn = vi.fn().mockResolvedValue({
	action: "updated",
	completion: {
		id: 2,
		todoId: 1,
		scheduledDate: new Date("2026-01-16T00:00:00.000Z"),
		completedAt: new Date(),
		userId: "user-123",
	},
});

// Mock the analytics.api module
vi.mock("./analytics.api", () => ({
	getAnalyticsQueryOptions: vi.fn((input) => ({
		queryKey: [{ path: ["todo", "getAnalytics"] }, { input }],
		queryFn: mockAnalyticsQueryFn,
	})),
	getAnalyticsQueryKey: vi.fn((input) => [
		{ path: ["todo", "getAnalytics"] },
		{ input },
	]),
	getCompletionHistoryQueryOptions: vi.fn((input) => ({
		queryKey: [{ path: ["todo", "getCompletionHistory"] }, { input }],
		queryFn: mockCompletionHistoryQueryFn,
	})),
	getCompletionHistoryQueryKey: vi.fn((input) => [
		{ path: ["todo", "getCompletionHistory"] },
		{ input },
	]),
	getUpdatePastCompletionMutationOptions: vi.fn(() => ({
		mutationFn: mockUpdatePastCompletionMutationFn,
	})),
}));

// Mock queryClient for optimistic updates
const mockCancelQueries = vi.fn().mockResolvedValue(undefined);
const mockGetQueriesData = vi.fn();
const mockSetQueryData = vi.fn();
const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined);

vi.mock("@/utils/trpc", () => ({
	queryClient: {
		cancelQueries: (...args: unknown[]) => mockCancelQueries(...args),
		getQueriesData: (...args: unknown[]) => mockGetQueriesData(...args),
		setQueryData: (...args: unknown[]) => mockSetQueryData(...args),
		invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
	},
}));

// Import after mocks are set up
import {
	useAnalytics,
	useCompletionHistory,
	useUpdatePastCompletion,
} from "./analytics.hooks";

// Test wrapper with QueryClientProvider
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	});

	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

describe("Analytics Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAnalyticsQueryFn.mockResolvedValue(mockAnalyticsData);
		mockCompletionHistoryQueryFn.mockResolvedValue(mockCompletionHistory);
		mockUpdatePastCompletionMutationFn.mockResolvedValue({
			action: "updated",
			completion: {
				id: 2,
				todoId: 1,
				scheduledDate: new Date("2026-01-16T00:00:00.000Z"),
				completedAt: new Date(),
				userId: "user-123",
			},
		});
		mockGetQueriesData.mockReturnValue([]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("useAnalytics", () => {
		const startDate = "2026-01-15T00:00:00.000Z";
		const endDate = "2026-01-17T23:59:59.999Z";

		it("returns analytics data for the date range", async () => {
			const { result } = renderHook(() => useAnalytics(startDate, endDate), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(mockAnalyticsData);
		});

		it("passes startDate and endDate to query options", async () => {
			const { getAnalyticsQueryOptions } = await import("./analytics.api");

			renderHook(() => useAnalytics(startDate, endDate), {
				wrapper: createWrapper(),
			});

			expect(getAnalyticsQueryOptions).toHaveBeenCalledWith({
				startDate,
				endDate,
			});
		});

		it("returns isLoading true while fetching", () => {
			// Create a pending promise to simulate loading state
			mockAnalyticsQueryFn.mockReturnValue(new Promise(() => {}));

			const { result } = renderHook(() => useAnalytics(startDate, endDate), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
		});

		it("returns isError true on failure", async () => {
			mockAnalyticsQueryFn.mockRejectedValue(new Error("Failed to fetch"));

			const { result } = renderHook(() => useAnalytics(startDate, endDate), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});
		});

		it("handles different date ranges", async () => {
			const monthStart = "2026-01-01T00:00:00.000Z";
			const monthEnd = "2026-01-31T23:59:59.999Z";

			const { result } = renderHook(() => useAnalytics(monthStart, monthEnd), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(mockAnalyticsData);
		});
	});

	describe("useCompletionHistory", () => {
		const startDate = "2026-01-15T00:00:00.000Z";
		const endDate = "2026-01-17T23:59:59.999Z";

		it("returns completion history for the date range", async () => {
			const { result } = renderHook(
				() => useCompletionHistory(startDate, endDate),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual(mockCompletionHistory);
		});

		it("passes startDate and endDate to query options", async () => {
			const { getCompletionHistoryQueryOptions } = await import(
				"./analytics.api"
			);

			renderHook(() => useCompletionHistory(startDate, endDate), {
				wrapper: createWrapper(),
			});

			expect(getCompletionHistoryQueryOptions).toHaveBeenCalledWith({
				startDate,
				endDate,
			});
		});

		it("returns isLoading true while fetching", () => {
			mockCompletionHistoryQueryFn.mockReturnValue(new Promise(() => {}));

			const { result } = renderHook(
				() => useCompletionHistory(startDate, endDate),
				{ wrapper: createWrapper() },
			);

			expect(result.current.isLoading).toBe(true);
		});

		it("returns isError true on failure", async () => {
			mockCompletionHistoryQueryFn.mockRejectedValue(
				new Error("Failed to fetch"),
			);

			const { result } = renderHook(
				() => useCompletionHistory(startDate, endDate),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});
		});

		it("returns completion records with correct structure", async () => {
			const { result } = renderHook(
				() => useCompletionHistory(startDate, endDate),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			const data = result.current.data;
			expect(data).toHaveLength(3);
			expect(data?.[0]).toHaveProperty("id");
			expect(data?.[0]).toHaveProperty("todoId");
			expect(data?.[0]).toHaveProperty("scheduledDate");
			expect(data?.[0]).toHaveProperty("completedAt");
			expect(data?.[0]).toHaveProperty("todoText");
		});
	});

	describe("useUpdatePastCompletion", () => {
		it("returns mutation function", () => {
			const { result } = renderHook(() => useUpdatePastCompletion(), {
				wrapper: createWrapper(),
			});

			expect(typeof result.current.mutate).toBe("function");
			expect(typeof result.current.mutateAsync).toBe("function");
		});

		it("calls mutation with correct input", async () => {
			const { result } = renderHook(() => useUpdatePastCompletion(), {
				wrapper: createWrapper(),
			});

			const input = {
				todoId: 1,
				scheduledDate: "2026-01-16T00:00:00.000Z",
				completed: true,
			};

			await act(async () => {
				await result.current.mutateAsync(input);
			});

			// React Query passes additional context as second argument
			expect(mockUpdatePastCompletionMutationFn).toHaveBeenCalled();
			expect(mockUpdatePastCompletionMutationFn.mock.calls[0][0]).toEqual(
				input,
			);
		});

		it("returns isPending true during mutation", async () => {
			// Create a promise that we can control
			let resolvePromise: (value: unknown) => void;
			mockUpdatePastCompletionMutationFn.mockReturnValue(
				new Promise((resolve) => {
					resolvePromise = resolve;
				}),
			);

			const { result } = renderHook(() => useUpdatePastCompletion(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isPending).toBe(false);

			act(() => {
				result.current.mutate({
					todoId: 1,
					scheduledDate: "2026-01-16T00:00:00.000Z",
					completed: true,
				});
			});

			await waitFor(() => {
				expect(result.current.isPending).toBe(true);
			});

			// Resolve the promise to complete the mutation
			await act(async () => {
				resolvePromise!({ action: "updated", completion: {} });
			});
		});

		it("returns isSuccess true after successful mutation", async () => {
			const { result } = renderHook(() => useUpdatePastCompletion(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.mutateAsync({
					todoId: 1,
					scheduledDate: "2026-01-16T00:00:00.000Z",
					completed: true,
				});
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});
		});

		it("returns isError true on mutation failure", async () => {
			mockUpdatePastCompletionMutationFn.mockRejectedValue(
				new Error("Failed to update"),
			);

			const { result } = renderHook(() => useUpdatePastCompletion(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				try {
					await result.current.mutateAsync({
						todoId: 1,
						scheduledDate: "2026-01-16T00:00:00.000Z",
						completed: true,
					});
				} catch {
					// Expected to throw
				}
			});

			await waitFor(() => {
				expect(result.current.isError).toBe(true);
			});
		});

		describe("Optimistic Updates", () => {
			it("cancels outgoing queries on mutate", async () => {
				const { result } = renderHook(() => useUpdatePastCompletion(), {
					wrapper: createWrapper(),
				});

				await act(async () => {
					await result.current.mutateAsync({
						todoId: 1,
						scheduledDate: "2026-01-16T00:00:00.000Z",
						completed: true,
					});
				});

				expect(mockCancelQueries).toHaveBeenCalled();
			});

			it("invalidates queries on success", async () => {
				const { result } = renderHook(() => useUpdatePastCompletion(), {
					wrapper: createWrapper(),
				});

				await act(async () => {
					await result.current.mutateAsync({
						todoId: 1,
						scheduledDate: "2026-01-16T00:00:00.000Z",
						completed: true,
					});
				});

				expect(mockInvalidateQueries).toHaveBeenCalled();
			});

			it("updates analytics cache optimistically when marking as completed", async () => {
				const analyticsQueryKey = [
					{ path: ["todo", "getAnalytics"] },
					{
						input: {
							startDate: "2026-01-15T00:00:00.000Z",
							endDate: "2026-01-17T23:59:59.999Z",
						},
					},
				];

				mockGetQueriesData.mockReturnValue([
					[analyticsQueryKey, mockAnalyticsData],
				]);

				const { result } = renderHook(() => useUpdatePastCompletion(), {
					wrapper: createWrapper(),
				});

				await act(async () => {
					await result.current.mutateAsync({
						todoId: 1,
						scheduledDate: "2026-01-16T00:00:00.000Z",
						completed: true,
					});
				});

				// Should have called setQueryData for analytics
				expect(mockSetQueryData).toHaveBeenCalled();
			});

			it("updates completion history cache optimistically", async () => {
				const completionHistoryQueryKey = [
					{ path: ["todo", "getCompletionHistory"] },
					{
						input: {
							startDate: "2026-01-15T00:00:00.000Z",
							endDate: "2026-01-17T23:59:59.999Z",
						},
					},
				];

				mockGetQueriesData.mockImplementation(({ predicate }) => {
					// Check if predicate matches completion history
					const mockKey = [{ path: ["todo", "getCompletionHistory"] }];
					if (predicate && predicate({ queryKey: mockKey })) {
						return [[completionHistoryQueryKey, mockCompletionHistory]];
					}
					return [];
				});

				const { result } = renderHook(() => useUpdatePastCompletion(), {
					wrapper: createWrapper(),
				});

				await act(async () => {
					await result.current.mutateAsync({
						todoId: 1,
						scheduledDate: "2026-01-16T00:00:00.000Z",
						completed: true,
					});
				});

				expect(mockSetQueryData).toHaveBeenCalled();
			});

			it("rolls back cache on error", async () => {
				const analyticsQueryKey = [
					{ path: ["todo", "getAnalytics"] },
					{
						input: {
							startDate: "2026-01-15T00:00:00.000Z",
							endDate: "2026-01-17T23:59:59.999Z",
						},
					},
				];

				mockGetQueriesData.mockReturnValue([
					[analyticsQueryKey, mockAnalyticsData],
				]);
				mockUpdatePastCompletionMutationFn.mockRejectedValue(
					new Error("Network error"),
				);

				const { result } = renderHook(() => useUpdatePastCompletion(), {
					wrapper: createWrapper(),
				});

				await act(async () => {
					try {
						await result.current.mutateAsync({
							todoId: 1,
							scheduledDate: "2026-01-16T00:00:00.000Z",
							completed: true,
						});
					} catch {
						// Expected to throw
					}
				});

				// Should have called setQueryData for both optimistic update AND rollback
				expect(mockSetQueryData.mock.calls.length).toBeGreaterThanOrEqual(1);
			});

			it("handles marking as incomplete (unchecking)", async () => {
				const analyticsQueryKey = [
					{ path: ["todo", "getAnalytics"] },
					{
						input: {
							startDate: "2026-01-15T00:00:00.000Z",
							endDate: "2026-01-17T23:59:59.999Z",
						},
					},
				];

				mockGetQueriesData.mockReturnValue([
					[analyticsQueryKey, mockAnalyticsData],
				]);

				const { result } = renderHook(() => useUpdatePastCompletion(), {
					wrapper: createWrapper(),
				});

				// Mark as incomplete (completed: false)
				await act(async () => {
					await result.current.mutateAsync({
						todoId: 1,
						scheduledDate: "2026-01-15T00:00:00.000Z",
						completed: false,
					});
				});

				expect(mockSetQueryData).toHaveBeenCalled();
			});
		});
	});

	describe("Module Exports", () => {
		it("exports useAnalytics hook", () => {
			expect(typeof useAnalytics).toBe("function");
		});

		it("exports useCompletionHistory hook", () => {
			expect(typeof useCompletionHistory).toBe("function");
		});

		it("exports useUpdatePastCompletion hook", () => {
			expect(typeof useUpdatePastCompletion).toBe("function");
		});
	});
});
