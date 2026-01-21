"use client";

import { Cloud, FolderSync, HardDrive, ListChecks, Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import type { SyncAction } from "@/app/api/todo";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface SyncDialogProps {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback when the dialog's open state changes */
	onOpenChange: (open: boolean) => void;
	/** Number of local todos to sync */
	localTodosCount: number;
	/** Number of remote todos already on server */
	remoteTodosCount: number;
	/** Number of local folders to sync */
	localFoldersCount: number;
	/** Number of remote folders already on server */
	remoteFoldersCount: number;
	/** Number of local subtasks to sync */
	localSubtasksCount: number;
	/** Callback when user selects a sync action */
	onSyncAction: (action: SyncAction) => Promise<void>;
	/** Whether a sync operation is in progress */
	isSyncing?: boolean;
}

/**
 * Dialog for handling local data sync after login.
 *
 * Features:
 * - Shows count of local todos, folders, and subtasks
 * - Shows count of existing remote items
 * - Three sync actions: Sync, Discard, Keep Both
 * - Loading state during sync operation
 */
export function SyncDialog({
	open,
	onOpenChange,
	localTodosCount,
	remoteTodosCount,
	localFoldersCount,
	remoteFoldersCount,
	localSubtasksCount,
	onSyncAction,
	isSyncing = false,
}: SyncDialogProps) {
	const handleAction = useCallback(
		async (action: SyncAction) => {
			await onSyncAction(action);
			onOpenChange(false);
		},
		[onSyncAction, onOpenChange],
	);

	const totalLocalItems = useMemo(
		() => localTodosCount + localFoldersCount + localSubtasksCount,
		[localTodosCount, localFoldersCount, localSubtasksCount],
	);

	const totalRemoteItems = useMemo(
		() => remoteTodosCount + remoteFoldersCount,
		[remoteTodosCount, remoteFoldersCount],
	);

	const hasLocalItems = totalLocalItems > 0;
	const hasRemoteItems = totalRemoteItems > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-testid="sync-dialog">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FolderSync className="h-5 w-5 text-accent" />
						Sync Local Data
					</DialogTitle>
					<DialogDescription>
						You have local data that can be synced to your account.
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4 space-y-4">
					{/* Local Items Summary */}
					<div
						className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
						data-testid="sync-local-summary"
					>
						<div className="mb-3 flex items-center gap-2">
							<HardDrive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
							<span className="font-medium text-amber-600 text-sm dark:text-amber-400">
								Local Data
							</span>
						</div>
						<div className="space-y-2 text-sm">
							{localTodosCount > 0 && (
								<div
									className="flex items-center gap-2 text-muted-foreground"
									data-testid="sync-local-todos-count"
								>
									<ListChecks className="h-3.5 w-3.5" />
									<span>
										{localTodosCount} todo{localTodosCount !== 1 ? "s" : ""}
									</span>
								</div>
							)}
							{localFoldersCount > 0 && (
								<div
									className="flex items-center gap-2 text-muted-foreground"
									data-testid="sync-local-folders-count"
								>
									<FolderSync className="h-3.5 w-3.5" />
									<span>
										{localFoldersCount} folder
										{localFoldersCount !== 1 ? "s" : ""}
									</span>
								</div>
							)}
							{localSubtasksCount > 0 && (
								<div
									className="flex items-center gap-2 text-muted-foreground"
									data-testid="sync-local-subtasks-count"
								>
									<ListChecks className="h-3.5 w-3.5" />
									<span>
										{localSubtasksCount} subtask
										{localSubtasksCount !== 1 ? "s" : ""}
									</span>
								</div>
							)}
							{!hasLocalItems && (
								<div className="text-muted-foreground">No local data</div>
							)}
						</div>
					</div>

					{/* Remote Items Summary */}
					{hasRemoteItems && (
						<div
							className="rounded-lg border border-green-500/20 bg-green-500/5 p-4"
							data-testid="sync-remote-summary"
						>
							<div className="mb-3 flex items-center gap-2">
								<Cloud className="h-4 w-4 text-green-600 dark:text-green-400" />
								<span className="font-medium text-green-600 text-sm dark:text-green-400">
									Cloud Data
								</span>
							</div>
							<div className="space-y-2 text-sm">
								{remoteTodosCount > 0 && (
									<div
										className="flex items-center gap-2 text-muted-foreground"
										data-testid="sync-remote-todos-count"
									>
										<ListChecks className="h-3.5 w-3.5" />
										<span>
											{remoteTodosCount} todo{remoteTodosCount !== 1 ? "s" : ""}
										</span>
									</div>
								)}
								{remoteFoldersCount > 0 && (
									<div
										className="flex items-center gap-2 text-muted-foreground"
										data-testid="sync-remote-folders-count"
									>
										<FolderSync className="h-3.5 w-3.5" />
										<span>
											{remoteFoldersCount} folder
											{remoteFoldersCount !== 1 ? "s" : ""}
										</span>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				<DialogFooter className="mt-6 flex-col gap-2 sm:flex-row">
					{/* Discard Action */}
					<Button
						type="button"
						variant="outline"
						onClick={() => handleAction("discard")}
						disabled={isSyncing}
						className="w-full sm:w-auto"
						data-testid="sync-discard-button"
					>
						<Trash2 className="mr-2 h-4 w-4" />
						Discard
					</Button>

					{/* Keep Both Action (only show if there are remote items) */}
					{hasRemoteItems && (
						<Button
							type="button"
							variant="secondary"
							onClick={() => handleAction("keep_both")}
							disabled={isSyncing}
							className="w-full sm:w-auto"
							data-testid="sync-keep-both-button"
						>
							<Cloud className="mr-2 h-4 w-4" />
							Keep Both
						</Button>
					)}

					{/* Sync Action */}
					<Button
						type="button"
						onClick={() => handleAction("sync")}
						disabled={isSyncing || !hasLocalItems}
						className={cn("w-full sm:w-auto", !hasRemoteItems && "sm:ml-auto")}
						data-testid="sync-upload-button"
					>
						{isSyncing ? (
							<>
								<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
								Syncing...
							</>
						) : (
							<>
								<Cloud className="mr-2 h-4 w-4" />
								Sync to Cloud
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
