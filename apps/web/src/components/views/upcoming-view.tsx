"use client";

import { Calendar, CheckCircle2, Circle, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useCompletionHistory } from "@/app/api/analytics";
import type { FolderColor } from "@/app/api/folder";
import { useFolderStorage } from "@/app/api/folder";
import { useAllSubtasksProgress } from "@/app/api/subtask";
import type {
	RecurringPattern,
	Todo,
	VirtualTodo,
} from "@/app/api/todo/todo.types";
import { isToday, isTomorrow } from "@/components/scheduling/due-date-badge";
import { TodoExpandableItem } from "@/components/todos";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompletionRealtimeWithAuth } from "@/hooks/use-completion-realtime";
import { isDateMatchingPattern } from "@/lib/recurring-utils";
import { cn } from "@/lib/utils";

type FilterType = "all" | "active" | "completed";

/**
 * Maps folder colors to Tailwind CSS classes for badges.
 */
const folderColorBgClasses: Record<FolderColor, string> = {
	slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
	red: "bg-red-500/10 text-red-600 dark:text-red-400",
	orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
	amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	yellow: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
	lime: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
	green: "bg-green-500/10 text-green-600 dark:text-green-400",
	emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
	cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
	sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
	blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
	violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
	purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
	fuchsia: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
	pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
	rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export interface UpcomingViewProps {
	/** All todos from the todo storage */
	todos: Todo[];
	/** Whether todos are loading */
	isLoading?: boolean;
	/** Callback when a todo is toggled */
	onToggle: (
		id: number | string,
		completed: boolean,
		options?: { virtualDate?: string },
	) => void;
	/** Callback when a todo is deleted */
	onDelete: (id: number | string) => void;
	/** Callback when a todo's schedule is updated */
	onScheduleChange?: (
		id: number | string,
		schedule: {
			dueDate?: string | null;
			reminderAt?: string | null;
			recurringPattern?: RecurringPattern | null;
		},
	) => void;
	/** Additional CSS classes */
	className?: string;
}

/** A todo entry that may be a regular todo or a virtual recurring instance */
export type UpcomingTodoEntry = Todo | VirtualTodo;

/**
 * Type guard to check if a todo entry is a virtual recurring instance.
 */
export function isVirtualTodo(todo: UpcomingTodoEntry): todo is VirtualTodo {
	return "isRecurringInstance" in todo && todo.isRecurringInstance === true;
}

/**
 * Represents a group of todos for a specific date.
 */
export interface TodoDateGroup {
	/** ISO date string (YYYY-MM-DD) */
	dateKey: string;
	/** Human-readable label for the date */
	label: string;
	/** Todos due on this date (may include virtual recurring instances) */
	todos: UpcomingTodoEntry[];
}

/**
 * Checks if a date is within the next N days (including today).
 */
export function isWithinDays(date: Date | string, days: number): boolean {
	const d = typeof date === "string" ? new Date(date) : date;
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const endDate = new Date(today);
	endDate.setDate(endDate.getDate() + days);
	endDate.setHours(23, 59, 59, 999);

	const dateOnly = new Date(d);
	dateOnly.setHours(12, 0, 0, 0);

	return dateOnly >= today && dateOnly <= endDate;
}

/**
 * Returns a date key (YYYY-MM-DD) for grouping.
 */
export function getDateKey(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Formats a date as a human-readable label for the upcoming view.
 * Returns "Today", "Tomorrow", or formatted date (e.g., "Mon, Jan 15").
 */
export function formatDateLabel(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;

	if (isToday(d)) return "Today";
	if (isTomorrow(d)) return "Tomorrow";

	return d.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

/**
 * Get an array of dates for the next N days (including today).
 */
function getNextDays(days: number): Date[] {
	const dates: Date[] = [];
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	for (let i = 0; i <= days; i++) {
		const date = new Date(today);
		date.setDate(date.getDate() + i);
		dates.push(date);
	}

	return dates;
}

/**
 * Check if a recurring pattern matches any date in the next N days.
 * Returns the matching dates for the pattern.
 */
export function getRecurringMatchingDates(
	pattern: RecurringPattern,
	days: number,
): Date[] {
	const nextDays = getNextDays(days);
	return nextDays.filter((date) => isDateMatchingPattern(pattern, date));
}

/**
 * Creates a virtual todo entry for a recurring pattern on a specific date.
 * @param todo - The original recurring todo
 * @param date - The date for this virtual instance
 * @param occurrenceCompleted - Whether this specific occurrence was completed
 */
export function createVirtualTodo(
	todo: Todo,
	date: Date,
	occurrenceCompleted?: boolean,
): VirtualTodo {
	const dateKey = getDateKey(date);
	return {
		...todo,
		isRecurringInstance: true,
		virtualDate: dateKey,
		virtualKey: `${todo.id}-${dateKey}`,
		occurrenceCompleted,
	};
}

/**
 * Completion record for a recurring todo occurrence.
 * Used to track which specific dates have been completed.
 * todoId can be string (local storage) or number (remote).
 */
export interface CompletionRecord {
	todoId: string | number;
	scheduledDate: Date;
	completedAt: Date | null;
}

/**
 * Filters todos to return only those due within the next 7 days, grouped by date.
 * Generates virtual todo entries for recurring patterns on each matching date.
 * @param todos - All todos to filter
 * @param completionHistory - Optional completion history for recurring todos
 */
export function getTodosUpcoming(
	todos: Todo[],
	completionHistory?: CompletionRecord[],
): TodoDateGroup[] {
	// Create a map for quick lookup of completion status by todoId and date
	const completionMap = new Map<string, boolean>();
	if (completionHistory) {
		for (const record of completionHistory) {
			const dateKey = getDateKey(record.scheduledDate);
			const key = `${record.todoId}-${dateKey}`;
			completionMap.set(key, record.completedAt !== null);
		}
	}

	// Group by date
	const groups = new Map<
		string,
		{ label: string; todos: UpcomingTodoEntry[] }
	>();

	// Helper to add a todo entry to a specific date group
	const addTodoToGroup = (
		entry: UpcomingTodoEntry,
		date: Date | string,
		uniqueKey: string,
	) => {
		const dateKey = getDateKey(date);
		const label = formatDateLabel(date);

		if (!groups.has(dateKey)) {
			groups.set(dateKey, { label, todos: [] });
		}
		const group = groups.get(dateKey);
		if (group) {
			// Avoid adding duplicates using unique key
			const existingKeys = new Set(
				group.todos.map((t) =>
					isVirtualTodo(t) ? t.virtualKey : String(t.id),
				),
			);
			if (!existingKeys.has(uniqueKey)) {
				group.todos.push(entry);
			}
		}
	};

	for (const todo of todos) {
		// Case 1: Todo has a due date within the next 7 days
		if (todo.dueDate && isWithinDays(todo.dueDate, 7)) {
			// Non-recurring todo with dueDate - add as-is
			if (!todo.recurringPattern) {
				addTodoToGroup(todo, todo.dueDate, String(todo.id));
			} else {
				// Recurring todo with explicit dueDate
				// Create virtual entry with occurrence completion status
				const dueDateKey = getDateKey(todo.dueDate);
				const completionKey = `${todo.id}-${dueDateKey}`;
				const occurrenceCompleted = completionMap.get(completionKey);
				const virtualEntry = createVirtualTodo(
					todo,
					new Date(todo.dueDate),
					occurrenceCompleted,
				);
				addTodoToGroup(virtualEntry, todo.dueDate, virtualEntry.virtualKey);
			}
		}

		// Case 2: Todo has a recurring pattern - create virtual entries for each matching date
		if (todo.recurringPattern) {
			const matchingDates = getRecurringMatchingDates(todo.recurringPattern, 7);
			for (const date of matchingDates) {
				const dateKey = getDateKey(date);
				// If the todo also has a dueDate matching this date, skip virtual entry
				// to avoid duplication (the explicit dueDate takes precedence)
				if (todo.dueDate) {
					const dueDateKey = getDateKey(todo.dueDate);
					if (dueDateKey === dateKey) {
						continue;
					}
				}
				// Check if this occurrence was completed
				const completionKey = `${todo.id}-${dateKey}`;
				const occurrenceCompleted = completionMap.get(completionKey);
				const virtualEntry = createVirtualTodo(todo, date, occurrenceCompleted);
				addTodoToGroup(virtualEntry, date, virtualEntry.virtualKey);
			}
		}
	}

	// Convert to array and sort by date
	const result: TodoDateGroup[] = Array.from(groups.entries())
		.map(([dateKey, { label, todos }]) => ({ dateKey, label, todos }))
		.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

	return result;
}

/**
 * Flattens date groups into a flat array of todo entries.
 */
export function flattenDateGroups(
	groups: TodoDateGroup[],
): UpcomingTodoEntry[] {
	return groups.flatMap((group) => group.todos);
}

/**
 * Helper to check if a todo entry is effectively completed.
 * For virtual todos, checks occurrenceCompleted; for regular todos, checks completed.
 */
export function isEntryCompleted(entry: UpcomingTodoEntry): boolean {
	if (isVirtualTodo(entry)) {
		return entry.occurrenceCompleted === true;
	}
	return entry.completed;
}

/**
 * UpcomingView component showing todos due in the next 7 days grouped by date.
 *
 * Features:
 * - Groups todos by due date
 * - Shows "Today", "Tomorrow", or formatted date as section headers
 * - Status filter (all/active/completed)
 * - Search filter
 * - Empty state when no upcoming todos
 * - Statistics for active and completed todos
 * - Folder badges on todo items
 */
export function UpcomingView({
	todos,
	isLoading = false,
	onToggle,
	onDelete,
	onScheduleChange,
	className,
}: UpcomingViewProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [filter, setFilter] = useState<FilterType>("all");

	const { folders } = useFolderStorage();
	const { getProgress } = useAllSubtasksProgress();

	// Enable realtime sync for completion history
	// This automatically invalidates and refetches when completion records change
	useCompletionRealtimeWithAuth();

	// Calculate date range for completion history (today to 7 days from now)
	const dateRange = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const endDate = new Date(today);
		endDate.setDate(endDate.getDate() + 7);
		endDate.setHours(23, 59, 59, 999);
		return {
			startDate: today.toISOString(),
			endDate: endDate.toISOString(),
		};
	}, []);

	// Fetch completion history for recurring todos
	const { data: completionHistoryData } = useCompletionHistory(
		dateRange.startDate,
		dateRange.endDate,
	);

	// Convert completion history to the format expected by getTodosUpcoming
	const completionHistory = useMemo(() => {
		if (!completionHistoryData) return undefined;
		return completionHistoryData.map((record) => ({
			todoId: record.todoId,
			scheduledDate: new Date(record.scheduledDate),
			completedAt: record.completedAt ? new Date(record.completedAt) : null,
		}));
	}, [completionHistoryData]);

	// Get todos grouped by date
	const dateGroups = useMemo(() => {
		return getTodosUpcoming(todos, completionHistory);
	}, [todos, completionHistory]);

	// Flatten all upcoming todos for filtering
	const allUpcomingTodos = useMemo(() => {
		return flattenDateGroups(dateGroups);
	}, [dateGroups]);

	// Apply status and search filters to groups, then sort todos within each group
	const filteredGroups = useMemo(() => {
		const getTime = (todo: UpcomingTodoEntry): number | null => {
			// Check recurring pattern notifyAt first (e.g., "09:00", "21:00")
			if (todo.recurringPattern?.notifyAt) {
				const [hours, minutes] = todo.recurringPattern.notifyAt
					.split(":")
					.map(Number);
				return hours * 60 + minutes;
			}
			// Check reminderAt (it has explicit time)
			if (todo.reminderAt) {
				const date = new Date(todo.reminderAt);
				return date.getHours() * 60 + date.getMinutes();
			}
			// Check if dueDate has a time component (not midnight)
			if (todo.dueDate) {
				const date = new Date(todo.dueDate);
				const minutes = date.getHours() * 60 + date.getMinutes();
				// If it's not midnight (00:00), consider it has a time
				if (minutes > 0) {
					return minutes;
				}
			}
			return null;
		};

		return dateGroups
			.map((group) => {
				const filtered = group.todos.filter((todo) => {
					const isCompleted = isEntryCompleted(todo);
					const matchesFilter =
						filter === "all" ||
						(filter === "active" && !isCompleted) ||
						(filter === "completed" && isCompleted);

					const matchesSearch =
						!searchQuery ||
						todo.text.toLowerCase().includes(searchQuery.toLowerCase());

					return matchesFilter && matchesSearch;
				});

				// Sort all todos by time descending (no separation by completion status)
				const sorted = [...filtered].sort((a, b) => {
					const aTime = getTime(a);
					const bTime = getTime(b);

					// Both have time: sort by time descending (latest first)
					if (aTime !== null && bTime !== null) {
						return bTime - aTime;
					}

					// Only a has time: a comes first
					if (aTime !== null) {
						return -1;
					}

					// Only b has time: b comes first
					if (bTime !== null) {
						return 1;
					}

					// Neither has time: maintain original order
					return 0;
				});

				return {
					...group,
					todos: sorted,
				};
			})
			.filter((group) => group.todos.length > 0);
	}, [dateGroups, filter, searchQuery]);

	// Stats for all upcoming todos
	const stats = useMemo(() => {
		const total = allUpcomingTodos.length;
		const completed = allUpcomingTodos.filter((t) =>
			isEntryCompleted(t),
		).length;
		const active = total - completed;
		return { total, completed, active };
	}, [allUpcomingTodos]);

	// Helper function to get folder for a todo
	const getFolderForTodo = (folderId: number | string | null | undefined) => {
		if (!folderId) return null;
		return folders.find((f) => f.id === folderId) ?? null;
	};

	const handleToggleTodo = (entry: UpcomingTodoEntry, completed: boolean) => {
		const id = entry.id;
		// Detect virtual recurring instances and pass virtualDate option
		if (isVirtualTodo(entry)) {
			onToggle(id, completed, { virtualDate: entry.virtualDate });
		} else {
			onToggle(id, completed);
		}
	};

	return (
		<div className={cn("w-full", className)} data-testid="upcoming-view">
			{/* Header */}
			<div className="mb-8 animate-fade-up opacity-0">
				<div className="flex items-center gap-3">
					<Calendar className="h-6 w-6 text-sky-500" />
					<div>
						<h1 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
							Upcoming
						</h1>
						<p className="mt-2 text-muted-foreground">
							Tasks due in the next 7 days
						</p>
					</div>
				</div>
			</div>

			{/* Filters and Search */}
			<div className="stagger-1 mb-6 flex animate-fade-up flex-col gap-4 opacity-0 sm:flex-row sm:items-center sm:justify-between">
				{/* Filter Tabs */}
				<div className="flex items-center gap-1 rounded-xl bg-secondary/50 p-1">
					{(["all", "active", "completed"] as const).map((type) => (
						<button
							type="button"
							key={type}
							onClick={() => setFilter(type)}
							className={cn(
								"relative rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200",
								filter === type
									? "bg-card text-foreground shadow-soft"
									: "text-muted-foreground hover:text-foreground",
							)}
							data-testid={`filter-${type}`}
						>
							{type.charAt(0).toUpperCase() + type.slice(1)}
							{type === "all" && stats.total > 0 && (
								<span className="ml-1.5 text-muted-foreground text-xs">
									({stats.total})
								</span>
							)}
							{type === "active" && stats.active > 0 && (
								<span className="ml-1.5 text-muted-foreground text-xs">
									({stats.active})
								</span>
							)}
							{type === "completed" && stats.completed > 0 && (
								<span className="ml-1.5 text-muted-foreground text-xs">
									({stats.completed})
								</span>
							)}
						</button>
					))}
				</div>

				{/* Search */}
				<div className="relative">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search tasks..."
						className="h-10 w-full pr-9 pl-9 sm:w-64"
						data-testid="search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
							data-testid="clear-search"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>

			{/* Task List */}
			<Card className="stagger-2 animate-fade-up border-border/50 opacity-0 shadow-soft">
				<CardContent className="p-4">
					{isLoading ? (
						<div className="space-y-3" data-testid="loading-skeleton">
							{[1, 2, 3, 4].map((i) => (
								<div
									key={i}
									className="flex items-center gap-4 rounded-xl bg-secondary/30 p-4"
								>
									<Skeleton className="h-6 w-6 rounded-full" />
									<Skeleton className="h-4 flex-1" />
								</div>
							))}
						</div>
					) : filteredGroups.length === 0 ? (
						<UpcomingEmptyState
							filter={filter}
							searchQuery={searchQuery}
							hasAnyTodos={allUpcomingTodos.length > 0}
						/>
					) : (
						<div className="space-y-6" data-testid="upcoming-todo-list">
							{filteredGroups.map((group) => (
								<div
									key={group.dateKey}
									data-testid={`date-group-${group.dateKey}`}
								>
									{/* Date Header */}
									<div
										className="mb-3 flex items-center gap-2"
										data-testid={`date-header-${group.dateKey}`}
									>
										<span className="font-semibold text-sm">{group.label}</span>
										<span className="text-muted-foreground text-xs">
											({group.todos.length})
										</span>
									</div>

									{/* Todos for this date */}
									<ul className="space-y-2">
										{group.todos.map((todo, index) => {
											const todoFolder = getFolderForTodo(todo.folderId);
											// Use virtualKey for recurring instances, otherwise use id
											const itemKey = isVirtualTodo(todo)
												? todo.virtualKey
												: todo.id;
											// For virtual todos, use occurrenceCompleted for display
											const displayCompleted = isVirtualTodo(todo)
												? todo.occurrenceCompleted === true
												: todo.completed;
											return (
												<TodoExpandableItem
													key={itemKey}
													todo={{
														...todo,
														// Override completed with the effective completion status
														completed: displayCompleted,
													}}
													subtaskProgress={getProgress(todo.id)}
													onToggle={(_id, completed) =>
														handleToggleTodo(todo, completed)
													}
													onDelete={onDelete}
													onScheduleChange={onScheduleChange}
													folder={todoFolder}
													showFolderBadge={true}
													folderColorBgClasses={folderColorBgClasses}
													animationDelay={`${index * 0.03}s`}
													isRecurringInstance={isVirtualTodo(todo)}
													virtualDate={
														isVirtualTodo(todo) ? todo.virtualDate : undefined
													}
												/>
											);
										})}
									</ul>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Summary Footer */}
			{allUpcomingTodos.length > 0 && (
				<div className="stagger-3 mt-4 flex animate-fade-up items-center justify-between text-muted-foreground text-sm opacity-0">
					<span data-testid="active-count">
						{stats.active} task{stats.active !== 1 ? "s" : ""} remaining
					</span>
					{stats.completed > 0 && (
						<span
							className="flex items-center gap-1.5"
							data-testid="completed-count"
						>
							<CheckCircle2 className="h-4 w-4 text-accent" />
							{stats.completed} completed
						</span>
					)}
				</div>
			)}
		</div>
	);
}

interface UpcomingEmptyStateProps {
	filter: FilterType;
	searchQuery: string;
	hasAnyTodos: boolean;
}

function UpcomingEmptyState({
	filter,
	searchQuery,
	hasAnyTodos,
}: UpcomingEmptyStateProps) {
	let icon = Calendar;
	let title = "No upcoming tasks";
	let description =
		"You don't have any tasks due in the next 7 days. Add a due date to your tasks to see them here.";

	if (searchQuery) {
		icon = Search;
		title = "No matching tasks";
		description = `No tasks found matching "${searchQuery}".`;
	} else if (filter === "active" && hasAnyTodos) {
		icon = CheckCircle2;
		title = "All upcoming tasks done!";
		description =
			"You've completed all your upcoming tasks. Great job staying ahead!";
	} else if (filter === "completed" && hasAnyTodos) {
		icon = Circle;
		title = "No completed tasks";
		description = "Complete some tasks to see them here.";
	}

	const Icon = icon;

	return (
		<div
			className="flex flex-col items-center justify-center py-12 text-center"
			data-testid="upcoming-empty-state"
		>
			<div className="mb-4 rounded-2xl bg-secondary/50 p-4">
				<Icon className="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 className="font-display font-semibold">{title}</h3>
			<p className="mt-1 max-w-xs text-muted-foreground text-sm">
				{description}
			</p>
		</div>
	);
}
