import { describe, expect, it } from "vitest";
import {
	extractAuthErrorMessage,
	extractErrorMessage,
	getStatusCodeMessage,
	isAuthError,
	isRetryableError,
	processError,
} from "./use-error-handler";

describe("Error Handler Pure Functions", () => {
	describe("extractAuthErrorMessage", () => {
		it("extracts message from auth error", () => {
			const error = { error: { message: "Invalid credentials" } };
			expect(extractAuthErrorMessage(error)).toBe("Invalid credentials");
		});

		it("falls back to statusText when message is missing", () => {
			const error = { error: { statusText: "Unauthorized" } };
			expect(extractAuthErrorMessage(error)).toBe("Unauthorized");
		});

		it("returns default message when both are missing", () => {
			const error = { error: {} };
			expect(extractAuthErrorMessage(error)).toBe("An error occurred");
		});
	});

	describe("extractErrorMessage", () => {
		it("extracts message from Error instance", () => {
			const error = new Error("Something went wrong");
			expect(extractErrorMessage(error)).toBe("Something went wrong");
		});

		it("returns string errors as-is", () => {
			expect(extractErrorMessage("Direct error message")).toBe(
				"Direct error message",
			);
		});

		it("handles auth errors", () => {
			const error = { error: { message: "Auth failed" } };
			expect(extractErrorMessage(error)).toBe("Auth failed");
		});

		it("returns default for unknown error types", () => {
			expect(extractErrorMessage(null)).toBe("An unexpected error occurred");
			expect(extractErrorMessage(undefined)).toBe(
				"An unexpected error occurred",
			);
			expect(extractErrorMessage(42)).toBe("An unexpected error occurred");
		});
	});

	describe("isAuthError", () => {
		it("returns true for valid auth error structure", () => {
			const error = { error: { message: "Test" } };
			expect(isAuthError(error)).toBe(true);
		});

		it("returns false for non-object", () => {
			expect(isAuthError("string")).toBe(false);
			expect(isAuthError(null)).toBe(false);
			expect(isAuthError(undefined)).toBe(false);
		});

		it("returns false for object without error property", () => {
			expect(isAuthError({ message: "Test" })).toBe(false);
		});

		it("returns false when error property is not an object", () => {
			expect(isAuthError({ error: "string" })).toBe(false);
		});
	});

	describe("isRetryableError", () => {
		it("returns true for network errors", () => {
			const error = new Error("Network request failed");
			expect(isRetryableError(error)).toBe(true);
		});

		it("returns true for timeout errors", () => {
			const error = new Error("Request timeout exceeded");
			expect(isRetryableError(error)).toBe(true);
		});

		it("returns true for fetch errors", () => {
			const error = new Error("Failed to fetch");
			expect(isRetryableError(error)).toBe(true);
		});

		it("returns true for connection errors", () => {
			const error = new Error("Connection refused");
			expect(isRetryableError(error)).toBe(true);
		});

		it("returns false for validation errors", () => {
			const error = new Error("Invalid email format");
			expect(isRetryableError(error)).toBe(false);
		});

		it("returns false for non-Error types", () => {
			expect(isRetryableError("string error")).toBe(false);
			expect(isRetryableError(null)).toBe(false);
		});
	});

	describe("getStatusCodeMessage", () => {
		it("returns correct message for 400", () => {
			expect(getStatusCodeMessage(400)).toBe(
				"Invalid request. Please check your input.",
			);
		});

		it("returns correct message for 401", () => {
			expect(getStatusCodeMessage(401)).toBe("Please sign in to continue.");
		});

		it("returns correct message for 403", () => {
			expect(getStatusCodeMessage(403)).toBe(
				"You don't have permission to do this.",
			);
		});

		it("returns correct message for 404", () => {
			expect(getStatusCodeMessage(404)).toBe(
				"The requested resource was not found.",
			);
		});

		it("returns correct message for 429", () => {
			expect(getStatusCodeMessage(429)).toBe(
				"Too many requests. Please wait a moment.",
			);
		});

		it("returns correct message for 500", () => {
			expect(getStatusCodeMessage(500)).toBe(
				"Something went wrong on our end.",
			);
		});

		it("returns generic message for unknown status codes", () => {
			expect(getStatusCodeMessage(418)).toBe("An error occurred");
		});
	});

	describe("processError", () => {
		it("processes Error instance correctly", () => {
			const error = new Error("Test error");
			const result = processError(error);

			expect(result.message).toBe("Test error");
			expect(result.retryable).toBe(false);
		});

		it("marks network errors as retryable", () => {
			const error = new Error("Network failure");
			const result = processError(error);

			expect(result.retryable).toBe(true);
		});

		it("processes auth errors correctly", () => {
			const error = { error: { message: "Invalid token" } };
			const result = processError(error);

			expect(result.message).toBe("Invalid token");
			expect(result.retryable).toBe(false);
		});

		it("processes string errors correctly", () => {
			const result = processError("Something bad happened");

			expect(result.message).toBe("Something bad happened");
			expect(result.retryable).toBe(false);
		});
	});
});
