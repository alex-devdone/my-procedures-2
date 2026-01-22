"use client";

import { CheckCircle2, Clock, HourglassIcon, XCircle } from "lucide-react";
import { useUpdatePastCompletion } from "@/app/api/analytics";
import type {
	RecurringOccurrenceWithStatus,
	UnifiedCompletionHistoryRecord,
} from "@/app/api/analytics/analytics.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface CompletionHistoryListProps {
	/** Legacy prop: completion history records */
	history?: UnifiedCompletionHistoryRecord[] | undefined;
	/** New prop: recurring occurrences with status (preferred) */
	occurrences?: RecurringOccurrenceWithStatus[] | undefined;
	isLoading?: boolean;
}

type OccurrenceStatus = "completed" | "missed" | "pending";

interface StatusCellProps {
	completedAt: Date | null;
	status?: OccurrenceStatus;
}

function formatTime(date: Date): string {
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function StatusCell({ completedAt, status }: StatusCellProps) {
	// If status is provided, use it; otherwise infer from completedAt
	const effectiveStatus = status ?? (completedAt ? "completed" : "missed");

	if (effectiveStatus === "completed" && completedAt) {
		return (
			<div className="flex items-center gap-2 text-green-600 dark:text-green-400">
				<CheckCircle2 className="h-4 w-4" />
				<span className="text-xs">{formatTime(new Date(completedAt))}</span>
			</div>
		);
	}

	if (effectiveStatus === "pending") {
		return (
			<div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
				<HourglassIcon className="h-4 w-4" />
				<span className="text-xs">Pending</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2 text-muted-foreground">
			<XCircle className="h-4 w-4" />
			<span className="text-xs">Missed</span>
		</div>
	);
}

interface CompletionToggleProps {
	completedAt: Date | null;
	onToggle: () => void;
	isPending: boolean;
	status?: OccurrenceStatus;
}

function CompletionToggle({
	completedAt,
	onToggle,
	isPending,
	status,
}: CompletionToggleProps) {
	const effectiveStatus = status ?? (completedAt ? "completed" : "missed");
	const isCompleted = effectiveStatus === "completed";

	return (
		<button
			type="button"
			onClick={onToggle}
			disabled={isPending}
			className={cn(
				"inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-none border font-medium text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
				isCompleted
					? "border-green-600/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:border-green-400/30 dark:text-green-400"
					: "border-border bg-background hover:bg-muted hover:text-foreground",
				"h-7 w-12 rounded-none",
			)}
			aria-label={isCompleted ? "Mark as missed" : "Mark as completed"}
		>
			{isCompleted ? "Done" : "Miss"}
		</button>
	);
}

interface CompletionRowProps {
	record: UnifiedCompletionHistoryRecord | RecurringOccurrenceWithStatus;
	onToggle: () => void;
	isPending: boolean;
}

function isOccurrenceWithStatus(
	record: UnifiedCompletionHistoryRecord | RecurringOccurrenceWithStatus,
): record is RecurringOccurrenceWithStatus {
	return "status" in record;
}

function CompletionRow({ record, onToggle, isPending }: CompletionRowProps) {
	const scheduledDate = new Date(record.scheduledDate);
	const completedAt = record.completedAt ? new Date(record.completedAt) : null;
	const status = isOccurrenceWithStatus(record) ? record.status : undefined;
	const todoText = isOccurrenceWithStatus(record)
		? record.todoText
		: (record.todoText ?? "");

	return (
		<div
			className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-border/50 border-b py-3 last:border-0 sm:gap-4"
			data-testid="completion-row"
			data-todo-id={record.todoId}
			data-status={status}
		>
			{/* Todo text */}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm" title={todoText}>
					{todoText}
				</p>
			</div>

			{/* Scheduled date */}
			<div className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
				<Clock className="h-3.5 w-3.5 shrink-0" />
				<span className="whitespace-nowrap">{formatDate(scheduledDate)}</span>
			</div>

			{/* Status */}
			<StatusCell completedAt={completedAt} status={status} />

			{/* Toggle button */}
			<CompletionToggle
				completedAt={completedAt}
				onToggle={onToggle}
				isPending={isPending}
				status={status}
			/>
		</div>
	);
}

interface LoadingRowProps {
	index: number;
}

function LoadingRow({ index }: LoadingRowProps) {
	return (
		<div
			className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-border/50 border-b py-3 last:border-0 sm:gap-4"
			data-testid="loading-row"
			data-index={index}
		>
			<Skeleton className="h-5 w-full" />
			<Skeleton className="h-5 w-20" />
			<Skeleton className="h-5 w-16" />
			<Skeleton className="h-7 w-12" />
		</div>
	);
}

export function CompletionHistoryList({
	history,
	occurrences,
	isLoading,
}: CompletionHistoryListProps) {
	const updatePastCompletion = useUpdatePastCompletion();

	const handleToggle = (
		todoId: string | number,
		scheduledDate: Date,
		completedAt: Date | null,
	) => {
		updatePastCompletion.mutate({
			todoId,
			scheduledDate: scheduledDate.toISOString(),
			completed: completedAt === null,
		});
	};

	// Prefer occurrences over history if both are provided
	const data = occurrences ?? history;
	const hasData = data && data.length > 0;
	const isLoadingRows = isLoading && !hasData;

	return (
		<Card className="border-border/50 shadow-soft">
			<CardHeader>
				<CardTitle>Completion History</CardTitle>
			</CardHeader>
			<CardContent>
				{/* Header row - visible on larger screens */}
				<div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4 sm:border-border/50 sm:border-b sm:pb-2 sm:text-muted-foreground sm:text-xs">
					<div>Todo</div>
					<div className="flex items-center gap-1.5">
						<Clock className="h-3.5 w-3.5" />
						<span>Scheduled</span>
					</div>
					<div>Status</div>
					<div>Action</div>
				</div>

				{/* List content */}
				{isLoadingRows ? (
					<div className="space-y-0">
						{Array.from({ length: 5 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Static loading skeleton, index is safe here
							<LoadingRow key={`loading-${i}`} index={i} />
						))}
					</div>
				) : !hasData ? (
					<div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
						No recurring occurrences in this period
					</div>
				) : (
					<div className="space-y-0">
						{data.map((record) => {
							const isOccurrence = isOccurrenceWithStatus(record);
							const todoId = record.todoId;
							const scheduledDate = new Date(record.scheduledDate);
							const completedAt = record.completedAt
								? new Date(record.completedAt)
								: null;
							const key = isOccurrence
								? record.id
								: `${record.todoId}-${scheduledDate.toISOString()}`;

							return (
								<CompletionRow
									key={key}
									record={record}
									onToggle={() =>
										handleToggle(todoId, scheduledDate, completedAt)
									}
									isPending={updatePastCompletion.isPending}
								/>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
