"use client";

import { useSyncExternalStore } from "react";
import { useSession } from "@/lib/auth-client";
import * as localSubtaskStorage from "@/lib/local-subtask-storage";
import type { SubtaskProgress } from "./subtask.types";

// ============================================================================
// Local Storage Sync for All Subtasks (for useSyncExternalStore)
// ============================================================================

// Listeners for global subtask changes
const allSubtasksListeners: Array<() => void> = [];

// Cached snapshot to prevent infinite loops in useSyncExternalStore
let cachedAllSubtasksGrouped: Map<string, SubtaskProgress> | null = null;
let cachedAllSubtasksJson: string | null = null;

// Stable empty map for server snapshot
const emptyProgressMap = new Map<string, SubtaskProgress>();

function subscribeToAllSubtasks(callback: () => void) {
	allSubtasksListeners.push(callback);
	return () => {
		const index = allSubtasksListeners.indexOf(callback);
		if (index > -1) {
			allSubtasksListeners.splice(index, 1);
		}
	};
}

/**
 * Call this to notify listeners when subtasks change.
 * This is automatically called by localStorage operations.
 */
export function notifyAllSubtasksListeners() {
	for (const listener of allSubtasksListeners) {
		listener();
	}
}

function getAllSubtasksProgressSnapshot(): Map<string, SubtaskProgress> {
	const grouped = localSubtaskStorage.getAllGroupedByTodoId();
	const progressMap = new Map<string, SubtaskProgress>();

	for (const [todoId, subtasks] of grouped) {
		progressMap.set(todoId, {
			completed: subtasks.filter((s) => s.completed).length,
			total: subtasks.length,
		});
	}

	const progressJson = JSON.stringify(Array.from(progressMap.entries()));

	// Only return a new reference if the data actually changed
	if (progressJson !== cachedAllSubtasksJson) {
		cachedAllSubtasksJson = progressJson;
		cachedAllSubtasksGrouped = progressMap;
	}

	return cachedAllSubtasksGrouped ?? emptyProgressMap;
}

function getAllSubtasksProgressServerSnapshot(): Map<string, SubtaskProgress> {
	return emptyProgressMap;
}

// ============================================================================
// useAllSubtasksProgress Hook
// ============================================================================

export interface UseAllSubtasksProgressReturn {
	/** Map of todoId -> SubtaskProgress */
	progressMap: Map<string, SubtaskProgress>;
	/** Get progress for a specific todo (returns { completed: 0, total: 0 } if no subtasks) */
	getProgress: (todoId: number | string) => SubtaskProgress;
	/** Whether data is still loading */
	isLoading: boolean;
	/** Whether user is authenticated */
	isAuthenticated: boolean;
}

/**
 * Hook to get subtask progress for all todos efficiently.
 * Works with both localStorage (guests) and remote storage (authenticated users).
 *
 * For localStorage mode, it fetches all subtasks at once and groups them by todoId.
 * For authenticated mode, it currently relies on each todo's subtask query being cached.
 *
 * @returns Object with progress map and helper functions
 */
export function useAllSubtasksProgress(): UseAllSubtasksProgressReturn {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	const localProgressMap = useSyncExternalStore(
		subscribeToAllSubtasks,
		getAllSubtasksProgressSnapshot,
		getAllSubtasksProgressServerSnapshot,
	);

	// For now, we only support local storage mode for subtask progress
	// Remote mode would require a batch query endpoint which isn't implemented yet
	const progressMap = isAuthenticated ? emptyProgressMap : localProgressMap;

	const getProgress = (todoId: number | string): SubtaskProgress => {
		const key = String(todoId);
		return progressMap.get(key) ?? { completed: 0, total: 0 };
	};

	return {
		progressMap,
		getProgress,
		isLoading: isSessionPending,
		isAuthenticated,
	};
}
