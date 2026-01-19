import { and, db, eq } from "@my-procedures-2/db";
import { todo } from "@my-procedures-2/db/schema/todo";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { protectedProcedure, router } from "../index";

export const todoRouter = router({
	getAll: protectedProcedure.query(async ({ ctx }) => {
		return await db
			.select()
			.from(todo)
			.where(eq(todo.userId, ctx.session.user.id));
	}),

	create: protectedProcedure
		.input(z.object({ text: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			return await db.insert(todo).values({
				text: input.text,
				userId: ctx.session.user.id,
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
});
