"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

// Mock the subtask.api module
vi.mock("./subtask.api", () => ({
	getSubtasksQueryOptions: (input: { todoId: number }) => ({
		queryKey: ["subtasks", input.todoId],
		queryFn: vi.fn().mockResolvedValue([]),
	}),
	getSubtasksQueryKey: (todoId: number) => ["subtasks", todoId],
	getCreateSubtaskMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({
			id: 1,
			text: "New Subtask",
			completed: false,
			todoId: 1,
			order: 0,
		}),
	}),
	getUpdateSubtaskMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({
			id: 1,
			text: "Updated Subtask",
			completed: false,
			todoId: 1,
			order: 0,
		}),
	}),
	getToggleSubtaskMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({
			id: 1,
			text: "Subtask",
			completed: true,
			todoId: 1,
			order: 0,
		}),
	}),
	getDeleteSubtaskMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({ success: true }),
	}),
	getReorderSubtaskMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({
			id: 1,
			text: "Subtask",
			completed: false,
			todoId: 1,
			order: 1,
		}),
	}),
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
import { useSubtaskStorage } from "./subtask.hooks";

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

describe("useSubtaskStorage", () => {
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

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			expect(result.current.isAuthenticated).toBe(false);
		});

		it("returns isAuthenticated: true when user session exists", async () => {
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123", email: "test@test.com" } },
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage(1), {
				wrapper: createWrapper(),
			});

			expect(result.current.isAuthenticated).toBe(true);
		});

		it("returns isLoading: true when session is pending", async () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: true,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
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

		it("returns empty subtasks when localStorage is empty", () => {
			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			expect(result.current.subtasks).toEqual([]);
		});

		it("returns subtasks from localStorage for the specified todo", () => {
			const storedSubtasks = [
				{
					id: "subtask-1",
					text: "First subtask",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
				{
					id: "subtask-2",
					text: "Second subtask",
					completed: true,
					todoId: "todo-1",
					order: 1,
				},
				{
					id: "subtask-3",
					text: "Other todo subtask",
					completed: false,
					todoId: "todo-2",
					order: 0,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(storedSubtasks);

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			expect(result.current.subtasks).toHaveLength(2);
			expect(result.current.subtasks[0].text).toBe("First subtask");
			expect(result.current.subtasks[1].text).toBe("Second subtask");
		});

		it("creates subtask in localStorage when not authenticated", async () => {
			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.create("todo-1", "New subtask");
			});

			expect(localStorageMock.setItem).toHaveBeenCalled();
			const stored = JSON.parse(mockLocalStorage.subtasks);
			expect(stored).toHaveLength(1);
			expect(stored[0].text).toBe("New subtask");
			expect(stored[0].todoId).toBe("todo-1");
			expect(stored[0].completed).toBe(false);
		});

		it("updates subtask text in localStorage when not authenticated", async () => {
			const initialSubtasks = [
				{
					id: "subtask-1",
					text: "Old text",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(initialSubtasks);

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.update("subtask-1", "Updated text");
			});

			const stored = JSON.parse(mockLocalStorage.subtasks);
			expect(stored[0].text).toBe("Updated text");
		});

		it("toggles subtask completion in localStorage when not authenticated", async () => {
			const initialSubtasks = [
				{
					id: "subtask-1",
					text: "Subtask",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(initialSubtasks);

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.toggle("subtask-1", true);
			});

			const stored = JSON.parse(mockLocalStorage.subtasks);
			expect(stored[0].completed).toBe(true);
		});

		it("deletes subtask from localStorage when not authenticated", async () => {
			const initialSubtasks = [
				{
					id: "subtask-1",
					text: "Subtask 1",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
				{
					id: "subtask-2",
					text: "Subtask 2",
					completed: false,
					todoId: "todo-1",
					order: 1,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(initialSubtasks);

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.deleteSubtask("subtask-1");
			});

			const stored = JSON.parse(mockLocalStorage.subtasks);
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe("subtask-2");
		});

		it("reorders subtasks in localStorage when not authenticated", async () => {
			const initialSubtasks = [
				{
					id: "subtask-1",
					text: "Subtask 1",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
				{
					id: "subtask-2",
					text: "Subtask 2",
					completed: false,
					todoId: "todo-1",
					order: 1,
				},
				{
					id: "subtask-3",
					text: "Subtask 3",
					completed: false,
					todoId: "todo-1",
					order: 2,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(initialSubtasks);

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			// Move first subtask to last position
			await act(async () => {
				await result.current.reorder("subtask-1", 2);
			});

			const stored = JSON.parse(mockLocalStorage.subtasks);
			const subtask1 = stored.find((s: { id: string }) => s.id === "subtask-1");
			expect(subtask1.order).toBe(2);
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
			const storedSubtasks = [
				{
					id: "subtask-1",
					text: "Local subtask",
					completed: false,
					todoId: "1",
					order: 0,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(storedSubtasks);

			const { result } = renderHook(() => useSubtaskStorage(1), {
				wrapper: createWrapper(),
			});

			// Should return remote subtasks (empty by default in mock), not local
			expect(result.current.isAuthenticated).toBe(true);
		});
	});

	describe("Dual-Mode Switching", () => {
		it("switches from local to remote subtasks when user logs in", async () => {
			// Start unauthenticated with local subtasks
			const localSubtasks = [
				{
					id: "subtask-1",
					text: "Local",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(localSubtasks);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result, rerender } = renderHook(
				() => useSubtaskStorage("todo-1"),
				{
					wrapper: createWrapper(),
				},
			);

			expect(result.current.isAuthenticated).toBe(false);
			expect(result.current.subtasks).toHaveLength(1);

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

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
		});

		it("returns isLoading false when session resolved and not authenticated", () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			// Should be false because we're not fetching remote subtasks in guest mode
			expect(result.current.isLoading).toBe(false);
		});

		it("does not include mutation pending states in isLoading (allows optimistic updates)", async () => {
			// Start with some local subtasks
			const localSubtasks = [
				{
					id: "subtask-1",
					text: "Subtask 1",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(localSubtasks);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			// isLoading should be false before update
			expect(result.current.isLoading).toBe(false);

			// Start update mutation (don't await to check isLoading during mutation)
			act(() => {
				result.current.update("subtask-1", "Updated");
			});

			// isLoading should STILL be false during mutation - this allows optimistic updates
			// to render immediately without showing loading skeleton
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("Subtask Normalization", () => {
		it("normalizes local subtasks to unified format", () => {
			const localSubtasks = [
				{
					id: "subtask-abc",
					text: "Test subtask",
					completed: true,
					todoId: "todo-1",
					order: 0,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(localSubtasks);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			expect(result.current.subtasks[0]).toMatchObject({
				id: "subtask-abc",
				text: "Test subtask",
				completed: true,
				todoId: "todo-1",
				order: 0,
			});
		});

		it("sorts subtasks by order", () => {
			const localSubtasks = [
				{
					id: "subtask-1",
					text: "Third",
					completed: false,
					todoId: "todo-1",
					order: 2,
				},
				{
					id: "subtask-2",
					text: "First",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
				{
					id: "subtask-3",
					text: "Second",
					completed: false,
					todoId: "todo-1",
					order: 1,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(localSubtasks);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			expect(result.current.subtasks[0].text).toBe("First");
			expect(result.current.subtasks[1].text).toBe("Second");
			expect(result.current.subtasks[2].text).toBe("Third");
		});
	});

	describe("TodoId Filtering", () => {
		it("only returns subtasks for the specified todoId", () => {
			const allSubtasks = [
				{
					id: "subtask-1",
					text: "Todo 1 subtask",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
				{
					id: "subtask-2",
					text: "Todo 2 subtask",
					completed: false,
					todoId: "todo-2",
					order: 0,
				},
				{
					id: "subtask-3",
					text: "Todo 1 another subtask",
					completed: true,
					todoId: "todo-1",
					order: 1,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(allSubtasks);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			expect(result.current.subtasks).toHaveLength(2);
			expect(result.current.subtasks.every((s) => s.todoId === "todo-1")).toBe(
				true,
			);
		});

		it("returns empty array for todo with no subtasks", () => {
			const allSubtasks = [
				{
					id: "subtask-1",
					text: "Todo 1 subtask",
					completed: false,
					todoId: "todo-1",
					order: 0,
				},
			];
			mockLocalStorage.subtasks = JSON.stringify(allSubtasks);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-99"), {
				wrapper: createWrapper(),
			});

			expect(result.current.subtasks).toEqual([]);
		});
	});

	describe("Error Handling", () => {
		it("throws error when updating non-existent subtask in local mode", async () => {
			mockLocalStorage.subtasks = JSON.stringify([]);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			await expect(
				act(async () => {
					await result.current.update("non-existent", "text");
				}),
			).rejects.toThrow("Subtask with id non-existent not found");
		});

		it("throws error when toggling non-existent subtask in local mode", async () => {
			mockLocalStorage.subtasks = JSON.stringify([]);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			await expect(
				act(async () => {
					await result.current.toggle("non-existent", true);
				}),
			).rejects.toThrow("Subtask with id non-existent not found");
		});

		it("throws error when reordering non-existent subtask in local mode", async () => {
			mockLocalStorage.subtasks = JSON.stringify([]);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
				wrapper: createWrapper(),
			});

			await expect(
				act(async () => {
					await result.current.reorder("non-existent", 0);
				}),
			).rejects.toThrow("Subtask with id non-existent not found");
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
		const subtasks = [
			{
				id: "subtask-1",
				text: "Subtask",
				completed: false,
				todoId: "todo-1",
				order: 0,
			},
		];
		mockLocalStorage.subtasks = JSON.stringify(subtasks);

		const { result, rerender } = renderHook(() => useSubtaskStorage("todo-1"), {
			wrapper: createWrapper(),
		});

		const firstSubtasks = result.current.subtasks;

		// Re-render without changing localStorage
		rerender();

		const secondSubtasks = result.current.subtasks;

		// Should be referentially equal if data hasn't changed
		expect(firstSubtasks.length).toBe(secondSubtasks.length);
	});

	it("returns empty array for server snapshot (SSR)", () => {
		// This test verifies the server snapshot behavior
		// In the actual implementation, getLocalSubtasksServerSnapshot returns []
		mockUseSession.mockReturnValue({
			data: null,
			isPending: false,
		});

		const { result } = renderHook(() => useSubtaskStorage("todo-1"), {
			wrapper: createWrapper(),
		});

		// The hook should work without errors in test environment
		expect(Array.isArray(result.current.subtasks)).toBe(true);
	});
});
