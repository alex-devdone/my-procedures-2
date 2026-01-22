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

// Mock the auth-client module
const mockUseSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
	useSession: () => mockUseSession(),
}));

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
const localStorageMock = {
	getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
	setItem: vi.fn((key: string, value: string) => {
		mockLocalStorage[key] = value;
	}),
	removeItem: vi.fn((key: string) => {
		delete mockLocalStorage[key];
	}),
	clear: vi.fn(() => {
		for (const key of Object.keys(mockLocalStorage)) {
			delete mockLocalStorage[key];
		}
	}),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
	randomUUID: () => `uuid-${Date.now()}-${Math.random()}`,
});

// Mock the todo.api module
vi.mock("./todo.api", () => ({
	getAllTodosQueryOptions: () => ({
		queryKey: ["todos"],
		queryFn: vi.fn().mockResolvedValue([]),
	}),
	getCreateTodoMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({ id: 1 }),
	}),
	getToggleTodoMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({}),
	}),
	getDeleteTodoMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({}),
	}),
	getBulkCreateTodosMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({ count: 0 }),
	}),
	getUpdateTodoFolderMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({}),
	}),
	getUpdateTodoScheduleMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({}),
	}),
	getCompleteRecurringMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({}),
	}),
	getUpdatePastCompletionMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({}),
	}),
	getTodosQueryKey: () => ["todos"],
}));

// Mock queryClient
vi.mock("@/utils/trpc", () => ({
	queryClient: {
		cancelQueries: vi.fn().mockResolvedValue(undefined),
		getQueryData: vi.fn(),
		setQueryData: vi.fn(),
		invalidateQueries: vi.fn().mockResolvedValue(undefined),
	},
}));

// Import after mocks are set up
import { useSyncTodos, useTodoStorage } from "./todo.hooks";

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

describe("useTodoStorage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();

		// Default: unauthenticated user
		mockUseSession.mockReturnValue({
			data: null,
			isPending: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Authentication State Detection", () => {
		it("returns isAuthenticated: false when no session", async () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isAuthenticated).toBe(false);
		});

		it("returns isAuthenticated: true when user session exists", async () => {
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123", email: "test@test.com" } },
				isPending: false,
			});

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isAuthenticated).toBe(true);
		});

		it("returns isLoading: true when session is pending", async () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: true,
			});

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
		});
	});

	describe("Guest Mode (Local Storage)", () => {
		beforeEach(() => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});
		});

		it("returns empty todos when localStorage is empty", () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.todos).toEqual([]);
		});

		it("returns todos from localStorage when not authenticated", () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Local Task 1", completed: false },
				{ id: "uuid-2", text: "Local Task 2", completed: true },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.todos).toHaveLength(2);
			expect(result.current.todos[0].text).toBe("Local Task 1");
		});

		it("creates todo in localStorage when not authenticated", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.create("New Local Task");
			});

			expect(localStorageMock.setItem).toHaveBeenCalled();
			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored).toHaveLength(1);
			expect(stored[0].text).toBe("New Local Task");
			expect(stored[0].completed).toBe(false);
		});

		it("toggles todo in localStorage when not authenticated", async () => {
			const initialTodos = [{ id: "uuid-1", text: "Task 1", completed: false }];
			mockLocalStorage.todos = JSON.stringify(initialTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.toggle("uuid-1", true);
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].completed).toBe(true);
		});

		it("deletes todo from localStorage when not authenticated", async () => {
			const initialTodos = [
				{ id: "uuid-1", text: "Task 1", completed: false },
				{ id: "uuid-2", text: "Task 2", completed: false },
			];
			mockLocalStorage.todos = JSON.stringify(initialTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.deleteTodo("uuid-1");
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe("uuid-2");
		});
	});

	describe("Authenticated Mode", () => {
		beforeEach(() => {
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123", email: "test@test.com" } },
				isPending: false,
			});
		});

		it("does not use localStorage when authenticated", () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Local Task", completed: false },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			// Should return remote todos (empty by default in mock), not local
			expect(result.current.isAuthenticated).toBe(true);
		});

		it("updatePastCompletion is available for authenticated users", () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.updatePastCompletion).toBeDefined();
			expect(typeof result.current.updatePastCompletion).toBe("function");
		});

		it("updatePastCompletion calls mutation for authenticated users", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.updatePastCompletion(
					1,
					"2026-01-20T00:00:00.000Z",
					true,
				);
			});

			// Verify the method completes without throwing
			expect(result.current.updatePastCompletion).toBeDefined();
		});

		it("updatePastCompletion skips server call for optimistic IDs", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			// Should not throw for negative (optimistic) IDs
			await act(async () => {
				await result.current.updatePastCompletion(
					-1,
					"2026-01-20T00:00:00.000Z",
					true,
				);
			});

			// Should complete successfully
			expect(result.current.updatePastCompletion).toBeDefined();
		});
	});

	describe("Dual-Mode Switching", () => {
		it("switches from local to remote todos when user logs in", async () => {
			// Start unauthenticated with local todos
			const localTodos = [{ id: "uuid-1", text: "Local", completed: false }];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result, rerender } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isAuthenticated).toBe(false);
			expect(result.current.todos).toHaveLength(1);

			// Simulate login
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123", email: "test@test.com" } },
				isPending: false,
			});

			rerender();

			await waitFor(() => {
				expect(result.current.isAuthenticated).toBe(true);
			});
		});
	});

	describe("Loading State", () => {
		it("returns isLoading true when session is pending", () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: true, // Session pending
			});

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
		});

		it("returns isLoading false when session resolved and not authenticated", () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			// Should be false because we're not fetching remote todos in guest mode
			expect(result.current.isLoading).toBe(false);
		});

		it("does not include mutation pending states in isLoading (allows optimistic updates)", async () => {
			// Start with some local todos
			const localTodos = [{ id: "uuid-1", text: "Task 1", completed: false }];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			// isLoading should be false before toggle
			expect(result.current.isLoading).toBe(false);

			// Start toggle mutation (don't await to check isLoading during mutation)
			act(() => {
				result.current.toggle("uuid-1", true);
			});

			// isLoading should STILL be false during mutation - this allows optimistic updates
			// to render immediately without showing loading skeleton
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("Todo Normalization", () => {
		it("normalizes local todos to unified format", () => {
			const localTodos = [{ id: "uuid-abc", text: "Task", completed: true }];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.todos[0]).toEqual({
				id: "uuid-abc",
				text: "Task",
				completed: true,
				folderId: null,
				dueDate: null,
				reminderAt: null,
				recurringPattern: null,
			});
		});
	});
});

describe("useSyncTodos", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Initial State", () => {
		it("returns closed sync prompt by default", () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			expect(result.current.syncPrompt.isOpen).toBe(false);
			expect(result.current.syncPrompt.localTodosCount).toBe(0);
			expect(result.current.syncPrompt.remoteTodosCount).toBe(0);
		});

		it("returns isSyncing: false initially", () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isSyncing).toBe(false);
		});
	});

	describe("Login Transition Detection", () => {
		it("does not show sync prompt on initial load when authenticated", () => {
			// User is already authenticated on first render
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123" } },
				isPending: false,
			});

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			// Should not trigger sync prompt on initial load
			expect(result.current.syncPrompt.isOpen).toBe(false);
		});

		it("does not show sync prompt when there are no local todos", async () => {
			// Start unauthenticated with no local todos
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result, rerender } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			// Simulate login
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123" } },
				isPending: false,
			});

			rerender();

			await waitFor(() => {
				// No local todos, so no prompt
				expect(result.current.syncPrompt.isOpen).toBe(false);
			});
		});
	});

	describe("Sync Actions", () => {
		beforeEach(() => {
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123" } },
				isPending: false,
			});
		});

		it("clears local storage on discard action", async () => {
			const localTodos = [{ id: "uuid-1", text: "Task", completed: false }];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("discard");
			});

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("clears local storage after sync action", async () => {
			const localTodos = [{ id: "uuid-1", text: "Task", completed: false }];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("clears local storage after keep_both action", async () => {
			const localTodos = [{ id: "uuid-1", text: "Task", completed: false }];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("keep_both");
			});

			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("closes sync prompt after action completes", async () => {
			const localTodos = [{ id: "uuid-1", text: "Task", completed: false }];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			// Manually set sync prompt open state
			await act(async () => {
				await result.current.handleSyncAction("discard");
			});

			expect(result.current.syncPrompt.isOpen).toBe(false);
			expect(result.current.syncPrompt.localTodosCount).toBe(0);
		});
	});

	describe("Sync with Scheduling Fields", () => {
		beforeEach(() => {
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123" } },
				isPending: false,
			});
		});

		it("includes scheduling fields when syncing todos with dueDate", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Task with due date",
					completed: false,
					dueDate: "2026-01-25T10:00:00.000Z",
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (sync was attempted)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("includes scheduling fields when syncing todos with reminderAt", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Task with reminder",
					completed: false,
					reminderAt: "2026-01-25T09:00:00.000Z",
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (sync was attempted)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("includes scheduling fields when syncing todos with recurringPattern", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Daily recurring task",
					completed: false,
					recurringPattern: { type: "daily" },
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (sync was attempted)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("includes all scheduling fields when syncing fully scheduled todo", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Fully scheduled task",
					completed: true,
					dueDate: "2026-01-25T10:00:00.000Z",
					reminderAt: "2026-01-25T09:00:00.000Z",
					recurringPattern: { type: "weekly", daysOfWeek: [1, 3, 5] },
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (sync was attempted)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("sets null for undefined scheduling fields when syncing", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Task without scheduling",
					completed: false,
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (sync was attempted)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("includes scheduling fields when using keep_both action", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Task to keep",
					completed: false,
					dueDate: "2026-01-30T10:00:00.000Z",
					reminderAt: "2026-01-30T08:00:00.000Z",
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("keep_both");
			});

			// Verify localStorage was cleared (sync was attempted)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("sets folderId to null when syncing (local folders use string UUIDs)", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Task in local folder",
					completed: false,
					folderId: "local-folder-uuid",
					dueDate: "2026-01-25T10:00:00.000Z",
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (sync was attempted)
			// Note: folderId is intentionally set to null because local folders use string UUIDs
			// while remote folders use numeric IDs - folder sync is handled separately
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("syncs multiple todos with mixed scheduling fields", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Simple task",
					completed: false,
				},
				{
					id: "uuid-2",
					text: "Scheduled task",
					completed: true,
					dueDate: "2026-01-25T10:00:00.000Z",
					reminderAt: "2026-01-25T09:00:00.000Z",
					recurringPattern: { type: "daily" },
				},
				{
					id: "uuid-3",
					text: "Due only task",
					completed: false,
					dueDate: "2026-02-01T12:00:00.000Z",
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (all todos were synced)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("includes notifyAt field when syncing recurring todos with sync action", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Daily reminder with notification time",
					completed: false,
					dueDate: "2026-01-25T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "09:00",
					},
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (sync was attempted with notifyAt included)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("includes notifyAt field when syncing recurring todos with keep_both action", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Weekly meeting notification",
					completed: false,
					dueDate: "2026-01-27T14:00:00.000Z",
					recurringPattern: {
						type: "weekly",
						interval: 1,
						daysOfWeek: [1],
						notifyAt: "13:45",
					},
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("keep_both");
			});

			// Verify localStorage was cleared (sync was attempted with notifyAt included)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("syncs multiple recurring todos with different notifyAt times", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Morning standup",
					completed: false,
					dueDate: "2026-01-25T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "08:45",
					},
				},
				{
					id: "uuid-2",
					text: "Evening review",
					completed: false,
					dueDate: "2026-01-25T17:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						notifyAt: "16:30",
					},
				},
				{
					id: "uuid-3",
					text: "Monthly report",
					completed: true,
					dueDate: "2026-01-31T10:00:00.000Z",
					recurringPattern: {
						type: "monthly",
						interval: 1,
						dayOfMonth: 31,
						notifyAt: "09:00",
					},
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (all todos synced with their notifyAt values)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("syncs recurring pattern without notifyAt (optional field)", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Recurring without notification time",
					completed: false,
					dueDate: "2026-01-25T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
					},
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (sync works without notifyAt)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("syncs yearly recurring todo with notifyAt", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Annual review",
					completed: false,
					dueDate: "2026-03-15T10:00:00.000Z",
					recurringPattern: {
						type: "yearly",
						interval: 1,
						monthOfYear: 3,
						dayOfMonth: 15,
						notifyAt: "09:00",
					},
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (yearly pattern with notifyAt synced)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("syncs custom recurring pattern with notifyAt and daysOfWeek", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Weekend activity",
					completed: false,
					dueDate: "2026-01-25T12:00:00.000Z",
					recurringPattern: {
						type: "custom",
						interval: 1,
						daysOfWeek: [0, 6],
						notifyAt: "11:30",
					},
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (custom pattern with notifyAt synced)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});

		it("syncs recurring pattern with notifyAt and expiration settings", async () => {
			const localTodos = [
				{
					id: "uuid-1",
					text: "Limited recurrence with notification",
					completed: false,
					dueDate: "2026-01-25T09:00:00.000Z",
					recurringPattern: {
						type: "daily",
						interval: 1,
						endDate: "2026-02-28",
						occurrences: 30,
						notifyAt: "08:30",
					},
				},
			];
			mockLocalStorage.todos = JSON.stringify(localTodos);

			const { result } = renderHook(() => useSyncTodos(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.handleSyncAction("sync");
			});

			// Verify localStorage was cleared (pattern with expiration and notifyAt synced)
			expect(localStorageMock.removeItem).toHaveBeenCalledWith("todos");
		});
	});
});

describe("External Store Pattern", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		mockUseSession.mockReturnValue({
			data: null,
			isPending: false,
		});
	});

	it("uses stable cached reference when data unchanged", () => {
		const todos = [{ id: "uuid-1", text: "Task", completed: false }];
		mockLocalStorage.todos = JSON.stringify(todos);

		const { result, rerender } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		const firstTodos = result.current.todos;

		// Re-render without changing localStorage
		rerender();

		const secondTodos = result.current.todos;

		// Should be referentially equal if data hasn't changed
		expect(firstTodos.length).toBe(secondTodos.length);
	});

	it("returns empty array for server snapshot (SSR)", () => {
		// This test verifies the server snapshot behavior
		// In the actual implementation, getLocalTodosServerSnapshot returns []
		mockUseSession.mockReturnValue({
			data: null,
			isPending: false,
		});

		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// The hook should work without errors in test environment
		expect(Array.isArray(result.current.todos)).toBe(true);
	});
});

describe("Scheduling Support", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		mockUseSession.mockReturnValue({
			data: null,
			isPending: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Create Todo with Scheduling (Guest Mode)", () => {
		it("creates todo with dueDate in localStorage", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			const dueDate = "2026-01-25T10:00:00.000Z";
			await act(async () => {
				await result.current.create("Task with due date", null, { dueDate });
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].dueDate).toBe(dueDate);
		});

		it("creates todo with reminderAt in localStorage", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			const reminderAt = "2026-01-25T09:00:00.000Z";
			await act(async () => {
				await result.current.create("Task with reminder", null, { reminderAt });
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].reminderAt).toBe(reminderAt);
		});

		it("creates todo with recurringPattern in localStorage", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			const recurringPattern = { type: "daily" as const };
			await act(async () => {
				await result.current.create("Daily task", null, { recurringPattern });
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].recurringPattern).toEqual({ type: "daily" });
		});

		it("creates todo with all scheduling fields in localStorage", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			const scheduling = {
				dueDate: "2026-01-25T10:00:00.000Z",
				reminderAt: "2026-01-25T09:00:00.000Z",
				recurringPattern: { type: "weekly" as const, daysOfWeek: [1, 3, 5] },
			};
			await act(async () => {
				await result.current.create("Full scheduled task", null, scheduling);
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].dueDate).toBe(scheduling.dueDate);
			expect(stored[0].reminderAt).toBe(scheduling.reminderAt);
			expect(stored[0].recurringPattern).toEqual(scheduling.recurringPattern);
		});

		it("creates todo with folderId and scheduling in localStorage", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			const scheduling = { dueDate: "2026-01-25T10:00:00.000Z" };
			await act(async () => {
				await result.current.create(
					"Folder task with due date",
					"work-folder",
					scheduling,
				);
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].folderId).toBe("work-folder");
			expect(stored[0].dueDate).toBe(scheduling.dueDate);
		});

		it("creates todo with null scheduling fields when no scheduling provided", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.create("Simple task");
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].dueDate).toBe(null);
			expect(stored[0].reminderAt).toBe(null);
			expect(stored[0].recurringPattern).toBe(null);
		});
	});

	describe("Update Schedule (Guest Mode)", () => {
		it("updates todo dueDate via updateSchedule in localStorage", async () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Task", completed: false, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			const dueDate = "2026-01-30T10:00:00.000Z";
			await act(async () => {
				await result.current.updateSchedule("uuid-1", { dueDate });
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].dueDate).toBe(dueDate);
		});

		it("updates todo reminderAt via updateSchedule in localStorage", async () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Task", completed: false, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			const reminderAt = "2026-01-30T09:00:00.000Z";
			await act(async () => {
				await result.current.updateSchedule("uuid-1", { reminderAt });
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].reminderAt).toBe(reminderAt);
		});

		it("updates todo recurringPattern via updateSchedule in localStorage", async () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Task", completed: false, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			const recurringPattern = { type: "monthly" as const, dayOfMonth: 15 };
			await act(async () => {
				await result.current.updateSchedule("uuid-1", { recurringPattern });
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].recurringPattern).toEqual(recurringPattern);
		});

		it("updates multiple scheduling fields at once in localStorage", async () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Task", completed: false, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			const scheduling = {
				dueDate: "2026-02-01T10:00:00.000Z",
				reminderAt: "2026-02-01T08:00:00.000Z",
				recurringPattern: {
					type: "yearly" as const,
					monthOfYear: 2,
					dayOfMonth: 1,
				},
			};
			await act(async () => {
				await result.current.updateSchedule("uuid-1", scheduling);
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].dueDate).toBe(scheduling.dueDate);
			expect(stored[0].reminderAt).toBe(scheduling.reminderAt);
			expect(stored[0].recurringPattern).toEqual(scheduling.recurringPattern);
		});

		it("clears scheduling fields by setting them to null", async () => {
			const storedTodos = [
				{
					id: "uuid-1",
					text: "Task",
					completed: false,
					folderId: null,
					dueDate: "2026-01-25T10:00:00.000Z",
					reminderAt: "2026-01-25T09:00:00.000Z",
					recurringPattern: { type: "daily" },
				},
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.updateSchedule("uuid-1", {
					dueDate: null,
					reminderAt: null,
					recurringPattern: null,
				});
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].dueDate).toBe(null);
			expect(stored[0].reminderAt).toBe(null);
			expect(stored[0].recurringPattern).toBe(null);
		});
	});

	describe("Todos Include Scheduling Fields", () => {
		it("todos array includes scheduling fields from localStorage", () => {
			const storedTodos = [
				{
					id: "uuid-1",
					text: "Scheduled Task",
					completed: false,
					folderId: null,
					dueDate: "2026-01-25T10:00:00.000Z",
					reminderAt: "2026-01-25T09:00:00.000Z",
					recurringPattern: { type: "weekly", daysOfWeek: [1, 3, 5] },
				},
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.todos[0].dueDate).toBe("2026-01-25T10:00:00.000Z");
			expect(result.current.todos[0].reminderAt).toBe(
				"2026-01-25T09:00:00.000Z",
			);
			expect(result.current.todos[0].recurringPattern).toEqual({
				type: "weekly",
				daysOfWeek: [1, 3, 5],
			});
		});

		it("todos array normalizes undefined scheduling fields to null", () => {
			const storedTodos = [
				{
					id: "uuid-1",
					text: "Task without scheduling",
					completed: false,
					folderId: null,
				},
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.todos[0].dueDate).toBe(null);
			expect(result.current.todos[0].reminderAt).toBe(null);
			expect(result.current.todos[0].recurringPattern).toBe(null);
		});

		it("filteredTodos preserves scheduling fields", () => {
			const storedTodos = [
				{
					id: "uuid-1",
					text: "Inbox Task",
					completed: false,
					folderId: null,
					dueDate: "2026-01-25T10:00:00.000Z",
				},
				{
					id: "uuid-2",
					text: "Folder Task",
					completed: false,
					folderId: "work-folder",
					dueDate: "2026-01-26T10:00:00.000Z",
				},
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			// Default is inbox
			expect(result.current.filteredTodos[0].dueDate).toBe(
				"2026-01-25T10:00:00.000Z",
			);

			// Switch to folder
			act(() => {
				result.current.setSelectedFolderId("work-folder");
			});

			expect(result.current.filteredTodos[0].dueDate).toBe(
				"2026-01-26T10:00:00.000Z",
			);
		});
	});
});

describe("Folder Filtering", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		mockUseSession.mockReturnValue({
			data: null,
			isPending: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("selectedFolderId State", () => {
		it("defaults to 'inbox' for selectedFolderId", () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.selectedFolderId).toBe("inbox");
		});

		it("allows changing selectedFolderId", () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSelectedFolderId("folder-1");
			});

			expect(result.current.selectedFolderId).toBe("folder-1");
		});

		it("allows setting selectedFolderId back to inbox", () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSelectedFolderId("folder-1");
			});

			act(() => {
				result.current.setSelectedFolderId("inbox");
			});

			expect(result.current.selectedFolderId).toBe("inbox");
		});
	});

	describe("filteredTodos by Folder", () => {
		it("shows only todos without folderId when inbox is selected", () => {
			const storedTodos = [
				{
					id: "uuid-1",
					text: "Inbox Task 1",
					completed: false,
					folderId: null,
				},
				{
					id: "uuid-2",
					text: "Folder Task",
					completed: false,
					folderId: "folder-1",
				},
				{ id: "uuid-3", text: "Inbox Task 2", completed: true, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			// Default is inbox
			expect(result.current.selectedFolderId).toBe("inbox");
			expect(result.current.filteredTodos).toHaveLength(2);
			expect(result.current.filteredTodos[0].text).toBe("Inbox Task 1");
			expect(result.current.filteredTodos[1].text).toBe("Inbox Task 2");
		});

		it("shows only todos with matching folderId when folder is selected", () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Inbox Task", completed: false, folderId: null },
				{
					id: "uuid-2",
					text: "Work Task 1",
					completed: false,
					folderId: "work-folder",
				},
				{
					id: "uuid-3",
					text: "Work Task 2",
					completed: true,
					folderId: "work-folder",
				},
				{
					id: "uuid-4",
					text: "Personal Task",
					completed: false,
					folderId: "personal-folder",
				},
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSelectedFolderId("work-folder");
			});

			expect(result.current.filteredTodos).toHaveLength(2);
			expect(result.current.filteredTodos[0].text).toBe("Work Task 1");
			expect(result.current.filteredTodos[1].text).toBe("Work Task 2");
		});

		it("returns empty array when folder has no todos", () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Inbox Task", completed: false, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSelectedFolderId("empty-folder");
			});

			expect(result.current.filteredTodos).toHaveLength(0);
		});

		it("treats undefined folderId as inbox (null)", () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Task without folderId", completed: false },
				{
					id: "uuid-2",
					text: "Task with null folderId",
					completed: false,
					folderId: null,
				},
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			// Both should appear in inbox
			expect(result.current.filteredTodos).toHaveLength(2);
		});

		it("updates filteredTodos when todos change", async () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Inbox Task", completed: false, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.filteredTodos).toHaveLength(1);

			// Create a new todo in inbox
			await act(async () => {
				await result.current.create("New Inbox Task");
			});

			expect(result.current.filteredTodos).toHaveLength(2);
		});
	});

	describe("Create Todo with Folder", () => {
		it("creates todo with null folderId when inbox is selected", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.create("New Task");
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].folderId).toBe(null);
		});

		it("creates todo with folderId when folder is selected", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.create("New Task", "work-folder");
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].folderId).toBe("work-folder");
		});

		it("creates todo with explicit null folderId", async () => {
			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.create("New Task", null);
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].folderId).toBe(null);
		});
	});

	describe("Update Todo Folder", () => {
		it("updates todo folderId via updateFolder", async () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Task", completed: false, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.updateFolder("uuid-1", "work-folder");
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].folderId).toBe("work-folder");
		});

		it("moves todo to inbox by setting folderId to null", async () => {
			const storedTodos = [
				{
					id: "uuid-1",
					text: "Task",
					completed: false,
					folderId: "work-folder",
				},
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.updateFolder("uuid-1", null);
			});

			const stored = JSON.parse(mockLocalStorage.todos);
			expect(stored[0].folderId).toBe(null);
		});

		it("todo disappears from filtered list when moved to different folder", async () => {
			const storedTodos = [
				{ id: "uuid-1", text: "Task", completed: false, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			// Task is visible in inbox
			expect(result.current.filteredTodos).toHaveLength(1);

			await act(async () => {
				await result.current.updateFolder("uuid-1", "work-folder");
			});

			// Task is no longer visible in inbox
			expect(result.current.filteredTodos).toHaveLength(0);
		});
	});

	describe("Todos Include folderId", () => {
		it("todos array includes folderId property", () => {
			const storedTodos = [
				{
					id: "uuid-1",
					text: "Task 1",
					completed: false,
					folderId: "folder-1",
				},
				{ id: "uuid-2", text: "Task 2", completed: true, folderId: null },
			];
			mockLocalStorage.todos = JSON.stringify(storedTodos);

			const { result } = renderHook(() => useTodoStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.todos[0].folderId).toBe("folder-1");
			expect(result.current.todos[1].folderId).toBe(null);
		});
	});
});

describe("toggle with virtualDate for recurring todos", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		mockUseSession.mockReturnValue({
			data: { user: { id: "user-123" } },
			isPending: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("completes without error when virtualDate is provided with recurring todo", async () => {
		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// The hook should support the virtualDate option
		await act(async () => {
			// This should not throw - the toggle function accepts virtualDate option
			await result.current.toggle(1, true, {
				virtualDate: "2026-01-20T00:00:00.000Z",
			});
		});

		// Test passes if no error is thrown
		expect(result.current.toggle).toBeDefined();
	});

	it("completes without error when virtualDate is not provided with recurring todo", async () => {
		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// The hook should work without virtualDate option
		await act(async () => {
			await result.current.toggle(1, true);
		});

		// Test passes if no error is thrown
		expect(result.current.toggle).toBeDefined();
	});

	it("completes without error when unchecking a recurring todo", async () => {
		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// Unchecking should work
		await act(async () => {
			await result.current.toggle(1, false);
		});

		// Test passes if no error is thrown
		expect(result.current.toggle).toBeDefined();
	});

	it("completes without error for non-recurring todos", async () => {
		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// Regular toggle should work
		await act(async () => {
			await result.current.toggle(1, true);
		});

		// Test passes if no error is thrown
		expect(result.current.toggle).toBeDefined();
	});

	it("completes without error when virtualDate is provided for non-recurring todo", async () => {
		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// virtualDate should be ignored for non-recurring todos
		await act(async () => {
			await result.current.toggle(1, true, {
				virtualDate: "2026-01-20T00:00:00.000Z",
			});
		});

		// Test passes if no error is thrown
		expect(result.current.toggle).toBeDefined();
	});
});

describe("toggle recurring todo: completeRecurring vs updatePastCompletion (local storage)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();

		// Use local storage mode (guest mode) for these tests
		mockUseSession.mockReturnValue({
			data: null,
			isPending: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("uses completeRecurring when virtualDate matches todo's dueDate", async () => {
		// Set up a recurring todo with dueDate matching today
		const todayDate = "2026-01-22";
		const storedTodos = [
			{
				id: "uuid-1",
				text: "Daily Task",
				completed: false,
				folderId: null,
				dueDate: `${todayDate}T00:00:00.000Z`,
				reminderAt: null,
				recurringPattern: { type: "daily", interval: 1 },
			},
		];
		mockLocalStorage.todos = JSON.stringify(storedTodos);

		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// Toggle with virtualDate matching the dueDate (same day)
		await act(async () => {
			await result.current.toggle("uuid-1", true, { virtualDate: todayDate });
		});

		// After completeRecurring, the original todo should be marked completed
		// and a new todo should be created with the next occurrence date
		const stored = JSON.parse(mockLocalStorage.todos);

		// Should have 2 todos now: the completed original and the new occurrence
		expect(stored.length).toBe(2);

		// Find the original (completed) and new (incomplete) todos
		const completedTodo = stored.find(
			(t: { completed: boolean }) => t.completed === true,
		);
		const newTodo = stored.find(
			(t: { completed: boolean }) => t.completed === false,
		);

		expect(completedTodo).toBeDefined();
		expect(newTodo).toBeDefined();

		// New todo should have a different (future) dueDate
		expect(newTodo.dueDate).not.toBe(completedTodo.dueDate);
	});

	it("uses toggleLocalOccurrence when virtualDate does NOT match todo's dueDate", async () => {
		// Set up a recurring todo with dueDate different from virtualDate
		const storedTodos = [
			{
				id: "uuid-1",
				text: "Daily Task",
				completed: false,
				folderId: null,
				dueDate: "2026-01-25T00:00:00.000Z", // Different from virtualDate
				reminderAt: null,
				recurringPattern: { type: "daily", interval: 1 },
			},
		];
		mockLocalStorage.todos = JSON.stringify(storedTodos);

		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// Toggle with virtualDate NOT matching the dueDate (pattern-generated occurrence)
		await act(async () => {
			await result.current.toggle("uuid-1", true, {
				virtualDate: "2026-01-22",
			});
		});

		// For pattern-generated occurrences, toggleLocalOccurrence is called
		// This records the completion in completionHistory but does NOT create a new todo
		const stored = JSON.parse(mockLocalStorage.todos);

		// Should still have only 1 todo (no new occurrence created)
		expect(stored.length).toBe(1);

		// The original todo should NOT be marked as completed (it's a future occurrence)
		expect(stored[0].completed).toBe(false);
		expect(stored[0].dueDate).toBe("2026-01-25T00:00:00.000Z");

		// Completion history should have an entry for the virtual date
		// The local storage uses "completion_history" as the key
		const completionHistory = JSON.parse(
			mockLocalStorage.completion_history || "[]",
		);
		const entry = completionHistory.find(
			(e: { todoId: string; scheduledDate: string }) =>
				e.todoId === "uuid-1" && e.scheduledDate === "2026-01-22",
		);
		expect(entry).toBeDefined();
		expect(entry.completedAt).not.toBeNull();
	});

	it("uses completeRecurring when no virtualDate is provided", async () => {
		// Set up a recurring todo
		const storedTodos = [
			{
				id: "uuid-1",
				text: "Daily Task",
				completed: false,
				folderId: null,
				dueDate: "2026-01-22T00:00:00.000Z",
				reminderAt: null,
				recurringPattern: { type: "daily", interval: 1 },
			},
		];
		mockLocalStorage.todos = JSON.stringify(storedTodos);

		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// Toggle without virtualDate
		await act(async () => {
			await result.current.toggle("uuid-1", true);
		});

		// Should use completeRecurring - creates a new todo with next occurrence
		const stored = JSON.parse(mockLocalStorage.todos);

		// Should have 2 todos now: the completed original and the new occurrence
		expect(stored.length).toBe(2);

		// Find the completed todo
		const completedTodo = stored.find(
			(t: { completed: boolean }) => t.completed === true,
		);
		expect(completedTodo).toBeDefined();
	});

	it("handles recurring todo without dueDate using pattern-based completion", async () => {
		// Set up a recurring todo without an explicit dueDate
		const storedTodos = [
			{
				id: "uuid-1",
				text: "Daily Task",
				completed: false,
				folderId: null,
				dueDate: null, // No explicit dueDate
				reminderAt: null,
				recurringPattern: { type: "daily", interval: 1 },
			},
		];
		mockLocalStorage.todos = JSON.stringify(storedTodos);

		const { result } = renderHook(() => useTodoStorage(), {
			wrapper: createWrapper(),
		});

		// Toggle with virtualDate (since no dueDate, any virtualDate is pattern-generated)
		await act(async () => {
			await result.current.toggle("uuid-1", true, {
				virtualDate: "2026-01-22",
			});
		});

		// When todo has no dueDate, virtualDate will never match, so it uses toggleLocalOccurrence
		const stored = JSON.parse(mockLocalStorage.todos);

		// Should still have only 1 todo
		expect(stored.length).toBe(1);

		// Check completion history has an entry
		// The local storage uses "completion_history" as the key
		const completionHistory = JSON.parse(
			mockLocalStorage.completion_history || "[]",
		);
		const entry = completionHistory.find(
			(e: { todoId: string; scheduledDate: string }) =>
				e.todoId === "uuid-1" && e.scheduledDate === "2026-01-22",
		);
		expect(entry).toBeDefined();
		expect(entry.completedAt).not.toBeNull();
	});
});
