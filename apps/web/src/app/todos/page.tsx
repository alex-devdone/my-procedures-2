"use client";

import {
	CheckCircle2,
	Circle,
	Cloud,
	HardDrive,
	ListTodo,
	Plus,
	Search,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTodoStorage } from "@/hooks/use-todo-storage";
import { cn } from "@/lib/utils";

type FilterType = "all" | "active" | "completed";

export default function TodosPage() {
	const [newTodoText, setNewTodoText] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [filter, setFilter] = useState<FilterType>("all");
	const { todos, create, toggle, deleteTodo, isLoading, isAuthenticated } =
		useTodoStorage();
	const [isCreating, setIsCreating] = useState(false);

	const handleAddTodo = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newTodoText.trim()) {
			setIsCreating(true);
			await create(newTodoText);
			setNewTodoText("");
			setIsCreating(false);
		}
	};

	const handleToggleTodo = (id: number | string, completed: boolean) => {
		toggle(id, !completed);
	};

	const handleDeleteTodo = (id: number | string) => {
		deleteTodo(id);
	};

	const filteredTodos = useMemo(() => {
		return todos.filter((todo) => {
			const matchesFilter =
				filter === "all" ||
				(filter === "active" && !todo.completed) ||
				(filter === "completed" && todo.completed);

			const matchesSearch =
				!searchQuery ||
				todo.text.toLowerCase().includes(searchQuery.toLowerCase());

			return matchesFilter && matchesSearch;
		});
	}, [todos, filter, searchQuery]);

	const stats = useMemo(() => {
		const total = todos.length;
		const completed = todos.filter((t) => t.completed).length;
		const active = total - completed;
		return { total, completed, active };
	}, [todos]);

	return (
		<div className="relative min-h-full px-4 py-8 sm:px-6 lg:px-8">
			{/* Background decoration */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-20 -left-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
			</div>

			<div className="relative mx-auto max-w-3xl">
				{/* Header */}
				<div className="mb-8 animate-fade-up opacity-0">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
								Tasks
							</h1>
							<p className="mt-2 text-muted-foreground">
								Organize and track your work.
							</p>
						</div>
						{/* Sync Status Badge */}
						<div
							className={cn(
								"flex items-center gap-2 rounded-full px-4 py-2 font-medium text-sm transition-colors",
								isAuthenticated
									? "bg-green-500/10 text-green-600 dark:text-green-400"
									: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
							)}
							title={
								isAuthenticated
									? "Your tasks are synced to the cloud"
									: "Tasks are stored locally on this device"
							}
						>
							{isAuthenticated ? (
								<>
									<Cloud className="h-4 w-4" />
									<span className="hidden sm:inline">Synced</span>
								</>
							) : (
								<>
									<HardDrive className="h-4 w-4" />
									<span className="hidden sm:inline">Local</span>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Sign in prompt for guests */}
				{!isAuthenticated && (
					<Card className="stagger-1 mb-6 animate-fade-up border-accent/20 bg-gradient-to-r from-accent/5 to-accent/10 opacity-0">
						<CardContent className="flex items-center gap-4 p-4">
							<div className="rounded-xl bg-accent/20 p-2.5">
								<Sparkles className="h-5 w-5 text-accent" />
							</div>
							<div className="flex-1">
								<p className="font-medium text-sm">
									Want to access your tasks anywhere?
								</p>
								<p className="text-muted-foreground text-sm">
									<Link
										href="/login"
										className="font-semibold text-accent hover:underline"
									>
										Sign in
									</Link>{" "}
									to sync across all your devices.
								</p>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Add Task Form */}
				<Card className="stagger-1 mb-6 animate-fade-up border-border/50 opacity-0 shadow-soft">
					<CardContent className="p-4">
						<form onSubmit={handleAddTodo} className="flex gap-3">
							<div className="relative flex-1">
								<Plus className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={newTodoText}
									onChange={(e) => setNewTodoText(e.target.value)}
									placeholder="What needs to be done?"
									disabled={isCreating}
									className="h-12 pl-10 text-base transition-all duration-200 focus:ring-2 focus:ring-accent/20"
								/>
							</div>
							<Button
								type="submit"
								disabled={isCreating || !newTodoText.trim()}
								className="h-12 bg-accent px-6 text-accent-foreground shadow-soft transition-all duration-300 hover:bg-accent/90 hover:shadow-medium disabled:opacity-50"
							>
								{isCreating ? (
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
								) : (
									"Add"
								)}
							</Button>
						</form>
					</CardContent>
				</Card>

				{/* Filters and Search */}
				<div className="stagger-2 mb-6 flex animate-fade-up flex-col gap-4 opacity-0 sm:flex-row sm:items-center sm:justify-between">
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
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>

				{/* Task List */}
				<Card className="stagger-3 animate-fade-up border-border/50 opacity-0 shadow-soft">
					<CardContent className="p-4">
						{isLoading ? (
							<div className="space-y-3">
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
							<EmptyState
								filter={filter}
								searchQuery={searchQuery}
								hasAnyTodos={todos.length > 0}
							/>
						) : (
							<ul className="space-y-2">
								{filteredTodos.map((todo, index) => (
									<li
										key={todo.id}
										className="group flex items-center gap-4 rounded-xl border border-border/50 bg-secondary/30 p-4 transition-all duration-200 hover:border-accent/30 hover:bg-secondary/50"
										style={{
											animationDelay: `${index * 0.03}s`,
										}}
									>
										<button
											type="button"
											onClick={() => handleToggleTodo(todo.id, todo.completed)}
											className={cn(
												"flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
												todo.completed
													? "border-accent bg-accent text-accent-foreground"
													: "border-border hover:border-accent/50 hover:bg-accent/5",
											)}
											aria-label={
												todo.completed
													? "Mark as incomplete"
													: "Mark as complete"
											}
										>
											{todo.completed && <CheckCircle2 className="h-4 w-4" />}
										</button>
										<span
											className={cn(
												"flex-1 text-sm transition-all duration-200",
												todo.completed
													? "text-muted-foreground line-through"
													: "text-foreground",
											)}
										>
											{todo.text}
										</span>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleDeleteTodo(todo.id)}
											className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
											aria-label="Delete task"
										>
											<Trash2 className="h-4 w-4 text-muted-foreground transition-colors hover:text-destructive" />
										</Button>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				{/* Summary Footer */}
				{todos.length > 0 && (
					<div className="stagger-4 mt-4 flex animate-fade-up items-center justify-between text-muted-foreground text-sm opacity-0">
						<span>
							{stats.active} task{stats.active !== 1 ? "s" : ""} remaining
						</span>
						{stats.completed > 0 && (
							<span className="flex items-center gap-1.5">
								<CheckCircle2 className="h-4 w-4 text-accent" />
								{stats.completed} completed
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

interface EmptyStateProps {
	filter: FilterType;
	searchQuery: string;
	hasAnyTodos: boolean;
}

function EmptyState({ filter, searchQuery, hasAnyTodos }: EmptyStateProps) {
	let icon = ListTodo;
	let title = "No tasks yet";
	let description = "Create your first task above to get started.";

	if (searchQuery) {
		icon = Search;
		title = "No matching tasks";
		description = `No tasks found matching "${searchQuery}".`;
	} else if (filter === "active" && hasAnyTodos) {
		icon = CheckCircle2;
		title = "All done!";
		description = "You've completed all your tasks. Great job!";
	} else if (filter === "completed" && hasAnyTodos) {
		icon = Circle;
		title = "No completed tasks";
		description = "Complete some tasks to see them here.";
	}

	const Icon = icon;

	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
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
