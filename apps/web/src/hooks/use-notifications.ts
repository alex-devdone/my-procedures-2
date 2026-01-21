"use client";

import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

/**
 * Browser notification permission state
 */
export type NotificationPermission = "default" | "granted" | "denied";

/**
 * Notification state returned by the hook
 */
export interface NotificationState {
	/** Whether the browser supports notifications */
	isSupported: boolean;
	/** Current permission state */
	permission: NotificationPermission;
	/** Whether permission is currently being requested */
	isRequesting: boolean;
}

/**
 * Return type for the useNotifications hook
 */
export interface UseNotificationsReturn extends NotificationState {
	/** Request permission to show notifications */
	requestPermission: () => Promise<NotificationPermission>;
	/** Show a browser notification (only works if permission is granted) */
	showNotification: (
		title: string,
		options?: NotificationOptions,
	) => Notification | null;
}

/**
 * Options for showing a notification
 */
export interface NotificationOptions {
	body?: string;
	icon?: string;
	tag?: string;
	data?: unknown;
	requireInteraction?: boolean;
	silent?: boolean;
}

// ============================================================================
// Pure Functions (for testing)
// ============================================================================

/**
 * Check if the Notification API is supported in the current environment.
 * Pure function that can be tested with mocked globals.
 */
export function isNotificationSupported(
	windowObj?: { Notification?: unknown } | null,
): boolean {
	if (typeof windowObj === "undefined" || windowObj === null) {
		// SSR or no window
		return false;
	}
	return "Notification" in windowObj;
}

/**
 * Get the current notification permission.
 * Returns "default" if notifications are not supported.
 */
export function getNotificationPermission(
	notificationObj?: { permission?: NotificationPermission } | null,
): NotificationPermission {
	if (!notificationObj || typeof notificationObj.permission !== "string") {
		return "default";
	}
	return notificationObj.permission;
}

/**
 * Derive notification state from browser APIs.
 * Pure function for testability.
 */
export function deriveNotificationState(
	isSupported: boolean,
	permission: NotificationPermission,
	isRequesting: boolean,
): NotificationState {
	return {
		isSupported,
		permission,
		isRequesting,
	};
}

/**
 * Check if notifications can be shown (supported and permission granted).
 */
export function canShowNotification(
	isSupported: boolean,
	permission: NotificationPermission,
): boolean {
	return isSupported && permission === "granted";
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook for managing browser notification permissions.
 *
 * Features:
 * - Checks if notifications are supported
 * - Tracks current permission state
 * - Provides method to request permission
 * - Provides method to show notifications
 *
 * @example
 * ```tsx
 * const { isSupported, permission, requestPermission, showNotification } = useNotifications();
 *
 * if (permission === "default") {
 *   return <button onClick={requestPermission}>Enable notifications</button>;
 * }
 *
 * if (permission === "granted") {
 *   showNotification("Reminder", { body: "Your task is due!" });
 * }
 * ```
 */
export function useNotifications(): UseNotificationsReturn {
	const [isSupported, setIsSupported] = useState(false);
	const [permission, setPermission] =
		useState<NotificationPermission>("default");
	const [isRequesting, setIsRequesting] = useState(false);

	// Initialize state on mount (client-side only)
	useEffect(() => {
		const supported = isNotificationSupported(
			typeof window !== "undefined" ? window : null,
		);
		setIsSupported(supported);

		if (supported) {
			setPermission(getNotificationPermission(Notification));
		}
	}, []);

	// Listen for permission changes (some browsers support this)
	useEffect(() => {
		if (!isSupported) return;

		// Check if permission changed (e.g., user changed it in browser settings)
		const checkPermission = () => {
			const currentPermission = getNotificationPermission(Notification);
			setPermission(currentPermission);
		};

		// Poll for changes since there's no reliable event for this
		const interval = setInterval(checkPermission, 5000);

		return () => clearInterval(interval);
	}, [isSupported]);

	/**
	 * Request permission to show notifications.
	 * Returns the new permission state.
	 */
	const requestPermission =
		useCallback(async (): Promise<NotificationPermission> => {
			if (!isSupported) {
				return "denied";
			}

			// Already granted or denied
			if (permission !== "default") {
				return permission;
			}

			setIsRequesting(true);

			try {
				const result = await Notification.requestPermission();
				setPermission(result);
				return result;
			} catch {
				// Some browsers may throw if blocked by policy
				return "denied";
			} finally {
				setIsRequesting(false);
			}
		}, [isSupported, permission]);

	/**
	 * Show a browser notification.
	 * Returns the Notification object if shown, null otherwise.
	 */
	const showNotification = useCallback(
		(title: string, options?: NotificationOptions): Notification | null => {
			if (!canShowNotification(isSupported, permission)) {
				return null;
			}

			try {
				return new Notification(title, options);
			} catch {
				// May fail in certain contexts (e.g., service workers)
				return null;
			}
		},
		[isSupported, permission],
	);

	return {
		...deriveNotificationState(isSupported, permission, isRequesting),
		requestPermission,
		showNotification,
	};
}
