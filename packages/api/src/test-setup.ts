import { vi } from "vitest";

// Mock environment variables for tests
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.DIRECT_URL = "postgresql://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET =
	"test-secret-key-that-is-at-least-32-characters-long";
process.env.BETTER_AUTH_URL = "http://localhost:4757/api/auth";
process.env.CORS_ORIGIN = "http://localhost:4757";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
process.env.CRON_SECRET = "test-cron-secret";
process.env.NODE_ENV = "test";

// Mock env module before any tests import it
vi.mock("@my-procedures-2/env/server", () => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		DIRECT_URL: "postgresql://test:test@localhost:5432/test",
		BETTER_AUTH_SECRET: "test-secret-key-that-is-at-least-32-characters-long",
		BETTER_AUTH_URL: "http://localhost:4757/api/auth",
		CORS_ORIGIN: "http://localhost:4757",
		GOOGLE_CLIENT_ID: "test-google-client-id",
		GOOGLE_CLIENT_SECRET: "test-google-client-secret",
		CRON_SECRET: "test-cron-secret",
		NODE_ENV: "test",
	},
}));
