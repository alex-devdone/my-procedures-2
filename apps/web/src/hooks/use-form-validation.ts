import { z } from "zod";

// ============================================================================
// Validation Schemas (Pure - no React dependencies)
// ============================================================================

export const emailSchema = z.email("Invalid email address");

export const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters");

export const nameSchema = z
	.string()
	.min(2, "Name must be at least 2 characters");

export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

export const signupSchema = z.object({
	name: nameSchema,
	email: emailSchema,
	password: passwordSchema,
});

// ============================================================================
// Validation Types
// ============================================================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

// ============================================================================
// Pure Validation Functions
// ============================================================================

export interface ValidationResult<T> {
	success: boolean;
	data?: T;
	errors?: z.ZodError;
}

/**
 * Validates login form data. Pure function - no side effects.
 */
export function validateLoginForm(
	data: unknown,
): ValidationResult<LoginFormData> {
	const result = loginSchema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, errors: result.error };
}

/**
 * Validates signup form data. Pure function - no side effects.
 */
export function validateSignupForm(
	data: unknown,
): ValidationResult<SignupFormData> {
	const result = signupSchema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, errors: result.error };
}

/**
 * Validates a single email field. Pure function.
 */
export function validateEmail(email: string): ValidationResult<string> {
	const result = emailSchema.safeParse(email);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, errors: result.error };
}

/**
 * Validates a single password field. Pure function.
 */
export function validatePassword(password: string): ValidationResult<string> {
	const result = passwordSchema.safeParse(password);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, errors: result.error };
}

/**
 * Validates a single name field. Pure function.
 */
export function validateName(name: string): ValidationResult<string> {
	const result = nameSchema.safeParse(name);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return { success: false, errors: result.error };
}

/**
 * Extracts error messages from a Zod error for a specific field.
 * Pure function.
 */
export function getFieldErrors(
	errors: z.ZodError | undefined,
	field: string,
): string[] {
	if (!errors) return [];
	return errors.issues
		.filter((issue) => issue.path[0] === field)
		.map((issue) => issue.message);
}

/**
 * Gets the first error message for a field, or undefined if none.
 * Pure function.
 */
export function getFirstFieldError(
	errors: z.ZodError | undefined,
	field: string,
): string | undefined {
	const fieldErrors = getFieldErrors(errors, field);
	return fieldErrors[0];
}
