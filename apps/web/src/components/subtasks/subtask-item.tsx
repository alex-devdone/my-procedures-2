"use client";

import { Trash2 } from "lucide-react";
import type { Subtask } from "@/app/api/subtask";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface SubtaskItemProps {
	/** The subtask data to display */
	subtask: Subtask;
	/** Callback when the checkbox is toggled */
	onToggle: () => void;
	/** Callback when the delete button is clicked */
	onDelete: () => void;
	/** Whether to show in read-only mode (no edit/delete actions) */
	readOnly?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Single subtask item with checkbox for completion and delete button.
 *
 * Features:
 * - Checkbox to toggle completion status
 * - Delete button that appears on hover
 * - Strikethrough styling for completed subtasks
 * - Read-only mode support (disables checkbox, hides delete)
 * - Accessible with proper ARIA labels
 */
export function SubtaskItem({
	subtask,
	onToggle,
	onDelete,
	readOnly = false,
	className,
}: SubtaskItemProps) {
	return (
		<li
			className={cn(
				"group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50",
				className,
			)}
			data-testid={`subtask-item-${subtask.id}`}
		>
			<Checkbox
				checked={subtask.completed}
				onCheckedChange={onToggle}
				aria-label={`Mark "${subtask.text}" as ${subtask.completed ? "incomplete" : "complete"}`}
				data-testid={`subtask-checkbox-${subtask.id}`}
				disabled={readOnly}
			/>
			<span
				className={cn(
					"flex-1 text-sm transition-colors",
					subtask.completed && "text-muted-foreground line-through",
				)}
				data-testid={`subtask-text-${subtask.id}`}
			>
				{subtask.text}
			</span>
			{!readOnly && (
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={onDelete}
					className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
					aria-label={`Delete "${subtask.text}"`}
					data-testid={`subtask-delete-${subtask.id}`}
				>
					<Trash2 className="h-3 w-3 text-muted-foreground" />
				</Button>
			)}
		</li>
	);
}
