import { GoogleTasksClient } from "@my-procedures-2/api/lib/google-tasks-client";
import { and, db, eq, googleTasksIntegration, todo } from "@my-procedures-2/db";
import { env } from "@my-procedures-2/env/server";

export const maxDuration = 300;

type SyncResult = {
	userId: string;
	success: boolean;
	error?: string;
	todosSynced: number;
	todosCreated: number;
	todosUpdated: number;
};

/**
 * GET handler for Vercel Cron to sync Google Tasks.
 *
 * This endpoint is called by Vercel Cron on a schedule (e.g., every 15 minutes).
 * It verifies the request is authorized via CRON_SECRET, then syncs Google Tasks
 * for all users with enabled integrations.
 *
 * Authentication: Bearer token in Authorization header must match CRON_SECRET
 */
export async function GET(req: Request) {
	// Verify cron secret
	const authHeader = req.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const token = authHeader.slice(7);
	if (token !== env.CRON_SECRET) {
		return Response.json({ error: "Invalid token" }, { status: 401 });
	}

	try {
		// Find all enabled integrations with sync enabled
		const integrations = await db.query.googleTasksIntegration.findMany({
			where: and(
				eq(googleTasksIntegration.enabled, true),
				eq(googleTasksIntegration.syncEnabled, true),
			),
		});

		if (integrations.length === 0) {
			return Response.json({
				success: true,
				message: "No integrations to sync",
				results: [],
			});
		}

		// Sync each integration
		const results: SyncResult[] = [];
		for (const integration of integrations) {
			const result = await syncUserTodos(integration.userId, integration);
			results.push(result);
		}

		// Summary stats
		const successCount = results.filter((r) => r.success).length;
		const totalTodosSynced = results.reduce((sum, r) => sum + r.todosSynced, 0);
		const totalTodosCreated = results.reduce(
			(sum, r) => sum + r.todosCreated,
			0,
		);
		const totalTodosUpdated = results.reduce(
			(sum, r) => sum + r.todosUpdated,
			0,
		);

		return Response.json({
			success: true,
			summary: {
				total: results.length,
				successful: successCount,
				failed: results.length - successCount,
				totalTodosSynced,
				totalTodosCreated,
				totalTodosUpdated,
			},
			results,
		});
	} catch (error) {
		console.error("Google Tasks sync failed:", error);
		return Response.json(
			{
				error: "Sync failed",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * Sync todos for a single user.
 *
 * Fetches all tasks from the user's default Google Tasks list and syncs them
 * with local todos using last-write-wins strategy based on updated timestamps.
 */
async function syncUserTodos(
	userId: string,
	integration: {
		id: number;
		defaultListId: string | null;
	},
): Promise<SyncResult> {
	const result: SyncResult = {
		userId,
		success: false,
		todosSynced: 0,
		todosCreated: 0,
		todosUpdated: 0,
	};

	try {
		// Get the Google Tasks client
		const client = await GoogleTasksClient.forUser(userId);

		// Use default list ID or fetch the first available list
		let taskListId = integration.defaultListId;
		if (!taskListId) {
			const lists = await client.listTaskLists();
			if (lists.length === 0) {
				throw new Error("No Google Tasks lists found");
			}
			taskListId = lists[0].id;
		}

		// Fetch all tasks from Google (include deleted to handle deletions)
		const googleTasks = await client.listTasks(taskListId, true, false);

		// Get all local todos with Google sync enabled for this user
		const localTodos = await db.query.todo.findMany({
			where: eq(todo.userId, userId),
		});

		// Create maps for efficient lookup
		const googleTasksMap = new Map(googleTasks.map((task) => [task.id, task]));
		const localTodosMap = new Map<string, (typeof localTodos)[number]>();
		for (const localTodo of localTodos) {
			if (localTodo.googleTaskId) {
				localTodosMap.set(localTodo.googleTaskId, localTodo);
			}
		}

		// Track which Google task IDs we've seen
		const processedGoogleTaskIds = new Set<string>();

		// Sync: Google -> Local (for linked todos)
		for (const [googleTaskId, googleTask] of googleTasksMap) {
			processedGoogleTaskIds.add(googleTaskId);

			if (googleTask.deleted) {
				// Handle deleted Google tasks
				const localTodo = localTodosMap.get(googleTaskId);
				if (localTodo) {
					// Only delete if Google was updated more recently
					if (
						!localTodo.lastSyncedAt ||
						new Date(googleTask.updated) > localTodo.lastSyncedAt
					) {
						await db
							.update(todo)
							.set({
								completed: true,
								lastSyncedAt: new Date(),
							})
							.where(eq(todo.id, localTodo.id));
						result.todosUpdated++;
					}
				}
				continue;
			}

			const localTodo = localTodosMap.get(googleTaskId);

			if (localTodo) {
				// Existing linked todo - check if update needed
				const googleUpdatedAt = new Date(googleTask.updated);
				const localUpdatedAt = localTodo.lastSyncedAt;

				if (!localUpdatedAt || googleUpdatedAt > localUpdatedAt) {
					// Google is newer - update local
					await db
						.update(todo)
						.set({
							text: googleTask.title,
							completed: googleTask.status === "completed",
							dueDate: googleTask.due ? new Date(googleTask.due) : null,
							lastSyncedAt: new Date(),
						})
						.where(eq(todo.id, localTodo.id));
					result.todosUpdated++;
					result.todosSynced++;
				}
			}
		}

		// Sync: Local -> Google (for local todos with sync enabled)
		const localSyncEnabledTodos = localTodos.filter((t) => t.googleSyncEnabled);

		for (const localTodo of localSyncEnabledTodos) {
			if (localTodo.googleTaskId) {
				// Already linked - check if we need to push update
				const googleTask = googleTasksMap.get(localTodo.googleTaskId);
				if (!googleTask) {
					// Google task was deleted, we already handled it above
					continue;
				}

				// If never synced, local should win (it was created first)
				const localUpdatedAt = localTodo.lastSyncedAt;
				const googleUpdatedAt = new Date(googleTask.updated);

				// If never synced, local should win (it was created first)
				if (!localUpdatedAt || localUpdatedAt > googleUpdatedAt) {
					// Local is newer - push to Google
					await client.upsertTask(
						taskListId,
						{
							text: localTodo.text,
							completed: localTodo.completed,
							dueDate: localTodo.dueDate,
						},
						localTodo.googleTaskId,
					);
					result.todosUpdated++;
					result.todosSynced++;
				}
			} else {
				// Not yet linked - create in Google and link
				const googleTask = await client.upsertTask(taskListId, {
					text: localTodo.text,
					completed: localTodo.completed,
					dueDate: localTodo.dueDate,
				});

				await db
					.update(todo)
					.set({
						googleTaskId: googleTask.id,
						lastSyncedAt: new Date(),
					})
					.where(eq(todo.id, localTodo.id));
				result.todosCreated++;
				result.todosSynced++;
			}
		}

		// Update lastSyncedAt on integration
		await db
			.update(googleTasksIntegration)
			.set({
				lastSyncedAt: new Date(),
			})
			.where(eq(googleTasksIntegration.id, integration.id));

		result.success = true;
	} catch (error) {
		console.error(`Failed to sync todos for user ${userId}:`, error);
		result.error = error instanceof Error ? error.message : "Unknown error";
	}

	return result;
}
