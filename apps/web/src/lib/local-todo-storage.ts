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
	/** Time of day to send notification in HH:mm format (e.g., "09:00") */
	notifyAt?: string;
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

// ============================================================================
// Recurring Todo Utilities
// ============================================================================

/**
 * Check if a recurring pattern has reached its end condition
 */
export function isPatternExpired(
	pattern: RecurringPattern,
	fromDate: Date,
	completedOccurrences: number,
): boolean {
	// Check end date
	if (pattern.endDate) {
		const endDate = new Date(pattern.endDate);
		if (fromDate > endDate) {
			return true;
		}
	}

	// Check max occurrences
	if (pattern.occurrences !== undefined) {
		if (completedOccurrences >= pattern.occurrences) {
			return true;
		}
	}

	return false;
}

/**
 * Get the next occurrence date for a daily pattern
 */
function getNextDailyOccurrence(fromDate: Date, interval: number): Date {
	const next = new Date(fromDate);
	next.setDate(next.getDate() + interval);
	return next;
}

/**
 * Get the next occurrence date for a weekly pattern
 */
function getNextWeeklyOccurrence(
	fromDate: Date,
	interval: number,
	daysOfWeek?: number[],
): Date {
	const next = new Date(fromDate);

	if (daysOfWeek && daysOfWeek.length > 0) {
		const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
		const currentDay = fromDate.getDay();

		let foundInCurrentWeek = false;
		for (const day of sortedDays) {
			if (day > currentDay) {
				next.setDate(next.getDate() + (day - currentDay));
				foundInCurrentWeek = true;
				break;
			}
		}

		if (!foundInCurrentWeek) {
			const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
			const additionalWeeks = (interval - 1) * 7;
			next.setDate(next.getDate() + daysUntilNextWeek + additionalWeeks);
		}
	} else {
		next.setDate(next.getDate() + interval * 7);
	}

	return next;
}

/**
 * Get the next occurrence date for a monthly pattern
 */
function getNextMonthlyOccurrence(
	fromDate: Date,
	interval: number,
	dayOfMonth?: number,
): Date {
	const next = new Date(fromDate);
	const targetDay = dayOfMonth ?? fromDate.getDate();

	next.setDate(1);
	next.setMonth(next.getMonth() + interval);

	const maxDaysInMonth = new Date(
		next.getFullYear(),
		next.getMonth() + 1,
		0,
	).getDate();
	next.setDate(Math.min(targetDay, maxDaysInMonth));

	return next;
}

/**
 * Get the next occurrence date for a yearly pattern
 */
function getNextYearlyOccurrence(
	fromDate: Date,
	interval: number,
	monthOfYear?: number,
	dayOfMonth?: number,
): Date {
	const next = new Date(fromDate);
	const targetMonth = monthOfYear ? monthOfYear - 1 : fromDate.getMonth();
	const targetDay = dayOfMonth ?? fromDate.getDate();

	next.setFullYear(next.getFullYear() + interval);
	next.setMonth(targetMonth);

	const maxDaysInMonth = new Date(
		next.getFullYear(),
		next.getMonth() + 1,
		0,
	).getDate();
	next.setDate(Math.min(targetDay, maxDaysInMonth));

	if (next <= fromDate) {
		next.setFullYear(next.getFullYear() + interval);
		const newMaxDays = new Date(
			next.getFullYear(),
			next.getMonth() + 1,
			0,
		).getDate();
		next.setDate(Math.min(targetDay, newMaxDays));
	}

	return next;
}

/**
 * Calculate the next occurrence date based on a recurring pattern
 */
export function getNextOccurrence(
	pattern: RecurringPattern,
	fromDate: Date,
	completedOccurrences = 0,
): Date | null {
	if (isPatternExpired(pattern, fromDate, completedOccurrences)) {
		return null;
	}

	const interval = pattern.interval ?? 1;
	let nextDate: Date;

	switch (pattern.type) {
		case "daily":
			nextDate = getNextDailyOccurrence(fromDate, interval);
			break;
		case "weekly":
			nextDate = getNextWeeklyOccurrence(
				fromDate,
				interval,
				pattern.daysOfWeek,
			);
			break;
		case "monthly":
			nextDate = getNextMonthlyOccurrence(
				fromDate,
				interval,
				pattern.dayOfMonth,
			);
			break;
		case "yearly":
			nextDate = getNextYearlyOccurrence(
				fromDate,
				interval,
				pattern.monthOfYear,
				pattern.dayOfMonth,
			);
			break;
		case "custom":
			nextDate = getNextWeeklyOccurrence(
				fromDate,
				interval,
				pattern.daysOfWeek,
			);
			break;
		default:
			throw new Error(
				`Unknown recurring pattern type: ${(pattern as RecurringPattern).type}`,
			);
	}

	// Final check: make sure the calculated date doesn't exceed endDate
	if (pattern.endDate) {
		const endDate = new Date(pattern.endDate);
		if (nextDate > endDate) {
			return null;
		}
	}

	return nextDate;
}

/**
 * Complete a recurring todo - marks current as complete and creates next occurrence
 */
export interface CompleteRecurringResult {
	completed: boolean;
	nextTodo: LocalTodo | null;
	message: string;
}

export function completeRecurring(
	id: string,
	completedOccurrences = 0,
): CompleteRecurringResult {
	const todos = getAll();
	const todo = todos.find((t) => t.id === id);

	if (!todo) {
		return {
			completed: false,
			nextTodo: null,
			message: "Todo not found",
		};
	}

	if (!todo.recurringPattern) {
		return {
			completed: false,
			nextTodo: null,
			message: "Todo does not have a recurring pattern",
		};
	}

	// Mark current todo as completed
	todo.completed = true;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));

	// Calculate next occurrence
	const baseDate = todo.dueDate ? new Date(todo.dueDate) : new Date();
	const nextDueDate = getNextOccurrence(
		todo.recurringPattern,
		baseDate,
		completedOccurrences + 1,
	);

	if (!nextDueDate) {
		return {
			completed: true,
			nextTodo: null,
			message: "Recurring pattern has expired",
		};
	}

	// Calculate reminder offset if reminder was set
	let nextReminderAt: string | null = null;
	if (todo.reminderAt && todo.dueDate) {
		const reminderOffset =
			new Date(todo.dueDate).getTime() - new Date(todo.reminderAt).getTime();
		nextReminderAt = new Date(
			nextDueDate.getTime() - reminderOffset,
		).toISOString();
	}

	// Create the next occurrence
	const nextTodo = create(todo.text, todo.folderId, {
		dueDate: nextDueDate.toISOString(),
		reminderAt: nextReminderAt,
		recurringPattern: todo.recurringPattern,
	});

	return {
		completed: true,
		nextTodo,
		message: "Next occurrence created",
	};
}
