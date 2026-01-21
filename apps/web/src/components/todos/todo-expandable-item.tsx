"use client";

import { CheckCircle2, ChevronDown, FolderIcon, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { SubtaskProgress } from "@/app/api/subtask";
import { useSubtaskStorage } from "@/app/api/subtask";
import { SubtaskAddInput } from "@/components/subtasks/subtask-add-input";
import { SubtaskList } from "@/components/subtasks/subtask-list";
import { SubtaskProgressIndicator } from "@/components/subtasks/subtask-progress-indicator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TodoExpandableItemProps {
	/** The todo item data */
	todo: {
		id: number | string;
		text: string;
		completed: boolean;
		folderId?: number | string | null;
	};
	/** Subtask progress for this todo */
	subtaskProgress?: SubtaskProgress | null;
	/** Callback when toggle is clicked */
	onToggle: (id: number | string, completed: boolean) => void;
	/** Callback when delete is clicked */
	onDelete: (id: number | string) => void;
	/** Optional folder information for display */
	folder?: {
		name: string;
		color: string;
	} | null;
	/** Whether to show the folder badge (e.g., when viewing Inbox) */
	showFolderBadge?: boolean;
	/** Folder color classes mapping */
	folderColorBgClasses?: Record<string, string>;
	/** Additional CSS classes */
	className?: string;
	/** Animation delay for staggered rendering */
	animationDelay?: string;
}

/**
 * Expandable todo item that shows subtasks inline when expanded.
 *
 * Features:
 * - Toggle todo completion with checkbox
 * - Expand/collapse to show subtasks
 * - Delete todo button
 * - Subtask progress indicator
 * - Add new subtasks inline
 * - Auto-complete todo when all subtasks completed
 * - Auto-uncomplete todo when subtask unchecked
 */
export function TodoExpandableItem({
	todo,
	subtaskProgress,
	onToggle,
	onDelete,
	folder,
	showFolderBadge = false,
	folderColorBgClasses = {},
	className,
	animationDelay,
}: TodoExpandableItemProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const { create: createSubtask } = useSubtaskStorage(todo.id);

	const handleToggle = useCallback(() => {
		onToggle(todo.id, todo.completed);
	}, [todo.id, todo.completed, onToggle]);

	const handleDelete = useCallback(() => {
		onDelete(todo.id);
	}, [todo.id, onDelete]);

	const handleExpandToggle = useCallback(() => {
		setIsExpanded((prev) => !prev);
	}, []);

	const handleAddSubtask = useCallback(
		async (text: string) => {
			await createSubtask(todo.id, text);
		},
		[createSubtask, todo.id],
	);

	const handleAllSubtasksCompleted = useCallback(() => {
		// Auto-complete parent todo when all subtasks are done
		if (!todo.completed) {
			onToggle(todo.id, false); // false means current state, will be toggled to true
		}
	}, [todo.id, todo.completed, onToggle]);

	const handleSubtaskUncompleted = useCallback(() => {
		// Auto-uncomplete parent todo when a subtask is unchecked
		if (todo.completed) {
			onToggle(todo.id, true); // true means current state, will be toggled to false
		}
	}, [todo.id, todo.completed, onToggle]);

	return (
		<li
			className={cn(
				"group rounded-xl border border-border/50 bg-secondary/30 transition-all duration-200 hover:border-accent/30 hover:bg-secondary/50",
				className,
			)}
			style={animationDelay ? { animationDelay } : undefined}
			data-testid={`todo-item-${todo.id}`}
		>
			{/* Main todo row */}
			<div className="flex items-center gap-4 p-4">
				{/* Checkbox */}
				<button
					type="button"
					onClick={handleToggle}
					className={cn(
						"flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
						todo.completed
							? "border-accent bg-accent text-accent-foreground"
							: "border-border hover:border-accent/50 hover:bg-accent/5",
					)}
					aria-label={
						todo.completed ? "Mark as incomplete" : "Mark as complete"
					}
					data-testid="todo-toggle"
				>
					{todo.completed && <CheckCircle2 className="h-4 w-4" />}
				</button>

				{/* Expand button */}
				<button
					type="button"
					onClick={handleExpandToggle}
					className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
					aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
					aria-expanded={isExpanded}
					data-testid="todo-expand-toggle"
				>
					<ChevronDown
						className={cn(
							"h-4 w-4 transition-transform duration-200",
							isExpanded && "rotate-180",
						)}
					/>
				</button>

				{/* Todo content */}
				<div className="flex flex-1 flex-col gap-1">
					<span
						className={cn(
							"text-sm transition-all duration-200",
							todo.completed
								? "text-muted-foreground line-through"
								: "text-foreground",
						)}
						data-testid="todo-text"
					>
						{todo.text}
					</span>

					{/* Folder badge and subtask progress */}
					<div className="flex flex-wrap items-center gap-2">
						{folder && showFolderBadge && (
							<span
								className={cn(
									"inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs",
									folderColorBgClasses[folder.color] ||
										"bg-slate-500/10 text-slate-600 dark:text-slate-400",
								)}
								data-testid="todo-folder-badge"
							>
								<FolderIcon className="h-3 w-3" />
								{folder.name}
							</span>
						)}
						{subtaskProgress && (
							<SubtaskProgressIndicator
								progress={subtaskProgress}
								data-testid="todo-subtask-progress"
							/>
						)}
					</div>
				</div>

				{/* Delete button */}
				<Button
					variant="ghost"
					size="icon"
					onClick={handleDelete}
					className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
					aria-label="Delete task"
					data-testid="todo-delete"
				>
					<Trash2 className="h-4 w-4 text-muted-foreground transition-colors hover:text-destructive" />
				</Button>
			</div>

			{/* Expanded subtasks section */}
			{isExpanded && (
				<div
					className="border-border/50 border-t px-4 py-3"
					data-testid="todo-subtasks-section"
				>
					<SubtaskList
						todoId={todo.id}
						onAllCompleted={handleAllSubtasksCompleted}
						onUncompleted={handleSubtaskUncompleted}
						className="mb-3"
					/>
					<SubtaskAddInput
						onAdd={handleAddSubtask}
						placeholder="Add a subtask..."
						data-testid="todo-add-subtask-input"
					/>
				</div>
			)}
		</li>
	);
}
