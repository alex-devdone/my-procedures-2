"use client";

import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GoogleSyncToggleProps {
	/** The todo ID */
	todoId: number | string;
	/** Whether Google sync is enabled for this todo */
	isSynced: boolean;
	/** Callback when sync state changes */
	onSyncChange: (
		todoId: number | string,
		enabled: boolean,
	) => void | Promise<void>;
	/** Additional CSS classes */
	className?: string;
	/** Whether the button should be shown (only for authenticated users with numeric IDs) */
	show?: boolean;
}

/**
 * Toggle button for enabling/disabling Google Tasks sync on a todo.
 *
 * Features:
 * - Shows Cloud icon when synced (blue)
 * - Shows CloudOff icon when not synced (muted)
 * - Loading state during sync operations
 * - Only shown for authenticated users (numeric todo IDs)
 *
 * @example
 * ```tsx
 * <GoogleSyncToggle
 *   todoId={todo.id}
 *   isSynced={todo.googleSyncEnabled}
 *   onSyncChange={async (id, enabled) => {
 *     await updateTodoGoogleSync(id, enabled);
 *   }}
 *   show={typeof todo.id === "number"}
 * />
 * ```
 */
export function GoogleSyncToggle({
	todoId,
	isSynced,
	onSyncChange,
	className,
	show = true,
}: GoogleSyncToggleProps) {
	const [isPending, setIsPending] = useState(false);

	// Only allow sync for numeric IDs (authenticated users)
	const canSync = typeof todoId === "number";

	const handleClick = useCallback(async () => {
		if (typeof todoId !== "number") return;
		const newSyncState = !isSynced;
		setIsPending(true);
		try {
			await onSyncChange(todoId, newSyncState);
		} catch (error) {
			// Log error silently - parent component should handle showing errors
			console.error("Sync change failed:", error);
		} finally {
			setIsPending(false);
		}
	}, [todoId, isSynced, onSyncChange]);

	// Don't render if show is false (local todos)
	if (!show) {
		return null;
	}

	if (!canSync) {
		return null;
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onClick={handleClick}
			disabled={isPending}
			className={cn(
				"h-8 w-8 transition-colors",
				isSynced
					? "text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
					: "text-muted-foreground hover:text-foreground",
				className,
			)}
			aria-label={isSynced ? "Disable Google sync" : "Enable Google sync"}
			data-testid="google-sync-toggle"
		>
			{isPending ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : isSynced ? (
				<Cloud className="h-4 w-4" />
			) : (
				<CloudOff className="h-4 w-4" />
			)}
		</Button>
	);
}
