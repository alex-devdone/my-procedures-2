"use client";

import { useQuery } from "@tanstack/react-query";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { GoogleTasksIntegrationStatus } from "@/app/api/google-tasks";
import {
	getStatusQueryOptions,
	useUpdateGoogleTasksSettings,
} from "@/app/api/google-tasks";
import { useSession } from "@/lib/auth-client";
import { GoogleTasksConfigModal } from "./google-tasks-config-modal";

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
	const { data: session, isPending: sessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	// Only fetch Google Tasks status when user is authenticated
	const query = useQuery({
		...getStatusQueryOptions(),
		enabled: isAuthenticated && !sessionPending,
	});

	const {
		data: status,
		isLoading,
		error,
		refetch: refetchStatus,
	} = {
		data: query.data ?? null,
		isLoading: query.isLoading,
		error: query.error ?? null,
		refetch: query.refetch,
	};

	const { updateSettings, isPending: isUpdatePending } =
		useUpdateGoogleTasksSettings();

	const [isConfigOpen, setIsConfigOpen] = useState(false);

	useEffect(() => {
		const handleOpen = () => {
			setIsConfigOpen(true);
		};

		window.addEventListener("google-tasks:open-config", handleOpen);
		return () => {
			window.removeEventListener("google-tasks:open-config", handleOpen);
		};
	}, []);

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
			<GoogleTasksConfigModal
				open={isConfigOpen}
				onOpenChange={setIsConfigOpen}
			/>
		</GoogleTasksContext.Provider>
	);
}
