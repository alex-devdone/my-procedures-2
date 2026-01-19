"use client";

import { useCallback } from "react";
import { toast } from "sonner";

// ============================================================================
// Error Types
// ============================================================================

export interface AppError {
	message: string;
	code?: string;
	statusCode?: number;
	retryable?: boolean;
}

export interface AuthError {
	error: {
		message?: string;
		statusText?: string;
		code?: string;
	};
}

// ============================================================================
// Pure Error Extraction Functions
// ============================================================================

/**
 * Extracts error message from an auth error object. Pure function.
 */
export function extractAuthErrorMessage(error: AuthError): string {
	return error.error.message || error.error.statusText || "An error occurred";
}

/**
 * Extracts error message from a generic error. Pure function.
 */
export function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	if (isAuthError(error)) {
		return extractAuthErrorMessage(error);
	}
	return "An unexpected error occurred";
}

/**
 * Type guard for auth errors. Pure function.
 */
export function isAuthError(error: unknown): error is AuthError {
	return (
		typeof error === "object" &&
		error !== null &&
		"error" in error &&
		typeof (error as AuthError).error === "object"
	);
}

/**
 * Determines if an error is likely retryable. Pure function.
 */
export function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes("network") ||
			message.includes("timeout") ||
			message.includes("fetch") ||
			message.includes("connection")
		);
	}
	return false;
}

/**
 * Maps HTTP status codes to user-friendly messages. Pure function.
 */
export function getStatusCodeMessage(statusCode: number): string {
	const messages: Record<number, string> = {
		400: "Invalid request. Please check your input.",
		401: "Please sign in to continue.",
		403: "You don't have permission to do this.",
		404: "The requested resource was not found.",
		408: "Request timed out. Please try again.",
		429: "Too many requests. Please wait a moment.",
		500: "Something went wrong on our end.",
		502: "Service temporarily unavailable.",
		503: "Service is currently down for maintenance.",
		504: "Request timed out. Please try again.",
	};
	return messages[statusCode] || "An error occurred";
}

// ============================================================================
// Error Handler Configuration
// ============================================================================

export interface ErrorHandlerOptions {
	showToast?: boolean;
	retryAction?: () => void;
	onError?: (error: AppError) => void;
}

const defaultOptions: Required<ErrorHandlerOptions> = {
	showToast: true,
	retryAction: () => {},
	onError: () => {},
};

// ============================================================================
// Pure Error Processing
// ============================================================================

/**
 * Processes an error into a standardized AppError. Pure function.
 */
export function processError(error: unknown): AppError {
	const message = extractErrorMessage(error);
	const retryable = isRetryableError(error);

	return {
		message,
		retryable,
	};
}

// ============================================================================
// React Hook (thin wrapper)
// ============================================================================

export interface UseErrorHandlerReturn {
	handleError: (error: unknown, options?: ErrorHandlerOptions) => AppError;
	handleAuthError: (
		error: AuthError,
		options?: ErrorHandlerOptions,
	) => AppError;
}

/**
 * Hook for handling errors with toast notifications.
 * Thin wrapper that delegates to pure functions.
 */
export function useErrorHandler(): UseErrorHandlerReturn {
	const handleError = useCallback(
		(error: unknown, options: ErrorHandlerOptions = {}): AppError => {
			const opts = { ...defaultOptions, ...options };
			const appError = processError(error);

			if (opts.showToast) {
				if (appError.retryable && opts.retryAction) {
					toast.error(appError.message, {
						action: {
							label: "Retry",
							onClick: opts.retryAction,
						},
					});
				} else {
					toast.error(appError.message);
				}
			}

			opts.onError(appError);
			return appError;
		},
		[],
	);

	const handleAuthError = useCallback(
		(error: AuthError, options: ErrorHandlerOptions = {}): AppError => {
			const opts = { ...defaultOptions, ...options };
			const message = extractAuthErrorMessage(error);
			const appError: AppError = { message, retryable: false };

			if (opts.showToast) {
				toast.error(message);
			}

			opts.onError(appError);
			return appError;
		},
		[],
	);

	return {
		handleError,
		handleAuthError,
	};
}
