import { describe, expect, it } from "vitest";
import { auth } from "./index";

describe("auth configuration", () => {
	describe("Google OAuth", () => {
		it("should include social providers configuration", () => {
			const authInstance = auth as unknown as {
				options?: {
					socialProviders?: {
						google?: {
							clientId: string;
							clientSecret: string;
							enabled: boolean;
						};
					};
				};
			};

			expect(authInstance.options?.socialProviders).toBeDefined();
			expect(authInstance.options?.socialProviders?.google).toBeDefined();
		});

		it("should have Google provider with correct structure", () => {
			const authInstance = auth as unknown as {
				options?: {
					socialProviders?: {
						google?: {
							clientId: string;
							clientSecret: string;
							enabled: boolean;
						};
					};
				};
			};

			const googleConfig = authInstance.options?.socialProviders?.google;
			expect(googleConfig).toHaveProperty("clientId");
			expect(googleConfig).toHaveProperty("clientSecret");
			expect(googleConfig).toHaveProperty("enabled");
			expect(typeof googleConfig?.enabled).toBe("boolean");
		});

		it("should have Google OAuth enabled with credentials", () => {
			const authInstance = auth as unknown as {
				options?: {
					socialProviders?: {
						google?: {
							clientId: string;
							clientSecret: string;
							enabled: boolean;
						};
					};
				};
			};

			const googleConfig = authInstance.options?.socialProviders?.google;
			expect(googleConfig?.clientId).toBe("test-google-client-id");
			expect(googleConfig?.clientSecret).toBe("test-google-client-secret");
			expect(googleConfig?.enabled).toBe(true);
		});
	});

	describe("auth instance", () => {
		it("should export auth instance", () => {
			expect(auth).toBeDefined();
			expect(typeof auth).toBe("object");
		});

		it("should have email and password authentication enabled", () => {
			const authInstance = auth as unknown as {
				options?: {
					emailAndPassword?: {
						enabled: boolean;
					};
				};
			};

			expect(authInstance.options?.emailAndPassword).toBeDefined();
			expect(authInstance.options?.emailAndPassword?.enabled).toBe(true);
		});
	});
});
