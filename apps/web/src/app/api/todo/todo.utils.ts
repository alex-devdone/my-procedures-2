import type { LocalTodo, RemoteTodo, Todo } from "./todo.types";

// ============================================================================
// Filter Types
// ============================================================================

export type FilterType = "all" | "active" | "completed";

// ============================================================================
// Todo Statistics (Pure Functions)
// ============================================================================

export interface TodoStats {
	total: number;
	completed: number;
	active: number;
	completionRate: number;
}

/**
 * Calculates statistics for a list of todos. Pure function.
 */
export function calculateTodoStats(todos: Todo[]): TodoStats {
	const total = todos.length;
	const completed = todos.filter((t) => t.completed).length;
	const active = total - completed;
	const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

	return { total, completed, active, completionRate };
}

// ============================================================================
// Filtering & Sorting (Pure Functions)
// ============================================================================

/**
 * Filters todos by completion status. Pure function.
 */
export function filterTodosByStatus(todos: Todo[], filter: FilterType): Todo[] {
	if (filter === "all") return todos;
	if (filter === "active") return todos.filter((t) => !t.completed);
	if (filter === "completed") return todos.filter((t) => t.completed);
	return todos;
}

/**
 * Filters todos by search query (case-insensitive). Pure function.
 */
export function filterTodosBySearch(todos: Todo[], query: string): Todo[] {
	if (!query.trim()) return todos;
	const normalizedQuery = query.toLowerCase();
	return todos.filter((t) => t.text.toLowerCase().includes(normalizedQuery));
}

/**
 * Combines status and search filtering. Pure function.
 */
export function filterTodos(
	todos: Todo[],
	filter: FilterType,
	searchQuery: string,
): Todo[] {
	const byStatus = filterTodosByStatus(todos, filter);
	return filterTodosBySearch(byStatus, searchQuery);
}

/**
 * Gets the N most recent todos. Pure function.
 */
export function getRecentTodos(todos: Todo[], count: number): Todo[] {
	return todos.slice(0, count);
}

// ============================================================================
// Todo Normalization (Pure Functions)
// ============================================================================

/**
 * Normalizes a remote todo to the unified Todo type. Pure function.
 */
export function normalizeRemoteTodo(todo: RemoteTodo): Todo {
	return {
		id: todo.id,
		text: todo.text,
		completed: todo.completed,
	};
}

/**
 * Normalizes remote todos to the unified Todo type. Pure function.
 */
export function normalizeRemoteTodos(todos: RemoteTodo[]): Todo[] {
	return todos.map(normalizeRemoteTodo);
}

/**
 * Normalizes a local todo to the unified Todo type. Pure function.
 */
export function normalizeLocalTodo(todo: LocalTodo): Todo {
	return {
		id: todo.id,
		text: todo.text,
		completed: todo.completed,
	};
}

/**
 * Normalizes local todos to the unified Todo type. Pure function.
 */
export function normalizeLocalTodos(todos: LocalTodo[]): Todo[] {
	return todos.map(normalizeLocalTodo);
}

// ============================================================================
// Local Storage Sync Logic (Pure Functions)
// ============================================================================

/**
 * Prepares local todos for bulk sync to server. Pure function.
 */
export function prepareTodosForSync(
	localTodos: LocalTodo[],
): Array<{ text: string; completed: boolean }> {
	return localTodos.map((t) => ({
		text: t.text,
		completed: t.completed,
	}));
}

/**
 * Checks if there are local todos that need syncing. Pure function.
 */
export function hasLocalTodosToSync(localTodos: LocalTodo[]): boolean {
	return localTodos.length > 0;
}

// ============================================================================
// Optimistic Update Helpers (Pure Functions)
// ============================================================================

/**
 * Creates an optimistic todo for immediate UI update. Pure function.
 */
export function createOptimisticTodo(text: string, userId: string): RemoteTodo {
	return {
		id: -Date.now(), // Negative ID to distinguish from server IDs
		text,
		completed: false,
		userId,
		folderId: null,
		dueDate: null,
		reminderAt: null,
	};
}

/**
 * Applies optimistic create to todo list. Pure function.
 */
export function applyOptimisticCreate(
	todos: RemoteTodo[],
	newTodo: RemoteTodo,
): RemoteTodo[] {
	return [...todos, newTodo];
}

/**
 * Applies optimistic toggle to todo list. Pure function.
 */
export function applyOptimisticToggle(
	todos: RemoteTodo[],
	id: number,
	completed: boolean,
): RemoteTodo[] {
	return todos.map((todo) => (todo.id === id ? { ...todo, completed } : todo));
}

/**
 * Applies optimistic delete to todo list. Pure function.
 */
export function applyOptimisticDelete(
	todos: RemoteTodo[],
	id: number,
): RemoteTodo[] {
	return todos.filter((todo) => todo.id !== id);
}

// ============================================================================
// Greeting Helper (Pure Function)
// ============================================================================

/**
 * Gets a time-based greeting. Pure function.
 */
export function getTimeBasedGreeting(hour: number): string {
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
}

/**
 * Gets a greeting for the current time. Pure function.
 */
export function getCurrentGreeting(): string {
	return getTimeBasedGreeting(new Date().getHours());
}

// ============================================================================
// Motivation Messages (Pure Function)
// ============================================================================

/**
 * Gets a motivation message based on completion rate. Pure function.
 */
export function getMotivationMessage(
	completionRate: number,
	pendingCount: number,
): string {
	if (completionRate >= 80) {
		return "Amazing progress! You're crushing it today.";
	}
	if (completionRate >= 50) {
		return "Great work! Keep the momentum going.";
	}
	if (pendingCount > 0) {
		return "Every task completed is a step forward.";
	}
	return "Ready to start? Add your first task!";
}
