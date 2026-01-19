"use client";

export type { Todo, UseTodoStorageReturn } from "@/app/api/todo";
// Re-export from new entity-based module location
export { useTodoStorage } from "@/app/api/todo";
