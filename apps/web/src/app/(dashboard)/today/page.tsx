"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import type { RecurringPattern } from "@/app/api/todo";
import { FolderSidebar } from "@/components/folders/folder-sidebar";
import { Button } from "@/components/ui/button";
import { TodayView } from "@/components/views/today-view";
import { useFolderNavigation } from "@/hooks/use-folder-navigation";
import type { SelectedFolderId } from "@/hooks/use-todo-storage";
import { useTodoStorage } from "@/hooks/use-todo-storage";
import { cn } from "@/lib/utils";

export default function TodayPage() {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const { navigateToFolder } = useFolderNavigation();

	const { todos, toggle, deleteTodo, updateSchedule, isLoading } =
		useTodoStorage();

	const handleSelectFolder = (folderId: SelectedFolderId) => {
		setIsSidebarOpen(false);
		navigateToFolder(folderId);
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
					selectedFolderId="today"
					onSelectFolder={handleSelectFolder}
					className="h-full"
				/>
			</div>

			{/* Main content */}
			<div className="relative min-h-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
				{/* Mobile menu button */}
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsSidebarOpen(true)}
					className="mb-4 lg:hidden"
					aria-label="Open sidebar"
				>
					<Menu className="h-5 w-5" />
				</Button>

				{/* Background decoration */}
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-20 -left-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
				</div>

				<div className="relative mx-auto max-w-3xl">
					<TodayView
						todos={todos}
						isLoading={isLoading}
						onToggle={handleToggleTodo}
						onDelete={handleDeleteTodo}
						onScheduleChange={handleScheduleChange}
					/>
				</div>
			</div>
		</div>
	);
}
