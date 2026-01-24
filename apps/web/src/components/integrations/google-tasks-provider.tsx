"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { GoogleTasksIntegrationStatus } from "@/app/api/google-tasks";
import {
	useGoogleTasksStatus,
	useUpdateGoogleTasksSettings,
} from "@/app/api/google-tasks";

// ============================================================================
// Context
// ============================================================================

/**
 * Google Tasks provider context value
 */
interface GoogleTasksContextValue {
	/** Current integration status */
	status: GoogleTasksIntegrationStatus | null;
	/** Whether status is being fetched */
	isLoading: boolean;
	/** Whether there was an error fetching status */
	error: unknown | null;
	/** Whether Google Tasks is linked and enabled */
	isEnabled: boolean;
	/** Whether auto-sync is enabled */
	isSyncEnabled: boolean;
	/** Refetch the integration status */
	refetch: () => void;
	/** Enable or disable auto-sync */
	setSyncEnabled: (enabled: boolean) => Promise<void>;
}

const GoogleTasksContext = createContext<GoogleTasksContextValue | null>(null);

/**
 * Hook to access Google Tasks integration state.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isEnabled, isSyncEnabled, setSyncEnabled } = useGoogleTasks();
 *
 *   if (!isEnabled) return <p>Google Tasks not enabled</p>;
 *
 *   return (
 *     <button onClick={() => setSyncEnabled(!isSyncEnabled)}>
 *       {isSyncEnabled ? "Disable Sync" : "Enable Sync"}
 *     </button>
 *   );
 * }
 * ```
 */
export function useGoogleTasks(): GoogleTasksContextValue {
	const context = useContext(GoogleTasksContext);
	if (!context) {
		// Return empty defaults if used outside provider
		return {
			status: null,
			isLoading: false,
			error: null,
			isEnabled: false,
			isSyncEnabled: false,
			refetch: () => {},
			setSyncEnabled: async () => {},
		};
	}
	return context;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the GoogleTasksProvider component
 */
export interface GoogleTasksProviderProps {
	/** Child elements to render */
	children: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Provider component that manages Google Tasks integration state.
 *
 * Features:
 * - Fetches and provides Google Tasks integration status
 * - Enables access to integration state via useGoogleTasks hook
 * - Provides methods to update sync settings
 * - Handles loading and error states
 *
 * @example
 * ```tsx
 * // In app layout
 * <GoogleTasksProvider>
 *   {children}
 * </GoogleTasksProvider>
 * ```
 */
export function GoogleTasksProvider({ children }: GoogleTasksProviderProps) {
	const {
		status,
		isLoading,
		error,
		refetch: refetchStatus,
	} = useGoogleTasksStatus();

	const { updateSettings, isPending: isUpdatePending } =
		useUpdateGoogleTasksSettings();

	// Computed values
	const isEnabled = Boolean(status?.linked && status?.enabled);
	const isSyncEnabled = Boolean(status?.syncEnabled);

	// Handle setting sync enabled state
	const setSyncEnabled = useCallback(
		async (enabled: boolean) => {
			try {
				await updateSettings({ syncEnabled: enabled });
				await refetchStatus();
			} catch {
				// Error handling is managed by the hook
			}
		},
		[updateSettings, refetchStatus],
	);

	// Memoize context value to prevent unnecessary re-renders
	const contextValue = useMemo(
		(): GoogleTasksContextValue => ({
			status,
			isLoading: isLoading || isUpdatePending,
			error,
			isEnabled,
			isSyncEnabled,
			refetch: refetchStatus,
			setSyncEnabled,
		}),
		[
			status,
			isLoading,
			isUpdatePending,
			error,
			isEnabled,
			isSyncEnabled,
			refetchStatus,
			setSyncEnabled,
		],
	);

	return (
		<GoogleTasksContext.Provider value={contextValue}>
			{children}
		</GoogleTasksContext.Provider>
	);
}
