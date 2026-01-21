import { Check, Loader2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Connection status type for realtime synchronization.
 */
export type ConnectionStatus =
	| "connecting"
	| "connected"
	| "disconnected"
	| "not-configured";

/**
 * Props for the ConnectionStatus component.
 */
export interface ConnectionStatusProps {
	/**
	 * The current connection status.
	 */
	status: ConnectionStatus;
	/**
	 * Optional className for custom styling.
	 */
	className?: string;
	/**
	 * Whether to show text label alongside the icon.
	 * @default false
	 */
	showLabel?: boolean;
	/**
	 * Custom label for each status.
	 */
	labels?: Partial<Record<ConnectionStatus, string>>;
	/**
	 * Size variant for the status indicator.
	 * @default "sm"
	 */
	size?: "sm" | "md" | "lg";
}

/**
 * Get the icon component for a given connection status.
 */
function getStatusIcon(status: ConnectionStatus): ReactNode {
	switch (status) {
		case "connecting":
			return <Loader2 className="animate-spin" aria-hidden="true" />;
		case "connected":
			return <Check aria-hidden="true" />;
		case "disconnected":
		case "not-configured":
			return <XCircle aria-hidden="true" />;
	}
}

/**
 * Get the default label for a given connection status.
 */
function getDefaultLabel(status: ConnectionStatus): string {
	switch (status) {
		case "connecting":
			return "Connecting...";
		case "connected":
			return "Synced";
		case "disconnected":
			return "Disconnected";
		case "not-configured":
			return "Not configured";
	}
}

/**
 * Get the CSS classes for a given connection status.
 */
function getStatusClasses(status: ConnectionStatus): string {
	switch (status) {
		case "connecting":
			return "text-muted-foreground";
		case "connected":
			return "text-emerald-600 dark:text-emerald-400";
		case "disconnected":
			return "text-destructive";
		case "not-configured":
			return "text-muted-foreground";
	}
}

/**
 * Get the icon size classes for a given size variant.
 */
function getIconSize(size: "sm" | "md" | "lg"): string {
	switch (size) {
		case "sm":
			return "h-3 w-3";
		case "md":
			return "h-4 w-4";
		case "lg":
			return "h-5 w-5";
	}
}

/**
 * Get the text size classes for a given size variant.
 */
function getTextSize(size: "sm" | "md" | "lg"): string {
	switch (size) {
		case "sm":
			return "text-xs";
		case "md":
			return "text-sm";
		case "lg":
			return "text-base";
	}
}

/**
 * Connection status indicator component for realtime sync.
 *
 * Displays the current realtime connection status with an icon and optional label.
 * Used to show whether the app is connected to Supabase Realtime for cross-device sync.
 *
 * @example
 * ```tsx
 * <ConnectionStatus status="connected" />
 * <ConnectionStatus status="connected" showLabel />
 * <ConnectionStatus status="connecting" showLabel size="lg" />
 * ```
 */
export function ConnectionStatus({
	status,
	className,
	showLabel = false,
	labels,
	size = "sm",
}: ConnectionStatusProps) {
	const icon = getStatusIcon(status);
	const statusClasses = getStatusClasses(status);
	const iconSize = getIconSize(size);
	const textSize = getTextSize(size);
	const defaultLabel = getDefaultLabel(status);
	const label = labels?.[status] ?? defaultLabel;

	return (
		<output
			className={cn(
				"inline-flex items-center gap-1.5",
				statusClasses,
				className,
			)}
			aria-live="polite"
			data-connection-status={status}
		>
			<span className={cn("shrink-0", iconSize)} aria-hidden="true">
				{icon}
			</span>
			{showLabel && (
				<span className={cn("font-medium", textSize)}>{label}</span>
			)}
		</output>
	);
}
