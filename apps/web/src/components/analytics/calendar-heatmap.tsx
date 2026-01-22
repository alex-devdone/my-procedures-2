"use client";

import { useMemo } from "react";
import type { DailyStats } from "@/app/api/analytics/analytics.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface CalendarHeatmapProps {
	dailyBreakdown: DailyStats[] | undefined;
	startDate: string;
	endDate: string;
	isLoading?: boolean;
}

interface DayData {
	date: string;
	count: number;
	displayDate: string;
	dayOfWeek: number;
	weekIndex: number;
}

type IntensityLevel = 0 | 1 | 2 | 3 | 4;

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CELL_SIZE = 12;
const CELL_GAP = 3;

/**
 * Get the intensity level based on completion count
 * gray=0, light green=1-2, medium green=3-5, dark green=6+
 */
export function getIntensityLevel(count: number): IntensityLevel {
	if (count === 0) return 0;
	if (count <= 2) return 1;
	if (count <= 5) return 2;
	if (count <= 8) return 3;
	return 4;
}

/**
 * Get CSS classes for a given intensity level
 */
function getIntensityClasses(level: IntensityLevel): string {
	const classes: Record<IntensityLevel, string> = {
		0: "bg-muted",
		1: "bg-green-200 dark:bg-green-900",
		2: "bg-green-400 dark:bg-green-700",
		3: "bg-green-500 dark:bg-green-500",
		4: "bg-green-600 dark:bg-green-400",
	};
	return classes[level];
}

/**
 * Format a date string to a human-readable format
 */
function formatDisplayDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Generate all days between start and end dates
 */
function generateDateRange(startDate: string, endDate: string): Date[] {
	const dates: Date[] = [];
	const start = new Date(startDate);
	const end = new Date(endDate);

	// Reset to start of day in local timezone
	start.setHours(0, 0, 0, 0);
	end.setHours(0, 0, 0, 0);

	const current = new Date(start);
	while (current <= end) {
		dates.push(new Date(current));
		current.setDate(current.getDate() + 1);
	}

	return dates;
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Transform daily stats into a lookup map
 */
function createDailyStatsMap(
	dailyBreakdown: DailyStats[],
): Map<string, number> {
	const map = new Map<string, number>();
	for (const day of dailyBreakdown) {
		const total = day.regularCompleted + day.recurringCompleted;
		map.set(day.date, total);
	}
	return map;
}

/**
 * Process dates into grid data with week positioning
 */
function processGridData(
	dates: Date[],
	statsMap: Map<string, number>,
): { days: DayData[]; weekCount: number } {
	if (dates.length === 0) {
		return { days: [], weekCount: 0 };
	}

	let currentWeek = 0;

	const days: DayData[] = dates.map((date, index) => {
		const dayOfWeek = date.getDay();
		const dateKey = formatDateKey(date);

		// Start a new week when we hit Sunday (except for the first day)
		if (dayOfWeek === 0 && index > 0) {
			currentWeek++;
		}

		return {
			date: dateKey,
			count: statsMap.get(dateKey) ?? 0,
			displayDate: formatDisplayDate(dateKey),
			dayOfWeek,
			weekIndex: currentWeek,
		};
	});

	// Account for first week offset
	const lastDay = days[days.length - 1];
	const weekCount = lastDay ? lastDay.weekIndex + 1 : 0;

	return { days, weekCount };
}

interface HeatmapCellProps {
	day: DayData;
}

function HeatmapCell({ day }: HeatmapCellProps) {
	const level = getIntensityLevel(day.count);
	const intensityClass = getIntensityClasses(level);

	return (
		<div
			data-testid="heatmap-cell"
			data-date={day.date}
			data-count={day.count}
			data-level={level}
			title={`${day.displayDate}: ${day.count} completion${day.count !== 1 ? "s" : ""}`}
			className={cn(
				"rounded-sm transition-colors hover:ring-1 hover:ring-foreground/30",
				intensityClass,
			)}
			style={{
				width: CELL_SIZE,
				height: CELL_SIZE,
				gridRow: day.dayOfWeek + 1,
				gridColumn: day.weekIndex + 1,
			}}
		/>
	);
}

function HeatmapLegend() {
	const levels: IntensityLevel[] = [0, 1, 2, 3, 4];

	return (
		<div className="mt-4 flex items-center justify-end gap-1 text-muted-foreground text-xs">
			<span className="mr-1">Less</span>
			{levels.map((level) => (
				<div
					key={level}
					data-testid="legend-item"
					data-level={level}
					className={cn("rounded-sm", getIntensityClasses(level))}
					style={{ width: CELL_SIZE, height: CELL_SIZE }}
				/>
			))}
			<span className="ml-1">More</span>
		</div>
	);
}

function WeekdayLabels() {
	return (
		<div
			className="flex flex-col justify-between text-muted-foreground text-xs"
			style={{
				height: 7 * (CELL_SIZE + CELL_GAP) - CELL_GAP,
				marginRight: 4,
			}}
		>
			{DAYS_OF_WEEK.map((day, index) => (
				<span
					key={day}
					className={cn(index % 2 === 0 ? "invisible" : "")}
					style={{ height: CELL_SIZE, lineHeight: `${CELL_SIZE}px` }}
				>
					{day}
				</span>
			))}
		</div>
	);
}

export function CalendarHeatmap({
	dailyBreakdown,
	startDate,
	endDate,
	isLoading,
}: CalendarHeatmapProps) {
	const gridData = useMemo(() => {
		if (!dailyBreakdown || dailyBreakdown.length === 0) {
			return { days: [], weekCount: 0 };
		}

		const dates = generateDateRange(startDate, endDate);
		const statsMap = createDailyStatsMap(dailyBreakdown);
		return processGridData(dates, statsMap);
	}, [dailyBreakdown, startDate, endDate]);

	const totalCompletions = useMemo(() => {
		if (!dailyBreakdown) return 0;
		return dailyBreakdown.reduce(
			(sum, day) => sum + day.regularCompleted + day.recurringCompleted,
			0,
		);
	}, [dailyBreakdown]);

	const gridWidth = gridData.weekCount * (CELL_SIZE + CELL_GAP) - CELL_GAP;
	const gridHeight = 7 * (CELL_SIZE + CELL_GAP) - CELL_GAP;

	return (
		<Card className="border-border/50 shadow-soft">
			<CardHeader>
				<CardTitle>Activity</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<Skeleton className="h-[140px] w-full" />
				) : gridData.days.length === 0 ? (
					<div className="flex h-[140px] items-center justify-center text-muted-foreground">
						No activity data available
					</div>
				) : (
					<>
						<div className="mb-2 text-muted-foreground text-sm">
							{totalCompletions} completion
							{totalCompletions !== 1 ? "s" : ""} in this period
						</div>
						<div className="flex overflow-x-auto pb-2">
							<WeekdayLabels />
							<div
								data-testid="heatmap-grid"
								className="grid"
								style={{
									gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
									gridTemplateColumns: `repeat(${gridData.weekCount}, ${CELL_SIZE}px)`,
									gap: CELL_GAP,
									width: gridWidth,
									height: gridHeight,
								}}
							>
								{gridData.days.map((day) => (
									<HeatmapCell key={day.date} day={day} />
								))}
							</div>
						</div>
						<HeatmapLegend />
					</>
				)}
			</CardContent>
		</Card>
	);
}
