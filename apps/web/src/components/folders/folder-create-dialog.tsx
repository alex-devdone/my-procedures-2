"use client";

import { FolderIcon } from "lucide-react";
import { useCallback, useState } from "react";
import {
	FOLDER_COLORS,
	type FolderColor,
	type LocalCreateFolderInput,
} from "@/app/api/folder";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Maps folder colors to Tailwind CSS classes for the color picker.
 */
const folderColorClasses: Record<FolderColor, string> = {
	slate: "bg-slate-500",
	red: "bg-red-500",
	orange: "bg-orange-500",
	amber: "bg-amber-500",
	yellow: "bg-yellow-500",
	lime: "bg-lime-500",
	green: "bg-green-500",
	emerald: "bg-emerald-500",
	teal: "bg-teal-500",
	cyan: "bg-cyan-500",
	sky: "bg-sky-500",
	blue: "bg-blue-500",
	indigo: "bg-indigo-500",
	violet: "bg-violet-500",
	purple: "bg-purple-500",
	fuchsia: "bg-fuchsia-500",
	pink: "bg-pink-500",
	rose: "bg-rose-500",
};

/**
 * Maps folder colors to Tailwind text classes for the preview icon.
 */
const folderColorTextClasses: Record<FolderColor, string> = {
	slate: "text-slate-500",
	red: "text-red-500",
	orange: "text-orange-500",
	amber: "text-amber-500",
	yellow: "text-yellow-500",
	lime: "text-lime-500",
	green: "text-green-500",
	emerald: "text-emerald-500",
	teal: "text-teal-500",
	cyan: "text-cyan-500",
	sky: "text-sky-500",
	blue: "text-blue-500",
	indigo: "text-indigo-500",
	violet: "text-violet-500",
	purple: "text-purple-500",
	fuchsia: "text-fuchsia-500",
	pink: "text-pink-500",
	rose: "text-rose-500",
};

export interface FolderCreateDialogProps {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback when the dialog's open state changes */
	onOpenChange: (open: boolean) => void;
	/** Callback when a folder is created */
	onCreate: (input: LocalCreateFolderInput) => Promise<void>;
	/** Whether the create operation is loading */
	isLoading?: boolean;
}

/**
 * Dialog for creating a new folder with name and color selection.
 *
 * Features:
 * - Name input with validation (required, max 100 chars)
 * - Color picker with visual preview
 * - Live preview of folder appearance
 * - Form validation with error messages
 * - Loading state during creation
 */
export function FolderCreateDialog({
	open,
	onOpenChange,
	onCreate,
	isLoading = false,
}: FolderCreateDialogProps) {
	const [name, setName] = useState("");
	const [color, setColor] = useState<FolderColor>("slate");
	const [error, setError] = useState<string | null>(null);

	const resetForm = useCallback(() => {
		setName("");
		setColor("slate");
		setError(null);
	}, []);

	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			if (!newOpen) {
				resetForm();
			}
			onOpenChange(newOpen);
		},
		[onOpenChange, resetForm],
	);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setError(null);

			// Validation
			const trimmedName = name.trim();
			if (!trimmedName) {
				setError("Folder name is required");
				return;
			}
			if (trimmedName.length > 100) {
				setError("Folder name must be 100 characters or less");
				return;
			}

			try {
				await onCreate({ name: trimmedName, color });
				handleOpenChange(false);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to create folder",
				);
			}
		},
		[name, color, onCreate, handleOpenChange],
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent data-testid="folder-create-dialog">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>Create Folder</DialogTitle>
					<DialogDescription>
						Create a new folder to organize your todos.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="mt-4 space-y-4">
					{/* Name Input */}
					<div className="space-y-2">
						<Label htmlFor="folder-name">Name</Label>
						<Input
							id="folder-name"
							type="text"
							placeholder="Enter folder name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={100}
							disabled={isLoading}
							aria-invalid={!!error}
							aria-describedby={error ? "folder-name-error" : undefined}
							data-testid="folder-name-input"
						/>
						{error && (
							<p
								id="folder-name-error"
								className="text-destructive text-xs"
								role="alert"
								data-testid="folder-name-error"
							>
								{error}
							</p>
						)}
					</div>

					{/* Color Picker */}
					<fieldset className="space-y-2">
						<legend className="flex select-none items-center gap-2 text-xs leading-none">
							Color
						</legend>
						<div
							className="flex flex-wrap gap-2"
							data-testid="folder-color-picker"
						>
							{FOLDER_COLORS.map((c) => (
								<label key={c} className="relative">
									<input
										type="radio"
										name="folder-color"
										value={c}
										checked={color === c}
										onChange={() => setColor(c)}
										disabled={isLoading}
										className="peer sr-only"
										aria-label={c}
										data-testid={`folder-color-${c}`}
									/>
									<span
										className={cn(
											"block h-6 w-6 cursor-pointer rounded-full transition-all peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
											folderColorClasses[c],
											color === c
												? "ring-2 ring-ring ring-offset-2 ring-offset-background"
												: "hover:scale-110",
										)}
									/>
								</label>
							))}
						</div>
					</fieldset>

					{/* Preview */}
					<div className="space-y-2">
						<Label>Preview</Label>
						<div
							className="flex items-center gap-3 rounded-lg border border-border bg-sidebar px-3 py-2"
							data-testid="folder-preview"
						>
							<FolderIcon
								className={cn("h-4 w-4", folderColorTextClasses[color])}
							/>
							<span className="truncate font-medium text-sidebar-foreground text-sm">
								{name.trim() || "New Folder"}
							</span>
						</div>
					</div>

					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isLoading}
							data-testid="folder-create-cancel"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isLoading || !name.trim()}
							data-testid="folder-create-submit"
						>
							{isLoading ? "Creating..." : "Create Folder"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
