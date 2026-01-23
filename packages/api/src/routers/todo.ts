import {
	and,
	count,
	db,
	eq,
	googleTasksIntegration,
	gte,
	isNotNull,
	isNull,
	lt,
	lte,
	sql,
} from "@my-procedures-2/db";
import type { RecurringPattern } from "@my-procedures-2/db/schema/todo";
import { recurringTodoCompletion, todo } from "@my-procedures-2/db/schema/todo";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { protectedProcedure, router } from "../index";
import { GoogleTasksClient } from "../lib/google-tasks-client";
import { getNextOccurrence } from "../lib/recurring";

/**
 * Check if a date matches a recurring pattern.
 * Returns true if the date is a valid day for the pattern to trigger.
 *
 * @param pattern - The recurring pattern to check against
 * @param date - The date to check
 * @param startDate - Optional start date (the todo's creation/first occurrence date)
 * @returns true if the date matches the pattern
 */
function isDateMatchingPattern(
	pattern: RecurringPattern,
	date: Date,
	startDate?: Date | null,
): boolean {
	const dayOfWeek = date.getDay();
	const dayOfMonth = date.getDate();
	const month = date.getMonth() + 1; // 1-indexed

	// Check endDate first
	if (pattern.endDate) {
		const endDate = new Date(pattern.endDate);
		if (date > endDate) {
			return false;
		}
	}

	// For interval-based patterns, we need to check if the date falls on a valid interval
	const interval = pattern.interval ?? 1;

	switch (pattern.type) {
		case "daily": {
			if (interval === 1) {
				return true;
			}
			// For intervals > 1, check if the date is on the interval
			if (startDate) {
				const daysDiff = Math.floor(
					(date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
				);
				return daysDiff >= 0 && daysDiff % interval === 0;
			}
			return true;
		}

		case "weekly": {
			// Check if the day of week matches
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				if (!pattern.daysOfWeek.includes(dayOfWeek)) {
					return false;
				}
			}
			// For intervals > 1, check if the week is on the interval
			if (interval > 1 && startDate) {
				const weeksDiff = Math.floor(
					(date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7),
				);
				if (weeksDiff < 0 || weeksDiff % interval !== 0) {
					return false;
				}
			}
			return true;
		}

		case "monthly": {
			// Check if the day of month matches
			if (pattern.dayOfMonth !== undefined) {
				if (dayOfMonth !== pattern.dayOfMonth) {
					return false;
				}
			}
			// For intervals > 1, check if the month is on the interval
			if (interval > 1 && startDate) {
				const monthsDiff =
					(date.getFullYear() - startDate.getFullYear()) * 12 +
					(date.getMonth() - startDate.getMonth());
				if (monthsDiff < 0 || monthsDiff % interval !== 0) {
					return false;
				}
			}
			return true;
		}

		case "yearly": {
			// Check if month and day match
			if (
				pattern.monthOfYear !== undefined &&
				pattern.dayOfMonth !== undefined
			) {
				if (
					month !== pattern.monthOfYear ||
					dayOfMonth !== pattern.dayOfMonth
				) {
					return false;
				}
			} else if (pattern.monthOfYear !== undefined) {
				if (month !== pattern.monthOfYear) {
					return false;
				}
			} else if (pattern.dayOfMonth !== undefined) {
				if (dayOfMonth !== pattern.dayOfMonth) {
					return false;
				}
			}
			// For intervals > 1, check if the year is on the interval
			if (interval > 1 && startDate) {
				const yearsDiff = date.getFullYear() - startDate.getFullYear();
				if (yearsDiff < 0 || yearsDiff % interval !== 0) {
					return false;
				}
			}
			return true;
		}

		case "custom": {
			// Custom patterns use daysOfWeek like weekly
			if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
				if (!pattern.daysOfWeek.includes(dayOfWeek)) {
					return false;
				}
			}
			// For intervals > 1, check if the week is on the interval
			if (interval > 1 && startDate) {
				const weeksDiff = Math.floor(
					(date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7),
				);
				if (weeksDiff < 0 || weeksDiff % interval !== 0) {
					return false;
				}
			}
			return true;
		}

		default:
			return true;
	}
}

// Zod schema for recurring pattern validation
export const recurringPatternSchema = z.object({
	type: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
	interval: z.number().int().positive().optional(),
	daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
	dayOfMonth: z.number().int().min(1).max(31).optional(),
	monthOfYear: z.number().int().min(1).max(12).optional(),
	endDate: z.string().optional(),
	occurrences: z.number().int().positive().optional(),
	/** Time of day to send notification in HH:mm format (e.g., "09:00") */
	notifyAt: z
		.string()
		.regex(
			/^([01]\d|2[0-3]):([0-5]\d)$/,
			"Must be in HH:mm format (00:00-23:59)",
		)
		.default("09:00"),
});

export const todoRouter = router({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		return await db
			.select()
			.from(todo)
			.where(eq(todo.userId, ctx.session.user.id));
	}),

	create: protectedProcedure
		.input(
			z.object({
				text: z.string().min(1),
				folderId: z.number().nullable().optional(),
				dueDate: z.string().datetime().nullable().optional(),
				reminderAt: z.string().datetime().nullable().optional(),
				recurringPattern: recurringPatternSchema.nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return await db.insert(todo).values({
				text: input.text,
				userId: ctx.session.user.id,
				folderId: input.folderId ?? null,
				dueDate: input.dueDate ? new Date(input.dueDate) : null,
				reminderAt: input.reminderAt ? new Date(input.reminderAt) : null,
				recurringPattern: input.recurringPattern ?? null,
			});
		}),

	toggle: protectedProcedure
		.input(z.object({ id: z.number(), completed: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			const [existing] = await db
				.select()
				.from(todo)
				.where(
					and(eq(todo.id, input.id), eq(todo.userId, ctx.session.user.id)),
				);

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Todo not found or you do not have permission to modify it",
				});
			}

			// Update the local todo
			const [updated] = await db
				.update(todo)
				.set({ completed: input.completed })
				.where(eq(todo.id, input.id))
				.returning();

			// Sync to Google Tasks if enabled
			if (existing.googleSyncEnabled && existing.googleTaskId) {
				try {
					// Get the user's Google Tasks integration to find the default list ID
					const integration = await db.query.googleTasksIntegration.findFirst({
						where: eq(googleTasksIntegration.userId, ctx.session.user.id),
					});

					if (!integration || !integration.defaultListId) {
						// No integration configured or no default list - skip sync
						return updated;
					}

					// Create a Google Tasks client and sync the update
					const client = await GoogleTasksClient.forUser(ctx.session.user.id);
					await client.upsertTask(
						integration.defaultListId,
						{
							text: existing.text,
							completed: input.completed,
							dueDate: existing.dueDate,
						},
						existing.googleTaskId,
					);

					// Update the lastSyncedAt timestamp
					await db
						.update(todo)
						.set({ lastSyncedAt: new Date() })
						.where(eq(todo.id, input.id));
				} catch (error) {
					// Log the error but don't fail the toggle operation
					// The local todo has already been updated successfully
					console.error(
						`Failed to sync todo ${input.id} to Google Tasks:`,
						error,
					);
				}
			}

			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const [existing] = await db
				.select()
				.from(todo)
				.where(
					and(eq(todo.id, input.id), eq(todo.userId, ctx.session.user.id)),
				);

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Todo not found or you do not have permission to delete it",
				});
			}

			return await db.delete(todo).where(eq(todo.id, input.id));
		}),

	updateFolder: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				folderId: z.number().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await db
				.select()
				.from(todo)
				.where(
					and(eq(todo.id, input.id), eq(todo.userId, ctx.session.user.id)),
				);

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Todo not found or you do not have permission to modify it",
				});
			}

			return await db
				.update(todo)
				.set({ folderId: input.folderId })
				.where(eq(todo.id, input.id));
		}),

	bulkCreate: protectedProcedure
		.input(
			z.object({
				todos: z.array(
					z.object({
						text: z.string().min(1),
						completed: z.boolean(),
						folderId: z.number().nullable().optional(),
						dueDate: z.string().datetime().nullable().optional(),
						reminderAt: z.string().datetime().nullable().optional(),
						recurringPattern: recurringPatternSchema.nullable().optional(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.todos.length === 0) {
				return { count: 0 };
			}

			const values = input.todos.map((t) => ({
				text: t.text,
				completed: t.completed,
				userId: ctx.session.user.id,
				folderId: t.folderId ?? null,
				dueDate: t.dueDate ? new Date(t.dueDate) : null,
				reminderAt: t.reminderAt ? new Date(t.reminderAt) : null,
				recurringPattern: t.recurringPattern ?? null,
			}));

			await db.insert(todo).values(values);

			return { count: input.todos.length };
		}),

	updateSchedule: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				dueDate: z.string().datetime().nullable().optional(),
				reminderAt: z.string().datetime().nullable().optional(),
				recurringPattern: recurringPatternSchema.nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await db
				.select()
				.from(todo)
				.where(
					and(eq(todo.id, input.id), eq(todo.userId, ctx.session.user.id)),
				);

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Todo not found or you do not have permission to modify it",
				});
			}

			const updateData: Record<string, Date | null | object> = {};

			if (input.dueDate !== undefined) {
				updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
			}

			if (input.reminderAt !== undefined) {
				updateData.reminderAt = input.reminderAt
					? new Date(input.reminderAt)
					: null;
			}

			if (input.recurringPattern !== undefined) {
				updateData.recurringPattern = input.recurringPattern ?? null;
			}

			return await db.update(todo).set(updateData).where(eq(todo.id, input.id));
		}),

	getDueInRange: protectedProcedure
		.input(
			z.object({
				startDate: z.string().datetime(),
				endDate: z.string().datetime(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return await db
				.select()
				.from(todo)
				.where(
					and(
						eq(todo.userId, ctx.session.user.id),
						gte(todo.dueDate, new Date(input.startDate)),
						lte(todo.dueDate, new Date(input.endDate)),
					),
				);
		}),

	/**
	 * Complete a recurring todo:
	 * 1. Marks the current todo as completed
	 * 2. Creates a new todo with the next occurrence date (if pattern hasn't expired)
	 *
	 * @returns { completed: true, nextTodo: <new todo> | null }
	 */
	completeRecurring: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				completedOccurrences: z.number().int().nonnegative().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Fetch the existing todo
			const [existing] = await db
				.select()
				.from(todo)
				.where(
					and(eq(todo.id, input.id), eq(todo.userId, ctx.session.user.id)),
				);

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Todo not found or you do not have permission to modify it",
				});
			}

			// Check if todo has a recurring pattern
			if (!existing.recurringPattern) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Todo does not have a recurring pattern",
				});
			}

			const pattern = existing.recurringPattern as RecurringPattern;
			const completedOccurrences = input.completedOccurrences ?? 0;

			// Mark the current todo as completed
			await db
				.update(todo)
				.set({ completed: true })
				.where(eq(todo.id, input.id));

			// Calculate the next occurrence date
			// Use the current due date as the base, or now if no due date
			const baseDate = existing.dueDate ?? new Date();
			const nextDate = getNextOccurrence(
				pattern,
				baseDate,
				completedOccurrences + 1,
			);

			// If the pattern has expired, don't create a new todo
			if (!nextDate) {
				return {
					completed: true,
					nextTodo: null,
					message: "Recurring pattern has expired",
				};
			}

			// Calculate the next reminder if the original had one
			let nextReminderAt: Date | null = null;
			if (existing.reminderAt && existing.dueDate) {
				// Keep the same time offset between reminder and due date
				const reminderOffset =
					existing.dueDate.getTime() - existing.reminderAt.getTime();
				nextReminderAt = new Date(nextDate.getTime() - reminderOffset);
			}

			// Create the next occurrence
			const [newTodo] = await db
				.insert(todo)
				.values({
					text: existing.text,
					completed: false,
					userId: ctx.session.user.id,
					folderId: existing.folderId,
					dueDate: nextDate,
					reminderAt: nextReminderAt,
					recurringPattern: pattern,
				})
				.returning();

			// Record the completion in recurring_todo_completion table
			// Use the new todo's ID since it represents the continuing recurring series
			// The scheduledDate is the due date of the completed occurrence
			if (newTodo && existing.dueDate) {
				await db.insert(recurringTodoCompletion).values({
					todoId: newTodo.id,
					scheduledDate: existing.dueDate,
					completedAt: new Date(),
					userId: ctx.session.user.id,
				});
			}

			return {
				completed: true,
				nextTodo: newTodo,
				message: null,
			};
		}),

	/**
	 * Get completion history for recurring todos within a date range.
	 * Joins with todo data to include todo text.
	 *
	 * @param startDate - Start of date range (inclusive)
	 * @param endDate - End of date range (inclusive)
	 * @returns Array of completion records with associated todo data
	 */
	getCompletionHistory: protectedProcedure
		.input(
			z.object({
				startDate: z.string().datetime(),
				endDate: z.string().datetime(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const completions = await db
				.select({
					id: recurringTodoCompletion.id,
					todoId: recurringTodoCompletion.todoId,
					scheduledDate: recurringTodoCompletion.scheduledDate,
					completedAt: recurringTodoCompletion.completedAt,
					createdAt: recurringTodoCompletion.createdAt,
					todoText: todo.text,
				})
				.from(recurringTodoCompletion)
				.innerJoin(todo, eq(recurringTodoCompletion.todoId, todo.id))
				.where(
					and(
						eq(recurringTodoCompletion.userId, ctx.session.user.id),
						gte(
							recurringTodoCompletion.scheduledDate,
							new Date(input.startDate),
						),
						lte(recurringTodoCompletion.scheduledDate, new Date(input.endDate)),
					),
				);

			return completions;
		}),

	/**
	 * Get analytics for todos within a date range.
	 *
	 * Calculates:
	 * - Total regular (non-recurring) todos completed
	 * - Total recurring occurrences completed
	 * - Total recurring occurrences missed (scheduled before today with no completedAt)
	 * - Completion rate % (completed / total expected * 100)
	 * - Current streak (consecutive days with at least one completion)
	 * - Daily breakdown (regular completed, recurring completed, recurring missed per day)
	 *
	 * @param startDate - Start of date range (inclusive)
	 * @param endDate - End of date range (inclusive)
	 * @returns Analytics data for the date range
	 */
	getAnalytics: protectedProcedure
		.input(
			z.object({
				startDate: z.string().datetime(),
				endDate: z.string().datetime(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const startDate = new Date(input.startDate);
			const endDate = new Date(input.endDate);
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			// Get regular (non-recurring) todos completed in the date range
			// A regular todo is one without a recurringPattern that is completed
			const regularTodosCompleted = await db
				.select({ count: count() })
				.from(todo)
				.where(
					and(
						eq(todo.userId, ctx.session.user.id),
						eq(todo.completed, true),
						isNull(todo.recurringPattern),
						gte(todo.dueDate, startDate),
						lte(todo.dueDate, endDate),
					),
				);

			const totalRegularCompleted = regularTodosCompleted[0]?.count ?? 0;

			// Get recurring todo completion stats from recurringTodoCompletion table
			const recurringCompleted = await db
				.select({ count: count() })
				.from(recurringTodoCompletion)
				.where(
					and(
						eq(recurringTodoCompletion.userId, ctx.session.user.id),
						gte(recurringTodoCompletion.scheduledDate, startDate),
						lte(recurringTodoCompletion.scheduledDate, endDate),
						isNotNull(recurringTodoCompletion.completedAt),
					),
				);

			const totalRecurringCompleted = recurringCompleted[0]?.count ?? 0;

			// Get recurring missed: scheduled date before today (and within range) with no completedAt
			const recurringMissed = await db
				.select({ count: count() })
				.from(recurringTodoCompletion)
				.where(
					and(
						eq(recurringTodoCompletion.userId, ctx.session.user.id),
						gte(recurringTodoCompletion.scheduledDate, startDate),
						lte(recurringTodoCompletion.scheduledDate, endDate),
						lt(recurringTodoCompletion.scheduledDate, today),
						isNull(recurringTodoCompletion.completedAt),
					),
				);

			const totalRecurringMissed = recurringMissed[0]?.count ?? 0;

			// Total expected recurring = completed + missed
			const totalRecurringExpected =
				totalRecurringCompleted + totalRecurringMissed;

			// Calculate completion rate
			const totalCompleted = totalRegularCompleted + totalRecurringCompleted;
			const totalExpected = totalRegularCompleted + totalRecurringExpected;
			const completionRate =
				totalExpected > 0
					? Math.round((totalCompleted / totalExpected) * 100)
					: 100;

			// Calculate current streak (consecutive days with at least one completion)
			// Query all completion dates to calculate streak
			const completionDates = await db
				.select({
					date: sql<string>`DATE(${recurringTodoCompletion.completedAt})`.as(
						"date",
					),
				})
				.from(recurringTodoCompletion)
				.where(
					and(
						eq(recurringTodoCompletion.userId, ctx.session.user.id),
						isNotNull(recurringTodoCompletion.completedAt),
					),
				)
				.groupBy(sql`DATE(${recurringTodoCompletion.completedAt})`);

			// Also get regular todo completion dates (using dueDate as proxy since we don't have completedAt)
			const regularCompletionDates = await db
				.select({
					date: sql<string>`DATE(${todo.dueDate})`.as("date"),
				})
				.from(todo)
				.where(
					and(
						eq(todo.userId, ctx.session.user.id),
						eq(todo.completed, true),
						isNotNull(todo.dueDate),
					),
				)
				.groupBy(sql`DATE(${todo.dueDate})`);

			// Combine all completion dates and calculate streak
			const allCompletionDatesSet = new Set<string>();
			for (const row of completionDates) {
				if (row.date) allCompletionDatesSet.add(row.date);
			}
			for (const row of regularCompletionDates) {
				if (row.date) allCompletionDatesSet.add(row.date);
			}

			const allCompletionDates = Array.from(allCompletionDatesSet).sort(
				(a, b) => new Date(b).getTime() - new Date(a).getTime(),
			);

			let currentStreak = 0;
			const todayStr = today.toISOString().split("T")[0] ?? "";
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = yesterday.toISOString().split("T")[0] ?? "";

			// Start checking from today or yesterday
			let checkDate = todayStr;
			if (
				allCompletionDates.length > 0 &&
				allCompletionDates[0] !== todayStr &&
				allCompletionDates[0] === yesterdayStr
			) {
				// If no completion today but there's one yesterday, start from yesterday
				checkDate = yesterdayStr;
			}

			for (const dateStr of allCompletionDates) {
				if (dateStr === checkDate) {
					currentStreak++;
					const checkDateObj = new Date(checkDate);
					checkDateObj.setDate(checkDateObj.getDate() - 1);
					const newCheckDate = checkDateObj.toISOString().split("T")[0];
					checkDate = newCheckDate ?? "";
				} else if (new Date(dateStr) < new Date(checkDate)) {
					// Gap in dates, streak broken
					break;
				}
			}

			// Get daily breakdown within the date range
			// Group by date and count completions
			const dailyRecurringCompleted = await db
				.select({
					date: sql<string>`DATE(${recurringTodoCompletion.scheduledDate})`.as(
						"date",
					),
					count: count(),
				})
				.from(recurringTodoCompletion)
				.where(
					and(
						eq(recurringTodoCompletion.userId, ctx.session.user.id),
						gte(recurringTodoCompletion.scheduledDate, startDate),
						lte(recurringTodoCompletion.scheduledDate, endDate),
						isNotNull(recurringTodoCompletion.completedAt),
					),
				)
				.groupBy(sql`DATE(${recurringTodoCompletion.scheduledDate})`);

			const dailyRecurringMissed = await db
				.select({
					date: sql<string>`DATE(${recurringTodoCompletion.scheduledDate})`.as(
						"date",
					),
					count: count(),
				})
				.from(recurringTodoCompletion)
				.where(
					and(
						eq(recurringTodoCompletion.userId, ctx.session.user.id),
						gte(recurringTodoCompletion.scheduledDate, startDate),
						lte(recurringTodoCompletion.scheduledDate, endDate),
						lt(recurringTodoCompletion.scheduledDate, today),
						isNull(recurringTodoCompletion.completedAt),
					),
				)
				.groupBy(sql`DATE(${recurringTodoCompletion.scheduledDate})`);

			const dailyRegularCompleted = await db
				.select({
					date: sql<string>`DATE(${todo.dueDate})`.as("date"),
					count: count(),
				})
				.from(todo)
				.where(
					and(
						eq(todo.userId, ctx.session.user.id),
						eq(todo.completed, true),
						isNull(todo.recurringPattern),
						gte(todo.dueDate, startDate),
						lte(todo.dueDate, endDate),
					),
				)
				.groupBy(sql`DATE(${todo.dueDate})`);

			// Build daily breakdown map
			const dailyBreakdownMap = new Map<
				string,
				{
					date: string;
					regularCompleted: number;
					recurringCompleted: number;
					recurringMissed: number;
				}
			>();

			// Initialize all dates in range
			const currentDate = new Date(startDate);
			while (currentDate <= endDate) {
				const dateStr = currentDate.toISOString().split("T")[0] ?? "";
				dailyBreakdownMap.set(dateStr, {
					date: dateStr,
					regularCompleted: 0,
					recurringCompleted: 0,
					recurringMissed: 0,
				});
				currentDate.setDate(currentDate.getDate() + 1);
			}

			// Fill in the data
			for (const row of dailyRegularCompleted) {
				if (row.date) {
					const entry = dailyBreakdownMap.get(row.date);
					if (entry) {
						entry.regularCompleted = row.count;
					}
				}
			}

			for (const row of dailyRecurringCompleted) {
				if (row.date) {
					const entry = dailyBreakdownMap.get(row.date);
					if (entry) {
						entry.recurringCompleted = row.count;
					}
				}
			}

			for (const row of dailyRecurringMissed) {
				if (row.date) {
					const entry = dailyBreakdownMap.get(row.date);
					if (entry) {
						entry.recurringMissed = row.count;
					}
				}
			}

			const dailyBreakdown = Array.from(dailyBreakdownMap.values()).sort(
				(a, b) => a.date.localeCompare(b.date),
			);

			return {
				totalRegularCompleted,
				totalRecurringCompleted,
				totalRecurringMissed,
				completionRate,
				currentStreak,
				dailyBreakdown,
			};
		}),

	/**
	 * Insert, update, or delete a completion record for a past recurring todo occurrence.
	 * Used for "forgotten check-ins" where users need to retroactively mark completions.
	 *
	 * Operations:
	 * - If `completed` is true and no record exists: creates a new completion record
	 * - If `completed` is true and record exists: updates completedAt timestamp
	 * - If `completed` is false and record exists: removes the completedAt (marks as missed)
	 * - If `completed` is false and no record exists: creates a record with null completedAt
	 *
	 * @param todoId - The recurring todo ID
	 * @param scheduledDate - The date of the occurrence to update
	 * @param completed - Whether the occurrence was completed
	 * @returns The created/updated completion record or deletion confirmation
	 */
	updatePastCompletion: protectedProcedure
		.input(
			z.object({
				todoId: z.number(),
				scheduledDate: z.string().datetime(),
				completed: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify the todo exists and belongs to the user
			const [existingTodo] = await db
				.select()
				.from(todo)
				.where(
					and(eq(todo.id, input.todoId), eq(todo.userId, ctx.session.user.id)),
				);

			if (!existingTodo) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Todo not found or you do not have permission to modify it",
				});
			}

			// Verify the todo has a recurring pattern
			if (!existingTodo.recurringPattern) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Todo does not have a recurring pattern",
				});
			}

			const scheduledDate = new Date(input.scheduledDate);

			// Check if a completion record already exists for this todo and scheduled date
			const [existingCompletion] = await db
				.select()
				.from(recurringTodoCompletion)
				.where(
					and(
						eq(recurringTodoCompletion.todoId, input.todoId),
						eq(recurringTodoCompletion.scheduledDate, scheduledDate),
						eq(recurringTodoCompletion.userId, ctx.session.user.id),
					),
				);

			if (existingCompletion) {
				// Record exists - update it
				const [updated] = await db
					.update(recurringTodoCompletion)
					.set({
						completedAt: input.completed ? new Date() : null,
					})
					.where(eq(recurringTodoCompletion.id, existingCompletion.id))
					.returning();

				return {
					action: "updated" as const,
					completion: updated,
				};
			}

			// No existing record - create one
			const [created] = await db
				.insert(recurringTodoCompletion)
				.values({
					todoId: input.todoId,
					scheduledDate,
					completedAt: input.completed ? new Date() : null,
					userId: ctx.session.user.id,
				})
				.returning();

			return {
				action: "created" as const,
				completion: created,
			};
		}),

	/**
	 * Get all recurring todos that match dates within a specified date range.
	 * Uses pattern matching logic to determine which recurring todos would
	 * be scheduled on each date in the range.
	 *
	 * @param startDate - Start of date range (inclusive)
	 * @param endDate - End of date range (inclusive)
	 * @returns Array of objects containing the todo and an array of matching dates
	 */
	getRecurringTodosForDateRange: protectedProcedure
		.input(
			z.object({
				startDate: z.string().datetime(),
				endDate: z.string().datetime(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const startDate = new Date(input.startDate);
			const endDate = new Date(input.endDate);

			// Fetch all recurring todos for the user
			const recurringTodos = await db
				.select()
				.from(todo)
				.where(
					and(
						eq(todo.userId, ctx.session.user.id),
						isNotNull(todo.recurringPattern),
					),
				);

			const results: Array<{
				todo: (typeof recurringTodos)[0];
				matchingDates: Date[];
			}> = [];

			for (const t of recurringTodos) {
				const pattern = t.recurringPattern as RecurringPattern;
				const matchingDates: Date[] = [];

				// Use the todo's dueDate as the start reference for interval calculations
				// If no dueDate, pattern matching won't have a reference point for intervals
				const todoStartDate = t.dueDate;

				// Iterate through each date in the range
				const currentDate = new Date(startDate);
				// Normalize to start of day for consistent comparison
				currentDate.setHours(0, 0, 0, 0);

				const normalizedEndDate = new Date(endDate);
				normalizedEndDate.setHours(23, 59, 59, 999);

				while (currentDate <= normalizedEndDate) {
					// Check if this date is before the todo's start date (if it has one)
					if (todoStartDate) {
						const normalizedTodoStart = new Date(todoStartDate);
						normalizedTodoStart.setHours(0, 0, 0, 0);
						if (currentDate < normalizedTodoStart) {
							currentDate.setDate(currentDate.getDate() + 1);
							continue;
						}
					}

					// Check if pattern has expired by this date (based on occurrences)
					// We don't track completedOccurrences here, so we can only check endDate
					if (pattern.endDate) {
						const patternEndDate = new Date(pattern.endDate);
						if (currentDate > patternEndDate) {
							break; // Pattern has ended, no more matches possible
						}
					}

					// Check if the current date matches the pattern
					if (isDateMatchingPattern(pattern, currentDate, todoStartDate)) {
						matchingDates.push(new Date(currentDate));
					}

					currentDate.setDate(currentDate.getDate() + 1);
				}

				if (matchingDates.length > 0) {
					results.push({
						todo: t,
						matchingDates,
					});
				}
			}

			return results;
		}),
});
