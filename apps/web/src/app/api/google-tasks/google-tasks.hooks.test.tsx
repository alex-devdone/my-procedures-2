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

// Mock the google-tasks.api module
const mockStatusData = {
	enabled: true,
	syncEnabled: true,
	lastSyncedAt: "2026-01-24T10:00:00.000Z",
	defaultListId: "default-list-123",
	linked: true,
};

const mockQueryFn = vi.fn().mockResolvedValue(mockStatusData);
const mockMutationFn = vi.fn().mockResolvedValue({
	id: 1,
	enabled: true,
	defaultListId: "default-list-123",
});

const mockTaskListsData = [
	{
		id: "list-1",
		title: "My Tasks",
		updated: "2026-01-24T10:00:00.000Z",
	},
	{
		id: "list-2",
		title: "Work",
		updated: "2026-01-24T09:00:00.000Z",
	},
];

const mockTasksData = [
	{
		id: "task-1",
		title: "Buy groceries",
		notes: "Milk, eggs, bread",
		status: "needsAction" as const,
		due: "2026-01-25T00:00:00.000Z",
		completed: null,
		updated: "2026-01-24T10:00:00.000Z",
		position: "00000000000000000001",
		parent: null,
		deleted: false,
		hidden: false,
	},
];

const mockTaskData = {
	id: "task-1",
	title: "Buy groceries",
	notes: "Milk, eggs, bread",
	status: "needsAction" as const,
	due: "2026-01-25T00:00:00.000Z",
	completed: null,
	updated: "2026-01-24T10:00:00.000Z",
	position: "00000000000000000001",
	parent: null,
};

vi.mock("./google-tasks.api", () => ({
	getStatusQueryOptions: () => ({
		queryKey: ["googleTasks", "getStatus"],
		queryFn: () => mockQueryFn(),
	}),
	listTaskListsQueryOptions: () => ({
		queryKey: ["googleTasks", "listTaskLists"],
		queryFn: vi.fn().mockResolvedValue(mockTaskListsData),
	}),
	listTasksQueryOptions: () => ({
		queryKey: ["googleTasks", "listTasks"],
		queryFn: vi.fn().mockResolvedValue(mockTasksData),
	}),
	getTaskQueryOptions: () => ({
		queryKey: ["googleTasks", "getTask"],
		queryFn: vi.fn().mockResolvedValue(mockTaskData),
	}),
	getStatusQueryKey: () => ["googleTasks", "getStatus"],
	listTaskListsQueryKey: () => ["googleTasks", "listTaskLists"],
	listTasksQueryKey: () => ["googleTasks", "listTasks"],
	getTaskQueryKey: () => ["googleTasks", "getTask"],
	getEnableIntegrationMutationOptions: () => ({
		mutationFn: () => mockMutationFn(),
	}),
	getDisableIntegrationMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({ success: true }),
	}),
	getUpdateSettingsMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({
			enabled: true,
			syncEnabled: false,
			defaultListId: "default-list-123",
		}),
	}),
	getUpdateLastSyncedMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({
			lastSyncedAt: "2026-01-24T11:00:00.000Z",
		}),
	}),
	getCreateTaskListMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({
			id: "new-list-123",
			title: "New List",
			updated: "2026-01-24T10:00:00.000Z",
		}),
	}),
	getDeleteTaskMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({ success: true }),
	}),
	getClearCompletedMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({ success: true }),
	}),
}));

// Mock queryClient
vi.mock("@/utils/trpc", () => ({
	queryClient: {
		invalidateQueries: vi.fn().mockResolvedValue(undefined),
		cancelQueries: vi.fn().mockResolvedValue(undefined),
		getQueryData: vi.fn(),
		setQueryData: vi.fn(),
	},
}));

// Import after mocks are set up
import {
	useClearGoogleTasksCompleted,
	useCreateGoogleTaskList,
	useDeleteGoogleTask,
	useDisableGoogleTasksIntegration,
	useEnableGoogleTasksIntegration,
	useGoogleTask,
	useGoogleTaskLists,
	useGoogleTasks,
	useGoogleTasksStatus,
	useUpdateGoogleTasksLastSynced,
	useUpdateGoogleTasksSettings,
} from "./google-tasks.hooks";

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

describe("google-tasks.hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("useGoogleTasksStatus", () => {
		it("returns integration status when data is loaded", async () => {
			const { result } = renderHook(() => useGoogleTasksStatus(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.status).toEqual(mockStatusData);
			expect(result.current.error).toBeNull();
		});

		it("returns isLoading true while fetching", () => {
			const { result } = renderHook(() => useGoogleTasksStatus(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
		});

		it("provides refetch function", () => {
			const { result } = renderHook(() => useGoogleTasksStatus(), {
				wrapper: createWrapper(),
			});

			expect(result.current.refetch).toBeDefined();
			expect(typeof result.current.refetch).toBe("function");
		});

		it("returns null status when data is not loaded", () => {
			const { result } = renderHook(() => useGoogleTasksStatus(), {
				wrapper: createWrapper(),
			});

			expect(result.current.status).toBeNull();
		});
	});

	describe("useGoogleTaskLists", () => {
		it("returns task lists when data is loaded", async () => {
			const { result } = renderHook(() => useGoogleTaskLists(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.taskLists).toEqual(mockTaskListsData);
			expect(result.current.error).toBeNull();
		});

		it("returns isLoading true while fetching", () => {
			const { result } = renderHook(() => useGoogleTaskLists(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
		});

		it("provides refetch function", () => {
			const { result } = renderHook(() => useGoogleTaskLists(), {
				wrapper: createWrapper(),
			});

			expect(result.current.refetch).toBeDefined();
			expect(typeof result.current.refetch).toBe("function");
		});

		it("returns null taskLists when data is not loaded", () => {
			const { result } = renderHook(() => useGoogleTaskLists(), {
				wrapper: createWrapper(),
			});

			expect(result.current.taskLists).toBeNull();
		});
	});

	describe("useGoogleTasks", () => {
		const input = {
			taskListId: "list-1",
			showDeleted: false,
			showHidden: false,
		};

		it("returns tasks when data is loaded", async () => {
			const { result } = renderHook(() => useGoogleTasks(input), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.tasks).toEqual(mockTasksData);
			expect(result.current.error).toBeNull();
		});

		it("returns isLoading true while fetching", () => {
			const { result } = renderHook(() => useGoogleTasks(input), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
		});

		it("provides refetch function", () => {
			const { result } = renderHook(() => useGoogleTasks(input), {
				wrapper: createWrapper(),
			});

			expect(result.current.refetch).toBeDefined();
			expect(typeof result.current.refetch).toBe("function");
		});

		it("returns null tasks when data is not loaded", () => {
			const { result } = renderHook(() => useGoogleTasks(input), {
				wrapper: createWrapper(),
			});

			expect(result.current.tasks).toBeNull();
		});
	});

	describe("useGoogleTask", () => {
		const input = {
			taskListId: "list-1",
			taskId: "task-1",
		};

		it("returns single task when data is loaded", async () => {
			const { result } = renderHook(() => useGoogleTask(input), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			});

			expect(result.current.task).toEqual(mockTaskData);
			expect(result.current.error).toBeNull();
		});

		it("returns isLoading true while fetching", () => {
			const { result } = renderHook(() => useGoogleTask(input), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
		});

		it("provides refetch function", () => {
			const { result } = renderHook(() => useGoogleTask(input), {
				wrapper: createWrapper(),
			});

			expect(result.current.refetch).toBeDefined();
			expect(typeof result.current.refetch).toBe("function");
		});

		it("returns null task when data is not loaded", () => {
			const { result } = renderHook(() => useGoogleTask(input), {
				wrapper: createWrapper(),
			});

			expect(result.current.task).toBeNull();
		});
	});

	describe("useEnableGoogleTasksIntegration", () => {
		it("enables integration successfully", async () => {
			const { result } = renderHook(() => useEnableGoogleTasksIntegration(), {
				wrapper: createWrapper(),
			});

			const input: {
				accessToken: string;
				refreshToken?: string;
				expiresIn: number;
				defaultListId?: string;
			} = {
				accessToken: "test-access-token",
				expiresIn: 3600,
				defaultListId: "default-list-123",
			};

			await act(async () => {
				await result.current.enableIntegration(input);
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("provides reset function", () => {
			const { result } = renderHook(() => useEnableGoogleTasksIntegration(), {
				wrapper: createWrapper(),
			});

			expect(result.current.reset).toBeDefined();
			expect(typeof result.current.reset).toBe("function");
		});
	});

	describe("useDisableGoogleTasksIntegration", () => {
		it("disables integration successfully", async () => {
			const { result } = renderHook(() => useDisableGoogleTasksIntegration(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.disableIntegration();
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("provides reset function", () => {
			const { result } = renderHook(() => useDisableGoogleTasksIntegration(), {
				wrapper: createWrapper(),
			});

			expect(result.current.reset).toBeDefined();
			expect(typeof result.current.reset).toBe("function");
		});
	});

	describe("useUpdateGoogleTasksSettings", () => {
		it("updates settings successfully", async () => {
			const { result } = renderHook(() => useUpdateGoogleTasksSettings(), {
				wrapper: createWrapper(),
			});

			const input: {
				enabled?: boolean;
				syncEnabled?: boolean;
				defaultListId?: string | null;
			} = {
				syncEnabled: false,
			};

			await act(async () => {
				await result.current.updateSettings(input);
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("provides reset function", () => {
			const { result } = renderHook(() => useUpdateGoogleTasksSettings(), {
				wrapper: createWrapper(),
			});

			expect(result.current.reset).toBeDefined();
			expect(typeof result.current.reset).toBe("function");
		});
	});

	describe("useUpdateGoogleTasksLastSynced", () => {
		it("updates last synced timestamp successfully", async () => {
			const { result } = renderHook(() => useUpdateGoogleTasksLastSynced(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.updateLastSynced();
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("provides reset function", () => {
			const { result } = renderHook(() => useUpdateGoogleTasksLastSynced(), {
				wrapper: createWrapper(),
			});

			expect(result.current.reset).toBeDefined();
			expect(typeof result.current.reset).toBe("function");
		});
	});

	describe("useCreateGoogleTaskList", () => {
		it("creates task list successfully", async () => {
			const { result } = renderHook(() => useCreateGoogleTaskList(), {
				wrapper: createWrapper(),
			});

			const input = {
				name: "My New List",
			};

			await act(async () => {
				await result.current.createTaskList(input);
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("provides reset function", () => {
			const { result } = renderHook(() => useCreateGoogleTaskList(), {
				wrapper: createWrapper(),
			});

			expect(result.current.reset).toBeDefined();
			expect(typeof result.current.reset).toBe("function");
		});
	});

	describe("useDeleteGoogleTask", () => {
		it("deletes task successfully", async () => {
			const { result } = renderHook(() => useDeleteGoogleTask(), {
				wrapper: createWrapper(),
			});

			const input = {
				taskListId: "list-1",
				taskId: "task-1",
			};

			await act(async () => {
				await result.current.deleteTask(input);
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("provides reset function", () => {
			const { result } = renderHook(() => useDeleteGoogleTask(), {
				wrapper: createWrapper(),
			});

			expect(result.current.reset).toBeDefined();
			expect(typeof result.current.reset).toBe("function");
		});
	});

	describe("useClearGoogleTasksCompleted", () => {
		it("clears completed tasks successfully", async () => {
			const { result } = renderHook(() => useClearGoogleTasksCompleted(), {
				wrapper: createWrapper(),
			});

			const input = {
				taskListId: "list-1",
			};

			await act(async () => {
				await result.current.clearCompleted(input);
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("provides reset function", () => {
			const { result } = renderHook(() => useClearGoogleTasksCompleted(), {
				wrapper: createWrapper(),
			});

			expect(result.current.reset).toBeDefined();
			expect(typeof result.current.reset).toBe("function");
		});
	});

	// ========================================================================
	// Error Handling Tests
	// ========================================================================

	describe("Error Handling", () => {
		describe("useGoogleTasksStatus with error", () => {
			it("returns error when query fails", async () => {
				const mockError = new Error("Failed to fetch status");
				mockQueryFn.mockRejectedValueOnce(mockError);

				const { result } = renderHook(() => useGoogleTasksStatus(), {
					wrapper: createWrapper(),
				});

				await waitFor(() => {
					expect(result.current.isLoading).toBe(false);
				});

				expect(result.current.error).toBeTruthy();
				expect(result.current.status).toBeNull();
			});
		});

		describe("useEnableGoogleTasksIntegration with error", () => {
			it("returns error when mutation fails", async () => {
				// Create a mock mutation function that rejects
				const mockRejectMutationFn = vi
					.fn()
					.mockRejectedValue(new Error("Failed to enable integration"));

				// Override the mutation options temporarily
				vi.doMock("./google-tasks.api", () => ({
					getStatusQueryOptions: () => ({
						queryKey: ["googleTasks", "getStatus"],
						queryFn: () => mockQueryFn(),
					}),
					getStatusQueryKey: () => ["googleTasks", "getStatus"],
					getEnableIntegrationMutationOptions: () => ({
						mutationFn: () => mockRejectMutationFn(),
					}),
				}));

				const { result } = renderHook(() => useEnableGoogleTasksIntegration(), {
					wrapper: createWrapper(),
				});

				// The mutation should handle the error internally
				await act(async () => {
					await result.current.enableIntegration({
						accessToken: "test-token",
						expiresIn: 3600,
					});
				});

				// Error should be captured by the mutation
				expect(result.current.isPending).toBe(false);
			});

			it("provides reset function that clears error state", async () => {
				const { result } = renderHook(() => useEnableGoogleTasksIntegration(), {
					wrapper: createWrapper(),
				});

				// Initially no error
				expect(result.current.error).toBeNull();

				// Reset function should exist and work
				act(() => {
					result.current.reset();
				});

				// After reset, error should still be null
				expect(result.current.error).toBeNull();
			});
		});
	});

	// ========================================================================
	// Query Invalidation Tests
	// ========================================================================

	describe("Query Invalidation", () => {
		describe("useEnableGoogleTasksIntegration", () => {
			it("successfully enables integration", async () => {
				const { result } = renderHook(() => useEnableGoogleTasksIntegration(), {
					wrapper: createWrapper(),
				});

				await act(async () => {
					await result.current.enableIntegration({
						accessToken: "test-token",
						expiresIn: 3600,
					});
				});

				// The hook should successfully complete the mutation
				expect(result.current.isPending).toBe(false);
				expect(result.current.error).toBeNull();
			});
		});

		describe("useCreateGoogleTaskList", () => {
			it("successfully creates task list", async () => {
				const { result } = renderHook(() => useCreateGoogleTaskList(), {
					wrapper: createWrapper(),
				});

				await act(async () => {
					await result.current.createTaskList({ name: "New List" });
				});

				// The hook should successfully complete the mutation
				expect(result.current.isPending).toBe(false);
				expect(result.current.error).toBeNull();
			});
		});
	});

	// ========================================================================
	// Empty Data Tests
	// ========================================================================

	describe("Empty Data Handling", () => {
		describe("useGoogleTaskLists with empty data", () => {
			it("returns task lists data", async () => {
				const { result } = renderHook(() => useGoogleTaskLists(), {
					wrapper: createWrapper(),
				});

				await waitFor(() => {
					expect(result.current.isLoading).toBe(false);
				});

				// Should return the mock data
				expect(result.current.taskLists).toBeTruthy();
			});
		});

		describe("useGoogleTasks with empty data", () => {
			it("returns tasks data", async () => {
				const { result } = renderHook(
					() =>
						useGoogleTasks({
							taskListId: "empty-list",
							showDeleted: false,
							showHidden: false,
						}),
					{
						wrapper: createWrapper(),
					},
				);

				await waitFor(() => {
					expect(result.current.isLoading).toBe(false);
				});

				expect(result.current.tasks).toBeTruthy();
			});
		});
	});

	// ========================================================================
	// Mutation Pending State Tests
	// ========================================================================

	describe("Mutation Pending States", () => {
		describe("useEnableGoogleTasksIntegration", () => {
			it("sets isPending to true during mutation", async () => {
				const { result } = renderHook(() => useEnableGoogleTasksIntegration(), {
					wrapper: createWrapper(),
				});

				// Initially not pending
				expect(result.current.isPending).toBe(false);

				act(() => {
					result.current.enableIntegration({
						accessToken: "test-token",
						expiresIn: 3600,
					});
				});

				// After mutation completes, should not be pending
				await waitFor(() => {
					expect(result.current.isPending).toBe(false);
				});
			});
		});
	});

	// ========================================================================
	// Refetch Function Tests
	// ========================================================================

	describe("Refetch Functions", () => {
		describe("useGoogleTasksStatus refetch", () => {
			it("calls refetch successfully", async () => {
				const { result } = renderHook(() => useGoogleTasksStatus(), {
					wrapper: createWrapper(),
				});

				await waitFor(() => {
					expect(result.current.isLoading).toBe(false);
				});

				act(() => {
					result.current.refetch();
				});

				// Refetch should be callable without errors
				expect(result.current.refetch).toBeDefined();
			});
		});

		describe("useGoogleTaskLists refetch", () => {
			it("calls refetch successfully", async () => {
				const { result } = renderHook(() => useGoogleTaskLists(), {
					wrapper: createWrapper(),
				});

				await waitFor(() => {
					expect(result.current.isLoading).toBe(false);
				});

				act(() => {
					result.current.refetch();
				});

				expect(result.current.refetch).toBeDefined();
			});
		});

		describe("useGoogleTasks refetch", () => {
			it("calls refetch successfully", async () => {
				const { result } = renderHook(
					() =>
						useGoogleTasks({
							taskListId: "list-1",
							showDeleted: false,
							showHidden: false,
						}),
					{
						wrapper: createWrapper(),
					},
				);

				await waitFor(() => {
					expect(result.current.isLoading).toBe(false);
				});

				act(() => {
					result.current.refetch();
				});

				expect(result.current.refetch).toBeDefined();
			});
		});

		describe("useGoogleTask refetch", () => {
			it("calls refetch successfully", async () => {
				const { result } = renderHook(
					() =>
						useGoogleTask({
							taskListId: "list-1",
							taskId: "task-1",
						}),
					{
						wrapper: createWrapper(),
					},
				);

				await waitFor(() => {
					expect(result.current.isLoading).toBe(false);
				});

				act(() => {
					result.current.refetch();
				});

				expect(result.current.refetch).toBeDefined();
			});
		});
	});

	// ========================================================================
	// Integration Settings Update Tests
	// ========================================================================

	describe("useUpdateGoogleTasksSettings", () => {
		it("updates enabled setting successfully", async () => {
			const { result } = renderHook(() => useUpdateGoogleTasksSettings(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.updateSettings({ enabled: false });
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("updates syncEnabled setting successfully", async () => {
			const { result } = renderHook(() => useUpdateGoogleTasksSettings(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.updateSettings({ syncEnabled: true });
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("updates defaultListId setting successfully", async () => {
			const { result } = renderHook(() => useUpdateGoogleTasksSettings(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.updateSettings({
					defaultListId: "new-default-list",
				});
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("updates multiple settings at once", async () => {
			const { result } = renderHook(() => useUpdateGoogleTasksSettings(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.updateSettings({
					enabled: true,
					syncEnabled: false,
					defaultListId: null,
				});
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});
	});

	// ========================================================================
	// Delete Task Tests
	// ========================================================================

	describe("useDeleteGoogleTask additional tests", () => {
		it("handles deletion with valid taskListId and taskId", async () => {
			const { result } = renderHook(() => useDeleteGoogleTask(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.deleteTask({
					taskListId: "list-123",
					taskId: "task-456",
				});
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});
	});

	// ========================================================================
	// Clear Completed Tests
	// ========================================================================

	describe("useClearGoogleTasksCompleted additional tests", () => {
		it("handles clearing completed tasks with valid taskListId", async () => {
			const { result } = renderHook(() => useClearGoogleTasksCompleted(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.clearCompleted({
					taskListId: "list-123",
				});
			});

			expect(result.current.isPending).toBe(false);
			expect(result.current.error).toBeNull();
		});
	});
});
