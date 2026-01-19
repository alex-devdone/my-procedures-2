"use client";

export type {
	SyncAction,
	SyncPromptState,
	UseSyncTodosReturn,
} from "@/app/api/todo";
// Re-export from new entity-based module location
export { useSyncTodos } from "@/app/api/todo";
