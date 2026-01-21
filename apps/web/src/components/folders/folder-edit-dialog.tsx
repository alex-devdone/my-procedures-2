"use client";

import { FolderIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	FOLDER_COLORS,
	type Folder,
	type FolderColor,
	type LocalUpdateFolderInput,
	type UpdateFolderInput,
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

export interface FolderEditDialogProps {
	/** The folder to edit */
	folder: Folder | null;
	/** Whether the dialog is open */
	open: boolean;
	/** Callback when the dialog's open state changes */
	onOpenChange: (open: boolean) => void;
	/** Callback when the folder is updated */
	onUpdate: (
		input: LocalUpdateFolderInput | UpdateFolderInput,
	) => Promise<void>;
	/** Callback when the folder is deleted */
	onDelete: (id: number | string) => Promise<void>;
	/** Whether the update operation is loading */
	isUpdating?: boolean;
	/** Whether the delete operation is loading */
	isDeleting?: boolean;
}

/**
 * Dialog for editing or deleting an existing folder.
 *
 * Features:
 * - Name input with validation (required, max 100 chars)
 * - Color picker with visual preview
 * - Live preview of folder appearance
 * - Delete confirmation
 * - Form validation with error messages
 * - Loading states during update/delete
 */
export function FolderEditDialog({
	folder,
	open,
	onOpenChange,
	onUpdate,
	onDelete,
	isUpdating = false,
	isDeleting = false,
}: FolderEditDialogProps) {
	const [name, setName] = useState("");
	const [color, setColor] = useState<FolderColor>("slate");
	const [error, setError] = useState<string | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const isLoading = isUpdating || isDeleting;

	// Initialize form state when folder changes or dialog opens
	useEffect(() => {
		if (folder && open) {
			setName(folder.name);
			setColor(folder.color);
			setError(null);
			setShowDeleteConfirm(false);
		}
	}, [folder, open]);

	const resetForm = useCallback(() => {
		if (folder) {
			setName(folder.name);
			setColor(folder.color);
		}
		setError(null);
		setShowDeleteConfirm(false);
	}, [folder]);

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
			if (!folder) return;

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

			// Check if anything changed
			const nameChanged = trimmedName !== folder.name;
			const colorChanged = color !== folder.color;

			if (!nameChanged && !colorChanged) {
				// Nothing to update
				handleOpenChange(false);
				return;
			}

			try {
				const updateInput =
					typeof folder.id === "number"
						? ({ id: folder.id, name: trimmedName, color } as UpdateFolderInput)
						: ({
								id: folder.id,
								name: trimmedName,
								color,
							} as LocalUpdateFolderInput);

				await onUpdate(updateInput);
				handleOpenChange(false);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to update folder",
				);
			}
		},
		[folder, name, color, onUpdate, handleOpenChange],
	);

	const handleDelete = useCallback(async () => {
		if (!folder) return;

		try {
			await onDelete(folder.id);
			handleOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete folder");
			setShowDeleteConfirm(false);
		}
	}, [folder, onDelete, handleOpenChange]);

	const handleDeleteClick = useCallback(() => {
		setShowDeleteConfirm(true);
	}, []);

	const handleCancelDelete = useCallback(() => {
		setShowDeleteConfirm(false);
	}, []);

	if (!folder) return null;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent data-testid="folder-edit-dialog">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>Edit Folder</DialogTitle>
					<DialogDescription>
						Update the folder name and color, or delete the folder.
					</DialogDescription>
				</DialogHeader>

				{showDeleteConfirm ? (
					<div className="mt-4 space-y-4" data-testid="delete-confirmation">
						<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
							<p className="font-medium text-destructive text-sm">
								Delete "{folder.name}"?
							</p>
							<p className="mt-1 text-muted-foreground text-xs">
								This will move all todos in this folder to Inbox. This action
								cannot be undone.
							</p>
						</div>

						{error && (
							<p
								className="text-destructive text-xs"
								role="alert"
								data-testid="folder-delete-error"
							>
								{error}
							</p>
						)}

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={handleCancelDelete}
								disabled={isDeleting}
								data-testid="folder-delete-cancel"
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={handleDelete}
								disabled={isDeleting}
								data-testid="folder-delete-confirm"
							>
								{isDeleting ? "Deleting..." : "Delete Folder"}
							</Button>
						</DialogFooter>
					</div>
				) : (
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
									{name.trim() || "Unnamed Folder"}
								</span>
							</div>
						</div>

						<DialogFooter className="mt-6">
							<Button
								type="button"
								variant="ghost"
								onClick={handleDeleteClick}
								disabled={isLoading}
								className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
								data-testid="folder-delete-button"
							>
								<Trash2Icon className="mr-2 h-4 w-4" />
								Delete
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={isLoading}
								data-testid="folder-edit-cancel"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isLoading || !name.trim()}
								data-testid="folder-edit-submit"
							>
								{isUpdating ? "Saving..." : "Save Changes"}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
