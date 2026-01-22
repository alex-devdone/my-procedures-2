"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { DailyStats } from "@/app/api/analytics/analytics.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface CompletionChartProps {
	dailyBreakdown: DailyStats[] | undefined;
	isLoading?: boolean;
}

interface ChartDataPoint {
	date: string;
	displayDate: string;
	regularCompleted: number;
	recurringCompleted: number;
	recurringMissed: number;
}

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

function transformData(dailyBreakdown: DailyStats[]): ChartDataPoint[] {
	return dailyBreakdown.map((day) => ({
		date: day.date,
		displayDate: formatDate(day.date),
		regularCompleted: day.regularCompleted,
		recurringCompleted: day.recurringCompleted,
		recurringMissed: day.recurringMissed,
	}));
}

interface CustomTooltipProps {
	active?: boolean;
	payload?: Array<{
		name: string;
		value: number;
		color: string;
		dataKey: string;
	}>;
	label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
	if (!active || !payload || !payload.length) {
		return null;
	}

	return (
		<div className="rounded-md border bg-background p-3 shadow-md">
			<p className="mb-2 font-medium text-sm">{label}</p>
			{payload.map((entry) => (
				<div key={entry.dataKey} className="flex items-center gap-2 text-xs">
					<div
						className="h-3 w-3 rounded-sm"
						style={{ backgroundColor: entry.color }}
					/>
					<span className="text-muted-foreground">{entry.name}:</span>
					<span className="font-medium">{entry.value}</span>
				</div>
			))}
		</div>
	);
}

export function CompletionChart({
	dailyBreakdown,
	isLoading,
}: CompletionChartProps) {
	const chartData = dailyBreakdown ? transformData(dailyBreakdown) : [];
	const hasData = chartData.length > 0;

	return (
		<Card className="border-border/50 shadow-soft">
			<CardHeader>
				<CardTitle>Daily Completions</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-[300px] w-full" />
				) : !hasData ? (
					<div className="flex h-[300px] items-center justify-center text-muted-foreground">
						No completion data available
					</div>
				) : (
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={chartData}
								margin={{
									top: 10,
									right: 10,
									left: 0,
									bottom: 0,
								}}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-border"
								/>
								<XAxis
									dataKey="displayDate"
									tick={{ fontSize: 12 }}
									tickLine={false}
									axisLine={false}
									className="text-muted-foreground"
								/>
								<YAxis
									tick={{ fontSize: 12 }}
									tickLine={false}
									axisLine={false}
									allowDecimals={false}
									className="text-muted-foreground"
								/>
								<Tooltip content={<CustomTooltip />} />
								<Legend wrapperStyle={{ fontSize: "12px" }} iconType="square" />
								<Bar
									dataKey="regularCompleted"
									name="Regular"
									stackId="completed"
									fill="hsl(var(--chart-1))"
									radius={[0, 0, 0, 0]}
								/>
								<Bar
									dataKey="recurringCompleted"
									name="Recurring"
									stackId="completed"
									fill="hsl(var(--chart-2))"
									radius={[4, 4, 0, 0]}
								/>
								<Bar
									dataKey="recurringMissed"
									name="Missed Recurring"
									fill="hsl(var(--chart-5))"
									radius={[4, 4, 4, 4]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
