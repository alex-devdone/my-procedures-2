"use client";

import { CheckSquare } from "lucide-react";
import type { SubtaskProgress } from "@/app/api/subtask";
import { cn } from "@/lib/utils";

export interface SubtaskProgressIndicatorProps {
	/** Progress data with completed and total counts */
	progress: SubtaskProgress;
	/** Additional CSS classes */
	className?: string;
	/** Whether to show the icon */
	showIcon?: boolean;
	/** Size variant */
	size?: "sm" | "md";
}

/**
 * Displays subtask completion progress (e.g., "2/5").
 *
 * Features:
 * - Shows completed/total count
 * - Optional check icon
 * - Different styling when all completed
 * - Two size variants (sm, md)
 * - Accessible with proper ARIA attributes
 */
export function SubtaskProgressIndicator({
	progress,
	className,
	showIcon = true,
	size = "sm",
}: SubtaskProgressIndicatorProps) {
	const { completed, total } = progress;

	// Don't render if there are no subtasks
	if (total === 0) {
		return null;
	}

	const isAllCompleted = completed === total;

	return (
		<output
			className={cn(
				"inline-flex items-center gap-1 font-medium",
				size === "sm" ? "text-xs" : "text-sm",
				isAllCompleted
					? "text-green-600 dark:text-green-400"
					: "text-muted-foreground",
				className,
			)}
			data-testid="subtask-progress-indicator"
			aria-label={`${completed} of ${total} subtasks completed`}
		>
			{showIcon && (
				<CheckSquare
					className={cn(
						size === "sm" ? "h-3 w-3" : "h-4 w-4",
						isAllCompleted
							? "text-green-600 dark:text-green-400"
							: "text-muted-foreground",
					)}
					aria-hidden="true"
				/>
			)}
			<span data-testid="subtask-progress-text">
				{completed}/{total}
			</span>
		</output>
	);
}
