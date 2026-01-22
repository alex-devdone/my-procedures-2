"use client";

import { AlertCircle, CheckCircle2, Circle, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useCompletionHistory } from "@/app/api/analytics";
import type { FolderColor } from "@/app/api/folder";
import { useFolderStorage } from "@/app/api/folder";
import { useAllSubtasksProgress } from "@/app/api/subtask";
import type { RecurringPattern, Todo } from "@/app/api/todo/todo.types";
import { isOverdue } from "@/components/scheduling/due-date-badge";
import { TodoExpandableItem } from "@/components/todos";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

export interface OverdueViewProps {
	/** All todos from the todo storage */
	todos: Todo[];
	/** Whether todos are loading */
	isLoading?: boolean;
	/** Callback when a todo is toggled */
	onToggle: (id: number | string, completed: boolean) => void;
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

/**
 * Completion record for a recurring todo occurrence.
 */
export interface CompletionRecord {
	todoId: number;
	scheduledDate: Date;
	completedAt: Date | null;
}

/**
 * Helper to get date key for grouping (YYYY-MM-DD).
 */
function getDateKey(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Filters todos to return only those that are overdue (past due date).
 * Includes both active and completed todos with past due dates.
 * For recurring todos, checks if there are uncompleted past occurrences.
 * @param todos - All todos to filter
 * @param now - The current date
 * @param completionHistory - Optional completion history for recurring todos
 */
export function getTodosOverdue(
	todos: Todo[],
	now: Date = new Date(),
	completionHistory?: CompletionRecord[],
): Todo[] {
	// Create a map for quick lookup of completion status by todoId and date
	const completionMap = new Map<string, boolean>();
	if (completionHistory) {
		for (const record of completionHistory) {
			const dateKey = getDateKey(record.scheduledDate);
			const key = `${record.todoId}-${dateKey}`;
			completionMap.set(key, record.completedAt !== null);
		}
	}

	const today = new Date(now);
	today.setHours(0, 0, 0, 0);

	return todos.filter((todo) => {
		// For non-recurring todos, check if they have an overdue dueDate
		if (!todo.recurringPattern) {
			if (!todo.dueDate) return false;
			return isOverdue(todo.dueDate, false);
		}

		// For recurring todos, check if there are any uncompleted past occurrences
		// Start from 7 days ago (reasonable window for overdue tracking)
		const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
		sevenDaysAgo.setHours(0, 0, 0, 0);

		// Check if the pattern has ended
		if (todo.recurringPattern.endDate) {
			const endDate = new Date(todo.recurringPattern.endDate);
			endDate.setHours(0, 0, 0, 0);
			if (endDate < today) {
				// Pattern ended before today, no future occurrences possible
				return false;
			}
		}

		// Check dates from 7 days ago up to yesterday
		const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
		yesterday.setHours(0, 0, 0, 0);

		const currentDate = new Date(sevenDaysAgo);
		while (currentDate <= yesterday) {
			// Check if this date matches the recurring pattern
			if (isDateMatchingPattern(todo.recurringPattern, currentDate)) {
				// Check if this occurrence was completed
				const dateKey = getDateKey(currentDate);
				const completionKey = `${todo.id}-${dateKey}`;
				const wasCompleted = completionMap.get(completionKey);

				// If we found an uncompleted past occurrence, this todo is overdue
				if (!wasCompleted) {
					return true;
				}
			}

			currentDate.setDate(currentDate.getDate() + 1);
		}

		return false;
	});
}

/**
 * OverdueView component showing overdue todos.
 *
 * Features:
 * - Filters todos to show only overdue tasks
 * - Status filter (all/active/completed)
 * - Search filter
 * - Empty state when no overdue todos
 * - Statistics for active and completed todos
 * - Folder badges on todo items
 */
export function OverdueView({
	todos,
	isLoading = false,
	onToggle,
	onDelete,
	onScheduleChange,
	className,
}: OverdueViewProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [filter, setFilter] = useState<FilterType>("all");

	const { folders } = useFolderStorage();
	const { getProgress } = useAllSubtasksProgress();

	// Calculate date range for completion history (last 7 days up to yesterday)
	const dateRange = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
		yesterday.setHours(23, 59, 59, 999);
		const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
		sevenDaysAgo.setHours(0, 0, 0, 0);
		return {
			startDate: sevenDaysAgo.toISOString(),
			endDate: yesterday.toISOString(),
		};
	}, []);

	// Fetch completion history for recurring todos
	const { data: completionHistoryData } = useCompletionHistory(
		dateRange.startDate,
		dateRange.endDate,
	);

	// Convert completion history to the format expected by getTodosOverdue
	const completionHistory = useMemo(() => {
		if (!completionHistoryData) return undefined;
		return completionHistoryData.map((record) => ({
			todoId: record.todoId,
			scheduledDate: new Date(record.scheduledDate),
			completedAt: record.completedAt ? new Date(record.completedAt) : null,
		}));
	}, [completionHistoryData]);

	// Filter overdue todos
	const overdueTodos = useMemo(() => {
		return getTodosOverdue(todos, new Date(), completionHistory);
	}, [todos, completionHistory]);

	// Apply status and search filters
	const filteredTodos = useMemo(() => {
		return overdueTodos.filter((todo) => {
			const matchesFilter =
				filter === "all" ||
				(filter === "active" && !todo.completed) ||
				(filter === "completed" && todo.completed);

			const matchesSearch =
				!searchQuery ||
				todo.text.toLowerCase().includes(searchQuery.toLowerCase());

			return matchesFilter && matchesSearch;
		});
	}, [overdueTodos, filter, searchQuery]);

	// Sort overdue todos: active first (by due date, then by time), then completed
	const sortedTodos = useMemo(() => {
		const getTime = (todo: Todo): number | null => {
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

		const active = filteredTodos.filter((t) => !t.completed);
		const completed = filteredTodos.filter((t) => t.completed);

		// Sort active by due date (oldest first = most overdue), then by time
		const sortedActive = [...active].sort((a, b) => {
			// First sort by date
			const dateA = new Date(a.dueDate as string).getTime();
			const dateB = new Date(b.dueDate as string).getTime();
			if (dateA !== dateB) {
				return dateA - dateB;
			}

			// Same date: sort by time
			const aTime = getTime(a);
			const bTime = getTime(b);

			// Both have time: sort by time ascending
			if (aTime !== null && bTime !== null) {
				return aTime - bTime;
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

		// Sort completed by due date (newest first = recently completed), then by time
		const sortedCompleted = [...completed].sort((a, b) => {
			// First sort by date (newest first)
			const dateA = new Date(a.dueDate as string).getTime();
			const dateB = new Date(b.dueDate as string).getTime();
			if (dateA !== dateB) {
				return dateB - dateA;
			}

			// Same date: sort by time
			const aTime = getTime(a);
			const bTime = getTime(b);

			// Both have time: sort by time ascending
			if (aTime !== null && bTime !== null) {
				return aTime - bTime;
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

		return [...sortedActive, ...sortedCompleted];
	}, [filteredTodos]);

	// Stats for overdue todos
	const stats = useMemo(() => {
		const total = overdueTodos.length;
		const completed = overdueTodos.filter((t) => t.completed).length;
		const active = total - completed;
		return { total, completed, active };
	}, [overdueTodos]);

	// Helper function to get folder for a todo
	const getFolderForTodo = (folderId: number | string | null | undefined) => {
		if (!folderId) return null;
		return folders.find((f) => f.id === folderId) ?? null;
	};

	const handleToggleTodo = (id: number | string, completed: boolean) => {
		// Pass through - TodoExpandableItem already passes current state,
		// parent will invert to get desired state
		onToggle(id, completed);
	};

	return (
		<div className={cn("w-full", className)} data-testid="overdue-view">
			{/* Header */}
			<div className="mb-8 animate-fade-up opacity-0">
				<div className="flex items-center gap-3">
					<div className="rounded-xl bg-red-500/10 p-2">
						<AlertCircle className="h-6 w-6 text-red-500" />
					</div>
					<div>
						<h1 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
							Overdue
						</h1>
						<p className="mt-2 text-muted-foreground">
							Tasks that are past their due date
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
					) : sortedTodos.length === 0 ? (
						<OverdueEmptyState
							filter={filter}
							searchQuery={searchQuery}
							hasAnyTodos={overdueTodos.length > 0}
						/>
					) : (
						<ul className="space-y-2" data-testid="overdue-todo-list">
							{sortedTodos.map((todo, index) => {
								const todoFolder = getFolderForTodo(todo.folderId);
								return (
									<TodoExpandableItem
										key={todo.id}
										todo={todo}
										subtaskProgress={getProgress(todo.id)}
										onToggle={handleToggleTodo}
										onDelete={onDelete}
										onScheduleChange={onScheduleChange}
										folder={todoFolder}
										showFolderBadge={true}
										folderColorBgClasses={folderColorBgClasses}
										animationDelay={`${index * 0.03}s`}
									/>
								);
							})}
						</ul>
					)}
				</CardContent>
			</Card>

			{/* Summary Footer */}
			{overdueTodos.length > 0 && (
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

interface OverdueEmptyStateProps {
	filter: FilterType;
	searchQuery: string;
	hasAnyTodos: boolean;
}

function OverdueEmptyState({
	filter,
	searchQuery,
	hasAnyTodos,
}: OverdueEmptyStateProps) {
	let icon = AlertCircle;
	let title = "No overdue tasks";
	let description =
		"You're all caught up! Tasks past their due date will appear here.";

	if (searchQuery) {
		icon = Search;
		title = "No matching tasks";
		description = `No tasks found matching "${searchQuery}".`;
	} else if (filter === "active" && hasAnyTodos) {
		icon = CheckCircle2;
		title = "All overdue tasks completed!";
		description =
			"You've completed all your overdue tasks. Great job catching up!";
	} else if (filter === "completed" && hasAnyTodos) {
		icon = Circle;
		title = "No completed tasks";
		description = "Complete some tasks to see them here.";
	}

	const Icon = icon;

	return (
		<div
			className="flex flex-col items-center justify-center py-12 text-center"
			data-testid="overdue-empty-state"
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
