"use client";

import { useEffect, useRef } from "react";
import { authClient, useSession } from "@/lib/auth-client";

// ============================================================================
// Types
// ============================================================================

export interface AuthState {
	isAuthenticated: boolean;
	isPending: boolean;
	user: AuthUser | null;
}

export interface AuthUser {
	id: string;
	email: string;
	name: string | null;
}

export interface UseAuthStateReturn extends AuthState {
	signOut: () => Promise<void>;
}

export interface AuthTransitionCallbacks {
	onLogin?: () => void;
	onLogout?: () => void;
}

// ============================================================================
// Pure Functions (for testing)
// ============================================================================

/**
 * Derives authentication state from session data. Pure function.
 */
export function deriveAuthState(
	session: { user?: { id: string; email: string; name: string } | null } | null,
	isPending: boolean,
): AuthState {
	const user = session?.user ?? null;
	return {
		isAuthenticated: !!user,
		isPending,
		user: user
			? {
					id: user.id,
					email: user.email,
					name: user.name || null, // Convert empty string to null
				}
			: null,
	};
}

/**
 * Detects auth state transition. Pure function.
 * @returns 'login' | 'logout' | null
 */
export function detectAuthTransition(
	previousAuthState: boolean | null,
	currentAuthState: boolean,
): "login" | "logout" | null {
	if (previousAuthState === null) return null;
	if (previousAuthState === false && currentAuthState === true) return "login";
	if (previousAuthState === true && currentAuthState === false) return "logout";
	return null;
}

// ============================================================================
// React Hooks (thin wrappers around pure functions)
// ============================================================================

/**
 * Hook for accessing auth state. Thin wrapper that delegates to pure functions.
 */
export function useAuthState(): UseAuthStateReturn {
	const { data: session, isPending } = useSession();
	const state = deriveAuthState(session, isPending);

	const handleSignOut = async () => {
		await authClient.signOut();
	};

	return {
		...state,
		signOut: handleSignOut,
	};
}

/**
 * Hook for detecting auth state transitions (login/logout).
 * Useful for triggering side effects when user logs in or out.
 */
export function useAuthTransition(callbacks: AuthTransitionCallbacks): void {
	const { data: session, isPending } = useSession();
	const isAuthenticated = !!session?.user;
	const previousAuthState = useRef<boolean | null>(null);

	useEffect(() => {
		if (isPending) return;

		const transition = detectAuthTransition(
			previousAuthState.current,
			isAuthenticated,
		);

		previousAuthState.current = isAuthenticated;

		if (transition === "login") {
			callbacks.onLogin?.();
		} else if (transition === "logout") {
			callbacks.onLogout?.();
		}
	}, [isAuthenticated, isPending, callbacks]);
}
