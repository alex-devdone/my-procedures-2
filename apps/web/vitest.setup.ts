import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock @my-procedures-2/env/server BEFORE any imports to prevent client-side access errors
// Using vi.hoisted to ensure the mock is available before module evaluation
const mockEnv = vi.hoisted(() => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		DIRECT_URL: undefined,
		BETTER_AUTH_SECRET: "test-secret-key-that-is-at-least-32-chars-long",
		BETTER_AUTH_URL: "http://localhost:4757",
		CORS_ORIGIN: "http://localhost:4757",
		SUPABASE_SERVICE_ROLE_KEY: undefined,
		GOOGLE_CLIENT_ID: undefined,
		GOOGLE_CLIENT_SECRET: undefined,
		CRON_SECRET: undefined,
		NODE_ENV: "test" as const,
	},
}));

vi.mock("@my-procedures-2/env/server", () => mockEnv);

// Set Supabase environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key-12345678";

// Also set NODE_ENV for tests
process.env.NODE_ENV = "test";
