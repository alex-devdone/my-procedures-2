import { and, db, eq, gt, gte, lt, sql } from "@my-procedures-2/db";
import { subtask } from "@my-procedures-2/db/schema/subtask";
import { todo } from "@my-procedures-2/db/schema/todo";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { protectedProcedure, router } from "../index";

// Zod validation schemas for subtask inputs
export const createSubtaskInputSchema = z.object({
	todoId: z.number(),
	text: z.string().min(1).max(500),
});

export const updateSubtaskInputSchema = z.object({
	id: z.number(),
	text: z.string().min(1).max(500).optional(),
});

export const deleteSubtaskInputSchema = z.object({
	id: z.number(),
});

export const toggleSubtaskInputSchema = z.object({
	id: z.number(),
	completed: z.boolean(),
});

export const reorderSubtaskInputSchema = z.object({
	id: z.number(),
	newOrder: z.number().min(0),
});

export const listSubtasksInputSchema = z.object({
	todoId: z.number(),
});

// Helper function to verify todo ownership
async function verifyTodoOwnership(todoId: number, userId: string) {
	const [existingTodo] = await db
		.select()
		.from(todo)
		.where(and(eq(todo.id, todoId), eq(todo.userId, userId)));

	if (!existingTodo) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Todo not found or you do not have permission to access it",
		});
	}

	return existingTodo;
}

// Helper function to verify subtask ownership (via todo)
async function verifySubtaskOwnership(subtaskId: number, userId: string) {
	const [existingSubtask] = await db
		.select({
			subtask: subtask,
			todo: todo,
		})
		.from(subtask)
		.innerJoin(todo, eq(subtask.todoId, todo.id))
		.where(and(eq(subtask.id, subtaskId), eq(todo.userId, userId)));

	if (!existingSubtask) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Subtask not found or you do not have permission to access it",
		});
	}

	return existingSubtask;
}

// Helper function to check and auto-complete parent todo
async function checkAndAutoCompleteTodo(todoId: number) {
	// Get all subtasks for this todo
	const subtasks = await db
		.select()
		.from(subtask)
		.where(eq(subtask.todoId, todoId));

	// If there are no subtasks, do nothing
	if (subtasks.length === 0) {
		return;
	}

	// Check if all subtasks are completed
	const allCompleted = subtasks.every((s) => s.completed);

	// Update the parent todo's completed status
	await db
		.update(todo)
		.set({ completed: allCompleted })
		.where(eq(todo.id, todoId));
}

export const subtaskRouter = router({
	list: protectedProcedure
		.input(listSubtasksInputSchema)
		.query(async ({ ctx, input }) => {
			// Verify the todo belongs to the user
			await verifyTodoOwnership(input.todoId, ctx.session.user.id);

			return await db
				.select()
				.from(subtask)
				.where(eq(subtask.todoId, input.todoId))
				.orderBy(subtask.order);
		}),

	create: protectedProcedure
		.input(createSubtaskInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify the todo belongs to the user
			await verifyTodoOwnership(input.todoId, ctx.session.user.id);

			// Get the max order value for the todo's subtasks
			const [maxOrderResult] = await db
				.select({ maxOrder: sql<number>`COALESCE(MAX(${subtask.order}), -1)` })
				.from(subtask)
				.where(eq(subtask.todoId, input.todoId));

			const newOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

			const [newSubtask] = await db
				.insert(subtask)
				.values({
					text: input.text,
					todoId: input.todoId,
					order: newOrder,
					completed: false,
				})
				.returning();

			// Adding a subtask doesn't change auto-complete status (new subtask is incomplete)
			// But we should ensure parent is marked incomplete if it was completed
			await db
				.update(todo)
				.set({ completed: false })
				.where(eq(todo.id, input.todoId));

			return newSubtask;
		}),

	update: protectedProcedure
		.input(updateSubtaskInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify ownership via todo
			const existing = await verifySubtaskOwnership(
				input.id,
				ctx.session.user.id,
			);

			if (input.text === undefined) {
				return existing.subtask;
			}

			const [updated] = await db
				.update(subtask)
				.set({ text: input.text })
				.where(eq(subtask.id, input.id))
				.returning();

			return updated;
		}),

	delete: protectedProcedure
		.input(deleteSubtaskInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify ownership via todo
			const existing = await verifySubtaskOwnership(
				input.id,
				ctx.session.user.id,
			);

			const todoId = existing.subtask.todoId;
			const deletedOrder = existing.subtask.order;

			// Delete the subtask
			await db.delete(subtask).where(eq(subtask.id, input.id));

			// Reorder remaining subtasks to close the gap
			await db
				.update(subtask)
				.set({ order: sql`${subtask.order} - 1` })
				.where(
					and(eq(subtask.todoId, todoId), gt(subtask.order, deletedOrder)),
				);

			// Check if we should auto-complete the parent todo
			await checkAndAutoCompleteTodo(todoId);

			return { success: true };
		}),

	toggle: protectedProcedure
		.input(toggleSubtaskInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify ownership via todo
			const existing = await verifySubtaskOwnership(
				input.id,
				ctx.session.user.id,
			);

			const [updated] = await db
				.update(subtask)
				.set({ completed: input.completed })
				.where(eq(subtask.id, input.id))
				.returning();

			// Check and auto-complete parent todo
			await checkAndAutoCompleteTodo(existing.subtask.todoId);

			return updated;
		}),

	reorder: protectedProcedure
		.input(reorderSubtaskInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify ownership via todo
			const existing = await verifySubtaskOwnership(
				input.id,
				ctx.session.user.id,
			);

			const oldOrder = existing.subtask.order;
			const newOrder = input.newOrder;
			const todoId = existing.subtask.todoId;

			if (oldOrder === newOrder) {
				return existing.subtask;
			}

			// Shift other subtasks to make room
			if (newOrder > oldOrder) {
				// Moving down: shift items between old and new positions up
				await db
					.update(subtask)
					.set({ order: sql`${subtask.order} - 1` })
					.where(
						and(
							eq(subtask.todoId, todoId),
							gt(subtask.order, oldOrder),
							lt(subtask.order, newOrder + 1),
						),
					);
			} else {
				// Moving up: shift items between new and old positions down
				await db
					.update(subtask)
					.set({ order: sql`${subtask.order} + 1` })
					.where(
						and(
							eq(subtask.todoId, todoId),
							gte(subtask.order, newOrder),
							lt(subtask.order, oldOrder),
						),
					);
			}

			// Update the moved subtask's order
			const [updated] = await db
				.update(subtask)
				.set({ order: newOrder })
				.where(eq(subtask.id, input.id))
				.returning();

			return updated;
		}),
});
