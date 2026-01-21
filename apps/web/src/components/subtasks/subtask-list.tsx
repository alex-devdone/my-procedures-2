"use client";

import { Trash2 } from "lucide-react";
import { useCallback } from "react";
import type { Subtask, UseSubtaskStorageReturn } from "@/app/api/subtask";
import { useSubtaskStorage } from "@/app/api/subtask";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface SubtaskListProps {
	/** The ID of the parent todo */
	todoId: number | string;
	/** Optional callback when all subtasks are completed (for auto-complete logic) */
	onAllCompleted?: () => void;
	/** Optional callback when at least one subtask is uncompleted after being all completed */
	onUncompleted?: () => void;
	/** Additional CSS classes */
	className?: string;
	/** Whether to show in read-only mode (no edit/delete actions) */
	readOnly?: boolean;
}

/**
 * Renders a list of subtasks for a todo item.
 *
 * Features:
 * - Displays subtasks with checkboxes for completion
 * - Delete button for each subtask
 * - Loading skeleton state
 * - Empty state when no subtasks exist
 * - Callbacks for auto-complete parent todo logic
 * - Accessible with proper ARIA attributes
 */
export function SubtaskList({
	todoId,
	onAllCompleted,
	onUncompleted,
	className,
	readOnly = false,
}: SubtaskListProps) {
	const { subtasks, toggle, deleteSubtask, isLoading } =
		useSubtaskStorage(todoId);

	const handleToggle = useCallback(
		async (subtask: Subtask) => {
			const newCompleted = !subtask.completed;
			await toggle(subtask.id, newCompleted);

			// Check if all subtasks are now completed
			const updatedSubtasks = subtasks.map((s) =>
				s.id === subtask.id ? { ...s, completed: newCompleted } : s,
			);

			const allCompleted =
				updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.completed);
			const wasAllCompleted =
				subtasks.length > 0 && subtasks.every((s) => s.completed);

			if (allCompleted && !wasAllCompleted) {
				onAllCompleted?.();
			} else if (!allCompleted && wasAllCompleted) {
				onUncompleted?.();
			}
		},
		[subtasks, toggle, onAllCompleted, onUncompleted],
	);

	const handleDelete = useCallback(
		async (subtaskId: number | string) => {
			await deleteSubtask(subtaskId);
		},
		[deleteSubtask],
	);

	if (isLoading) {
		return (
			<div
				className={cn("space-y-2", className)}
				data-testid="subtask-list-loading"
			>
				{[1, 2, 3].map((i) => (
					<div key={i} className="flex items-center gap-3">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 flex-1" />
					</div>
				))}
			</div>
		);
	}

	if (subtasks.length === 0) {
		return (
			<div
				className={cn(
					"py-2 text-center text-muted-foreground text-sm",
					className,
				)}
				data-testid="subtask-list-empty"
			>
				No subtasks yet
			</div>
		);
	}

	return (
		<ul
			className={cn("space-y-1", className)}
			data-testid="subtask-list"
			aria-label="Subtasks"
		>
			{subtasks.map((subtask) => (
				<SubtaskItem
					key={subtask.id}
					subtask={subtask}
					onToggle={() => handleToggle(subtask)}
					onDelete={() => handleDelete(subtask.id)}
					readOnly={readOnly}
				/>
			))}
		</ul>
	);
}

interface SubtaskItemProps {
	subtask: Subtask;
	onToggle: () => void;
	onDelete: () => void;
	readOnly: boolean;
}

function SubtaskItem({
	subtask,
	onToggle,
	onDelete,
	readOnly,
}: SubtaskItemProps) {
	return (
		<li
			className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
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

/**
 * Standalone SubtaskList component that can be used outside of useSubtaskStorage context.
 * Useful for testing or when subtasks are passed directly.
 */
export interface StandaloneSubtaskListProps {
	subtasks: Subtask[];
	onToggle: UseSubtaskStorageReturn["toggle"];
	onDelete: UseSubtaskStorageReturn["deleteSubtask"];
	isLoading?: boolean;
	className?: string;
	readOnly?: boolean;
	onAllCompleted?: () => void;
	onUncompleted?: () => void;
}

export function StandaloneSubtaskList({
	subtasks,
	onToggle,
	onDelete,
	isLoading = false,
	className,
	readOnly = false,
	onAllCompleted,
	onUncompleted,
}: StandaloneSubtaskListProps) {
	const handleToggle = useCallback(
		async (subtask: Subtask) => {
			const newCompleted = !subtask.completed;
			await onToggle(subtask.id, newCompleted);

			const updatedSubtasks = subtasks.map((s) =>
				s.id === subtask.id ? { ...s, completed: newCompleted } : s,
			);

			const allCompleted =
				updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.completed);
			const wasAllCompleted =
				subtasks.length > 0 && subtasks.every((s) => s.completed);

			if (allCompleted && !wasAllCompleted) {
				onAllCompleted?.();
			} else if (!allCompleted && wasAllCompleted) {
				onUncompleted?.();
			}
		},
		[subtasks, onToggle, onAllCompleted, onUncompleted],
	);

	const handleDelete = useCallback(
		async (subtaskId: number | string) => {
			await onDelete(subtaskId);
		},
		[onDelete],
	);

	if (isLoading) {
		return (
			<div
				className={cn("space-y-2", className)}
				data-testid="subtask-list-loading"
			>
				{[1, 2, 3].map((i) => (
					<div key={i} className="flex items-center gap-3">
						<Skeleton className="h-4 w-4" />
						<Skeleton className="h-4 flex-1" />
					</div>
				))}
			</div>
		);
	}

	if (subtasks.length === 0) {
		return (
			<div
				className={cn(
					"py-2 text-center text-muted-foreground text-sm",
					className,
				)}
				data-testid="subtask-list-empty"
			>
				No subtasks yet
			</div>
		);
	}

	return (
		<ul
			className={cn("space-y-1", className)}
			data-testid="subtask-list"
			aria-label="Subtasks"
		>
			{subtasks.map((subtask) => (
				<SubtaskItem
					key={subtask.id}
					subtask={subtask}
					onToggle={() => handleToggle(subtask)}
					onDelete={() => handleDelete(subtask.id)}
					readOnly={readOnly}
				/>
			))}
		</ul>
	);
}
