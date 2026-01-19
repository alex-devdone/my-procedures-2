const STORAGE_KEY = "todos";

export interface LocalTodo {
	id: string;
	text: string;
	completed: boolean;
}

function isLocalTodoArray(data: unknown): data is LocalTodo[] {
	if (!Array.isArray(data)) return false;
	return data.every(
		(item) =>
			typeof item === "object" &&
			item !== null &&
			typeof item.id === "string" &&
			typeof item.text === "string" &&
			typeof item.completed === "boolean",
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

export function create(text: string): LocalTodo {
	const todos = getAll();
	const newTodo: LocalTodo = {
		id: crypto.randomUUID(),
		text,
		completed: false,
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
	return true;
}
