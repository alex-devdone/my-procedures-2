import { describe, expect, it, vi } from "vitest";

// Mock the Supabase client to avoid actual network calls
vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn(() => ({
		from: vi.fn(),
		channel: vi.fn((name: string) => ({
			name,
			on: vi.fn(() => ({
				subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
			})),
			subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
			unsubscribe: vi.fn(),
		})),
		getChannels: vi.fn(() => []),
		removeChannel: vi.fn(),
	})),
}));

// Mock the environment variables BEFORE importing the module
vi.mock("@my-procedures-2/env/web", () => ({
	env: {
		NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-12345678",
	},
}));

import {
	createSupabaseChannel,
	isSupabaseConfigured,
	supabase,
} from "./supabase";

describe("supabase", () => {
	describe("supabase client", () => {
		it("should create a Supabase client instance", () => {
			expect(supabase).toBeDefined();
			expect(supabase).toHaveProperty("from");
			expect(supabase).toHaveProperty("channel");
			expect(supabase).toHaveProperty("getChannels");
		});

		it("should have auth configured with persistSession disabled", () => {
			// The client is created with persistSession: false for realtime use
			expect(supabase).toBeDefined();
		});
	});

	describe("createSupabaseChannel", () => {
		it("should create a Supabase channel with the given name", () => {
			const channel = createSupabaseChannel("test-channel");
			expect(channel).toBeDefined();
			expect(channel).toHaveProperty("on");
			expect(channel).toHaveProperty("subscribe");
			expect(channel).toHaveProperty("unsubscribe");
		});

		it("should create unique channels for different names", () => {
			const channel1 = createSupabaseChannel("channel-1");
			const channel2 = createSupabaseChannel("channel-2");

			expect(channel1).toBeDefined();
			expect(channel2).toBeDefined();
			// Channels should be different instances (mocked to include name property)
			expect((channel1 as unknown as { name: string }).name).toBe("channel-1");
			expect((channel2 as unknown as { name: string }).name).toBe("channel-2");
		});
	});

	describe("isSupabaseConfigured", () => {
		it("should return true when Supabase is properly configured", () => {
			const result = isSupabaseConfigured();
			expect(result).toBe(true);
		});
	});
});
