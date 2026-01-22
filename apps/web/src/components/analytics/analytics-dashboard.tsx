"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
	useAnalytics,
	useRecurringOccurrencesWithStatus,
} from "@/app/api/analytics";
import { CalendarHeatmap } from "@/components/analytics/calendar-heatmap";
import { CompletionChart } from "@/components/analytics/completion-chart";
import { CompletionHistoryList } from "@/components/analytics/completion-history-list";
import { StatsCards } from "@/components/analytics/stats-cards";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TabValue = "overview" | "history";
type DateRangePreset = "7days" | "14days" | "30days" | "90days";

interface DateRangePresetConfig {
	label: string;
	days: number;
}

const DATE_RANGE_PRESETS: Record<DateRangePreset, DateRangePresetConfig> = {
	"7days": { label: "7 days", days: 7 },
	"14days": { label: "14 days", days: 14 },
	"30days": { label: "30 days", days: 30 },
	"90days": { label: "90 days", days: 90 },
};

/**
 * Get date range for a given preset, shifted by offset days
 */
function getDateRange(
	preset: DateRangePreset,
	offset = 0,
): { startDate: string; endDate: string } {
	const days = DATE_RANGE_PRESETS[preset].days;
	const now = new Date();
	const endDate = new Date(now);
	const startDate = new Date(now);

	// Apply offset to both start and end dates
	endDate.setDate(endDate.getDate() + offset);
	startDate.setDate(startDate.getDate() - (days - 1) + offset);

	// Reset times to start/end of day
	startDate.setHours(0, 0, 0, 0);
	endDate.setHours(23, 59, 59, 999);

	return {
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
	};
}

/**
 * Format a date range for display
 */
function formatDateRangeDisplay(startDate: string, endDate: string): string {
	const start = new Date(startDate);
	const end = new Date(endDate);

	const startFormatted = start.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
	const endFormatted = end.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	// If same year, show shorter format
	if (start.getFullYear() === end.getFullYear()) {
		return `${startFormatted} - ${endFormatted}`;
	}

	return `${startFormatted}, ${start.getFullYear()} - ${endFormatted}`;
}

interface TabButtonProps {
	label: string;
	isActive: boolean;
	onClick: () => void;
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200",
				isActive
					? "bg-card text-foreground shadow-soft"
					: "text-muted-foreground hover:text-foreground",
			)}
			aria-selected={isActive}
			role="tab"
		>
			{label}
		</button>
	);
}

interface DateRangeSelectorProps {
	currentPreset: DateRangePreset;
	offset: number;
	onPresetChange: (preset: DateRangePreset) => void;
	onOffsetChange: (offset: number) => void;
}

function DateRangeSelector({
	currentPreset,
	offset,
	onPresetChange,
	onOffsetChange,
}: DateRangeSelectorProps) {
	const dateRange = getDateRange(currentPreset, offset);
	const canGoForward = offset < 0; // Can go forward if we're in the past
	const canGoBack = true; // Can always go back

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			{/* Preset buttons */}
			<div className="flex items-center gap-1 rounded-xl bg-secondary/50 p-1">
				{(Object.keys(DATE_RANGE_PRESETS) as DateRangePreset[]).map(
					(preset) => (
						<button
							type="button"
							key={preset}
							onClick={() => {
								onPresetChange(preset);
								onOffsetChange(0);
							}}
							className={cn(
								"rounded-lg px-3 py-1.5 font-medium text-xs transition-all duration-200 sm:text-sm",
								currentPreset === preset
									? "bg-card text-foreground shadow-soft"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{DATE_RANGE_PRESETS[preset].label}
						</button>
					),
				)}
			</div>

			{/* Navigation */}
			<div className="flex items-center gap-3">
				{/* Date display */}
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<Calendar className="h-4 w-4" />
					<span className="whitespace-nowrap">
						{formatDateRangeDisplay(dateRange.startDate, dateRange.endDate)}
					</span>
				</div>

				{/* Navigation buttons */}
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="outline"
						size="icon-xs"
						onClick={() => onOffsetChange(offset - 1)}
						disabled={!canGoBack}
						aria-label="Previous period"
					>
						<ChevronLeft className="h-3.5 w-3.5" />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon-xs"
						onClick={() => onOffsetChange(offset + 1)}
						disabled={!canGoForward}
						aria-label="Next period"
					>
						<ChevronRight className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
}

export interface AnalyticsDashboardProps {
	initialPreset?: DateRangePreset;
}

export function AnalyticsDashboard({
	initialPreset = "7days",
}: AnalyticsDashboardProps) {
	const [activeTab, setActiveTab] = useState<TabValue>("overview");
	const [datePreset, setDatePreset] = useState<DateRangePreset>(initialPreset);
	const [dateOffset, setDateOffset] = useState(0);

	const dateRange = useMemo(
		() => getDateRange(datePreset, dateOffset),
		[datePreset, dateOffset],
	);

	const startDateKey = useMemo(
		() => new Date(dateRange.startDate).toISOString().split("T")[0],
		[dateRange.startDate],
	);
	const endDateKey = useMemo(
		() => new Date(dateRange.endDate).toISOString().split("T")[0],
		[dateRange.endDate],
	);

	const {
		data: analytics,
		isLoading: analyticsLoading,
		error: analyticsError,
	} = useAnalytics(dateRange.startDate, dateRange.endDate);

	const {
		data: occurrences,
		isLoading: occurrencesLoading,
		isError: occurrencesError,
	} = useRecurringOccurrencesWithStatus(dateRange.startDate, dateRange.endDate);

	const isLoading = analyticsLoading || occurrencesLoading;
	const hasError = analyticsError || occurrencesError;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
					Analytics
				</h1>
				<p className="mt-2 text-muted-foreground">
					Track your task completion progress and patterns
				</p>
			</div>

			{/* Date Range Selector */}
			<div className="stagger-1 animate-fade-up opacity-0">
				<DateRangeSelector
					currentPreset={datePreset}
					offset={dateOffset}
					onPresetChange={setDatePreset}
					onOffsetChange={setDateOffset}
				/>
			</div>

			{/* Tabs */}
			<div className="stagger-2 animate-fade-up opacity-0">
				<div className="flex items-center gap-1 rounded-xl bg-secondary/50 p-1">
					<TabButton
						label="Overview"
						isActive={activeTab === "overview"}
						onClick={() => setActiveTab("overview")}
					/>
					<TabButton
						label="History"
						isActive={activeTab === "history"}
						onClick={() => setActiveTab("history")}
					/>
				</div>
			</div>

			{/* Error State */}
			{hasError && (
				<div
					className="animate-fade-up rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center opacity-0"
					data-testid="analytics-error"
				>
					<p className="font-medium text-destructive">
						Failed to load analytics data
					</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Please try again later
					</p>
				</div>
			)}

			{/* Content */}
			{!hasError && (
				<>
					{/* Overview Tab */}
					{activeTab === "overview" && (
						<div className="space-y-6">
							{/* Stats Cards */}
							<div className="stagger-3 animate-fade-up opacity-0">
								<StatsCards analytics={analytics} isLoading={isLoading} />
							</div>

							{/* Completion Chart */}
							<div className="stagger-4 animate-fade-up opacity-0">
								<CompletionChart
									dailyBreakdown={analytics?.dailyBreakdown}
									isLoading={isLoading}
								/>
							</div>
						</div>
					)}

					{/* History Tab */}
					{activeTab === "history" && (
						<div className="grid gap-6 lg:grid-cols-2">
							{/* Calendar Heatmap */}
							<div className="stagger-3 animate-fade-up opacity-0">
								<CalendarHeatmap
									dailyBreakdown={analytics?.dailyBreakdown}
									startDate={startDateKey}
									endDate={endDateKey}
									isLoading={isLoading}
								/>
							</div>

							{/* Completion History List */}
							<div className="stagger-4 animate-fade-up opacity-0 lg:col-span-1">
								<CompletionHistoryList
									occurrences={occurrences}
									isLoading={isLoading}
								/>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
