import type { LocalSubtask } from "@/app/api/subtask/subtask.types";

const STORAGE_KEY = "subtasks";

function isLocalSubtaskArray(data: unknown): data is LocalSubtask[] {
	if (!Array.isArray(data)) return false;
	return data.every(
		(item) =>
			typeof item === "object" &&
			item !== null &&
			typeof item.id === "string" &&
			typeof item.text === "string" &&
			typeof item.completed === "boolean" &&
			typeof item.todoId === "string" &&
			typeof item.order === "number",
	);
}

/**
 * Get all subtasks from localStorage.
 */
function getAllSubtasks(): LocalSubtask[] {
	if (typeof window === "undefined") return [];

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];

		const parsed: unknown = JSON.parse(stored);
		if (!isLocalSubtaskArray(parsed)) {
			return [];
		}
		return parsed;
	} catch {
		return [];
	}
}

/**
 * Save all subtasks to localStorage.
 */
function saveAllSubtasks(subtasks: LocalSubtask[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(subtasks));
}

/**
 * Get all subtasks for a specific todo.
 */
export function getAll(todoId: string): LocalSubtask[] {
	const allSubtasks = getAllSubtasks();
	return allSubtasks
		.filter((s) => s.todoId === todoId)
		.sort((a, b) => a.order - b.order);
}

/**
 * Get all subtasks grouped by todoId.
 * Useful for efficiently displaying subtask progress across multiple todos.
 */
export function getAllGroupedByTodoId(): Map<string, LocalSubtask[]> {
	const allSubtasks = getAllSubtasks();
	const grouped = new Map<string, LocalSubtask[]>();

	for (const subtask of allSubtasks) {
		const existing = grouped.get(subtask.todoId);
		if (existing) {
			existing.push(subtask);
		} else {
			grouped.set(subtask.todoId, [subtask]);
		}
	}

	// Sort each group by order
	for (const [todoId, subtasks] of grouped) {
		grouped.set(
			todoId,
			subtasks.sort((a, b) => a.order - b.order),
		);
	}

	return grouped;
}

/**
 * Create a new subtask for a todo.
 */
export function create(todoId: string, text: string): LocalSubtask {
	const allSubtasks = getAllSubtasks();
	const todoSubtasks = allSubtasks.filter((s) => s.todoId === todoId);
	const maxOrder = Math.max(-1, ...todoSubtasks.map((s) => s.order));

	const newSubtask: LocalSubtask = {
		id: crypto.randomUUID(),
		text,
		completed: false,
		todoId,
		order: maxOrder + 1,
	};

	allSubtasks.push(newSubtask);
	saveAllSubtasks(allSubtasks);
	return newSubtask;
}

/**
 * Update a subtask's text.
 */
export function update(id: string, text: string): LocalSubtask | null {
	const allSubtasks = getAllSubtasks();
	const subtask = allSubtasks.find((s) => s.id === id);
	if (!subtask) return null;

	subtask.text = text;
	saveAllSubtasks(allSubtasks);
	return subtask;
}

/**
 * Toggle a subtask's completion status.
 */
export function toggle(id: string, completed: boolean): LocalSubtask | null {
	const allSubtasks = getAllSubtasks();
	const subtask = allSubtasks.find((s) => s.id === id);
	if (!subtask) return null;

	subtask.completed = completed;
	saveAllSubtasks(allSubtasks);
	return subtask;
}

/**
 * Delete a subtask.
 */
export function deleteSubtask(id: string): boolean {
	const allSubtasks = getAllSubtasks();
	const index = allSubtasks.findIndex((s) => s.id === id);
	if (index === -1) return false;

	allSubtasks.splice(index, 1);
	saveAllSubtasks(allSubtasks);
	return true;
}

/**
 * Reorder a subtask within its todo.
 */
export function reorder(id: string, newOrder: number): LocalSubtask | null {
	const allSubtasks = getAllSubtasks();
	const subtaskToMove = allSubtasks.find((s) => s.id === id);
	if (!subtaskToMove) return null;

	const todoId = subtaskToMove.todoId;
	const oldOrder = subtaskToMove.order;

	// Update orders for subtasks in the same todo
	for (const subtask of allSubtasks) {
		if (subtask.todoId !== todoId) continue;

		if (subtask.id === id) {
			subtask.order = newOrder;
		} else if (newOrder > oldOrder) {
			// Moving down: decrease order of subtasks between old and new position
			if (subtask.order > oldOrder && subtask.order <= newOrder) {
				subtask.order -= 1;
			}
		} else if (newOrder < oldOrder) {
			// Moving up: increase order of subtasks between new and old position
			if (subtask.order >= newOrder && subtask.order < oldOrder) {
				subtask.order += 1;
			}
		}
	}

	saveAllSubtasks(allSubtasks);
	return subtaskToMove;
}

/**
 * Delete all subtasks for a specific todo.
 * Used when a todo is deleted.
 */
export function deleteByTodoId(todoId: string): number {
	const allSubtasks = getAllSubtasks();
	const filteredSubtasks = allSubtasks.filter((s) => s.todoId !== todoId);
	const deletedCount = allSubtasks.length - filteredSubtasks.length;

	if (deletedCount > 0) {
		saveAllSubtasks(filteredSubtasks);
	}

	return deletedCount;
}

/**
 * Clear all subtasks from localStorage.
 */
export function clearAll(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get a subtask by ID.
 */
export function getById(id: string): LocalSubtask | null {
	const allSubtasks = getAllSubtasks();
	return allSubtasks.find((s) => s.id === id) ?? null;
}
