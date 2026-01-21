"use client";

import { CheckCircle2, Circle, ListTodo, Search, Sun, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { FolderColor } from "@/app/api/folder";
import { useFolderStorage } from "@/app/api/folder";
import { useAllSubtasksProgress } from "@/app/api/subtask";
import type { RecurringPattern, Todo } from "@/app/api/todo/todo.types";
import { isToday } from "@/components/scheduling/due-date-badge";
import { TodoExpandableItem } from "@/components/todos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

export interface TodayViewProps {
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
 * Filters todos to return only those due today.
 */
export function getTodosDueToday(todos: Todo[]): Todo[] {
	return todos.filter((todo) => {
		if (!todo.dueDate) return false;
		return isToday(todo.dueDate);
	});
}

/**
 * TodayView component showing todos due today.
 *
 * Features:
 * - Filters todos to show only those due today
 * - Status filter (all/active/completed)
 * - Search filter
 * - Empty state when no todos are due today
 * - Statistics for active and completed todos
 * - Folder badges on todo items
 */
export function TodayView({
	todos,
	isLoading = false,
	onToggle,
	onDelete,
	onScheduleChange,
	className,
}: TodayViewProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [filter, setFilter] = useState<FilterType>("all");

	const { folders } = useFolderStorage();
	const { getProgress } = useAllSubtasksProgress();

	// Filter todos due today
	const todayTodos = useMemo(() => {
		return getTodosDueToday(todos);
	}, [todos]);

	// Apply status and search filters
	const filteredTodos = useMemo(() => {
		return todayTodos.filter((todo) => {
			const matchesFilter =
				filter === "all" ||
				(filter === "active" && !todo.completed) ||
				(filter === "completed" && todo.completed);

			const matchesSearch =
				!searchQuery ||
				todo.text.toLowerCase().includes(searchQuery.toLowerCase());

			return matchesFilter && matchesSearch;
		});
	}, [todayTodos, filter, searchQuery]);

	// Stats for today's todos
	const stats = useMemo(() => {
		const total = todayTodos.length;
		const completed = todayTodos.filter((t) => t.completed).length;
		const active = total - completed;
		return { total, completed, active };
	}, [todayTodos]);

	// Helper function to get folder for a todo
	const getFolderForTodo = (folderId: number | string | null | undefined) => {
		if (!folderId) return null;
		return folders.find((f) => f.id === folderId) ?? null;
	};

	const handleToggleTodo = (id: number | string, completed: boolean) => {
		onToggle(id, !completed);
	};

	return (
		<div className={cn("w-full", className)} data-testid="today-view">
			{/* Header */}
			<div className="mb-8 animate-fade-up opacity-0">
				<div className="flex items-center gap-3">
					<Sun className="h-6 w-6 text-amber-500" />
					<div>
						<h1 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
							Today
						</h1>
						<p className="mt-2 text-muted-foreground">Tasks due today</p>
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
					) : filteredTodos.length === 0 ? (
						<TodayEmptyState
							filter={filter}
							searchQuery={searchQuery}
							hasAnyTodos={todayTodos.length > 0}
						/>
					) : (
						<ul className="space-y-2" data-testid="today-todo-list">
							{filteredTodos.map((todo, index) => {
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
			{todayTodos.length > 0 && (
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

interface TodayEmptyStateProps {
	filter: FilterType;
	searchQuery: string;
	hasAnyTodos: boolean;
}

function TodayEmptyState({
	filter,
	searchQuery,
	hasAnyTodos,
}: TodayEmptyStateProps) {
	let icon = Sun;
	let title = "No tasks due today";
	let description =
		"You're all caught up! Add a due date to your tasks to see them here.";

	if (searchQuery) {
		icon = Search;
		title = "No matching tasks";
		description = `No tasks found matching "${searchQuery}".`;
	} else if (filter === "active" && hasAnyTodos) {
		icon = CheckCircle2;
		title = "All done for today!";
		description = "You've completed all your tasks for today. Great job!";
	} else if (filter === "completed" && hasAnyTodos) {
		icon = Circle;
		title = "No completed tasks";
		description = "Complete some tasks to see them here.";
	}

	const Icon = icon;

	return (
		<div
			className="flex flex-col items-center justify-center py-12 text-center"
			data-testid="today-empty-state"
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
