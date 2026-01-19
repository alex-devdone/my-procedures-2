"use client";

import { useQuery } from "@tanstack/react-query";
import {
	ArrowRight,
	CheckCircle2,
	Circle,
	ListTodo,
	MessageSquare,
	Plus,
	Sparkles,
	Target,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useTodoStorage } from "@/app/api/todo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

interface DashboardProps {
	userName: string;
}

export default function Dashboard({ userName }: DashboardProps) {
	const { data: privateData, isLoading: isPrivateLoading } = useQuery(
		trpc.privateData.queryOptions(),
	);
	const { todos, isLoading: isTodosLoading } = useTodoStorage();

	const stats = useMemo(() => {
		const total = todos.length;
		const completed = todos.filter((t) => t.completed).length;
		const pending = total - completed;
		const completionRate =
			total > 0 ? Math.round((completed / total) * 100) : 0;

		return { total, completed, pending, completionRate };
	}, [todos]);

	const recentTodos = useMemo(() => {
		return todos.slice(0, 5);
	}, [todos]);

	const getGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 18) return "Good afternoon";
		return "Good evening";
	};

	return (
		<div className="relative min-h-full px-4 py-8 sm:px-6 lg:px-8">
			{/* Background decoration */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-20 -right-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
			</div>

			<div className="relative mx-auto max-w-6xl">
				{/* Header */}
				<div className="mb-8 animate-fade-up opacity-0">
					<h1 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
						{getGreeting()}, {userName.split(" ")[0]}
					</h1>
					<p className="mt-2 text-muted-foreground">
						Here's an overview of your productivity today.
					</p>
				</div>

				{/* Stats Grid */}
				<div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<StatCard
						title="Total Tasks"
						value={stats.total}
						icon={ListTodo}
						color="accent"
						delay={0}
						isLoading={isTodosLoading}
					/>
					<StatCard
						title="Completed"
						value={stats.completed}
						icon={CheckCircle2}
						color="green"
						delay={1}
						isLoading={isTodosLoading}
					/>
					<StatCard
						title="In Progress"
						value={stats.pending}
						icon={Circle}
						color="amber"
						delay={2}
						isLoading={isTodosLoading}
					/>
					<StatCard
						title="Completion Rate"
						value={`${stats.completionRate}%`}
						icon={TrendingUp}
						color="blue"
						delay={3}
						isLoading={isTodosLoading}
					/>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					{/* Recent Tasks */}
					<div className="lg:col-span-2">
						<Card className="stagger-4 animate-fade-up overflow-hidden border-border/50 opacity-0 shadow-soft">
							<CardHeader className="flex flex-row items-center justify-between pb-4">
								<CardTitle className="font-display font-semibold text-lg">
									Recent Tasks
								</CardTitle>
								<Link
									href="/todos"
									className="inline-flex h-7 items-center justify-center gap-1 rounded-lg px-2.5 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
								>
									View all
									<ArrowRight className="ml-1 h-4 w-4" />
								</Link>
							</CardHeader>
							<CardContent>
								{isTodosLoading ? (
									<div className="space-y-3">
										{[1, 2, 3].map((i) => (
											<div key={i} className="flex items-center gap-3">
												<Skeleton className="h-5 w-5 rounded-full" />
												<Skeleton className="h-4 flex-1" />
											</div>
										))}
									</div>
								) : recentTodos.length > 0 ? (
									<div className="space-y-3">
										{recentTodos.map((todo) => (
											<div
												key={todo.id}
												className="group flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3 transition-all duration-200 hover:border-accent/30 hover:bg-secondary/50"
											>
												<div
													className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
														todo.completed
															? "border-accent bg-accent text-accent-foreground"
															: "border-border group-hover:border-accent/50"
													}`}
												>
													{todo.completed && (
														<CheckCircle2 className="h-3 w-3" />
													)}
												</div>
												<span
													className={`flex-1 text-sm ${
														todo.completed
															? "text-muted-foreground line-through"
															: "text-foreground"
													}`}
												>
													{todo.text}
												</span>
											</div>
										))}
									</div>
								) : (
									<EmptyState
										icon={ListTodo}
										title="No tasks yet"
										description="Create your first task to get started"
										action={
											<Link
												href="/todos"
												className="mt-4 inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-accent px-2.5 font-medium text-accent-foreground text-xs transition-colors hover:bg-accent/90"
											>
												<Plus className="mr-1 h-4 w-4" />
												Add task
											</Link>
										}
									/>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Quick Actions & Status */}
					<div className="space-y-6">
						{/* Quick Actions */}
						<Card className="stagger-5 animate-fade-up border-border/50 opacity-0 shadow-soft">
							<CardHeader className="pb-4">
								<CardTitle className="font-display font-semibold text-lg">
									Quick Actions
								</CardTitle>
							</CardHeader>
							<CardContent className="grid gap-2">
								<QuickActionButton
									href="/todos"
									icon={Plus}
									label="Add new task"
								/>
								<QuickActionButton
									href="/ai"
									icon={MessageSquare}
									label="Ask AI assistant"
								/>
								<QuickActionButton
									href="/todos"
									icon={Target}
									label="Review tasks"
								/>
							</CardContent>
						</Card>

						{/* API Status */}
						<Card className="stagger-6 animate-fade-up border-border/50 opacity-0 shadow-soft">
							<CardHeader className="pb-4">
								<CardTitle className="font-display font-semibold text-lg">
									System Status
								</CardTitle>
							</CardHeader>
							<CardContent>
								{isPrivateLoading ? (
									<div className="flex items-center gap-3">
										<Skeleton className="h-3 w-3 rounded-full" />
										<Skeleton className="h-4 w-24" />
									</div>
								) : (
									<div className="flex items-center gap-3">
										<div
											className={`h-3 w-3 rounded-full ${
												privateData ? "bg-green-500" : "bg-red-500"
											} animate-pulse-soft`}
										/>
										<span className="text-muted-foreground text-sm">
											{privateData
												? "All systems operational"
												: "Service unavailable"}
										</span>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Motivation Card */}
						<Card className="stagger-6 animate-fade-up overflow-hidden border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 opacity-0 shadow-soft">
							<CardContent className="p-5">
								<div className="mb-3 inline-flex rounded-lg bg-accent/20 p-2">
									<Sparkles className="h-5 w-5 text-accent" />
								</div>
								<p className="font-display font-medium text-sm">
									{stats.completionRate >= 80
										? "Amazing progress! You're crushing it today."
										: stats.completionRate >= 50
											? "Great work! Keep the momentum going."
											: stats.pending > 0
												? "Every task completed is a step forward."
												: "Ready to start? Add your first task!"}
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}

interface StatCardProps {
	title: string;
	value: string | number;
	icon: React.ComponentType<{ className?: string }>;
	color: "accent" | "green" | "amber" | "blue";
	delay: number;
	isLoading?: boolean;
}

function StatCard({
	title,
	value,
	icon: Icon,
	color,
	delay,
	isLoading,
}: StatCardProps) {
	const colorClasses = {
		accent: "bg-accent/10 text-accent",
		green: "bg-green-500/10 text-green-600 dark:text-green-400",
		amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
		blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	};

	return (
		<Card
			className={`animate-fade-up border-border/50 opacity-0 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-medium stagger-${delay}`}
		>
			<CardContent className="p-5">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-muted-foreground text-sm">{title}</p>
						{isLoading ? (
							<Skeleton className="mt-1 h-8 w-16" />
						) : (
							<p className="mt-1 font-bold font-display text-2xl">{value}</p>
						)}
					</div>
					<div className={`rounded-xl p-3 ${colorClasses[color]}`}>
						<Icon className="h-5 w-5" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

interface QuickActionButtonProps {
	href: "/todos" | "/ai" | "/dashboard";
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}

function QuickActionButton({
	href,
	icon: Icon,
	label,
}: QuickActionButtonProps) {
	return (
		<Link
			href={href}
			className="flex h-auto items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary"
		>
			<div className="rounded-lg bg-secondary p-2">
				<Icon className="h-4 w-4 text-muted-foreground" />
			</div>
			<span className="font-medium text-sm">{label}</span>
		</Link>
	);
}

interface EmptyStateProps {
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	description: string;
	action?: React.ReactNode;
}

function EmptyState({
	icon: Icon,
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-8 text-center">
			<div className="mb-4 rounded-2xl bg-secondary/50 p-4">
				<Icon className="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 className="font-display font-semibold">{title}</h3>
			<p className="mt-1 text-muted-foreground text-sm">{description}</p>
			{action}
		</div>
	);
}
