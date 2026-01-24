import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

// Mock dependencies
vi.mock("@my-procedures-2/db", () => ({
	db: {
		query: {
			googleTasksIntegration: {
				findMany: vi.fn(),
			},
			todo: {
				findMany: vi.fn(),
			},
		},
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve([])),
			})),
		})),
	},
	googleTasksIntegration: {},
	todo: {},
	and: vi.fn((...args: unknown[]) => args),
	eq: vi.fn((field: string, value: unknown) => ({ field, value })),
}));

vi.mock("@my-procedures-2/env/server", () => ({
	env: {
		CRON_SECRET: "test-cron-secret",
	},
}));

vi.mock("@my-procedures-2/api/lib/google-tasks-client", () => ({
	GoogleTasksClient: {
		forUser: vi.fn(),
	},
}));

describe("Google Tasks Sync Cron Route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Authentication", () => {
		it("returns 401 when authorization header is missing", async () => {
			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
			);
			const response = await GET(request);

			expect(response.status).toBe(401);
			const json = await response.json();
			expect(json).toEqual({ error: "Unauthorized" });
		});

		it("returns 401 when authorization header does not start with Bearer", async () => {
			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
				{
					headers: {
						authorization: "InvalidFormat token",
					},
				},
			);
			const response = await GET(request);

			expect(response.status).toBe(401);
			const json = await response.json();
			expect(json).toEqual({ error: "Unauthorized" });
		});

		it("returns 401 when token does not match CRON_SECRET", async () => {
			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
				{
					headers: {
						authorization: "Bearer wrong-secret",
					},
				},
			);
			const response = await GET(request);

			expect(response.status).toBe(401);
			const json = await response.json();
			expect(json).toEqual({ error: "Invalid token" });
		});

		it("accepts request with valid Bearer token", async () => {
			const { db } = await import("@my-procedures-2/db");
			const findMany = db.query.googleTasksIntegration
				.findMany as unknown as ReturnType<typeof vi.fn>;
			findMany.mockResolvedValue([]);

			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
				{
					headers: {
						authorization: "Bearer test-cron-secret",
					},
				},
			);
			const response = await GET(request);

			expect(response.status).toBe(200);
		});
	});

	describe("Sync Behavior", () => {
		it("returns success message when no integrations to sync", async () => {
			const { db } = await import("@my-procedures-2/db");
			const findMany = db.query.googleTasksIntegration
				.findMany as unknown as ReturnType<typeof vi.fn>;
			findMany.mockResolvedValue([]);

			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
				{
					headers: {
						authorization: "Bearer test-cron-secret",
					},
				},
			);
			const response = await GET(request);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json).toEqual({
				success: true,
				message: "No integrations to sync",
				results: [],
			});
		});

		it("queries for enabled and sync-enabled integrations", async () => {
			const { db } = await import("@my-procedures-2/db");
			const findMany = db.query.googleTasksIntegration
				.findMany as unknown as ReturnType<typeof vi.fn>;
			findMany.mockResolvedValue([]);

			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
				{
					headers: {
						authorization: "Bearer test-cron-secret",
					},
				},
			);
			await GET(request);

			expect(findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.anything(),
				}),
			);
		});

		it("returns summary with sync results when integrations exist", async () => {
			const { db } = await import("@my-procedures-2/db");
			const findManyIntegrations = db.query.googleTasksIntegration
				.findMany as unknown as ReturnType<typeof vi.fn>;
			const findManyTodos = db.query.todo.findMany as unknown as ReturnType<
				typeof vi.fn
			>;

			// Mock integrations
			findManyIntegrations.mockResolvedValue([
				{
					id: 1,
					userId: "user1",
					enabled: true,
					syncEnabled: true,
					defaultListId: "list1",
					accessToken: "token",
					refreshToken: null,
					tokenExpiresAt: null,
					lastSyncedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			// Mock todos query
			findManyTodos.mockResolvedValue([]);

			// Mock GoogleTasksClient
			const { GoogleTasksClient } = await import(
				"@my-procedures-2/api/lib/google-tasks-client"
			);
			const forUser = GoogleTasksClient.forUser as unknown as ReturnType<
				typeof vi.fn
			>;
			const mockClient = {
				listTaskLists: vi.fn().mockResolvedValue([
					{
						id: "list1",
						title: "My Tasks",
						updated: "2026-01-24T00:00:00Z",
					},
				]),
				listTasks: vi.fn().mockResolvedValue([]),
			};
			forUser.mockResolvedValue(mockClient as never);

			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
				{
					headers: {
						authorization: "Bearer test-cron-secret",
					},
				},
			);
			const response = await GET(request);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(json.summary).toBeDefined();
			expect(json.summary.total).toBe(1);
			expect(json.results).toHaveLength(1);
		});

		it("handles sync errors gracefully and continues with other integrations", async () => {
			const { db } = await import("@my-procedures-2/db");
			const findManyIntegrations = db.query.googleTasksIntegration
				.findMany as unknown as ReturnType<typeof vi.fn>;
			const findManyTodos = db.query.todo.findMany as unknown as ReturnType<
				typeof vi.fn
			>;

			// Mock integrations - one will fail, one will succeed
			findManyIntegrations.mockResolvedValue([
				{
					id: 1,
					userId: "user1",
					enabled: true,
					syncEnabled: true,
					defaultListId: "list1",
					accessToken: "token",
					refreshToken: null,
					tokenExpiresAt: null,
					lastSyncedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: 2,
					userId: "user2",
					enabled: true,
					syncEnabled: true,
					defaultListId: "list2",
					accessToken: "token",
					refreshToken: null,
					tokenExpiresAt: null,
					lastSyncedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			findManyTodos.mockResolvedValue([]);

			const { GoogleTasksClient } = await import(
				"@my-procedures-2/api/lib/google-tasks-client"
			);
			const forUser = GoogleTasksClient.forUser as unknown as ReturnType<
				typeof vi.fn
			>;

			// First user fails
			const mockClient1 = {
				listTaskLists: vi.fn().mockRejectedValue(new Error("API Error")),
			};
			// Second user succeeds
			const mockClient2 = {
				listTaskLists: vi.fn().mockResolvedValue([
					{
						id: "list2",
						title: "My Tasks",
						updated: "2026-01-24T00:00:00Z",
					},
				]),
				listTasks: vi.fn().mockResolvedValue([]),
			};

			forUser
				.mockResolvedValueOnce(mockClient1 as never)
				.mockResolvedValueOnce(mockClient2 as never);

			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
				{
					headers: {
						authorization: "Bearer test-cron-secret",
					},
				},
			);
			const response = await GET(request);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.summary.successful).toBe(1);
			expect(json.summary.failed).toBe(1);
			expect(json.results[0].success).toBe(false);
			expect(json.results[0].error).toBeDefined();
			expect(json.results[1].success).toBe(true);
		});
	});

	describe("Error Handling", () => {
		it("returns 500 when database query fails", async () => {
			const { db } = await import("@my-procedures-2/db");
			const findMany = db.query.googleTasksIntegration
				.findMany as unknown as ReturnType<typeof vi.fn>;
			findMany.mockRejectedValue(new Error("Database connection failed"));

			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
				{
					headers: {
						authorization: "Bearer test-cron-secret",
					},
				},
			);
			const response = await GET(request);

			expect(response.status).toBe(500);
			const json = await response.json();
			expect(json.error).toBe("Sync failed");
		});
	});

	describe("Response Format", () => {
		it("returns summary statistics in response", async () => {
			const { db } = await import("@my-procedures-2/db");
			const findManyIntegrations = db.query.googleTasksIntegration
				.findMany as unknown as ReturnType<typeof vi.fn>;
			const findManyTodos = db.query.todo.findMany as unknown as ReturnType<
				typeof vi.fn
			>;

			findManyIntegrations.mockResolvedValue([
				{
					id: 1,
					userId: "user1",
					enabled: true,
					syncEnabled: true,
					defaultListId: "list1",
					accessToken: "token",
					refreshToken: null,
					tokenExpiresAt: null,
					lastSyncedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			findManyTodos.mockResolvedValue([]);

			const { GoogleTasksClient } = await import(
				"@my-procedures-2/api/lib/google-tasks-client"
			);
			const forUser = GoogleTasksClient.forUser as unknown as ReturnType<
				typeof vi.fn
			>;
			const mockClient = {
				listTaskLists: vi.fn().mockResolvedValue([
					{
						id: "list1",
						title: "My Tasks",
						updated: "2026-01-24T00:00:00Z",
					},
				]),
				listTasks: vi.fn().mockResolvedValue([]),
			};
			forUser.mockResolvedValue(mockClient as never);

			const request = new Request(
				"http://localhost:3000/api/cron/google-tasks-sync",
				{
					headers: {
						authorization: "Bearer test-cron-secret",
					},
				},
			);
			const response = await GET(request);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.summary).toMatchObject({
				total: expect.any(Number),
				successful: expect.any(Number),
				failed: expect.any(Number),
				totalTodosSynced: expect.any(Number),
				totalTodosCreated: expect.any(Number),
				totalTodosUpdated: expect.any(Number),
			});
		});
	});
});
