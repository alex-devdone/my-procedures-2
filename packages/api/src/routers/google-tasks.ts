import { and, db, eq, googleTasksIntegration } from "@my-procedures-2/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { protectedProcedure, router } from "../index";
import { GoogleTasksClient } from "../lib/google-tasks-client";

/**
 * Google Tasks router.
 *
 * Provides procedures for:
 * - Getting Google Tasks integration status
 * - Listing Google Tasks lists
 * - Syncing todos with Google Tasks
 * - Managing Google Tasks integration settings
 */
export const googleTasksRouter = router({
	/**
	 * Get the current user's Google Tasks integration status.
	 *
	 * Returns whether the integration is enabled, the last sync time,
	 * and the default task list ID.
	 */
	getStatus: protectedProcedure.query(async ({ ctx }) => {
		const integration = await db.query.googleTasksIntegration.findFirst({
			where: eq(googleTasksIntegration.userId, ctx.session.user.id),
		});

		if (!integration) {
			return {
				enabled: false,
				syncEnabled: false,
				lastSyncedAt: null,
				defaultListId: null,
				linked: false,
			};
		}

		return {
			enabled: integration.enabled,
			syncEnabled: integration.syncEnabled,
			lastSyncedAt: integration.lastSyncedAt?.toISOString() ?? null,
			defaultListId: integration.defaultListId ?? null,
			linked: true,
		};
	}),

	/**
	 * List all task lists from Google Tasks.
	 *
	 * Requires the user to have a linked Google account.
	 */
	listTaskLists: protectedProcedure.query(async ({ ctx }) => {
		const client = await GoogleTasksClient.forUser(ctx.session.user.id);
		const lists = await client.listTaskLists();

		return lists.map((list) => ({
			id: list.id,
			title: list.title,
			updated: list.updated,
		}));
	}),

	/**
	 * Create a new task list in Google Tasks.
	 *
	 * @param name - The name of the task list to create
	 */
	createTaskList: protectedProcedure
		.input(z.object({ name: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const client = await GoogleTasksClient.forUser(ctx.session.user.id);
			const list = await client.createTaskList(input.name);

			return {
				id: list.id,
				title: list.title,
				updated: list.updated,
			};
		}),

	/**
	 * List all tasks from a specific Google Tasks list.
	 *
	 * @param taskListId - The ID of the task list
	 * @param showDeleted - Whether to include deleted tasks
	 * @param showHidden - Whether to include hidden tasks
	 */
	listTasks: protectedProcedure
		.input(
			z.object({
				taskListId: z.string(),
				showDeleted: z.boolean().optional().default(false),
				showHidden: z.boolean().optional().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const client = await GoogleTasksClient.forUser(ctx.session.user.id);
			const tasks = await client.listTasks(
				input.taskListId,
				input.showDeleted,
				input.showHidden,
			);

			return tasks.map((task) => ({
				id: task.id,
				title: task.title,
				notes: task.notes ?? null,
				status: task.status,
				due: task.due ?? null,
				completed: task.completed ?? null,
				updated: task.updated,
				position: task.position,
				parent: task.parent,
				deleted: task.deleted ?? false,
				hidden: task.hidden ?? false,
			}));
		}),

	/**
	 * Enable Google Tasks integration for the current user.
	 *
	 * Creates or updates the integration record with the provided
	 * access and refresh tokens.
	 *
	 * @param accessToken - OAuth access token
	 * @param refreshToken - OAuth refresh token
	 * @param expiresIn - Token expiration time in seconds
	 * @param defaultListId - Optional default task list ID
	 */
	enableIntegration: protectedProcedure
		.input(
			z.object({
				accessToken: z.string(),
				refreshToken: z.string().optional(),
				expiresIn: z.number().positive(),
				defaultListId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tokenExpiresAt = new Date(Date.now() + input.expiresIn * 1000);

			// Check if integration already exists
			const [existing] = await db
				.select()
				.from(googleTasksIntegration)
				.where(eq(googleTasksIntegration.userId, ctx.session.user.id));

			if (existing) {
				// Update existing integration
				const [updated] = await db
					.update(googleTasksIntegration)
					.set({
						accessToken: input.accessToken,
						refreshToken: input.refreshToken ?? null,
						tokenExpiresAt,
						defaultListId: input.defaultListId ?? null,
						enabled: true,
						updatedAt: new Date(),
					})
					.where(eq(googleTasksIntegration.id, existing.id))
					.returning();

				return {
					id: updated.id,
					enabled: updated.enabled,
					defaultListId: updated.defaultListId,
				};
			}

			// Create new integration
			const [created] = await db
				.insert(googleTasksIntegration)
				.values({
					userId: ctx.session.user.id,
					accessToken: input.accessToken,
					refreshToken: input.refreshToken ?? null,
					tokenExpiresAt,
					defaultListId: input.defaultListId ?? null,
					enabled: true,
					syncEnabled: true,
				})
				.returning();

			return {
				id: created.id,
				enabled: created.enabled,
				defaultListId: created.defaultListId,
			};
		}),

	/**
	 * Disable Google Tasks integration for the current user.
	 *
	 * Sets the enabled flag to false but does not delete the integration
	 * record, allowing the user to re-enable later.
	 */
	disableIntegration: protectedProcedure.mutation(async ({ ctx }) => {
		const [existing] = await db
			.select()
			.from(googleTasksIntegration)
			.where(eq(googleTasksIntegration.userId, ctx.session.user.id));

		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Google Tasks integration not found",
			});
		}

		await db
			.update(googleTasksIntegration)
			.set({ enabled: false, updatedAt: new Date() })
			.where(eq(googleTasksIntegration.id, existing.id));

		return { success: true };
	}),

	/**
	 * Update Google Tasks integration settings.
	 *
	 * @param enabled - Whether the integration is enabled
	 * @param syncEnabled - Whether automatic sync is enabled
	 * @param defaultListId - The default task list ID
	 */
	updateSettings: protectedProcedure
		.input(
			z.object({
				enabled: z.boolean().optional(),
				syncEnabled: z.boolean().optional(),
				defaultListId: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await db
				.select()
				.from(googleTasksIntegration)
				.where(eq(googleTasksIntegration.userId, ctx.session.user.id));

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Google Tasks integration not found",
				});
			}

			const updateData: Record<string, boolean | string | Date | null> = {
				updatedAt: new Date(),
			};

			if (input.enabled !== undefined) {
				updateData.enabled = input.enabled;
			}

			if (input.syncEnabled !== undefined) {
				updateData.syncEnabled = input.syncEnabled;
			}

			if (input.defaultListId !== undefined) {
				updateData.defaultListId = input.defaultListId;
			}

			const [updated] = await db
				.update(googleTasksIntegration)
				.set(updateData)
				.where(eq(googleTasksIntegration.id, existing.id))
				.returning();

			return {
				enabled: updated.enabled,
				syncEnabled: updated.syncEnabled,
				defaultListId: updated.defaultListId,
			};
		}),

	/**
	 * Update the last synced timestamp for the integration.
	 *
	 * This is typically called after a successful sync operation.
	 */
	updateLastSynced: protectedProcedure.mutation(async ({ ctx }) => {
		const [existing] = await db
			.select()
			.from(googleTasksIntegration)
			.where(
				and(
					eq(googleTasksIntegration.userId, ctx.session.user.id),
					eq(googleTasksIntegration.enabled, true),
				),
			);

		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Google Tasks integration not found or not enabled",
			});
		}

		const [updated] = await db
			.update(googleTasksIntegration)
			.set({ lastSyncedAt: new Date(), updatedAt: new Date() })
			.where(eq(googleTasksIntegration.id, existing.id))
			.returning();

		return {
			lastSyncedAt: updated.lastSyncedAt?.toISOString() ?? null,
		};
	}),

	/**
	 * Delete a task from Google Tasks.
	 *
	 * @param taskListId - The ID of the task list
	 * @param taskId - The ID of the task to delete
	 */
	deleteTask: protectedProcedure
		.input(
			z.object({
				taskListId: z.string(),
				taskId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const client = await GoogleTasksClient.forUser(ctx.session.user.id);
			await client.deleteTask(input.taskListId, input.taskId);

			return { success: true };
		}),

	/**
	 * Get a single task from Google Tasks.
	 *
	 * @param taskListId - The ID of the task list
	 * @param taskId - The ID of the task
	 */
	getTask: protectedProcedure
		.input(
			z.object({
				taskListId: z.string(),
				taskId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const client = await GoogleTasksClient.forUser(ctx.session.user.id);
			const task = await client.getTask(input.taskListId, input.taskId);

			return {
				id: task.id,
				title: task.title,
				notes: task.notes ?? null,
				status: task.status,
				due: task.due ?? null,
				completed: task.completed ?? null,
				updated: task.updated,
				position: task.position,
				parent: task.parent,
			};
		}),

	/**
	 * Clear all completed tasks from a Google Tasks list.
	 *
	 * @param taskListId - The ID of the task list
	 */
	clearCompleted: protectedProcedure
		.input(z.object({ taskListId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const client = await GoogleTasksClient.forUser(ctx.session.user.id);
			await client.clearCompleted(input.taskListId);

			return { success: true };
		}),
});
