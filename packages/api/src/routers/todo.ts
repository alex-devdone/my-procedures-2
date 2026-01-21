import { and, db, eq, gte, lte } from "@my-procedures-2/db";
import type { RecurringPattern } from "@my-procedures-2/db/schema/todo";
import { recurringTodoCompletion, todo } from "@my-procedures-2/db/schema/todo";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { protectedProcedure, router } from "../index";
import { getNextOccurrence } from "../lib/recurring";

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

			return await db
				.update(todo)
				.set({ completed: input.completed })
				.where(eq(todo.id, input.id));
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
});
