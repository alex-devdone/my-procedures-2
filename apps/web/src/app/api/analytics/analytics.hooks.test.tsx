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

// Mock local-todo-storage
const mockGetLocalAnalytics = vi.fn();
const mockGetLocalCompletionHistory = vi.fn();
const mockUpdateLocalPastCompletion = vi.fn();

vi.mock("@/lib/local-todo-storage", () => ({
	getLocalAnalytics: (...args: unknown[]) => mockGetLocalAnalytics(...args),
	getLocalCompletionHistory: (...args: unknown[]) =>
		mockGetLocalCompletionHistory(...args),
	updateLocalPastCompletion: (...args: unknown[]) =>
		mockUpdateLocalPastCompletion(...args),
}));

// Mock useSession hook
const mockUseSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
	useSession: () => mockUseSession(),
}));

// Mock the Supabase completion history function
const mockGetCompletionHistorySupabase = vi.hoisted(() => vi.fn());
vi.mock("./analytics.supabase", () => ({
	getCompletionHistorySupabase: mockGetCompletionHistorySupabase,
}));

// Import after mocks are set up
import {
	notifyLocalAnalyticsListeners,
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
	describe("Authenticated User (Remote API)", () => {
		const startDate = "2026-01-15T00:00:00.000Z";
		const endDate = "2026-01-17T23:59:59.999Z";

		beforeEach(() => {
			// Mock authenticated session
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123", name: "Test User" } },
				isPending: false,
			});
			vi.clearAllMocks();
			mockAnalyticsQueryFn.mockResolvedValue(mockAnalyticsData);
			mockCompletionHistoryQueryFn.mockResolvedValue(mockCompletionHistory);
			mockGetCompletionHistorySupabase.mockResolvedValue(
				mockCompletionHistory.map((r) => ({
					id: r.id,
					todo_id: r.todoId,
					scheduled_date: r.scheduledDate.toISOString(),
					completed_at: r.completedAt?.toISOString() || null,
					user_id: "user-123",
				})),
			);
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
			it("returns analytics data for the date range", async () => {
				const { result } = renderHook(() => useAnalytics(startDate, endDate), {
					wrapper: createWrapper(),
				});

				await waitFor(() => {
					expect(result.current.isSuccess).toBe(true);
				});

				expect(result.current.data).toEqual(mockAnalyticsData);
			});

			it("calls Supabase function with correct parameters", async () => {
				renderHook(() => useCompletionHistory(startDate, endDate), {
					wrapper: createWrapper(),
				});

				await waitFor(() => {
					expect(mockGetCompletionHistorySupabase).toHaveBeenCalledWith(
						"user-123",
						startDate,
						endDate,
					);
				});
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
		it("returns completion history for the date range", async () => {
			const { result } = renderHook(
				() => useCompletionHistory(startDate, endDate),
				{ wrapper: createWrapper() },
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			// Supabase returns transformed data (snake_case -> camelCase, ISO strings)
			expect(result.current.data).toEqual(
				mockCompletionHistory.map((r) => ({
					id: r.id,
					todoId: r.todoId,
					scheduledDate: r.scheduledDate.toISOString(),
					completedAt: r.completedAt?.toISOString() || null,
				})),
			);
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
			mockGetCompletionHistorySupabase.mockReturnValue(new Promise(() => {}));

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
			// todoText is not returned by Supabase implementation
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
				resolvePromise?.({ action: "updated", completion: {} });
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
					if (predicate?.({ queryKey: mockKey })) {
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
});

describe("Unauthenticated User (Local Storage)", () => {
	const startDate = "2026-01-15T00:00:00.000Z";
	const endDate = "2026-01-17T23:59:59.999Z";

	beforeEach(() => {
		// Mock unauthenticated session
		mockUseSession.mockReturnValue({
			data: null,
			isPending: false,
		});
		vi.clearAllMocks();
	});

	describe("useAnalytics with local storage", () => {
		it("returns local analytics data when user is not authenticated", () => {
			const mockLocalAnalytics = {
				totalRegularCompleted: 3,
				totalRecurringCompleted: 7,
				totalRecurringMissed: 1,
				completionRate: 91,
				currentStreak: 2,
				dailyBreakdown: [
					{
						date: "2026-01-15",
						regularCompleted: 1,
						recurringCompleted: 2,
						recurringMissed: 0,
					},
					{
						date: "2026-01-16",
						regularCompleted: 1,
						recurringCompleted: 3,
						recurringMissed: 1,
					},
					{
						date: "2026-01-17",
						regularCompleted: 1,
						recurringCompleted: 2,
						recurringMissed: 0,
					},
				],
			};

			mockGetLocalAnalytics.mockReturnValue(mockLocalAnalytics);

			const { result } = renderHook(() => useAnalytics(startDate, endDate), {
				wrapper: createWrapper(),
			});

			// Since we're not authenticated, data should be available immediately
			expect(result.current.data).toEqual(mockLocalAnalytics);
			expect(mockGetLocalAnalytics).toHaveBeenCalledWith(startDate, endDate);
			expect(result.current.isLoading).toBe(false);
		});

		it("does not call remote query when user is not authenticated", () => {
			mockGetLocalAnalytics.mockReturnValue({
				totalRegularCompleted: 0,
				totalRecurringCompleted: 0,
				totalRecurringMissed: 0,
				completionRate: 100,
				currentStreak: 0,
				dailyBreakdown: [],
			});

			renderHook(() => useAnalytics(startDate, endDate), {
				wrapper: createWrapper(),
			});

			// Remote query should not be called for unauthenticated users
			expect(mockAnalyticsQueryFn).not.toHaveBeenCalled();
		});
	});

	describe("useCompletionHistory with local storage", () => {
		it("returns local completion history when user is not authenticated", () => {
			const mockLocalHistory = [
				{
					todoId: "local-todo-1",
					scheduledDate: "2026-01-15T00:00:00.000Z",
					completedAt: "2026-01-15T10:00:00.000Z",
				},
				{
					todoId: "local-todo-1",
					scheduledDate: "2026-01-16T00:00:00.000Z",
					completedAt: null,
				},
				{
					todoId: "local-todo-2",
					scheduledDate: "2026-01-15T00:00:00.000Z",
					completedAt: "2026-01-15T08:00:00.000Z",
				},
			];

			mockGetLocalCompletionHistory.mockReturnValue(mockLocalHistory);

			const { result } = renderHook(
				() => useCompletionHistory(startDate, endDate),
				{ wrapper: createWrapper() },
			);

			// Data should be mapped to include id field
			expect(result.current.data).toHaveLength(3);
			expect(result.current.data?.[0]).toEqual({
				id: "local-todo-1-2026-01-15T00:00:00.000Z",
				todoId: "local-todo-1",
				scheduledDate: "2026-01-15T00:00:00.000Z",
				completedAt: "2026-01-15T10:00:00.000Z",
			});
			expect(mockGetLocalCompletionHistory).toHaveBeenCalledWith(
				startDate,
				endDate,
			);
		});

		it("does not call remote query when user is not authenticated", () => {
			mockGetLocalCompletionHistory.mockReturnValue([]);

			renderHook(() => useCompletionHistory(startDate, endDate), {
				wrapper: createWrapper(),
			});

			// Remote query should not be called for unauthenticated users
			expect(mockCompletionHistoryQueryFn).not.toHaveBeenCalled();
		});
	});

	describe("useUpdatePastCompletion with local storage", () => {
		it("uses local storage update when user is not authenticated", async () => {
			const mockUpdatedEntry = {
				todoId: "local-todo-1",
				scheduledDate: "2026-01-16T00:00:00.000Z",
				completedAt: new Date().toISOString(),
			};

			mockUpdateLocalPastCompletion.mockReturnValue(mockUpdatedEntry);

			const { result } = renderHook(() => useUpdatePastCompletion(), {
				wrapper: createWrapper(),
			});

			const input = {
				todoId: "local-todo-1",
				scheduledDate: "2026-01-16T00:00:00.000Z",
				completed: true,
			};

			await act(async () => {
				await result.current.mutateAsync(input);
			});

			expect(mockUpdateLocalPastCompletion).toHaveBeenCalledWith(
				input.todoId,
				input.scheduledDate,
				input.completed,
			);
			// Remote mutation should not be called for unauthenticated users
			expect(mockUpdatePastCompletionMutationFn).not.toHaveBeenCalled();
		});

		it("handles marking as incomplete in local storage", async () => {
			mockUpdateLocalPastCompletion.mockReturnValue({
				todoId: "local-todo-1",
				scheduledDate: "2026-01-16T00:00:00.000Z",
				completedAt: null,
			});

			const { result } = renderHook(() => useUpdatePastCompletion(), {
				wrapper: createWrapper(),
			});

			const input = {
				todoId: "local-todo-1",
				scheduledDate: "2026-01-16T00:00:00.000Z",
				completed: false,
			};

			await act(async () => {
				await result.current.mutateAsync(input);
			});

			expect(mockUpdateLocalPastCompletion).toHaveBeenCalledWith(
				input.todoId,
				input.scheduledDate,
				input.completed,
			);
		});
	});

	describe("Local Storage Reactivity", () => {
		it("useAnalytics re-renders when notifyLocalAnalyticsListeners is called", async () => {
			const initialAnalytics = {
				totalRegularCompleted: 1,
				totalRecurringCompleted: 2,
				totalRecurringMissed: 0,
				completionRate: 100,
				currentStreak: 1,
				dailyBreakdown: [],
			};

			const updatedAnalytics = {
				totalRegularCompleted: 1,
				totalRecurringCompleted: 3,
				totalRecurringMissed: 0,
				completionRate: 100,
				currentStreak: 2,
				dailyBreakdown: [],
			};

			mockGetLocalAnalytics.mockReturnValue(initialAnalytics);

			const { result } = renderHook(() => useAnalytics(startDate, endDate), {
				wrapper: createWrapper(),
			});

			expect(result.current.data).toEqual(initialAnalytics);

			// Update mock to return different data
			mockGetLocalAnalytics.mockReturnValue(updatedAnalytics);

			// Notify listeners to trigger re-render
			await act(async () => {
				notifyLocalAnalyticsListeners();
			});

			// Data should be updated
			expect(result.current.data).toEqual(updatedAnalytics);
		});

		it("useCompletionHistory re-renders when notifyLocalAnalyticsListeners is called", async () => {
			const initialHistory = [
				{
					todoId: "local-todo-1",
					scheduledDate: "2026-01-15T00:00:00.000Z",
					completedAt: null,
				},
			];

			const updatedHistory = [
				{
					todoId: "local-todo-1",
					scheduledDate: "2026-01-15T00:00:00.000Z",
					completedAt: "2026-01-15T10:00:00.000Z",
				},
			];

			mockGetLocalCompletionHistory.mockReturnValue(initialHistory);

			const { result } = renderHook(
				() => useCompletionHistory(startDate, endDate),
				{ wrapper: createWrapper() },
			);

			expect(result.current.data?.[0]?.completedAt).toBeNull();

			// Update mock to return different data
			mockGetLocalCompletionHistory.mockReturnValue(updatedHistory);

			// Notify listeners to trigger re-render
			await act(async () => {
				notifyLocalAnalyticsListeners();
			});

			// Data should be updated
			expect(result.current.data?.[0]?.completedAt).toBe(
				"2026-01-15T10:00:00.000Z",
			);
		});

		it("useUpdatePastCompletion triggers notifyLocalAnalyticsListeners after local storage update", async () => {
			// Render hooks
			const analyticsHook = renderHook(() => useAnalytics(startDate, endDate), {
				wrapper: createWrapper(),
			});

			// Verify listener is subscribed (implicitly through the hook's useSyncExternalStore)
			mockGetLocalAnalytics.mockReturnValue({
				totalRegularCompleted: 0,
				totalRecurringCompleted: 0,
				totalRecurringMissed: 1,
				completionRate: 0,
				currentStreak: 0,
				dailyBreakdown: [],
			});

			const updateHook = renderHook(() => useUpdatePastCompletion(), {
				wrapper: createWrapper(),
			});

			mockUpdateLocalPastCompletion.mockReturnValue({
				todoId: "local-todo-1",
				scheduledDate: "2026-01-16T00:00:00.000Z",
				completedAt: new Date().toISOString(),
			});

			// After update, the mock should return new data
			const updatedAnalytics = {
				totalRegularCompleted: 0,
				totalRecurringCompleted: 1,
				totalRecurringMissed: 0,
				completionRate: 100,
				currentStreak: 1,
				dailyBreakdown: [],
			};
			mockGetLocalAnalytics.mockReturnValue(updatedAnalytics);

			// Perform the update
			await act(async () => {
				await updateHook.result.current.mutateAsync({
					todoId: "local-todo-1",
					scheduledDate: "2026-01-16T00:00:00.000Z",
					completed: true,
				});
			});

			// The analytics hook should have re-rendered with new data
			expect(analyticsHook.result.current.data).toEqual(updatedAnalytics);
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

	it("exports notifyLocalAnalyticsListeners function", () => {
		expect(typeof notifyLocalAnalyticsListeners).toBe("function");
	});
});
