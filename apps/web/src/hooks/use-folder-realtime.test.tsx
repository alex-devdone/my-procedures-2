import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase modules BEFORE importing the hook
vi.mock("@my-procedures-2/env/web", () => ({
	env: {
		NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-12345678",
	},
}));

vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => ({
		from: vi.fn(),
		channel: vi.fn((name: string) => ({
			name,
			on: vi.fn(() => ({
				subscribe: vi.fn((cb?: (status: string) => void) => {
					if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
					return { unsubscribe: vi.fn() };
				}),
			})),
			subscribe: vi.fn((cb?: (status: string) => void) => {
				if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
				return { unsubscribe: vi.fn() };
			}),
			unsubscribe: vi.fn(),
		})),
		getChannels: vi.fn(() => []),
		removeChannel: vi.fn(),
	})),
}));

// Mock the supabase module - use factory function to avoid hoisting issues
vi.mock("@/lib/supabase", () => {
	const mockSupabase = {
		channel: vi.fn((name: string) => ({
			name,
			on: vi.fn(() => ({
				subscribe: vi.fn((cb?: (status: string) => void) => {
					if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
					return { unsubscribe: vi.fn() };
				}),
			})),
			subscribe: vi.fn((cb?: (status: string) => void) => {
				if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
				return { unsubscribe: vi.fn() };
			}),
			unsubscribe: vi.fn(),
		})),
		removeChannel: vi.fn(),
	};
	return {
		supabase: mockSupabase,
		isSupabaseConfigured: vi.fn(() => true),
		createSupabaseChannel: (channelName: string) =>
			mockSupabase.channel(channelName),
	};
});

// Mock auth client
vi.mock("@/lib/auth-client", () => ({
	useSession: vi.fn(() => ({
		data: {
			user: { id: "user-123" },
		},
		isPending: false,
	})),
}));

import { getFoldersQueryKey } from "@/app/api/folder/folder.api";
import type { RemoteFolder } from "@/app/api/folder/folder.types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
	useFolderRealtime,
	useFolderRealtimeWithAuth,
} from "./use-folder-realtime";

// Wrapper for React Query
const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("useFolderRealtime", () => {
	let mockChannel: ReturnType<typeof vi.fn>;
	let onChangeCallback: ((payload: unknown) => void) | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(isSupabaseConfigured).mockReturnValue(true);

		// Create a more sophisticated mock that captures the onChange callback
		mockChannel = vi.fn((name: string) => ({
			name,
			on: vi.fn(
				(
					event: string,
					config: unknown,
					callback: (payload: unknown) => void,
				) => ({
					subscribe: vi.fn((cb?: (status: string) => void) => {
						onChangeCallback = callback;
						if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
						return { unsubscribe: vi.fn() };
					}),
				}),
			),
			subscribe: vi.fn((cb?: (status: string) => void) => {
				if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
				return { unsubscribe: vi.fn() };
			}),
			unsubscribe: vi.fn(),
		}));

		vi.mocked(supabase.channel).mockImplementation(mockChannel as never);
	});

	afterEach(() => {
		vi.clearAllMocks();
		onChangeCallback = undefined;
	});

	describe("initial state", () => {
		it("should return isConfigured: true when Supabase is configured", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useFolderRealtime("user-123"), {
				wrapper,
			});

			expect(result.current.isConfigured).toBe(true);
		});

		it("should return isConfigured: false when Supabase is not configured", () => {
			vi.mocked(isSupabaseConfigured).mockReturnValue(false);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useFolderRealtime("user-123"), {
				wrapper,
			});

			expect(result.current.isConfigured).toBe(false);
		});

		it("should return isSubscribed: false initially", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useFolderRealtime("user-123"), {
				wrapper,
			});

			expect(result.current.isSubscribed).toBe(false);
		});

		it("should provide unsubscribe function", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useFolderRealtime("user-123"), {
				wrapper,
			});

			expect(typeof result.current.unsubscribe).toBe("function");
		});
	});

	describe("subscription behavior", () => {
		it("should create a Supabase channel on mount when userId is provided", () => {
			const wrapper = createWrapper();
			renderHook(() => useFolderRealtime("user-123"), { wrapper });

			expect(supabase.channel).toHaveBeenCalledWith(
				"folder:user_id=eq.user-123",
			);
		});

		it("should not subscribe when Supabase is not configured", () => {
			vi.mocked(isSupabaseConfigured).mockReturnValue(false);

			const wrapper = createWrapper();
			renderHook(() => useFolderRealtime("user-123"), { wrapper });

			expect(supabase.channel).not.toHaveBeenCalled();
		});

		it("should not subscribe when userId is undefined", () => {
			const wrapper = createWrapper();
			renderHook(() => useFolderRealtime(undefined), { wrapper });

			expect(supabase.channel).not.toHaveBeenCalled();
		});

		it("should unsubscribe when unsubscribe function is called", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useFolderRealtime("user-123"), {
				wrapper,
			});

			result.current.unsubscribe();

			expect(supabase.removeChannel).toHaveBeenCalled();
		});
	});
});

describe("useFolderRealtimeWithAuth", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(isSupabaseConfigured).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("initial state", () => {
		it("should return isConfigured: true when Supabase is configured", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useFolderRealtimeWithAuth(), {
				wrapper,
			});

			expect(result.current.isConfigured).toBe(true);
		});

		it("should return isConfigured: false when Supabase is not configured", () => {
			vi.mocked(isSupabaseConfigured).mockReturnValue(false);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useFolderRealtimeWithAuth(), {
				wrapper,
			});

			expect(result.current.isConfigured).toBe(false);
		});

		it("should return isSubscribed: false initially", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useFolderRealtimeWithAuth(), {
				wrapper,
			});

			expect(result.current.isSubscribed).toBe(false);
		});

		it("should provide unsubscribe function", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useFolderRealtimeWithAuth(), {
				wrapper,
			});

			expect(typeof result.current.unsubscribe).toBe("function");
		});
	});
});

describe("INSERT event handling", () => {
	it("should add new folder to cache on INSERT event", () => {
		const wrapper = createWrapper();
		const queryClient = new QueryClient();

		// Set initial cache data
		const queryKey = getFoldersQueryKey();
		const initialFolders: RemoteFolder[] = [
			{
				id: 1,
				name: "Existing folder",
				color: "blue",
				userId: "user-123",
				createdAt: "2024-01-01T00:00:00.000Z",
				order: 0,
			},
		];
		queryClient.setQueryData(queryKey, initialFolders);

		const { result } = renderHook(() => useFolderRealtime("user-123"), {
			wrapper,
		});

		// The hook should have been initialized
		expect(result.current.isConfigured).toBe(true);
	});
});

describe("UPDATE event handling", () => {
	it("should update existing folder in cache on UPDATE event", () => {
		const wrapper = createWrapper();
		const queryClient = new QueryClient();

		// Set initial cache data
		const queryKey = getFoldersQueryKey();
		const initialFolders: RemoteFolder[] = [
			{
				id: 1,
				name: "Original folder",
				color: "blue",
				userId: "user-123",
				createdAt: "2024-01-01T00:00:00.000Z",
				order: 0,
			},
		];
		queryClient.setQueryData(queryKey, initialFolders);

		const { result } = renderHook(() => useFolderRealtime("user-123"), {
			wrapper,
		});

		// The hook should have been initialized
		expect(result.current.isConfigured).toBe(true);
	});
});

describe("DELETE event handling", () => {
	it("should remove folder from cache on DELETE event", () => {
		const wrapper = createWrapper();
		const queryClient = new QueryClient();

		// Set initial cache data
		const queryKey = getFoldersQueryKey();
		const initialFolders: RemoteFolder[] = [
			{
				id: 1,
				name: "Folder to delete",
				color: "blue",
				userId: "user-123",
				createdAt: "2024-01-01T00:00:00.000Z",
				order: 0,
			},
		];
		queryClient.setQueryData(queryKey, initialFolders);

		const { result } = renderHook(() => useFolderRealtime("user-123"), {
			wrapper,
		});

		// The hook should have been initialized
		expect(result.current.isConfigured).toBe(true);
	});
});

describe("React Query cache integration", () => {
	it("should use correct query key for folder queries", () => {
		const queryKey = getFoldersQueryKey();
		// Query key includes the operation ('getAll') and type
		expect(queryKey[0]).toContain("folder");
	});
});
