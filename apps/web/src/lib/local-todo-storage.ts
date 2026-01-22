import * as localSubtaskStorage from "./local-subtask-storage";

const STORAGE_KEY = "todos";
const COMPLETION_HISTORY_KEY = "completion_history";

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

/**
 * Toggle a specific occurrence of a recurring todo by scheduled date.
 * This is used for marking past scheduled occurrences as completed or uncompleted.
 *
 * @param todoId - The ID of the recurring todo
 * @param scheduledDate - The scheduled date of the occurrence (ISO string)
 * @param completed - Whether the occurrence is completed (true) or not (false)
 * @returns The updated completion history entry if found, null otherwise
 */
export function toggleLocalOccurrence(
	todoId: string,
	scheduledDate: string,
	completed: boolean,
): CompletionHistoryEntry | null {
	return updateLocalPastCompletion(todoId, scheduledDate, completed);
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

	// Store completion record
	const scheduledDate = todo.dueDate ?? new Date().toISOString();
	addCompletionHistoryEntry({
		todoId: todo.id,
		scheduledDate,
		completedAt: new Date().toISOString(),
	});

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

// ============================================================================
// Completion History
// ============================================================================

export interface CompletionHistoryEntry {
	todoId: string;
	scheduledDate: string;
	completedAt: string | null;
}

function isCompletionHistoryArray(
	data: unknown,
): data is CompletionHistoryEntry[] {
	if (!Array.isArray(data)) return false;
	return data.every(
		(item) =>
			typeof item === "object" &&
			item !== null &&
			typeof item.todoId === "string" &&
			typeof item.scheduledDate === "string" &&
			(item.completedAt === null || typeof item.completedAt === "string"),
	);
}

export function getCompletionHistory(): CompletionHistoryEntry[] {
	if (typeof window === "undefined") return [];

	try {
		const stored = localStorage.getItem(COMPLETION_HISTORY_KEY);
		if (!stored) return [];

		const parsed: unknown = JSON.parse(stored);
		if (!isCompletionHistoryArray(parsed)) {
			return [];
		}
		return parsed;
	} catch {
		return [];
	}
}

export function addCompletionHistoryEntry(
	entry: Omit<CompletionHistoryEntry, "completedAt"> & {
		completedAt?: string | null;
	},
): CompletionHistoryEntry {
	const history = getCompletionHistory();
	const newEntry: CompletionHistoryEntry = {
		completedAt:
			entry.completedAt !== undefined
				? entry.completedAt
				: new Date().toISOString(),
		todoId: entry.todoId,
		scheduledDate: entry.scheduledDate,
	};
	history.push(newEntry);
	localStorage.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(history));
	return newEntry;
}

export function updateCompletionHistoryEntry(
	todoId: string,
	scheduledDate: string,
	updates: Partial<Pick<CompletionHistoryEntry, "completedAt">>,
): CompletionHistoryEntry | null {
	const history = getCompletionHistory();
	const entry = history.find(
		(e) => e.todoId === todoId && e.scheduledDate === scheduledDate,
	);
	if (!entry) return null;

	if (updates.completedAt !== undefined) {
		entry.completedAt = updates.completedAt;
	}

	localStorage.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(history));
	return entry;
}

export function deleteCompletionHistoryEntry(
	todoId: string,
	scheduledDate: string,
): boolean {
	const history = getCompletionHistory();
	const index = history.findIndex(
		(e) => e.todoId === todoId && e.scheduledDate === scheduledDate,
	);
	if (index === -1) return false;

	history.splice(index, 1);
	localStorage.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(history));
	return true;
}

export function deleteCompletionHistoryByTodoId(todoId: string): number {
	const history = getCompletionHistory();
	const initialLength = history.length;
	const filtered = history.filter((e) => e.todoId !== todoId);

	if (filtered.length < initialLength) {
		localStorage.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(filtered));
	}

	return initialLength - filtered.length;
}

export function clearCompletionHistory(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(COMPLETION_HISTORY_KEY);
}

/**
 * Update the completedAt timestamp for a past completion history entry.
 * This is used to mark a past scheduled occurrence as completed retroactively.
 *
 * @param todoId - The ID of the todo
 * @param scheduledDate - The scheduled date of the occurrence (ISO string)
 * @param completed - Whether the todo is completed (true) or not (false)
 * @returns The updated entry if found, null otherwise
 */
export function updateLocalPastCompletion(
	todoId: string,
	scheduledDate: string,
	completed: boolean,
): CompletionHistoryEntry | null {
	return updateCompletionHistoryEntry(todoId, scheduledDate, {
		completedAt: completed ? new Date().toISOString() : null,
	});
}

export function getLocalCompletionHistory(
	startDate: string,
	endDate: string,
): CompletionHistoryEntry[] {
	const history = getCompletionHistory();
	const start = new Date(startDate);
	const end = new Date(endDate);

	return history.filter((entry) => {
		const entryDate = new Date(entry.scheduledDate);
		return entryDate >= start && entryDate <= end;
	});
}

// ============================================================================
// Analytics
// ============================================================================

export interface DailyStats {
	date: string;
	regularCompleted: number;
	recurringCompleted: number;
	recurringMissed: number;
}

export interface LocalAnalyticsData {
	totalRegularCompleted: number;
	totalRecurringCompleted: number;
	totalRecurringMissed: number;
	completionRate: number;
	currentStreak: number;
	dailyBreakdown: DailyStats[];
}

/**
 * Get analytics for local todos within a date range.
 *
 * Calculates:
 * - Total regular (non-recurring) todos completed
 * - Total recurring occurrences completed
 * - Total recurring occurrences missed (scheduled before today with no completedAt)
 * - Completion rate % (completed / total expected * 100)
 * - Current streak (consecutive days with at least one completion)
 * - Daily breakdown (regular completed, recurring completed, recurring missed per day)
 *
 * @param startDate - Start of date range (ISO string)
 * @param endDate - End of date range (ISO string)
 * @returns Analytics data for the date range
 */
export function getLocalAnalytics(
	startDate: string,
	endDate: string,
): LocalAnalyticsData {
	const todos = getAll();
	const history = getCompletionHistory();
	const start = new Date(startDate);
	const end = new Date(endDate);

	// Get "today" at midnight for proper date comparisons
	const now = new Date();
	const today = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);

	// Get regular (non-recurring) todos completed in the date range
	const regularCompletedInDateRange = todos.filter(
		(t) =>
			!t.recurringPattern &&
			t.completed &&
			t.dueDate &&
			new Date(t.dueDate) >= start &&
			new Date(t.dueDate) <= end,
	);

	const totalRegularCompleted = regularCompletedInDateRange.length;

	// Get recurring completion stats from completion history
	const historyInDateRange = history.filter((entry) => {
		const entryDate = new Date(entry.scheduledDate);
		return entryDate >= start && entryDate <= end;
	});

	const recurringCompletedInDateRange = historyInDateRange.filter(
		(entry) => entry.completedAt !== null,
	);
	const totalRecurringCompleted = recurringCompletedInDateRange.length;

	// Get recurring missed: scheduled date before today (and within range) with no completedAt
	const recurringMissedInDateRange = historyInDateRange.filter((entry) => {
		if (entry.completedAt !== null) return false;
		// Normalize scheduledDate to midnight UTC for comparison
		const scheduledDate = new Date(entry.scheduledDate);
		const scheduledDateMidnight = new Date(
			Date.UTC(
				scheduledDate.getUTCFullYear(),
				scheduledDate.getUTCMonth(),
				scheduledDate.getUTCDate(),
			),
		);
		return scheduledDateMidnight.getTime() < today.getTime();
	});
	const totalRecurringMissed = recurringMissedInDateRange.length;

	// Total expected recurring = completed + missed
	const totalRecurringExpected = totalRecurringCompleted + totalRecurringMissed;

	// Calculate completion rate
	const totalCompleted = totalRegularCompleted + totalRecurringCompleted;
	const totalExpected = totalRegularCompleted + totalRecurringExpected;
	const completionRate =
		totalExpected > 0
			? Math.round((totalCompleted / totalExpected) * 100)
			: 100;

	// Calculate current streak (consecutive days with at least one completion)
	const allCompletionDatesSet = new Set<string>();

	// Add recurring todo completion dates
	for (const entry of history) {
		if (entry.completedAt) {
			const dateStr = new Date(entry.completedAt).toISOString().split("T")[0];
			if (dateStr) {
				allCompletionDatesSet.add(dateStr);
			}
		}
	}

	// Add regular todo completion dates (using dueDate as proxy)
	for (const todo of todos) {
		if (todo.completed && !todo.recurringPattern && todo.dueDate) {
			const dateStr = new Date(todo.dueDate).toISOString().split("T")[0];
			if (dateStr) {
				allCompletionDatesSet.add(dateStr);
			}
		}
	}

	const allCompletionDates = Array.from(allCompletionDatesSet).sort(
		(a, b) => new Date(b).getTime() - new Date(a).getTime(),
	);

	let currentStreak = 0;
	const todayStr = today.toISOString().split("T")[0] ?? "";
	// Calculate yesterday in UTC
	const yesterday = new Date(
		Date.UTC(
			today.getUTCFullYear(),
			today.getUTCMonth(),
			today.getUTCDate() - 1,
		),
	);
	const yesterdayStr = yesterday.toISOString().split("T")[0] ?? "";

	// Start checking from today or yesterday
	let checkDate = todayStr;
	if (
		allCompletionDates.length > 0 &&
		allCompletionDates[0] !== todayStr &&
		allCompletionDates[0] === yesterdayStr
	) {
		// If no completion today but there's one yesterday, start from yesterday
		checkDate = yesterdayStr;
	}

	for (const dateStr of allCompletionDates) {
		if (dateStr === checkDate) {
			currentStreak++;
			// Decrement checkDate by one day (in UTC)
			const checkDateObj = new Date(`${checkDate}T00:00:00.000Z`);
			const nextCheckDate = new Date(
				Date.UTC(
					checkDateObj.getUTCFullYear(),
					checkDateObj.getUTCMonth(),
					checkDateObj.getUTCDate() - 1,
				),
			);
			const newCheckDate = nextCheckDate.toISOString().split("T")[0];
			checkDate = newCheckDate ?? "";
		} else if (
			new Date(`${dateStr}T00:00:00.000Z`) <
			new Date(`${checkDate}T00:00:00.000Z`)
		) {
			// Gap in dates, streak broken
			break;
		}
	}

	// Build daily breakdown map
	const dailyBreakdownMap = new Map<string, DailyStats>();

	// Initialize all dates in range
	const currentDate = new Date(start);
	while (currentDate <= end) {
		const dateStr = currentDate.toISOString().split("T")[0] ?? "";
		dailyBreakdownMap.set(dateStr, {
			date: dateStr,
			regularCompleted: 0,
			recurringCompleted: 0,
			recurringMissed: 0,
		});
		currentDate.setDate(currentDate.getDate() + 1);
	}

	// Fill in regular completed counts
	for (const todo of regularCompletedInDateRange) {
		if (todo.dueDate) {
			const dateStr = new Date(todo.dueDate).toISOString().split("T")[0];
			if (dateStr) {
				const entry = dailyBreakdownMap.get(dateStr);
				if (entry) {
					entry.regularCompleted++;
				}
			}
		}
	}

	// Fill in recurring completed counts
	for (const entry of recurringCompletedInDateRange) {
		const dateStr = new Date(entry.scheduledDate).toISOString().split("T")[0];
		if (dateStr) {
			const mapEntry = dailyBreakdownMap.get(dateStr);
			if (mapEntry) {
				mapEntry.recurringCompleted++;
			}
		}
	}

	// Fill in recurring missed counts
	for (const entry of recurringMissedInDateRange) {
		const dateStr = new Date(entry.scheduledDate).toISOString().split("T")[0];
		if (dateStr) {
			const mapEntry = dailyBreakdownMap.get(dateStr);
			if (mapEntry) {
				mapEntry.recurringMissed++;
			}
		}
	}

	const dailyBreakdown = Array.from(dailyBreakdownMap.values()).sort((a, b) =>
		a.date.localeCompare(b.date),
	);

	return {
		totalRegularCompleted,
		totalRecurringCompleted,
		totalRecurringMissed,
		completionRate,
		currentStreak,
		dailyBreakdown,
	};
}
