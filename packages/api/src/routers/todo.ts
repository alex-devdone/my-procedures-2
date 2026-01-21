import { and, db, eq, gte, lte } from "@my-procedures-2/db";
import { todo } from "@my-procedures-2/db/schema/todo";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { protectedProcedure, router } from "../index";

// Zod schema for recurring pattern validation
export const recurringPatternSchema = z.object({
	type: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
	interval: z.number().int().positive().optional(),
	daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
	dayOfMonth: z.number().int().min(1).max(31).optional(),
	monthOfYear: z.number().int().min(1).max(12).optional(),
	endDate: z.string().optional(),
	occurrences: z.number().int().positive().optional(),
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
});
