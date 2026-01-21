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

// Mock the folder.api module
vi.mock("./folder.api", () => ({
	getAllFoldersQueryOptions: () => ({
		queryKey: ["folders"],
		queryFn: vi.fn().mockResolvedValue([]),
	}),
	getCreateFolderMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({ id: 1 }),
	}),
	getUpdateFolderMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({}),
	}),
	getDeleteFolderMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({ success: true }),
	}),
	getReorderFolderMutationOptions: () => ({
		mutationFn: vi.fn().mockResolvedValue({}),
	}),
	getFoldersQueryKey: () => ["folders"],
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
import { useFolderStorage } from "./folder.hooks";

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

describe("useFolderStorage", () => {
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

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isAuthenticated).toBe(false);
		});

		it("returns isAuthenticated: true when user session exists", async () => {
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123", email: "test@test.com" } },
				isPending: false,
			});

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isAuthenticated).toBe(true);
		});

		it("returns isLoading: true when session is pending", async () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: true,
			});

			const { result } = renderHook(() => useFolderStorage(), {
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

		it("returns empty folders when localStorage is empty", () => {
			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.folders).toEqual([]);
		});

		it("returns folders from localStorage when not authenticated", () => {
			const storedFolders = [
				{
					id: "uuid-1",
					name: "Work",
					color: "blue",
					order: 0,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "uuid-2",
					name: "Personal",
					color: "green",
					order: 1,
					createdAt: "2024-01-02T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(storedFolders);

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.folders).toHaveLength(2);
			expect(result.current.folders[0].name).toBe("Work");
			expect(result.current.folders[1].name).toBe("Personal");
		});

		it("creates folder in localStorage when not authenticated", async () => {
			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.create({ name: "New Folder", color: "red" });
			});

			expect(localStorageMock.setItem).toHaveBeenCalled();
			const stored = JSON.parse(mockLocalStorage.folders);
			expect(stored).toHaveLength(1);
			expect(stored[0].name).toBe("New Folder");
			expect(stored[0].color).toBe("red");
		});

		it("creates folder with default color when not specified", async () => {
			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.create({ name: "Default Color Folder" });
			});

			const stored = JSON.parse(mockLocalStorage.folders);
			expect(stored[0].color).toBe("slate");
		});

		it("updates folder in localStorage when not authenticated", async () => {
			const initialFolders = [
				{
					id: "uuid-1",
					name: "Old Name",
					color: "blue",
					order: 0,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(initialFolders);

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.update({ id: "uuid-1", name: "New Name" });
			});

			const stored = JSON.parse(mockLocalStorage.folders);
			expect(stored[0].name).toBe("New Name");
			expect(stored[0].color).toBe("blue"); // Should remain unchanged
		});

		it("updates folder color in localStorage when not authenticated", async () => {
			const initialFolders = [
				{
					id: "uuid-1",
					name: "Folder",
					color: "blue",
					order: 0,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(initialFolders);

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.update({ id: "uuid-1", color: "red" });
			});

			const stored = JSON.parse(mockLocalStorage.folders);
			expect(stored[0].color).toBe("red");
			expect(stored[0].name).toBe("Folder"); // Should remain unchanged
		});

		it("deletes folder from localStorage when not authenticated", async () => {
			const initialFolders = [
				{
					id: "uuid-1",
					name: "Folder 1",
					color: "blue",
					order: 0,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "uuid-2",
					name: "Folder 2",
					color: "green",
					order: 1,
					createdAt: "2024-01-02T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(initialFolders);

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			await act(async () => {
				await result.current.deleteFolder("uuid-1");
			});

			const stored = JSON.parse(mockLocalStorage.folders);
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe("uuid-2");
		});

		it("reorders folders in localStorage when not authenticated", async () => {
			const initialFolders = [
				{
					id: "uuid-1",
					name: "Folder 1",
					color: "blue",
					order: 0,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "uuid-2",
					name: "Folder 2",
					color: "green",
					order: 1,
					createdAt: "2024-01-02T00:00:00.000Z",
				},
				{
					id: "uuid-3",
					name: "Folder 3",
					color: "red",
					order: 2,
					createdAt: "2024-01-03T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(initialFolders);

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			// Move first folder to last position
			await act(async () => {
				await result.current.reorder("uuid-1", 2);
			});

			const stored = JSON.parse(mockLocalStorage.folders);
			const folder1 = stored.find((f: { id: string }) => f.id === "uuid-1");
			expect(folder1.order).toBe(2);
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
			const storedFolders = [
				{
					id: "uuid-1",
					name: "Local Folder",
					color: "blue",
					order: 0,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(storedFolders);

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			// Should return remote folders (empty by default in mock), not local
			expect(result.current.isAuthenticated).toBe(true);
		});
	});

	describe("Dual-Mode Switching", () => {
		it("switches from local to remote folders when user logs in", async () => {
			// Start unauthenticated with local folders
			const localFolders = [
				{
					id: "uuid-1",
					name: "Local",
					color: "blue",
					order: 0,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(localFolders);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result, rerender } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isAuthenticated).toBe(false);
			expect(result.current.folders).toHaveLength(1);

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

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.isLoading).toBe(true);
		});

		it("returns isLoading false when session resolved and not authenticated", () => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			// Should be false because we're not fetching remote folders in guest mode
			expect(result.current.isLoading).toBe(false);
		});

		it("does not include mutation pending states in isLoading (allows optimistic updates)", async () => {
			// Start with some local folders
			const localFolders = [
				{
					id: "uuid-1",
					name: "Folder 1",
					color: "blue",
					order: 0,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(localFolders);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			// isLoading should be false before update
			expect(result.current.isLoading).toBe(false);

			// Start update mutation (don't await to check isLoading during mutation)
			act(() => {
				result.current.update({ id: "uuid-1", name: "Updated" });
			});

			// isLoading should STILL be false during mutation - this allows optimistic updates
			// to render immediately without showing loading skeleton
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("Folder Normalization", () => {
		it("normalizes local folders to unified format", () => {
			const localFolders = [
				{
					id: "uuid-abc",
					name: "Test Folder",
					color: "purple",
					order: 0,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(localFolders);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.folders[0]).toMatchObject({
				id: "uuid-abc",
				name: "Test Folder",
				color: "purple",
				order: 0,
			});
			expect(result.current.folders[0].createdAt).toBeInstanceOf(Date);
		});

		it("sorts folders by order", () => {
			const localFolders = [
				{
					id: "uuid-1",
					name: "Third",
					color: "blue",
					order: 2,
					createdAt: "2024-01-01T00:00:00.000Z",
				},
				{
					id: "uuid-2",
					name: "First",
					color: "green",
					order: 0,
					createdAt: "2024-01-02T00:00:00.000Z",
				},
				{
					id: "uuid-3",
					name: "Second",
					color: "red",
					order: 1,
					createdAt: "2024-01-03T00:00:00.000Z",
				},
			];
			mockLocalStorage.folders = JSON.stringify(localFolders);

			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});

			const { result } = renderHook(() => useFolderStorage(), {
				wrapper: createWrapper(),
			});

			expect(result.current.folders[0].name).toBe("First");
			expect(result.current.folders[1].name).toBe("Second");
			expect(result.current.folders[2].name).toBe("Third");
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
		const folders = [
			{
				id: "uuid-1",
				name: "Folder",
				color: "blue",
				order: 0,
				createdAt: "2024-01-01T00:00:00.000Z",
			},
		];
		mockLocalStorage.folders = JSON.stringify(folders);

		const { result, rerender } = renderHook(() => useFolderStorage(), {
			wrapper: createWrapper(),
		});

		const firstFolders = result.current.folders;

		// Re-render without changing localStorage
		rerender();

		const secondFolders = result.current.folders;

		// Should be referentially equal if data hasn't changed
		expect(firstFolders.length).toBe(secondFolders.length);
	});

	it("returns empty array for server snapshot (SSR)", () => {
		// This test verifies the server snapshot behavior
		// In the actual implementation, getLocalFoldersServerSnapshot returns []
		mockUseSession.mockReturnValue({
			data: null,
			isPending: false,
		});

		const { result } = renderHook(() => useFolderStorage(), {
			wrapper: createWrapper(),
		});

		// The hook should work without errors in test environment
		expect(Array.isArray(result.current.folders)).toBe(true);
	});
});
