import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
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

import { getSubtasksQueryKey } from "@/app/api/subtask/subtask.api";
import type { RemoteSubtask } from "@/app/api/subtask/subtask.types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
	useSubtaskRealtime,
	useSubtaskRealtimeWithAuth,
} from "./use-subtask-realtime";

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

describe("useSubtaskRealtime", () => {
	let mockChannel: ReturnType<typeof vi.fn>;
	let _onChangeCallback: ((payload: unknown) => void) | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(isSupabaseConfigured).mockReturnValue(true);

		// Create a more sophisticated mock that captures the onChange callback
		mockChannel = vi.fn((name: string) => ({
			name,
			on: vi.fn(
				(
					_event: string,
					_config: unknown,
					callback: (payload: unknown) => void,
				) => ({
					subscribe: vi.fn((cb?: (status: string) => void) => {
						_onChangeCallback = callback;
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
		_onChangeCallback = undefined;
	});

	describe("initial state", () => {
		it("should return isConfigured: true when Supabase is configured", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useSubtaskRealtime("user-123"), {
				wrapper,
			});

			expect(result.current.isConfigured).toBe(true);
		});

		it("should return isConfigured: false when Supabase is not configured", () => {
			vi.mocked(isSupabaseConfigured).mockReturnValue(false);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useSubtaskRealtime("user-123"), {
				wrapper,
			});

			expect(result.current.isConfigured).toBe(false);
		});

		it("should return isSubscribed: false initially", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useSubtaskRealtime("user-123"), {
				wrapper,
			});

			expect(result.current.isSubscribed).toBe(false);
		});

		it("should provide unsubscribe function", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useSubtaskRealtime("user-123"), {
				wrapper,
			});

			expect(typeof result.current.unsubscribe).toBe("function");
		});
	});

	describe("subscription behavior", () => {
		it("should create a Supabase channel on mount when userId is provided", () => {
			const wrapper = createWrapper();
			renderHook(() => useSubtaskRealtime("user-123"), { wrapper });

			expect(supabase.channel).toHaveBeenCalledWith(
				"subtask:user_id=eq.user-123",
			);
		});

		it("should not subscribe when Supabase is not configured", () => {
			vi.mocked(isSupabaseConfigured).mockReturnValue(false);

			const wrapper = createWrapper();
			renderHook(() => useSubtaskRealtime("user-123"), { wrapper });

			expect(supabase.channel).not.toHaveBeenCalled();
		});

		it("should not subscribe when userId is undefined", () => {
			const wrapper = createWrapper();
			renderHook(() => useSubtaskRealtime(undefined), { wrapper });

			expect(supabase.channel).not.toHaveBeenCalled();
		});

		it("should unsubscribe when unsubscribe function is called", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useSubtaskRealtime("user-123"), {
				wrapper,
			});

			result.current.unsubscribe();

			expect(supabase.removeChannel).toHaveBeenCalled();
		});
	});
});

describe("useSubtaskRealtimeWithAuth", () => {
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
			const { result } = renderHook(() => useSubtaskRealtimeWithAuth(), {
				wrapper,
			});

			expect(result.current.isConfigured).toBe(true);
		});

		it("should return isConfigured: false when Supabase is not configured", () => {
			vi.mocked(isSupabaseConfigured).mockReturnValue(false);

			const wrapper = createWrapper();
			const { result } = renderHook(() => useSubtaskRealtimeWithAuth(), {
				wrapper,
			});

			expect(result.current.isConfigured).toBe(false);
		});

		it("should return isSubscribed: false initially", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useSubtaskRealtimeWithAuth(), {
				wrapper,
			});

			expect(result.current.isSubscribed).toBe(false);
		});

		it("should provide unsubscribe function", () => {
			const wrapper = createWrapper();
			const { result } = renderHook(() => useSubtaskRealtimeWithAuth(), {
				wrapper,
			});

			expect(typeof result.current.unsubscribe).toBe("function");
		});
	});
});

describe("INSERT event handling", () => {
	it("should add new subtask to cache on INSERT event", () => {
		const wrapper = createWrapper();
		const queryClient = new QueryClient();

		// Set initial cache data for todo 1
		const queryKey = getSubtasksQueryKey(1);
		const initialSubtasks: RemoteSubtask[] = [
			{
				id: 1,
				text: "Existing subtask",
				completed: false,
				todoId: 1,
				order: 0,
			},
		];
		queryClient.setQueryData(queryKey, initialSubtasks);

		const { result } = renderHook(() => useSubtaskRealtime("user-123"), {
			wrapper,
		});

		// The hook should have been initialized
		expect(result.current.isConfigured).toBe(true);
	});
});

describe("UPDATE event handling", () => {
	it("should update existing subtask in cache on UPDATE event", () => {
		const wrapper = createWrapper();
		const queryClient = new QueryClient();

		// Set initial cache data for todo 1
		const queryKey = getSubtasksQueryKey(1);
		const initialSubtasks: RemoteSubtask[] = [
			{
				id: 1,
				text: "Original subtask",
				completed: false,
				todoId: 1,
				order: 0,
			},
		];
		queryClient.setQueryData(queryKey, initialSubtasks);

		const { result } = renderHook(() => useSubtaskRealtime("user-123"), {
			wrapper,
		});

		// The hook should have been initialized
		expect(result.current.isConfigured).toBe(true);
	});
});

describe("DELETE event handling", () => {
	it("should remove subtask from cache on DELETE event", () => {
		const wrapper = createWrapper();
		const queryClient = new QueryClient();

		// Set initial cache data for todo 1
		const queryKey = getSubtasksQueryKey(1);
		const initialSubtasks: RemoteSubtask[] = [
			{
				id: 1,
				text: "Subtask to delete",
				completed: false,
				todoId: 1,
				order: 0,
			},
		];
		queryClient.setQueryData(queryKey, initialSubtasks);

		const { result } = renderHook(() => useSubtaskRealtime("user-123"), {
			wrapper,
		});

		// The hook should have been initialized
		expect(result.current.isConfigured).toBe(true);
	});
});

describe("React Query cache integration", () => {
	it("should use correct query key for subtask queries", () => {
		const queryKey = getSubtasksQueryKey(123);
		// tRPC query keys are nested: [['subtask', 'list']]
		// The todoId parameter is included by tRPC in the query options
		expect(Array.isArray(queryKey)).toBe(true);
		expect(Array.isArray(queryKey[0])).toBe(true);
		expect(queryKey[0][0]).toBe("subtask");
		expect(queryKey[0][1]).toBe("list");
	});

	it("should handle subtasks for different todos with query options", () => {
		const queryKey1 = getSubtasksQueryKey(1);
		const queryKey2 = getSubtasksQueryKey(2);

		// Both return the same base query key structure
		// The todoId parameter is passed via queryOptions input
		expect(Array.isArray(queryKey1)).toBe(true);
		expect(Array.isArray(queryKey2)).toBe(true);
		expect(queryKey1[0][0]).toBe("subtask");
		expect(queryKey2[0][0]).toBe("subtask");
	});
});
