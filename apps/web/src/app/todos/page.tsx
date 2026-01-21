"use client";

import {
	CheckCircle2,
	Circle,
	Cloud,
	FolderIcon,
	HardDrive,
	Inbox,
	ListTodo,
	Menu,
	Plus,
	Search,
	Sparkles,
	X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type {
	Folder,
	FolderColor,
	LocalCreateFolderInput,
	LocalUpdateFolderInput,
	UpdateFolderInput,
} from "@/app/api/folder";
import { useFolderStorage } from "@/app/api/folder";
import { useAllSubtasksProgress } from "@/app/api/subtask";
import type { RecurringPattern } from "@/app/api/todo";
import { FolderCreateDialog } from "@/components/folders/folder-create-dialog";
import { FolderEditDialog } from "@/components/folders/folder-edit-dialog";
import {
	FolderSidebar,
	type SmartViewType,
} from "@/components/folders/folder-sidebar";
import { TodoExpandableItem } from "@/components/todos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { OverdueView } from "@/components/views/overdue-view";
import { TodayView } from "@/components/views/today-view";
import { UpcomingView } from "@/components/views/upcoming-view";
import type { SelectedFolderId } from "@/hooks/use-todo-storage";
import { useTodoStorage } from "@/hooks/use-todo-storage";
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

/**
 * Maps folder colors to Tailwind CSS classes for icons.
 */
const folderColorIconClasses: Record<FolderColor, string> = {
	slate: "text-slate-500",
	red: "text-red-500",
	orange: "text-orange-500",
	amber: "text-amber-500",
	yellow: "text-yellow-500",
	lime: "text-lime-500",
	green: "text-green-500",
	emerald: "text-emerald-500",
	teal: "text-teal-500",
	cyan: "text-cyan-500",
	sky: "text-sky-500",
	blue: "text-blue-500",
	indigo: "text-indigo-500",
	violet: "text-violet-500",
	purple: "text-purple-500",
	fuchsia: "text-fuchsia-500",
	pink: "text-pink-500",
	rose: "text-rose-500",
};

export default function TodosPage() {
	const [newTodoText, setNewTodoText] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [filter, setFilter] = useState<FilterType>("all");
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

	const {
		create,
		toggle,
		deleteTodo,
		updateSchedule,
		isLoading,
		isAuthenticated,
		selectedFolderId,
		setSelectedFolderId,
		filteredTodos: folderFilteredTodos,
		todos: allTodos,
	} = useTodoStorage();

	const {
		folders,
		create: createFolder,
		update: updateFolderData,
		deleteFolder,
	} = useFolderStorage();

	const { getProgress } = useAllSubtasksProgress();

	const [isCreating, setIsCreating] = useState(false);

	const handleAddTodo = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newTodoText.trim()) {
			setIsCreating(true);
			// Create todo in the currently selected folder (null for inbox)
			const folderId = selectedFolderId === "inbox" ? null : selectedFolderId;
			await create(newTodoText, folderId);
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

	const handleScheduleChange = (
		id: number | string,
		schedule: {
			dueDate?: string | null;
			reminderAt?: string | null;
			recurringPattern?: RecurringPattern | null;
		},
	) => {
		updateSchedule(id, schedule);
	};

	const handleSelectFolder = (folderId: SelectedFolderId) => {
		setSelectedFolderId(folderId);
		setIsSidebarOpen(false);
	};

	const handleCreateFolder = async (input: LocalCreateFolderInput) => {
		await createFolder(input);
	};

	const handleUpdateFolder = async (
		input: LocalUpdateFolderInput | UpdateFolderInput,
	) => {
		await updateFolderData(input);
		setEditingFolder(null);
	};

	const handleDeleteFolder = async (id: number | string) => {
		await deleteFolder(id);
		setEditingFolder(null);
		// If we deleted the currently selected folder, go to inbox
		if (selectedFolderId === id) {
			setSelectedFolderId("inbox");
		}
	};

	// Apply status and search filters on top of folder filtering
	const filteredTodos = useMemo(() => {
		return folderFilteredTodos.filter((todo) => {
			const matchesFilter =
				filter === "all" ||
				(filter === "active" && !todo.completed) ||
				(filter === "completed" && todo.completed);

			const matchesSearch =
				!searchQuery ||
				todo.text.toLowerCase().includes(searchQuery.toLowerCase());

			return matchesFilter && matchesSearch;
		});
	}, [folderFilteredTodos, filter, searchQuery]);

	// Stats based on folder-filtered todos
	const stats = useMemo(() => {
		const total = folderFilteredTodos.length;
		const completed = folderFilteredTodos.filter((t) => t.completed).length;
		const active = total - completed;
		return { total, completed, active };
	}, [folderFilteredTodos]);

	// Get the selected folder object
	const selectedFolder = useMemo(() => {
		if (selectedFolderId === "inbox") return null;
		return folders.find((f) => f.id === selectedFolderId) ?? null;
	}, [selectedFolderId, folders]);

	// Get folder name for display
	const selectedFolderName = selectedFolder?.name ?? "Inbox";

	// Helper function to get folder for a todo
	const getFolderForTodo = (folderId: number | string | null | undefined) => {
		if (!folderId) return null;
		return folders.find((f) => f.id === folderId) ?? null;
	};

	// Check if currently viewing a smart view
	const isSmartView = useMemo(() => {
		return (
			selectedFolderId === "today" ||
			selectedFolderId === "upcoming" ||
			selectedFolderId === "overdue"
		);
	}, [selectedFolderId]);

	// Get the smart view type
	const smartViewType = useMemo((): SmartViewType | null => {
		if (
			selectedFolderId === "today" ||
			selectedFolderId === "upcoming" ||
			selectedFolderId === "overdue"
		) {
			return selectedFolderId;
		}
		return null;
	}, [selectedFolderId]);

	return (
		<div className="flex min-h-full">
			{/* Mobile sidebar backdrop */}
			{isSidebarOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={() => setIsSidebarOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setIsSidebarOpen(false);
					}}
					aria-label="Close sidebar"
				/>
			)}

			{/* Sidebar */}
			<div
				className={cn(
					"fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:static lg:translate-x-0",
					isSidebarOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<FolderSidebar
					selectedFolderId={selectedFolderId}
					onSelectFolder={handleSelectFolder}
					onCreateFolder={() => setIsCreateDialogOpen(true)}
					onEditFolder={setEditingFolder}
					onDeleteFolder={(folder) => handleDeleteFolder(folder.id)}
					className="h-full"
				/>
			</div>

			{/* Main content */}
			<div className="relative min-h-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
				{/* Background decoration */}
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-20 -left-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
				</div>

				<div className="relative mx-auto max-w-3xl">
					{/* Header */}
					<div className="mb-8 animate-fade-up opacity-0">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								{/* Mobile menu button */}
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setIsSidebarOpen(true)}
									className="lg:hidden"
									aria-label="Open sidebar"
								>
									<Menu className="h-5 w-5" />
								</Button>
								<div>
									<div className="flex items-center gap-2">
										{selectedFolder ? (
											<FolderIcon
												className={cn(
													"h-6 w-6",
													folderColorIconClasses[selectedFolder.color],
												)}
											/>
										) : (
											<Inbox className="h-6 w-6 text-muted-foreground" />
										)}
										<h1 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
											{selectedFolderName}
										</h1>
									</div>
									<p className="mt-2 text-muted-foreground">
										{selectedFolder
											? `Tasks in ${selectedFolderName}`
											: "Tasks without a folder"}
									</p>
								</div>
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
					{!isAuthenticated && !isSmartView && (
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

					{/* Smart Views */}
					{isSmartView && smartViewType && (
						<>
							{smartViewType === "today" && (
								<TodayView
									todos={allTodos}
									isLoading={isLoading}
									onToggle={handleToggleTodo}
									onDelete={handleDeleteTodo}
									onScheduleChange={handleScheduleChange}
								/>
							)}
							{smartViewType === "upcoming" && (
								<UpcomingView
									todos={allTodos}
									isLoading={isLoading}
									onToggle={handleToggleTodo}
									onDelete={handleDeleteTodo}
									onScheduleChange={handleScheduleChange}
								/>
							)}
							{smartViewType === "overdue" && (
								<OverdueView
									todos={allTodos}
									isLoading={isLoading}
									onToggle={handleToggleTodo}
									onDelete={handleDeleteTodo}
									onScheduleChange={handleScheduleChange}
								/>
							)}
						</>
					)}

					{/* Folder View (Inbox and custom folders) */}
					{!isSmartView && (
						<>
							{/* Add Task Form */}
							<Card className="stagger-1 mb-6 animate-fade-up border-border/50 opacity-0 shadow-soft">
								<CardContent className="p-4">
									<form onSubmit={handleAddTodo} className="flex gap-3">
										<div className="relative flex-1">
											<Plus className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												value={newTodoText}
												onChange={(e) => setNewTodoText(e.target.value)}
												placeholder={`Add task to ${selectedFolderName}...`}
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
											hasAnyTodos={folderFilteredTodos.length > 0}
											folderName={selectedFolderName}
										/>
									) : (
										<ul className="space-y-2" data-testid="todo-list">
											{filteredTodos.map((todo, index) => {
												const todoFolder = getFolderForTodo(todo.folderId);
												return (
													<TodoExpandableItem
														key={todo.id}
														todo={todo}
														subtaskProgress={getProgress(todo.id)}
														onToggle={handleToggleTodo}
														onDelete={handleDeleteTodo}
														onScheduleChange={handleScheduleChange}
														folder={todoFolder}
														showFolderBadge={selectedFolderId === "inbox"}
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
							{folderFilteredTodos.length > 0 && (
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
						</>
					)}
				</div>
			</div>

			{/* Create Folder Dialog */}
			<FolderCreateDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onCreate={handleCreateFolder}
			/>

			{/* Edit Folder Dialog */}
			{editingFolder && (
				<FolderEditDialog
					open={!!editingFolder}
					onOpenChange={(open) => !open && setEditingFolder(null)}
					folder={editingFolder}
					onUpdate={handleUpdateFolder}
					onDelete={handleDeleteFolder}
				/>
			)}
		</div>
	);
}

interface EmptyStateProps {
	filter: FilterType;
	searchQuery: string;
	hasAnyTodos: boolean;
	folderName: string;
}

function EmptyState({
	filter,
	searchQuery,
	hasAnyTodos,
	folderName,
}: EmptyStateProps) {
	let icon = ListTodo;
	let title = "No tasks yet";
	let description = `Create your first task in ${folderName} above.`;

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
		<div
			className="flex flex-col items-center justify-center py-12 text-center"
			data-testid="empty-state"
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
