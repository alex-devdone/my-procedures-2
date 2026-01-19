"use client";

import { Cloud, HardDrive, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useTodoStorage } from "@/hooks/use-todo-storage";

export default function TodosPage() {
	const [newTodoText, setNewTodoText] = useState("");
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

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Todo List</CardTitle>
							<CardDescription>Manage your tasks efficiently</CardDescription>
						</div>
						<div
							className="flex items-center gap-1.5 text-muted-foreground"
							title={
								isAuthenticated
									? "Synced to cloud"
									: "Stored locally on this device"
							}
						>
							{isAuthenticated ? (
								<>
									<Cloud className="h-4 w-4" />
									<span className="text-xs">Synced</span>
								</>
							) : (
								<>
									<HardDrive className="h-4 w-4" />
									<span className="text-xs">Local</span>
								</>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{!isAuthenticated && (
						<div className="mb-4 rounded-md bg-muted p-3 text-muted-foreground text-sm">
							<Link href="/login" className="font-medium underline">
								Sign in
							</Link>{" "}
							to sync your todos across devices.
						</div>
					)}

					<form
						onSubmit={handleAddTodo}
						className="mb-6 flex items-center space-x-2"
					>
						<Input
							value={newTodoText}
							onChange={(e) => setNewTodoText(e.target.value)}
							placeholder="Add a new task..."
							disabled={isCreating}
						/>
						<Button type="submit" disabled={isCreating || !newTodoText.trim()}>
							{isCreating ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Add"
							)}
						</Button>
					</form>

					{isLoading ? (
						<div className="flex justify-center py-4">
							<Loader2 className="h-6 w-6 animate-spin" />
						</div>
					) : todos.length === 0 ? (
						<p className="py-4 text-center text-muted-foreground">
							No todos yet. Add one above!
						</p>
					) : (
						<ul className="space-y-2">
							{todos.map((todo) => (
								<li
									key={todo.id}
									className="flex items-center justify-between rounded-md border p-2"
								>
									<div className="flex items-center space-x-2">
										<Checkbox
											checked={todo.completed}
											onCheckedChange={() =>
												handleToggleTodo(todo.id, todo.completed)
											}
											id={`todo-${todo.id}`}
										/>
										<label
											htmlFor={`todo-${todo.id}`}
											className={`${todo.completed ? "text-muted-foreground line-through" : ""}`}
										>
											{todo.text}
										</label>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleDeleteTodo(todo.id)}
										aria-label="Delete todo"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
