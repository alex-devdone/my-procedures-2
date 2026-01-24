/**
 * Tests for Google Tasks API Client
 *
 * @see https://github.com/anthropics/claude-code
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock database - must be before imports
vi.mock("@my-procedures-2/db", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@my-procedures-2/db")>();
	const mockFindFirstIntegration = vi.fn();
	const mockFindFirstAccount = vi.fn();
	const mockUpdate = vi.fn(() => ({
		set: vi.fn(() => ({
			where: vi.fn(),
		})),
	}));
	const mockAnd = vi.fn();
	const mockEq = vi.fn();

	return {
		...actual,
		db: {
			...actual.db,
			query: {
				googleTasksIntegration: {
					findFirst: mockFindFirstIntegration,
				},
				account: {
					findFirst: mockFindFirstAccount,
				},
			},
			update: mockUpdate,
		},
		and: mockAnd,
		eq: mockEq,
		// Make mocks available for tests
		__mockFindFirstIntegration: mockFindFirstIntegration,
		__mockFindFirstAccount: mockFindFirstAccount,
		__mockUpdate: mockUpdate,
		__mockAnd: mockAnd,
		__mockEq: mockEq,
	};
});

// Mock environment
vi.mock("@my-procedures-2/env/server", () => ({
	env: {
		GOOGLE_CLIENT_ID: "test-client-id",
		GOOGLE_CLIENT_SECRET: "test-client-secret",
	},
}));

// Mock tRPC error
vi.mock("@trpc/server", () => ({
	TRPCError: class MockTRPCError extends Error {
		code: string;
		constructor(props: { code: string; message: string }) {
			super(props.message);
			this.code = props.code;
			this.name = "TRPCError";
		}
	},
}));

import { db } from "@my-procedures-2/db";
import { GoogleTasksApiError, GoogleTasksClient } from "./google-tasks-client";

const mockDb = db as unknown as {
	query: {
		googleTasksIntegration: { findFirst: ReturnType<typeof vi.fn> };
		account: { findFirst: ReturnType<typeof vi.fn> };
	};
	update: ReturnType<typeof vi.fn>;
};

describe("GoogleTasksClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({}),
			status: 200,
			statusText: "OK",
		} as Response);
	});

	describe("forUser", () => {
		it("should create client from integration with valid token", async () => {
			const integration = {
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
			};

			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue(
				integration,
			);

			const client = await GoogleTasksClient.forUser("user-1");
			expect(client).toBeInstanceOf(GoogleTasksClient);
		});

		it("should create client from account table when no integration exists", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue(null);

			const account = {
				id: "account-1",
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				accessTokenExpiresAt: new Date(Date.now() + 3600000),
			};

			mockDb.query.account.findFirst.mockResolvedValue(account);

			const client = await GoogleTasksClient.forUser("user-1");
			expect(client).toBeInstanceOf(GoogleTasksClient);
		});

		it("should throw error when no Google account linked", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue(null);
			mockDb.query.account.findFirst.mockResolvedValue(null);

			await expect(GoogleTasksClient.forUser("user-1")).rejects.toThrow(
				"Google account not linked",
			);
		});

		it("should throw error when account exists but no access token", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue(null);

			const account = {
				id: "account-1",
				userId: "user-1",
				accessToken: null,
			};

			mockDb.query.account.findFirst.mockResolvedValue(account);

			await expect(GoogleTasksClient.forUser("user-1")).rejects.toThrow(
				"Google account not linked",
			);
		});
	});

	describe("listTaskLists", () => {
		it("should return task lists", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			const mockLists = [
				{
					id: "list-1",
					title: "Personal",
					kind: "tasks#taskList",
					updated: "2024-01-01T00:00:00Z",
					selfLink: "https://example.com",
				},
				{
					id: "list-2",
					title: "Work",
					kind: "tasks#taskList",
					updated: "2024-01-01T00:00:00Z",
					selfLink: "https://example.com",
				},
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: mockLists }),
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			const lists = await client.listTaskLists();

			expect(lists).toEqual(mockLists);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://www.googleapis.com/tasks/v1/users/@me/lists",
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer valid-token",
					}),
				}),
			);
		});

		it("should return empty array when no task lists exist", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			const lists = await client.listTaskLists();

			expect(lists).toEqual([]);
		});
	});

	describe("createTaskList", () => {
		it("should create a new task list", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			const mockList = {
				id: "new-list",
				title: "Shopping",
				kind: "tasks#taskList",
				updated: "2024-01-01T00:00:00Z",
				selfLink: "https://example.com",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockList,
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			const result = await client.createTaskList("Shopping");

			expect(result).toEqual(mockList);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://www.googleapis.com/tasks/v1/users/@me/lists",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ title: "Shopping" }),
				}),
			);
		});
	});

	describe("listTasks", () => {
		it("should return tasks from a list", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			const mockTasks = [
				{
					id: "task-1",
					title: "Buy groceries",
					status: "needsAction",
					kind: "tasks#task",
					etag: "etag1",
					updated: "2024-01-01T00:00:00Z",
					selfLink: "https://example.com",
					parent: "list-1",
					position: "00000000000000000001",
				},
				{
					id: "task-2",
					title: "Walk the dog",
					status: "completed",
					kind: "tasks#task",
					etag: "etag2",
					updated: "2024-01-01T00:00:00Z",
					selfLink: "https://example.com",
					parent: "list-1",
					position: "00000000000000000002",
					completed: "2024-01-01T12:00:00Z",
				},
			];

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: mockTasks }),
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			const tasks = await client.listTasks("list-1");

			expect(tasks).toEqual(mockTasks);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("/lists/list-1/tasks?"),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer valid-token",
					}),
				}),
			);
		});

		it("should handle showDeleted and showHidden parameters", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ items: [] }),
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			await client.listTasks("list-1", true, true);

			const fetchUrl = mockFetch.mock.calls[0]?.[0];
			expect(fetchUrl).toContain("showDeleted=true");
			expect(fetchUrl).toContain("showHidden=true");
		});
	});

	describe("upsertTask", () => {
		it("should create a new task", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			const mockTask = {
				id: "new-task",
				title: "New todo",
				status: "needsAction",
				kind: "tasks#task",
				etag: "etag1",
				updated: "2024-01-01T00:00:00Z",
				selfLink: "https://example.com",
				parent: "list-1",
				position: "00000000000000000001",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockTask,
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			const result = await client.upsertTask("list-1", {
				text: "New todo",
				completed: false,
			});

			expect(result).toEqual(mockTask);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://www.googleapis.com/tasks/v1/lists/list-1/tasks",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ title: "New todo", status: "needsAction" }),
				}),
			);
		});

		it("should update an existing task", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			const mockTask = {
				id: "existing-task",
				title: "Updated todo",
				status: "completed",
				kind: "tasks#task",
				etag: "etag1",
				updated: "2024-01-01T00:00:00Z",
				selfLink: "https://example.com",
				parent: "list-1",
				position: "00000000000000000001",
				completed: "2024-01-01T12:00:00Z",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockTask,
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			const result = await client.upsertTask(
				"list-1",
				{
					text: "Updated todo",
					completed: true,
				},
				"existing-task",
			);

			expect(result).toEqual(mockTask);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://www.googleapis.com/tasks/v1/lists/list-1/tasks/existing-task",
				expect.objectContaining({
					method: "PATCH",
					body: expect.stringContaining('"title":"Updated todo"'),
				}),
			);
		});

		it("should include due date when provided", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			const dueDate = new Date("2024-12-25T10:00:00Z");

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "task-1",
					title: "Todo with due date",
					status: "needsAction",
					kind: "tasks#task",
					etag: "etag1",
					updated: "2024-01-01T00:00:00Z",
					selfLink: "https://example.com",
					parent: "list-1",
					position: "00000000000000000001",
				}),
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			await client.upsertTask("list-1", {
				text: "Todo with due date",
				completed: false,
				dueDate,
			});

			const requestBody = JSON.parse(
				mockFetch.mock.calls[0]?.[1]?.body as string,
			);
			expect(requestBody.due).toBe(dueDate.toISOString());
		});

		it("should include completed timestamp when creating completed task", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "task-1",
					title: "Completed todo",
					status: "completed",
					kind: "tasks#task",
					etag: "etag1",
					updated: "2024-01-01T00:00:00Z",
					selfLink: "https://example.com",
					parent: "list-1",
					position: "00000000000000000001",
					completed: "2024-01-15T10:00:00.000Z",
				}),
				status: 200,
				statusText: "OK",
			} as Response);

			const beforeCreation = Date.now();

			const client = await GoogleTasksClient.forUser("user-1");
			await client.upsertTask("list-1", {
				text: "Completed todo",
				completed: true,
			});

			const requestBody = JSON.parse(
				mockFetch.mock.calls[0]?.[1]?.body as string,
			);
			expect(requestBody.status).toBe("completed");
			expect(requestBody.completed).toBeDefined();

			const completedTime = new Date(requestBody.completed).getTime();
			expect(completedTime).toBeGreaterThanOrEqual(beforeCreation);
			expect(completedTime).toBeLessThanOrEqual(Date.now() + 1000);
		});

		it("should include completed timestamp when updating to completed", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "existing-task",
					title: "Mark as complete",
					status: "completed",
					kind: "tasks#task",
					etag: "etag1",
					updated: "2024-01-01T00:00:00Z",
					selfLink: "https://example.com",
					parent: "list-1",
					position: "00000000000000000001",
					completed: "2024-01-15T10:00:00.000Z",
				}),
				status: 200,
				statusText: "OK",
			} as Response);

			const beforeUpdate = Date.now();

			const client = await GoogleTasksClient.forUser("user-1");
			await client.upsertTask(
				"list-1",
				{
					text: "Mark as complete",
					completed: true,
				},
				"existing-task",
			);

			const requestBody = JSON.parse(
				mockFetch.mock.calls[0]?.[1]?.body as string,
			);
			expect(requestBody.status).toBe("completed");
			expect(requestBody.completed).toBeDefined();

			const completedTime = new Date(requestBody.completed).getTime();
			expect(completedTime).toBeGreaterThanOrEqual(beforeUpdate);
			expect(completedTime).toBeLessThanOrEqual(Date.now() + 1000);
		});
	});

	describe("deleteTask", () => {
		it("should delete a task", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
				status: 204,
				statusText: "No Content",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			await client.deleteTask("list-1", "task-1");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://www.googleapis.com/tasks/v1/lists/list-1/tasks/task-1",
				expect.objectContaining({
					method: "DELETE",
				}),
			);
		});
	});

	describe("getTask", () => {
		it("should get a single task", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			const mockTask = {
				id: "task-1",
				title: "Single task",
				status: "needsAction",
				kind: "tasks#task",
				etag: "etag1",
				updated: "2024-01-01T00:00:00Z",
				selfLink: "https://example.com",
				parent: "list-1",
				position: "00000000000000000001",
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockTask,
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			const result = await client.getTask("list-1", "task-1");

			expect(result).toEqual(mockTask);
		});
	});

	describe("clearCompleted", () => {
		it("should clear all completed tasks", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({}),
				status: 200,
				statusText: "OK",
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			await client.clearCompleted("list-1");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://www.googleapis.com/tasks/v1/lists/list-1/clear",
				expect.objectContaining({
					method: "POST",
				}),
			);
		});
	});

	describe("API error handling", () => {
		it("should throw TRPCError for 401 responses", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "expired-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: "Unauthorized",
				json: async () => ({}),
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");

			await expect(client.listTaskLists()).rejects.toThrow(
				"Google access was revoked",
			);
		});

		it("should throw TRPCError for 429 rate limit", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
				json: async () => ({}),
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");

			await expect(client.listTaskLists()).rejects.toThrow(
				"Rate limit exceeded",
			);
		});

		it("should throw GoogleTasksApiError for other errors", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: async () => ({ error: { message: "Task not found" } }),
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");

			try {
				await client.getTask("list-1", "non-existent");
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(GoogleTasksApiError);
				expect((error as GoogleTasksApiError).statusCode).toBe(404);
			}
		});

		it("should extract error message from API error response", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			const apiErrorMessage = "Invalid task list ID";
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: async () => ({ error: { message: apiErrorMessage } }),
			} as Response);

			const client = await GoogleTasksClient.forUser("user-1");

			try {
				await client.listTasks("invalid-list");
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(GoogleTasksApiError);
				expect((error as Error).message).toBe(apiErrorMessage);
			}
		});

		it("should use default error message when JSON parsing fails", async () => {
			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "valid-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: new Date(Date.now() + 3600000),
			});

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				headers: new Headers(),
				json: async () => {
					throw new Error("Invalid JSON");
				},
			} as unknown as Response);

			const client = await GoogleTasksClient.forUser("user-1");

			try {
				await client.listTasks("list-1");
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).toBeInstanceOf(GoogleTasksApiError);
				expect((error as Error).message).toContain("500 Internal Server Error");
			}
		});
	});
});

describe("Token refresh", () => {
	describe("from integration table", () => {
		it("should auto-refresh expired token from integration", async () => {
			const expiredDate = new Date(Date.now() - 1000);

			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "expired-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: expiredDate,
			});

			// Reset and setup fresh mocks for this test
			vi.clearAllMocks();

			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: "new-access-token",
						expires_in: 3600,
						token_type: "Bearer",
					}),
					status: 200,
					statusText: "OK",
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ items: [] }),
					status: 200,
					statusText: "OK",
				} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			await client.listTaskLists();

			// First call should be to token endpoint
			expect(mockFetch.mock.calls[0]?.[0]).toBe(
				"https://oauth2.googleapis.com/token",
			);
			expect(mockFetch.mock.calls[0]?.[1]?.method).toBe("POST");
		});

		it("should throw error when no refresh token available in integration", async () => {
			const expiredDate = new Date(Date.now() - 1000);

			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "expired-token",
				refreshToken: null,
				tokenExpiresAt: expiredDate,
			});

			await expect(GoogleTasksClient.forUser("user-1")).rejects.toThrow(
				"No refresh token available",
			);
		});

		it("should throw error when token refresh request fails", async () => {
			const expiredDate = new Date(Date.now() - 1000);

			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "expired-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: expiredDate,
			});

			vi.clearAllMocks();

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: async () => ({ error: "invalid_grant" }),
			} as Response);

			await expect(GoogleTasksClient.forUser("user-1")).rejects.toThrow(
				"Failed to refresh access token",
			);
		});

		it("should update integration record with new token", async () => {
			const expiredDate = new Date(Date.now() - 1000);
			const mockWhere = vi.fn();

			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue({
				id: 1,
				userId: "user-1",
				accessToken: "expired-token",
				refreshToken: "refresh-token",
				tokenExpiresAt: expiredDate,
			});

			// Properly chain the update mock
			mockDb.update = vi.fn(() => ({
				set: vi.fn(() => ({ where: mockWhere })),
			}));

			vi.clearAllMocks();

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					access_token: "new-access-token",
					expires_in: 3600,
					token_type: "Bearer",
				}),
				status: 200,
				statusText: "OK",
			} as Response);

			await GoogleTasksClient.forUser("user-1");

			expect(mockDb.update).toHaveBeenCalled();
		});
	});

	describe("from account table", () => {
		it("should auto-refresh expired token from account", async () => {
			const expiredDate = new Date(Date.now() - 1000);

			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue(null);

			mockDb.query.account.findFirst.mockResolvedValue({
				id: "account-1",
				userId: "user-1",
				accessToken: "expired-token",
				refreshToken: "refresh-token",
				accessTokenExpiresAt: expiredDate,
			});

			// Properly chain the update mock
			mockDb.update = vi.fn(() => ({
				set: vi.fn(() => ({ where: vi.fn() })),
			}));

			// Reset and setup fresh mocks for this test
			vi.clearAllMocks();

			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						access_token: "new-access-token",
						expires_in: 3600,
						token_type: "Bearer",
					}),
					status: 200,
					statusText: "OK",
				} as Response)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({ items: [] }),
					status: 200,
					statusText: "OK",
				} as Response);

			const client = await GoogleTasksClient.forUser("user-1");
			await client.listTaskLists();

			// First call should be to token endpoint
			expect(mockFetch.mock.calls[0]?.[0]).toBe(
				"https://oauth2.googleapis.com/token",
			);
			expect(mockFetch.mock.calls[0]?.[1]?.method).toBe("POST");
		});

		it("should throw error when no refresh token available in account", async () => {
			const expiredDate = new Date(Date.now() - 1000);

			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue(null);

			mockDb.query.account.findFirst.mockResolvedValue({
				id: "account-1",
				userId: "user-1",
				accessToken: "expired-token",
				refreshToken: null,
				accessTokenExpiresAt: expiredDate,
			});

			await expect(GoogleTasksClient.forUser("user-1")).rejects.toThrow(
				"No refresh token available",
			);
		});

		it("should throw error when account token refresh fails", async () => {
			const expiredDate = new Date(Date.now() - 1000);

			mockDb.query.googleTasksIntegration.findFirst.mockResolvedValue(null);

			mockDb.query.account.findFirst.mockResolvedValue({
				id: "account-1",
				userId: "user-1",
				accessToken: "expired-token",
				refreshToken: "refresh-token",
				accessTokenExpiresAt: expiredDate,
			});

			// Properly chain the update mock
			mockDb.update = vi.fn(() => ({
				set: vi.fn(() => ({ where: vi.fn() })),
			}));

			vi.clearAllMocks();

			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: "Bad Request",
				json: async () => ({ error: "invalid_grant" }),
			} as Response);

			await expect(GoogleTasksClient.forUser("user-1")).rejects.toThrow(
				"Failed to refresh access token",
			);
		});
	});
});

describe("Error classes", () => {
	describe("GoogleTasksApiError", () => {
		it("should create error with message, status code, and status text", () => {
			const error = new GoogleTasksApiError("Task not found", 404, "Not Found");

			expect(error.message).toBe("Task not found");
			expect(error.statusCode).toBe(404);
			expect(error.statusText).toBe("Not Found");
			expect(error.name).toBe("GoogleTasksApiError");
		});

		it("should be instanceof Error", () => {
			const error = new GoogleTasksApiError("Error", 500, "Server Error");

			expect(error instanceof Error).toBe(true);
		});
	});
});
