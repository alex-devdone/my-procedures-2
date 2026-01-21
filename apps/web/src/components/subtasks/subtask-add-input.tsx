"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SubtaskAddInputProps {
	/** Callback when a new subtask is submitted */
	onAdd: (text: string) => void | Promise<void>;
	/** Placeholder text for the input */
	placeholder?: string;
	/** Whether the input is disabled */
	disabled?: boolean;
	/** Additional CSS classes */
	className?: string;
	/** Auto-focus the input when rendered */
	autoFocus?: boolean;
}

/**
 * Inline input component for adding new subtasks to a todo.
 *
 * Features:
 * - Text input with Enter key submission
 * - Add button for mouse/touch users
 * - Loading state during submission
 * - Clears input after successful submission
 * - Accessible with proper ARIA labels
 */
export function SubtaskAddInput({
	onAdd,
	placeholder = "Add a subtask...",
	disabled = false,
	className,
	autoFocus = false,
}: SubtaskAddInputProps) {
	const [text, setText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = useCallback(async () => {
		const trimmedText = text.trim();
		if (!trimmedText || isSubmitting) return;

		setIsSubmitting(true);
		try {
			await onAdd(trimmedText);
			setText("");
		} finally {
			setIsSubmitting(false);
		}
	}, [text, onAdd, isSubmitting]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	const isDisabled = disabled || isSubmitting;
	const canSubmit = text.trim().length > 0 && !isDisabled;

	return (
		<div
			className={cn("flex items-center gap-2", className)}
			data-testid="subtask-add-input"
		>
			<Input
				type="text"
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				disabled={isDisabled}
				autoFocus={autoFocus}
				aria-label="New subtask text"
				data-testid="subtask-add-input-field"
				className="flex-1"
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				onClick={handleSubmit}
				disabled={!canSubmit}
				aria-label="Add subtask"
				data-testid="subtask-add-button"
			>
				<Plus
					className={cn(
						"h-4 w-4",
						isSubmitting && "animate-pulse",
						canSubmit ? "text-foreground" : "text-muted-foreground",
					)}
				/>
			</Button>
		</div>
	);
}
