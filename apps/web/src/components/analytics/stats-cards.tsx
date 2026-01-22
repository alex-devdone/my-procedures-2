"use client";

import { CheckCircle2, Flame, Target, XCircle } from "lucide-react";
import type { AnalyticsData } from "@/app/api/analytics/analytics.types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
	title: string;
	value: string | number;
	icon: React.ComponentType<{ className?: string }>;
	color: "green" | "blue" | "amber" | "red";
	isLoading?: boolean;
}

function StatCard({
	title,
	value,
	icon: Icon,
	color,
	isLoading,
}: StatCardProps) {
	const colorClasses = {
		green: "bg-green-500/10 text-green-600 dark:text-green-400",
		blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
		amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
		red: "bg-red-500/10 text-red-600 dark:text-red-400",
	};

	return (
		<Card className="border-border/50 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-medium">
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

export interface StatsCardsProps {
	analytics: AnalyticsData | undefined;
	isLoading?: boolean;
}

export function StatsCards({ analytics, isLoading }: StatsCardsProps) {
	const totalCompleted = analytics
		? analytics.totalRegularCompleted + analytics.totalRecurringCompleted
		: 0;

	const completionRate = analytics?.completionRate ?? 0;
	const currentStreak = analytics?.currentStreak ?? 0;
	const missedRecurring = analytics?.totalRecurringMissed ?? 0;

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatCard
				title="Total Completed"
				value={totalCompleted}
				icon={CheckCircle2}
				color="green"
				isLoading={isLoading}
			/>
			<StatCard
				title="Completion Rate"
				value={`${completionRate}%`}
				icon={Target}
				color="blue"
				isLoading={isLoading}
			/>
			<StatCard
				title="Current Streak"
				value={`${currentStreak} ${currentStreak === 1 ? "day" : "days"}`}
				icon={Flame}
				color="amber"
				isLoading={isLoading}
			/>
			<StatCard
				title="Missed Recurring"
				value={missedRecurring}
				icon={XCircle}
				color="red"
				isLoading={isLoading}
			/>
		</div>
	);
}
