"use client";

import {
	CheckCircle2,
	Circle,
	Loader2,
	RefreshCw,
	Settings2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	useCreateGoogleTaskList,
	useGoogleTaskLists,
	useGoogleTasksStatus,
	useUpdateGoogleTasksSettings,
} from "@/app/api/google-tasks";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface GoogleTasksConfigModalProps {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback when the dialog's open state changes */
	onOpenChange: (open: boolean) => void;
}

/**
 * Modal for configuring Google Tasks integration settings.
 *
 * Features:
 * - View current integration status
 * - Enable/disable sync
 * - Select default task list
 * - Create new task lists
 * - Refresh task lists
 */
export function GoogleTasksConfigModal({
	open,
	onOpenChange,
}: GoogleTasksConfigModalProps) {
	const {
		status,
		isLoading: statusLoading,
		refetch: refetchStatus,
	} = useGoogleTasksStatus();
	const {
		taskLists,
		isLoading: taskListsLoading,
		refetch: refetchTaskLists,
	} = useGoogleTaskLists();
	const { updateSettings, isPending: updatePending } =
		useUpdateGoogleTasksSettings();
	const { createTaskList, isPending: createPending } =
		useCreateGoogleTaskList();

	const [syncEnabled, setSyncEnabled] = useState(status?.syncEnabled ?? false);
	const [selectedListId, setSelectedListId] = useState<string | null>(
		status?.defaultListId ?? null,
	);
	const [newListName, setNewListName] = useState("");
	const [showNewListInput, setShowNewListInput] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const isLoading = statusLoading || taskListsLoading;
	const isPending = updatePending || createPending;

	// Update local state when status changes
	const handleStatusChange = useCallback(() => {
		if (status) {
			setSyncEnabled(status.syncEnabled);
			setSelectedListId(status.defaultListId);
		}
	}, [status]);

	// Handle refresh of task lists
	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refetchTaskLists();
		} finally {
			setIsRefreshing(false);
		}
	}, [refetchTaskLists]);

	// Handle creating a new task list
	const handleCreateList = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			const trimmedName = newListName.trim();
			if (!trimmedName) return;

			try {
				const newList = await createTaskList({ name: trimmedName });
				setSelectedListId(newList.id);
				setNewListName("");
				setShowNewListInput(false);
				await refetchTaskLists();
			} catch {
				// Error handling is managed by the hook
			}
		},
		[createTaskList, refetchTaskLists, newListName.trim],
	);

	// Handle saving settings
	const handleSave = useCallback(
		async (closeAfterSave = true) => {
			try {
				await updateSettings({
					syncEnabled,
					defaultListId: selectedListId,
				});
				await refetchStatus();
				if (closeAfterSave) {
					onOpenChange(false);
				}
			} catch {
				// Error handling is managed by the hook
			}
		},
		[syncEnabled, selectedListId, updateSettings, refetchStatus, onOpenChange],
	);

	// Handle dialog close
	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			if (!newOpen) {
				// Reset local state
				handleStatusChange();
				setNewListName("");
				setShowNewListInput(false);
			}
			onOpenChange(newOpen);
		},
		[handleStatusChange, onOpenChange],
	);

	// Computed values
	const hasChanges = useMemo(() => {
		if (!status) return false;
		return (
			syncEnabled !== status.syncEnabled ||
			selectedListId !== status.defaultListId
		);
	}, [status, syncEnabled, selectedListId]);

	const canCreateList =
		newListName.trim().length > 0 && newListName.length <= 100;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent data-testid="google-tasks-config-modal">
				<DialogClose />
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Settings2 className="h-5 w-5 text-accent" />
						Google Tasks Settings
					</DialogTitle>
					<DialogDescription>
						Configure your Google Tasks integration settings.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : status?.linked ? (
					<div className="mt-4 space-y-6">
						{/* Sync Toggle */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="sync-toggle">Auto Sync</Label>
								<p className="text-muted-foreground text-xs">
									Automatically sync changes with Google Tasks
								</p>
							</div>
							<button
								id="sync-toggle"
								type="button"
								role="switch"
								aria-checked={syncEnabled}
								onClick={() => setSyncEnabled(!syncEnabled)}
								disabled={isPending}
								className={cn(
									"relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
									syncEnabled ? "bg-primary" : "bg-input",
								)}
								data-testid="sync-toggle"
							>
								<span
									className={cn(
										"inline-block h-5 w-5 transform rounded-none bg-background shadow ring-0 transition duration-200 ease-in-out",
										syncEnabled ? "translate-x-5" : "translate-x-0",
									)}
								/>
							</button>
						</div>

						{/* Last Synced Info */}
						{status.lastSyncedAt && (
							<div className="rounded-lg border border-border bg-muted/50 p-3">
								<p className="text-muted-foreground text-xs">
									Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
								</p>
							</div>
						)}

						{/* Default Task List Selection */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>Default Task List</Label>
								<Button
									type="button"
									variant="ghost"
									size="xs"
									onClick={handleRefresh}
									disabled={isRefreshing || isPending}
									data-testid="refresh-lists-button"
								>
									<RefreshCw
										className={cn(
											"mr-1 h-3 w-3",
											isRefreshing && "animate-spin",
										)}
									/>
									Refresh
								</Button>
							</div>

							{taskLists && taskLists.length > 0 ? (
								<div className="space-y-1" data-testid="task-lists">
									{taskLists.map((list) => (
										<button
											key={list.id}
											type="button"
											onClick={() => setSelectedListId(list.id)}
											disabled={isPending}
											className={cn(
												"flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50",
												selectedListId === list.id &&
													"border-primary bg-primary/5",
											)}
											data-testid={`task-list-${list.id}`}
										>
											{selectedListId === list.id ? (
												<CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />
											) : (
												<Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
											)}
											<span className="truncate font-medium text-sm">
												{list.title}
											</span>
										</button>
									))}

									{/* Create New List Option */}
									{showNewListInput ? (
										<form
											onSubmit={handleCreateList}
											className="flex gap-2"
											data-testid="new-list-form"
										>
											<input
												type="text"
												value={newListName}
												onChange={(e) => setNewListName(e.target.value)}
												placeholder="New list name..."
												maxLength={100}
												disabled={isPending}
												className="h-8 flex-1 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
												autoFocus
												data-testid="new-list-input"
											/>
											<Button
												type="submit"
												size="sm"
												disabled={!canCreateList || isPending}
												data-testid="create-list-button"
											>
												Add
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => {
													setShowNewListInput(false);
													setNewListName("");
												}}
												disabled={isPending}
											>
												Cancel
											</Button>
										</form>
									) : (
										<button
											type="button"
											onClick={() => setShowNewListInput(true)}
											disabled={isPending}
											className="flex w-full items-center gap-3 rounded-lg border border-border border-dashed bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
											data-testid="create-new-list-button"
										>
											<Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
											<span className="text-muted-foreground text-sm">
												+ Create new list
											</span>
										</button>
									)}
								</div>
							) : (
								<div className="space-y-2">
									<div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
										<p className="text-muted-foreground text-sm">
											No task lists found
										</p>
									</div>
									{/* Show create button even when no lists exist */}
									{showNewListInput ? (
										<form
											onSubmit={handleCreateList}
											className="flex gap-2"
											data-testid="new-list-form"
										>
											<input
												type="text"
												value={newListName}
												onChange={(e) => setNewListName(e.target.value)}
												placeholder="New list name..."
												maxLength={100}
												disabled={isPending}
												className="h-8 flex-1 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
												autoFocus
												data-testid="new-list-input"
											/>
											<Button
												type="submit"
												size="sm"
												disabled={!canCreateList || isPending}
												data-testid="create-list-button"
											>
												Add
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => {
													setShowNewListInput(false);
													setNewListName("");
												}}
												disabled={isPending}
											>
												Cancel
											</Button>
										</form>
									) : (
										<button
											type="button"
											onClick={() => setShowNewListInput(true)}
											disabled={isPending}
											className="flex w-full items-center justify-center gap-3 rounded-lg border border-border border-dashed bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
											data-testid="create-new-list-button"
										>
											<Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
											<span className="text-muted-foreground text-sm">
												+ Create new list
											</span>
										</button>
									)}
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="py-8 text-center">
						<p className="text-muted-foreground text-sm">
							Google Tasks is not linked. Please link your account first.
						</p>
					</div>
				)}

				<DialogFooter className="mt-6">
					<Button
						type="button"
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isPending}
						data-testid="cancel-button"
					>
						Cancel
					</Button>
					{status?.linked && (
						<Button
							type="button"
							onClick={() => handleSave(true)}
							disabled={isPending || !hasChanges}
							data-testid="save-button"
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								"Save Changes"
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
