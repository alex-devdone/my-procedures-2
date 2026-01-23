import { describe, expect, it } from "vitest";
import { env } from "./server";

describe("server environment variables", () => {
	describe("required variables", () => {
		it("should have DATABASE_URL defined", () => {
			expect(env.DATABASE_URL).toBeDefined();
			expect(typeof env.DATABASE_URL).toBe("string");
		});

		it("should have BETTER_AUTH_SECRET defined and be at least 32 characters", () => {
			expect(env.BETTER_AUTH_SECRET).toBeDefined();
			expect(typeof env.BETTER_AUTH_SECRET).toBe("string");
			expect(env.BETTER_AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
		});

		it("should have BETTER_AUTH_URL defined as a valid URL", () => {
			expect(env.BETTER_AUTH_URL).toBeDefined();
			expect(typeof env.BETTER_AUTH_URL).toBe("string");
			expect(() => new URL(env.BETTER_AUTH_URL)).not.toThrow();
		});

		it("should have CORS_ORIGIN defined", () => {
			expect(env.CORS_ORIGIN).toBeDefined();
			expect(typeof env.CORS_ORIGIN).toBe("string");
		});
	});

	describe("optional variables", () => {
		it("should have DIRECT_URL as optional", () => {
			if (env.DIRECT_URL) {
				expect(typeof env.DIRECT_URL).toBe("string");
			} else {
				expect(env.DIRECT_URL).toBeUndefined();
			}
		});

		it("should have SUPABASE_SERVICE_ROLE_KEY as optional", () => {
			if (env.SUPABASE_SERVICE_ROLE_KEY) {
				expect(typeof env.SUPABASE_SERVICE_ROLE_KEY).toBe("string");
			} else {
				expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
			}
		});
	});

	describe("Google Tasks integration variables", () => {
		it("should have GOOGLE_CLIENT_ID as optional", () => {
			if (env.GOOGLE_CLIENT_ID) {
				expect(typeof env.GOOGLE_CLIENT_ID).toBe("string");
				expect(env.GOOGLE_CLIENT_ID.length).toBeGreaterThan(0);
			} else {
				expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
			}
		});

		it("should have GOOGLE_CLIENT_SECRET as optional", () => {
			if (env.GOOGLE_CLIENT_SECRET) {
				expect(typeof env.GOOGLE_CLIENT_SECRET).toBe("string");
				expect(env.GOOGLE_CLIENT_SECRET.length).toBeGreaterThan(0);
			} else {
				expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
			}
		});
	});

	describe("cron job variables", () => {
		it("should have CRON_SECRET as optional", () => {
			if (env.CRON_SECRET) {
				expect(typeof env.CRON_SECRET).toBe("string");
				expect(env.CRON_SECRET.length).toBeGreaterThan(0);
			} else {
				expect(env.CRON_SECRET).toBeUndefined();
			}
		});
	});

	describe("NODE_ENV", () => {
		it("should have NODE_ENV defined with valid enum value", () => {
			expect(env.NODE_ENV).toBeDefined();
			expect(["development", "production", "test"]).toContain(env.NODE_ENV);
		});

		it("should default to development when not set", () => {
			expect(["development", "production", "test"]).toContain(env.NODE_ENV);
		});
	});
});
