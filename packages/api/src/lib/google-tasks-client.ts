import {
	account,
	and,
	db,
	eq,
	googleTasksIntegration,
} from "@my-procedures-2/db";
import { env } from "@my-procedures-2/env/server";
import { TRPCError } from "@trpc/server";

const GOOGLE_TASKS_API_BASE = "https://www.googleapis.com/tasks/v1";

interface GoogleTaskList {
	kind: "tasks#taskList";
	id: string;
	title: string;
	updated: string;
	selfLink: string;
}

interface GoogleTask {
	kind: "tasks#task";
	id: string;
	etag: string;
	title: string;
	updated: string;
	selfLink: string;
	parent: string;
	position: string;
	notes?: string;
	status: "needsAction" | "completed";
	due?: string;
	completed?: string;
	deleted?: boolean;
	hidden?: boolean;
}

interface GoogleTasksListResponse {
	kind: "tasks#tasks";
	etag: string;
	nextPageToken?: string;
	items?: GoogleTask[];
}

interface GoogleTokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
}

/**
 * Error thrown when Google account is not linked or tokens are invalid
 */
export class GoogleAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GoogleAuthError";
	}
}

/**
 * Error thrown when Google Tasks API returns an error
 */
export class GoogleTasksApiError extends Error {
	constructor(
		message: string,
		public statusCode: number,
		public statusText: string,
	) {
		super(message);
		this.name = "GoogleTasksApiError";
	}
}

/**
 * Google Tasks API client for a specific user.
 *
 * Handles authentication, token refresh, and provides methods to interact
 * with the Google Tasks API.
 *
 * @example
 * ```ts
 * const client = await GoogleTasksClient.forUser(userId);
 * const lists = await client.listTaskLists();
 * ```
 */
export class GoogleTasksClient {
	private constructor(
		// @ts-expect-error - userId is stored for future use
		private readonly userId: string,
		private accessToken: string,
		private readonly refreshToken: string | null,
		private tokenExpiresAt: Date | null,
	) {}

	/**
	 * Create a GoogleTasksClient instance for the given user.
	 *
	 * Fetches the user's Google account credentials from the database.
	 * If the access token is expired, it will be refreshed automatically.
	 *
	 * @param userId - The user ID to get credentials for
	 * @returns A GoogleTasksClient instance
	 * @throws {TRPCError} If the user doesn't have a Google account linked
	 * @throws {TRPCError} If token refresh fails
	 */
	static async forUser(userId: string): Promise<GoogleTasksClient> {
		// Check if user has Google Tasks integration with stored tokens
		const integration = await db.query.googleTasksIntegration.findFirst({
			where: eq(googleTasksIntegration.userId, userId),
		});

		if (integration?.accessToken && integration.tokenExpiresAt) {
			const client = new GoogleTasksClient(
				userId,
				integration.accessToken,
				integration.refreshToken ?? null,
				integration.tokenExpiresAt,
			);

			// Auto-refresh token if expired
			if (integration.tokenExpiresAt <= new Date()) {
				await client.refreshAccessToken(integration.id);
			}

			return client;
		}

		// Fall back to checking the account table for Better-Auth OAuth
		const googleAccount = await db.query.account.findFirst({
			where: and(eq(account.userId, userId), eq(account.providerId, "google")),
		});

		if (!googleAccount?.accessToken) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message:
					"Google account not linked. Please link your Google account first.",
			});
		}

		const client = new GoogleTasksClient(
			userId,
			googleAccount.accessToken,
			googleAccount.refreshToken ?? null,
			googleAccount.accessTokenExpiresAt ?? null,
		);

		// Auto-refresh token if expired
		if (
			googleAccount.accessTokenExpiresAt &&
			googleAccount.accessTokenExpiresAt <= new Date()
		) {
			await client.refreshAccessTokenFromAccount(googleAccount.id);
		}

		return client;
	}

	/**
	 * Refresh the access token using the refresh token stored in the integration table.
	 *
	 * @param integrationId - The integration record ID to update
	 * @throws {TRPCError} If token refresh fails
	 */
	private async refreshAccessToken(integrationId: number): Promise<void> {
		if (!this.refreshToken) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message:
					"No refresh token available. Please re-link your Google account.",
			});
		}

		const response = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: env.GOOGLE_CLIENT_ID ?? "",
				client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
				refresh_token: this.refreshToken,
				grant_type: "refresh_token",
			}),
		});

		if (!response.ok) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					"Failed to refresh access token. Please re-link your Google account.",
			});
		}

		const data = (await response.json()) as GoogleTokenResponse;
		this.accessToken = data.access_token;
		this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

		// Update the integration record with new token
		await db
			.update(googleTasksIntegration)
			.set({
				accessToken: data.access_token,
				tokenExpiresAt: this.tokenExpiresAt,
			})
			.where(eq(googleTasksIntegration.id, integrationId));
	}

	/**
	 * Refresh the access token using the refresh token from the account table.
	 *
	 * @param accountId - The account record ID to update
	 * @throws {TRPCError} If token refresh fails
	 */
	private async refreshAccessTokenFromAccount(
		accountId: string,
	): Promise<void> {
		if (!this.refreshToken) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message:
					"No refresh token available. Please re-link your Google account.",
			});
		}

		const response = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: env.GOOGLE_CLIENT_ID ?? "",
				client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
				refresh_token: this.refreshToken,
				grant_type: "refresh_token",
			}),
		});

		if (!response.ok) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message:
					"Failed to refresh access token. Please re-link your Google account.",
			});
		}

		const data = (await response.json()) as GoogleTokenResponse;
		this.accessToken = data.access_token;
		this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

		// Update the account record with new token
		await db
			.update(account)
			.set({
				accessToken: data.access_token,
				accessTokenExpiresAt: this.tokenExpiresAt,
			})
			.where(eq(account.id, accountId));
	}

	/**
	 * Make an authenticated request to the Google Tasks API.
	 *
	 * @param endpoint - The API endpoint to call (relative to base URL)
	 * @param options - Fetch options
	 * @returns The response JSON
	 * @throws {GoogleTasksApiError} If the API returns an error
	 * @throws {TRPCError} If the request fails due to network issues
	 */
	private async apiRequest<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${GOOGLE_TASKS_API_BASE}${endpoint}`;

		const response = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			// Handle 401 Unauthorized - likely revoked access
			if (response.status === 401) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Google access was revoked. Please re-link your account.",
				});
			}

			// Handle rate limiting (429)
			if (response.status === 429) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Rate limit exceeded. Please try again later.",
				});
			}

			// Handle other errors
			let errorMessage = `Google Tasks API error: ${response.status} ${response.statusText}`;
			try {
				const errorData = (await response.json()) as {
					error?: { message?: string };
				};
				if (errorData.error?.message) {
					errorMessage = errorData.error.message;
				}
			} catch {
				// Ignore JSON parse errors
			}

			throw new GoogleTasksApiError(
				errorMessage,
				response.status,
				response.statusText,
			);
		}

		return response.json() as Promise<T>;
	}

	/**
	 * List all task lists for the authenticated user.
	 *
	 * @returns Array of task lists
	 */
	async listTaskLists(): Promise<GoogleTaskList[]> {
		const response = await this.apiRequest<{ items?: GoogleTaskList[] }>(
			"/users/@me/lists",
			{
				method: "GET",
			},
		);
		return response.items ?? [];
	}

	/**
	 * Create a new task list.
	 *
	 * @param name - The name of the task list
	 * @returns The created task list
	 */
	async createTaskList(name: string): Promise<GoogleTaskList> {
		return this.apiRequest<GoogleTaskList>("/users/@me/lists", {
			method: "POST",
			body: JSON.stringify({ title: name }),
		});
	}

	/**
	 * List all tasks in a specific task list.
	 *
	 * @param taskListId - The ID of the task list
	 * @param showDeleted - Whether to include deleted tasks
	 * @param showHidden - Whether to include hidden tasks
	 * @returns Array of tasks
	 */
	async listTasks(
		taskListId: string,
		showDeleted = false,
		showHidden = false,
	): Promise<GoogleTask[]> {
		const params = new URLSearchParams({
			showDeleted: showDeleted.toString(),
			showHidden: showHidden.toString(),
		});
		const response = await this.apiRequest<GoogleTasksListResponse>(
			`/lists/${taskListId}/tasks?${params.toString()}`,
			{ method: "GET" },
		);
		return response.items ?? [];
	}

	/**
	 * Upsert a task in Google Tasks.
	 *
	 * If the task already exists (has a googleTaskId), it will be updated.
	 * Otherwise, a new task will be created.
	 *
	 * @param taskListId - The ID of the task list
	 * @param todo - The todo object to sync
	 * @param googleTaskId - The Google Task ID (if updating an existing task)
	 * @returns The upserted task
	 */
	async upsertTask(
		taskListId: string,
		todo: {
			text: string;
			completed: boolean;
			dueDate?: Date | null;
		},
		googleTaskId?: string,
	): Promise<GoogleTask> {
		const taskData: {
			title: string;
			status: "needsAction" | "completed";
			notes?: string;
			due?: string;
			completed?: string;
		} = {
			title: todo.text,
			status: todo.completed ? "completed" : "needsAction",
		};

		// Add due date if present (format: RFC 3339)
		if (todo.dueDate) {
			taskData.due = todo.dueDate.toISOString();
		}

		// Add completed timestamp if task is completed
		if (todo.completed) {
			taskData.completed = new Date().toISOString();
		}

		if (googleTaskId) {
			// Update existing task
			return this.apiRequest<GoogleTask>(
				`/lists/${taskListId}/tasks/${googleTaskId}`,
				{
					method: "PATCH",
					body: JSON.stringify(taskData),
				},
			);
		}

		// Create new task
		return this.apiRequest<GoogleTask>(`/lists/${taskListId}/tasks`, {
			method: "POST",
			body: JSON.stringify(taskData),
		});
	}

	/**
	 * Delete a task from Google Tasks.
	 *
	 * @param taskListId - The ID of the task list
	 * @param taskId - The ID of the task to delete
	 */
	async deleteTask(taskListId: string, taskId: string): Promise<void> {
		await this.apiRequest(`/lists/${taskListId}/tasks/${taskId}`, {
			method: "DELETE",
		});
	}

	/**
	 * Get a single task by ID.
	 *
	 * @param taskListId - The ID of the task list
	 * @param taskId - The ID of the task
	 * @returns The task
	 */
	async getTask(taskListId: string, taskId: string): Promise<GoogleTask> {
		return this.apiRequest<GoogleTask>(`/lists/${taskListId}/tasks/${taskId}`, {
			method: "GET",
		});
	}

	/**
	 * Clear all completed tasks from a task list.
	 *
	 * @param taskListId - The ID of the task list
	 */
	async clearCompleted(taskListId: string): Promise<void> {
		await this.apiRequest(`/lists/${taskListId}/clear`, {
			method: "POST",
		});
	}
}
