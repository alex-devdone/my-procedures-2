import * as localSubtaskStorage from "./local-subtask-storage";

const STORAGE_KEY = "todos";

export interface RecurringPattern {
	type: "daily" | "weekly" | "monthly" | "yearly" | "custom";
	interval?: number;
	daysOfWeek?: number[];
	dayOfMonth?: number;
	monthOfYear?: number;
	endDate?: string;
	occurrences?: number;
}

export interface LocalTodo {
	id: string;
	text: string;
	completed: boolean;
	folderId?: string | null;
	dueDate?: string | null;
	reminderAt?: string | null;
	recurringPattern?: RecurringPattern | null;
}

function isLocalTodoArray(data: unknown): data is LocalTodo[] {
	if (!Array.isArray(data)) return false;
	return data.every(
		(item) =>
			typeof item === "object" &&
			item !== null &&
			typeof item.id === "string" &&
			typeof item.text === "string" &&
			typeof item.completed === "boolean" &&
			(item.folderId === undefined ||
				item.folderId === null ||
				typeof item.folderId === "string") &&
			(item.dueDate === undefined ||
				item.dueDate === null ||
				typeof item.dueDate === "string") &&
			(item.reminderAt === undefined ||
				item.reminderAt === null ||
				typeof item.reminderAt === "string") &&
			(item.recurringPattern === undefined ||
				item.recurringPattern === null ||
				typeof item.recurringPattern === "object"),
	);
}

export function getAll(): LocalTodo[] {
	if (typeof window === "undefined") return [];

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];

		const parsed: unknown = JSON.parse(stored);
		if (!isLocalTodoArray(parsed)) {
			return [];
		}
		return parsed;
	} catch {
		return [];
	}
}

export function create(
	text: string,
	folderId?: string | null,
	scheduling?: {
		dueDate?: string | null;
		reminderAt?: string | null;
		recurringPattern?: RecurringPattern | null;
	},
): LocalTodo {
	const todos = getAll();
	const newTodo: LocalTodo = {
		id: crypto.randomUUID(),
		text,
		completed: false,
		folderId: folderId ?? null,
		dueDate: scheduling?.dueDate ?? null,
		reminderAt: scheduling?.reminderAt ?? null,
		recurringPattern: scheduling?.recurringPattern ?? null,
	};
	todos.push(newTodo);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
	return newTodo;
}

export function toggle(id: string): LocalTodo | null {
	const todos = getAll();
	const todo = todos.find((t) => t.id === id);
	if (!todo) return null;

	todo.completed = !todo.completed;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
	return todo;
}

export function deleteTodo(id: string): boolean {
	const todos = getAll();
	const index = todos.findIndex((t) => t.id === id);
	if (index === -1) return false;

	todos.splice(index, 1);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));

	// Delete associated subtasks
	localSubtaskStorage.deleteByTodoId(id);

	return true;
}

export function updateFolder(
	id: string,
	folderId: string | null,
): LocalTodo | null {
	const todos = getAll();
	const todo = todos.find((t) => t.id === id);
	if (!todo) return null;

	todo.folderId = folderId;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
	return todo;
}

export function updateSchedule(
	id: string,
	scheduling: {
		dueDate?: string | null;
		reminderAt?: string | null;
		recurringPattern?: RecurringPattern | null;
	},
): LocalTodo | null {
	const todos = getAll();
	const todo = todos.find((t) => t.id === id);
	if (!todo) return null;

	if (scheduling.dueDate !== undefined) {
		todo.dueDate = scheduling.dueDate;
	}
	if (scheduling.reminderAt !== undefined) {
		todo.reminderAt = scheduling.reminderAt;
	}
	if (scheduling.recurringPattern !== undefined) {
		todo.recurringPattern = scheduling.recurringPattern;
	}

	localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
	return todo;
}

export function clearAll(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(STORAGE_KEY);
}

/**
 * Clears the folderId of all todos that belong to a specific folder.
 * Used when a folder is deleted to move its todos to Inbox.
 */
export function clearFolderFromTodos(folderId: string): number {
	const todos = getAll();
	let updatedCount = 0;

	for (const todo of todos) {
		if (todo.folderId === folderId) {
			todo.folderId = null;
			updatedCount++;
		}
	}

	if (updatedCount > 0) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
	}

	return updatedCount;
}
