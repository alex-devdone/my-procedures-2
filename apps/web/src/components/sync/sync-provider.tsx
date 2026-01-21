"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFolderStorage, useSyncFolders } from "@/app/api/folder";
import { useSyncSubtasks } from "@/app/api/subtask";
import type { SyncAction } from "@/app/api/todo";
import { useSyncTodos, useTodoStorage } from "@/app/api/todo";
import { useSession } from "@/lib/auth-client";
import * as localFolderStorage from "@/lib/local-folder-storage";
import * as localSubtaskStorage from "@/lib/local-subtask-storage";
import * as localTodoStorage from "@/lib/local-todo-storage";
import { SyncDialog } from "./sync-dialog";

export interface SyncProviderProps {
	children: React.ReactNode;
}

/**
 * Provider component that manages the local data sync process when a user logs in.
 *
 * Combines:
 * - useSyncTodos: Syncs local todos to server
 * - useSyncFolders: Syncs local folders to server
 * - useSyncSubtasks: Syncs local subtasks to server (requires todoId mapping)
 *
 * Shows a unified sync dialog when local data is detected after login.
 */
export function SyncProvider({ children }: SyncProviderProps) {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;
	const previousAuthState = useRef<boolean | null>(null);
	const [isSyncing, setIsSyncing] = useState(false);

	// Track local counts for the dialog
	const [localCounts, setLocalCounts] = useState({
		todos: 0,
		folders: 0,
		subtasks: 0,
	});
	const [remoteCounts, setRemoteCounts] = useState({
		todos: 0,
		folders: 0,
	});
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	// Get the sync hooks for handling the actual sync operations
	const { handleSyncAction: handleTodoSyncAction } = useSyncTodos();
	const { handleSyncAction: handleFolderSyncAction } = useSyncFolders();
	const { handleSyncAction: handleSubtaskSyncAction } = useSyncSubtasks();

	// Get remote data counts
	const { todos: remoteTodos } = useTodoStorage();
	const { folders: remoteFolders } = useFolderStorage();

	// Check for local data and show dialog
	const checkForLocalData = useCallback(() => {
		const localTodos = localTodoStorage.getAll();
		const localFolders = localFolderStorage.getAll();
		const allSubtasks = localSubtaskStorage.getAllGroupedByTodoId();

		let subtaskCount = 0;
		for (const subtasks of allSubtasks.values()) {
			subtaskCount += subtasks.length;
		}

		const hasLocalData =
			localTodos.length > 0 || localFolders.length > 0 || subtaskCount > 0;

		if (hasLocalData) {
			setLocalCounts({
				todos: localTodos.length,
				folders: localFolders.length,
				subtasks: subtaskCount,
			});
			setIsDialogOpen(true);
		}
	}, []);

	// Update remote counts when they change
	useEffect(() => {
		if (isAuthenticated) {
			setRemoteCounts({
				todos: remoteTodos.length,
				folders: remoteFolders.length,
			});
		}
	}, [isAuthenticated, remoteTodos.length, remoteFolders.length]);

	// Detect login transition
	useEffect(() => {
		if (isSessionPending) return;

		const wasAuthenticated = previousAuthState.current;
		const isNowAuthenticated = isAuthenticated;

		// Store current state for next comparison
		previousAuthState.current = isNowAuthenticated;

		// Only trigger on login transition (was not authenticated, now is)
		if (wasAuthenticated === false && isNowAuthenticated === true) {
			// Small delay to allow remote data to load
			const timer = setTimeout(() => {
				checkForLocalData();
			}, 500);
			return () => clearTimeout(timer);
		}
	}, [isAuthenticated, isSessionPending, checkForLocalData]);

	// Handle sync action from dialog
	const handleSyncAction = useCallback(
		async (action: SyncAction) => {
			setIsSyncing(true);

			try {
				// The sync process is complex because subtasks depend on todos:
				// 1. First sync todos to get the todoId mapping
				// 2. Then sync folders (independent)
				// 3. Then sync subtasks with the todoId mapping

				// For now, use a simplified approach:
				// - "discard" clears everything
				// - "sync" and "keep_both" sync todos and folders, but subtasks are discarded
				//   (since we can't easily get the todoId mapping in the current architecture)

				// Sync todos
				await handleTodoSyncAction(action);

				// Sync folders
				await handleFolderSyncAction(action);

				// For subtasks, we discard since we don't have todoId mapping
				// In a production app, the bulk create would return the mapping
				await handleSubtaskSyncAction("discard");

				setIsDialogOpen(false);
			} finally {
				setIsSyncing(false);
			}
		},
		[handleTodoSyncAction, handleFolderSyncAction, handleSubtaskSyncAction],
	);

	return (
		<>
			{children}
			<SyncDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				localTodosCount={localCounts.todos}
				remoteTodosCount={remoteCounts.todos}
				localFoldersCount={localCounts.folders}
				remoteFoldersCount={remoteCounts.folders}
				localSubtasksCount={localCounts.subtasks}
				onSyncAction={handleSyncAction}
				isSyncing={isSyncing}
			/>
		</>
	);
}
