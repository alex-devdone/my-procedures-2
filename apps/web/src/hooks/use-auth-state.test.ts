import { describe, expect, it } from "vitest";
import { deriveAuthState, detectAuthTransition } from "./use-auth-state";

describe("Auth State Pure Functions", () => {
	describe("deriveAuthState", () => {
		it("returns authenticated state when user exists", () => {
			const session = {
				user: {
					id: "123",
					email: "test@example.com",
					name: "Test User",
				},
			};
			const result = deriveAuthState(session, false);

			expect(result.isAuthenticated).toBe(true);
			expect(result.isPending).toBe(false);
			expect(result.user).toEqual({
				id: "123",
				email: "test@example.com",
				name: "Test User",
			});
		});

		it("returns unauthenticated state when session is null", () => {
			const result = deriveAuthState(null, false);

			expect(result.isAuthenticated).toBe(false);
			expect(result.isPending).toBe(false);
			expect(result.user).toBeNull();
		});

		it("returns unauthenticated state when user is null", () => {
			const result = deriveAuthState({ user: null }, false);

			expect(result.isAuthenticated).toBe(false);
			expect(result.user).toBeNull();
		});

		it("reflects pending state correctly", () => {
			const result = deriveAuthState(null, true);

			expect(result.isPending).toBe(true);
			expect(result.isAuthenticated).toBe(false);
		});

		it("handles user with no name", () => {
			const session = {
				user: {
					id: "123",
					email: "test@example.com",
					name: "",
				},
			};
			const result = deriveAuthState(session, false);

			expect(result.user?.name).toBeNull();
		});
	});

	describe("detectAuthTransition", () => {
		it('returns "login" when transitioning from unauthenticated to authenticated', () => {
			const result = detectAuthTransition(false, true);
			expect(result).toBe("login");
		});

		it('returns "logout" when transitioning from authenticated to unauthenticated', () => {
			const result = detectAuthTransition(true, false);
			expect(result).toBe("logout");
		});

		it("returns null when state has not changed (both authenticated)", () => {
			const result = detectAuthTransition(true, true);
			expect(result).toBeNull();
		});

		it("returns null when state has not changed (both unauthenticated)", () => {
			const result = detectAuthTransition(false, false);
			expect(result).toBeNull();
		});

		it("returns null when previous state is null (initial load)", () => {
			const result = detectAuthTransition(null, true);
			expect(result).toBeNull();
		});

		it("returns null when previous state is null and currently unauthenticated", () => {
			const result = detectAuthTransition(null, false);
			expect(result).toBeNull();
		});
	});
});
