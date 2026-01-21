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

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
	useSupabasePresence,
	useSupabaseRealtime,
} from "./use-supabase-realtime";

describe("useSupabaseRealtime", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(isSupabaseConfigured).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("initial state", () => {
		it("should return isConfigured: true when Supabase is configured", () => {
			const { result } = renderHook(() =>
				useSupabaseRealtime({
					table: "todo",
					onChange: vi.fn(),
				}),
			);

			expect(result.current.isConfigured).toBe(true);
		});

		it("should return isConfigured: false when Supabase is not configured", () => {
			vi.mocked(isSupabaseConfigured).mockReturnValue(false);

			const { result } = renderHook(() =>
				useSupabaseRealtime({
					table: "todo",
					onChange: vi.fn(),
				}),
			);

			expect(result.current.isConfigured).toBe(false);
		});

		it("should return isSubscribed: false initially", () => {
			const { result } = renderHook(() =>
				useSupabaseRealtime({
					table: "todo",
					onChange: vi.fn(),
				}),
			);

			expect(result.current.isSubscribed).toBe(false);
		});
	});

	describe("subscription behavior", () => {
		it("should create a Supabase channel on mount", () => {
			renderHook(() =>
				useSupabaseRealtime({
					table: "todo",
					onChange: vi.fn(),
				}),
			);

			expect(supabase.channel).toHaveBeenCalled();
		});

		it("should call onSubscribe callback when subscription is established", async () => {
			const onSubscribe = vi.fn();

			renderHook(() =>
				useSupabaseRealtime({
					table: "todo",
					onChange: vi.fn(),
					onSubscribe,
				}),
			);

			await waitFor(() => {
				expect(onSubscribe).toHaveBeenCalled();
			});
		});

		it("should not subscribe when Supabase is not configured", () => {
			vi.mocked(isSupabaseConfigured).mockReturnValue(false);

			renderHook(() =>
				useSupabaseRealtime({
					table: "todo",
					onChange: vi.fn(),
				}),
			);

			expect(supabase.channel).not.toHaveBeenCalled();
		});
	});

	describe("cleanup", () => {
		it("should remove channel on unmount", () => {
			const { unmount } = renderHook(() =>
				useSupabaseRealtime({
					table: "todo",
					onChange: vi.fn(),
				}),
			);

			unmount();

			expect(supabase.removeChannel).toHaveBeenCalled();
		});
	});
});

describe("useSupabasePresence", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(isSupabaseConfigured).mockReturnValue(true);
	});

	describe("subscription behavior", () => {
		it("should create a channel for presence tracking", () => {
			renderHook(() =>
				useSupabasePresence("online-users", "user-123", vi.fn()),
			);

			expect(supabase.channel).toHaveBeenCalled();
		});

		it("should not subscribe when Supabase is not configured", () => {
			vi.mocked(isSupabaseConfigured).mockReturnValue(false);

			renderHook(() =>
				useSupabasePresence("online-users", "user-123", vi.fn()),
			);

			expect(supabase.channel).not.toHaveBeenCalled();
		});

		it("should remove channel on unmount", () => {
			const { unmount } = renderHook(() =>
				useSupabasePresence("online-users", "user-123", vi.fn()),
			);

			unmount();

			expect(supabase.removeChannel).toHaveBeenCalled();
		});
	});
});
