import { and, db, eq, gt, gte, lt, sql } from "@my-procedures-2/db";
import { folder } from "@my-procedures-2/db/schema/folder";
import { todo } from "@my-procedures-2/db/schema/todo";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { protectedProcedure, router } from "../index";

// Zod validation schemas for folder inputs
export const folderColorSchema = z.enum([
	"slate",
	"red",
	"orange",
	"amber",
	"yellow",
	"lime",
	"green",
	"emerald",
	"teal",
	"cyan",
	"sky",
	"blue",
	"indigo",
	"violet",
	"purple",
	"fuchsia",
	"pink",
	"rose",
]);

export const createFolderInputSchema = z.object({
	name: z.string().min(1).max(100),
	color: folderColorSchema.optional().default("slate"),
});

export const updateFolderInputSchema = z.object({
	id: z.number(),
	name: z.string().min(1).max(100).optional(),
	color: folderColorSchema.optional(),
});

export const deleteFolderInputSchema = z.object({
	id: z.number(),
});

export const reorderFolderInputSchema = z.object({
	id: z.number(),
	newOrder: z.number().min(0),
});

export const bulkCreateFoldersInputSchema = z.object({
	folders: z.array(
		z.object({
			name: z.string().min(1).max(100),
			color: folderColorSchema.optional().default("slate"),
			order: z.number().min(0).optional(),
		}),
	),
});

export const folderRouter = router({
	list: protectedProcedure.query(async ({ ctx }) => {
		return await db
			.select()
			.from(folder)
			.where(eq(folder.userId, ctx.session.user.id))
			.orderBy(folder.order);
	}),

	create: protectedProcedure
		.input(createFolderInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Get the max order value for the user's folders
			const [maxOrderResult] = await db
				.select({ maxOrder: sql<number>`COALESCE(MAX(${folder.order}), -1)` })
				.from(folder)
				.where(eq(folder.userId, ctx.session.user.id));

			const newOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

			const [newFolder] = await db
				.insert(folder)
				.values({
					name: input.name,
					color: input.color,
					userId: ctx.session.user.id,
					order: newOrder,
				})
				.returning();

			return newFolder;
		}),

	update: protectedProcedure
		.input(updateFolderInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify ownership
			const [existing] = await db
				.select()
				.from(folder)
				.where(
					and(eq(folder.id, input.id), eq(folder.userId, ctx.session.user.id)),
				);

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message:
						"Folder not found or you do not have permission to modify it",
				});
			}

			const updateData: { name?: string; color?: string } = {};
			if (input.name !== undefined) updateData.name = input.name;
			if (input.color !== undefined) updateData.color = input.color;

			if (Object.keys(updateData).length === 0) {
				return existing;
			}

			const [updated] = await db
				.update(folder)
				.set(updateData)
				.where(eq(folder.id, input.id))
				.returning();

			return updated;
		}),

	delete: protectedProcedure
		.input(deleteFolderInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify ownership
			const [existing] = await db
				.select()
				.from(folder)
				.where(
					and(eq(folder.id, input.id), eq(folder.userId, ctx.session.user.id)),
				);

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message:
						"Folder not found or you do not have permission to delete it",
				});
			}

			// Move todos in this folder to Inbox (set folderId to null)
			await db
				.update(todo)
				.set({ folderId: null })
				.where(eq(todo.folderId, input.id));

			// Delete the folder
			await db.delete(folder).where(eq(folder.id, input.id));

			// Reorder remaining folders to close the gap
			await db
				.update(folder)
				.set({ order: sql`${folder.order} - 1` })
				.where(
					and(
						eq(folder.userId, ctx.session.user.id),
						gt(folder.order, existing.order),
					),
				);

			return { success: true };
		}),

	reorder: protectedProcedure
		.input(reorderFolderInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify ownership
			const [existing] = await db
				.select()
				.from(folder)
				.where(
					and(eq(folder.id, input.id), eq(folder.userId, ctx.session.user.id)),
				);

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message:
						"Folder not found or you do not have permission to reorder it",
				});
			}

			const oldOrder = existing.order;
			const newOrder = input.newOrder;

			if (oldOrder === newOrder) {
				return existing;
			}

			// Shift other folders to make room
			if (newOrder > oldOrder) {
				// Moving down: shift items between old and new positions up
				await db
					.update(folder)
					.set({ order: sql`${folder.order} - 1` })
					.where(
						and(
							eq(folder.userId, ctx.session.user.id),
							gt(folder.order, oldOrder),
							lt(folder.order, newOrder + 1),
						),
					);
			} else {
				// Moving up: shift items between new and old positions down
				await db
					.update(folder)
					.set({ order: sql`${folder.order} + 1` })
					.where(
						and(
							eq(folder.userId, ctx.session.user.id),
							gte(folder.order, newOrder),
							lt(folder.order, oldOrder),
						),
					);
			}

			// Update the moved folder's order
			const [updated] = await db
				.update(folder)
				.set({ order: newOrder })
				.where(eq(folder.id, input.id))
				.returning();

			return updated;
		}),

	bulkCreate: protectedProcedure
		.input(bulkCreateFoldersInputSchema)
		.mutation(async ({ ctx, input }) => {
			if (input.folders.length === 0) {
				return { count: 0, folders: [] };
			}

			// Get the current max order for the user's folders
			const [maxOrderResult] = await db
				.select({ maxOrder: sql<number>`COALESCE(MAX(${folder.order}), -1)` })
				.from(folder)
				.where(eq(folder.userId, ctx.session.user.id));

			let nextOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

			// Prepare folders for insertion, assigning orders
			const foldersToCreate = input.folders.map((f) => ({
				name: f.name,
				color: f.color,
				userId: ctx.session.user.id,
				order: f.order !== undefined ? f.order : nextOrder++,
			}));

			// Insert all folders
			const createdFolders = await db
				.insert(folder)
				.values(foldersToCreate)
				.returning();

			return { count: createdFolders.length, folders: createdFolders };
		}),
});
