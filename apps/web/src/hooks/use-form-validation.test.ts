import { describe, expect, it } from "vitest";
import {
	getFieldErrors,
	getFirstFieldError,
	loginSchema,
	signupSchema,
	validateEmail,
	validateLoginForm,
	validateName,
	validatePassword,
	validateSignupForm,
} from "./use-form-validation";

describe("Form Validation Schemas", () => {
	describe("loginSchema", () => {
		it("validates correct login data", () => {
			const result = loginSchema.safeParse({
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(true);
		});

		it("rejects invalid email", () => {
			const result = loginSchema.safeParse({
				email: "invalid-email",
				password: "password123",
			});
			expect(result.success).toBe(false);
		});

		it("rejects short password", () => {
			const result = loginSchema.safeParse({
				email: "test@example.com",
				password: "short",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("signupSchema", () => {
		it("validates correct signup data", () => {
			const result = signupSchema.safeParse({
				name: "John Doe",
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(true);
		});

		it("rejects short name", () => {
			const result = signupSchema.safeParse({
				name: "J",
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Validation Functions", () => {
	describe("validateLoginForm", () => {
		it("returns success for valid data", () => {
			const result = validateLoginForm({
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				email: "test@example.com",
				password: "password123",
			});
		});

		it("returns errors for invalid data", () => {
			const result = validateLoginForm({
				email: "invalid",
				password: "short",
			});
			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
		});
	});

	describe("validateSignupForm", () => {
		it("returns success for valid data", () => {
			const result = validateSignupForm({
				name: "John Doe",
				email: "test@example.com",
				password: "password123",
			});
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				name: "John Doe",
				email: "test@example.com",
				password: "password123",
			});
		});

		it("returns errors for invalid data", () => {
			const result = validateSignupForm({
				name: "J",
				email: "invalid",
				password: "short",
			});
			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
		});
	});

	describe("validateEmail", () => {
		it("validates correct email", () => {
			const result = validateEmail("test@example.com");
			expect(result.success).toBe(true);
			expect(result.data).toBe("test@example.com");
		});

		it("rejects invalid email", () => {
			const result = validateEmail("not-an-email");
			expect(result.success).toBe(false);
		});
	});

	describe("validatePassword", () => {
		it("validates password with 8+ characters", () => {
			const result = validatePassword("password123");
			expect(result.success).toBe(true);
		});

		it("rejects password with less than 8 characters", () => {
			const result = validatePassword("short");
			expect(result.success).toBe(false);
		});
	});

	describe("validateName", () => {
		it("validates name with 2+ characters", () => {
			const result = validateName("Jo");
			expect(result.success).toBe(true);
		});

		it("rejects name with less than 2 characters", () => {
			const result = validateName("J");
			expect(result.success).toBe(false);
		});
	});
});

describe("Error Extraction Functions", () => {
	describe("getFieldErrors", () => {
		it("returns empty array for undefined errors", () => {
			const result = getFieldErrors(undefined, "email");
			expect(result).toEqual([]);
		});

		it("extracts errors for a specific field", () => {
			const validation = validateLoginForm({
				email: "invalid",
				password: "valid123",
			});
			const errors = getFieldErrors(validation.errors, "email");
			expect(errors.length).toBeGreaterThan(0);
			expect(errors[0]).toContain("email");
		});

		it("returns empty array for field without errors", () => {
			const validation = validateLoginForm({
				email: "invalid",
				password: "valid123",
			});
			const errors = getFieldErrors(validation.errors, "password");
			expect(errors).toEqual([]);
		});
	});

	describe("getFirstFieldError", () => {
		it("returns undefined for undefined errors", () => {
			const result = getFirstFieldError(undefined, "email");
			expect(result).toBeUndefined();
		});

		it("returns first error message for field", () => {
			const validation = validateLoginForm({
				email: "invalid",
				password: "short",
			});
			const error = getFirstFieldError(validation.errors, "password");
			expect(error).toBe("Password must be at least 8 characters");
		});

		it("returns undefined for field without errors", () => {
			const validation = validateLoginForm({
				email: "test@example.com",
				password: "short",
			});
			const error = getFirstFieldError(validation.errors, "email");
			expect(error).toBeUndefined();
		});
	});
});
