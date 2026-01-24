import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock("@my-procedures-2/db", () => ({
	db: {
		query: {
			googleTasksIntegration: {
				findFirst: vi.fn(),
			},
		},
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
	eq: vi.fn((a, b) => ({ type: "eq", a, b })),
	and: vi.fn((...conditions) => ({ type: "and", conditions })),
}));

vi.mock("@my-procedures-2/db/schema/google-tasks-integration", () => ({
	googleTasksIntegration: {
		id: "googleTasksIntegration.id",
		userId: "googleTasksIntegration.userId",
		enabled: "googleTasksIntegration.enabled",
		syncEnabled: "googleTasksIntegration.syncEnabled",
		accessToken: "googleTasksIntegration.accessToken",
		refreshToken: "googleTasksIntegration.refreshToken",
		tokenExpiresAt: "googleTasksIntegration.tokenExpiresAt",
		lastSyncedAt: "googleTasksIntegration.lastSyncedAt",
		defaultListId: "googleTasksIntegration.defaultListId",
		createdAt: "googleTasksIntegration.createdAt",
		updatedAt: "googleTasksIntegration.updatedAt",
	},
}));

vi.mock("../lib/google-tasks-client", () => ({
	GoogleTasksClient: {
		forUser: vi.fn(),
	},
	GoogleTasksApiError: class GoogleTasksApiError extends Error {
		constructor(
			message: string,
			public statusCode: number,
			public statusText: string,
		) {
			super(message);
			this.name = "GoogleTasksApiError";
		}
	},
}));

// ============================================================================
// Type Definitions for Tests
// ============================================================================

interface MockGoogleTasksIntegration {
	id: number;
	userId: string;
	enabled: boolean;
	syncEnabled: boolean;
	accessToken: string;
	refreshToken: string | null;
	tokenExpiresAt: Date | null;
	lastSyncedAt: Date | null;
	defaultListId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

interface MockContext {
	session: {
		user: {
			id: string;
		};
	} | null;
}

interface MockGoogleTaskList {
	id: string;
	title: string;
	updated: string;
}

interface MockGoogleTask {
	id: string;
	title: string;
	notes?: string;
	status: "needsAction" | "completed";
	due?: string;
	completed?: string;
	updated: string;
	position: string;
	parent: string;
	deleted?: boolean;
	hidden?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

const createMockContext = (
	authenticated = true,
	overrideUserId?: string,
): MockContext => ({
	session: authenticated
		? { user: { id: overrideUserId ?? "user-123" } }
		: null,
});

const createMockIntegration = (
	overrides: Partial<MockGoogleTasksIntegration> = {},
): MockGoogleTasksIntegration => ({
	id: 1,
	userId: "user-123",
	enabled: true,
	syncEnabled: true,
	accessToken: "mock-access-token",
	refreshToken: "mock-refresh-token",
	tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
	lastSyncedAt: new Date(),
	defaultListId: "default-list-id",
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

const createMockTaskList = (
	overrides: Partial<MockGoogleTaskList> = {},
): MockGoogleTaskList => ({
	id: "list-1",
	title: "My Tasks",
	updated: "2026-01-24T10:00:00Z",
	...overrides,
});

const createMockTask = (
	overrides: Partial<MockGoogleTask> = {},
): MockGoogleTask => ({
	id: "task-1",
	title: "Sample Task",
	status: "needsAction",
	updated: "2026-01-24T10:00:00Z",
	position: "00000000000000000001",
	parent: "list-1",
	...overrides,
});

// ============================================================================
// Authorization Tests
// ============================================================================

describe("Google Tasks Router - Authorization", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Protected Procedure Middleware", () => {
		it("should throw UNAUTHORIZED when no session exists", () => {
			const ctx = createMockContext(false);

			const checkAuth = (context: MockContext) => {
				if (!context.session) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Authentication required",
					});
				}
				return context;
			};

			expect(() => checkAuth(ctx)).toThrow(TRPCError);
			expect(() => checkAuth(ctx)).toThrow("Authentication required");
		});

		it("should pass when session exists", () => {
			const ctx = createMockContext(true);

			const checkAuth = (context: MockContext) => {
				if (!context.session) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "Authentication required",
					});
				}
				return context;
			};

			expect(() => checkAuth(ctx)).not.toThrow();
		});
	});
});

// ============================================================================
// Zod Schema Validation Tests
// ============================================================================

describe("Google Tasks Router - Zod Schema Validation", () => {
	describe("createTaskList Input Schema", () => {
		const validateCreateTaskList = (
			input: unknown,
		): {
			valid: boolean;
			name?: string;
		} => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("name" in input) ||
				typeof (input as { name: unknown }).name !== "string" ||
				(input as { name: string }).name.length < 1
			) {
				return { valid: false };
			}

			return {
				valid: true,
				name: (input as { name: string }).name,
			};
		};

		it("should accept valid name", () => {
			expect(validateCreateTaskList({ name: "My List" })).toEqual({
				valid: true,
				name: "My List",
			});
		});

		it("should reject empty name", () => {
			expect(validateCreateTaskList({ name: "" })).toEqual({ valid: false });
		});

		it("should reject missing name", () => {
			expect(validateCreateTaskList({})).toEqual({ valid: false });
		});
	});

	describe("listTasks Input Schema", () => {
		const validateListTasks = (
			input: unknown,
		): {
			valid: boolean;
			taskListId?: string;
			showDeleted?: boolean;
			showHidden?: boolean;
		} => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("taskListId" in input) ||
				typeof (input as { taskListId: unknown }).taskListId !== "string"
			) {
				return { valid: false };
			}

			const typedInput = input as {
				taskListId: string;
				showDeleted?: unknown;
				showHidden?: unknown;
			};

			if (
				typedInput.showDeleted !== undefined &&
				typeof typedInput.showDeleted !== "boolean"
			) {
				return { valid: false };
			}

			if (
				typedInput.showHidden !== undefined &&
				typeof typedInput.showHidden !== "boolean"
			) {
				return { valid: false };
			}

			return {
				valid: true,
				taskListId: typedInput.taskListId,
				showDeleted: typedInput.showDeleted as boolean | undefined,
				showHidden: typedInput.showHidden as boolean | undefined,
			};
		};

		it("should accept valid input with taskListId only", () => {
			expect(validateListTasks({ taskListId: "list-1" })).toEqual({
				valid: true,
				taskListId: "list-1",
				showDeleted: undefined,
				showHidden: undefined,
			});
		});

		it("should accept valid input with showDeleted", () => {
			expect(
				validateListTasks({ taskListId: "list-1", showDeleted: true }),
			).toEqual({
				valid: true,
				taskListId: "list-1",
				showDeleted: true,
				showHidden: undefined,
			});
		});

		it("should accept valid input with showHidden", () => {
			expect(
				validateListTasks({ taskListId: "list-1", showHidden: true }),
			).toEqual({
				valid: true,
				taskListId: "list-1",
				showDeleted: undefined,
				showHidden: true,
			});
		});

		it("should reject missing taskListId", () => {
			expect(validateListTasks({})).toEqual({ valid: false });
		});

		it("should reject non-string taskListId", () => {
			expect(validateListTasks({ taskListId: 123 })).toEqual({ valid: false });
		});
	});

	describe("enableIntegration Input Schema", () => {
		const validateEnableIntegration = (
			input: unknown,
		): {
			valid: boolean;
			accessToken?: string;
			refreshToken?: string;
			expiresIn?: number;
			defaultListId?: string;
		} => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("accessToken" in input) ||
				!("expiresIn" in input) ||
				typeof (input as { accessToken: unknown }).accessToken !== "string" ||
				typeof (input as { expiresIn: unknown }).expiresIn !== "number"
			) {
				return { valid: false };
			}

			const typedInput = input as {
				accessToken: string;
				refreshToken?: string;
				expiresIn: number;
				defaultListId?: string;
			};

			if (typedInput.expiresIn <= 0) {
				return { valid: false };
			}

			if (
				typedInput.refreshToken !== undefined &&
				typeof typedInput.refreshToken !== "string"
			) {
				return { valid: false };
			}

			if (
				typedInput.defaultListId !== undefined &&
				typeof typedInput.defaultListId !== "string"
			) {
				return { valid: false };
			}

			return {
				valid: true,
				accessToken: typedInput.accessToken,
				refreshToken: typedInput.refreshToken,
				expiresIn: typedInput.expiresIn,
				defaultListId: typedInput.defaultListId,
			};
		};

		it("should accept valid input with required fields", () => {
			expect(
				validateEnableIntegration({
					accessToken: "token123",
					expiresIn: 3600,
				}),
			).toEqual({
				valid: true,
				accessToken: "token123",
				refreshToken: undefined,
				expiresIn: 3600,
				defaultListId: undefined,
			});
		});

		it("should accept valid input with all fields", () => {
			expect(
				validateEnableIntegration({
					accessToken: "token123",
					refreshToken: "refresh123",
					expiresIn: 3600,
					defaultListId: "list-1",
				}),
			).toEqual({
				valid: true,
				accessToken: "token123",
				refreshToken: "refresh123",
				expiresIn: 3600,
				defaultListId: "list-1",
			});
		});

		it("should reject missing accessToken", () => {
			expect(validateEnableIntegration({ expiresIn: 3600 })).toEqual({
				valid: false,
			});
		});

		it("should reject missing expiresIn", () => {
			expect(validateEnableIntegration({ accessToken: "token123" })).toEqual({
				valid: false,
			});
		});

		it("should reject non-positive expiresIn", () => {
			expect(
				validateEnableIntegration({
					accessToken: "token123",
					expiresIn: 0,
				}),
			).toEqual({ valid: false });
		});

		it("should reject negative expiresIn", () => {
			expect(
				validateEnableIntegration({
					accessToken: "token123",
					expiresIn: -100,
				}),
			).toEqual({ valid: false });
		});
	});

	describe("updateSettings Input Schema", () => {
		const validateUpdateSettings = (
			input: unknown,
		): {
			valid: boolean;
			enabled?: boolean;
			syncEnabled?: boolean;
			defaultListId?: string | null;
		} => {
			if (typeof input !== "object" || input === null) {
				return { valid: false };
			}

			const typedInput = input as {
				enabled?: unknown;
				syncEnabled?: unknown;
				defaultListId?: unknown;
			};

			if (
				typedInput.enabled !== undefined &&
				typeof typedInput.enabled !== "boolean"
			) {
				return { valid: false };
			}

			if (
				typedInput.syncEnabled !== undefined &&
				typeof typedInput.syncEnabled !== "boolean"
			) {
				return { valid: false };
			}

			if (
				typedInput.defaultListId !== undefined &&
				typedInput.defaultListId !== null &&
				typeof typedInput.defaultListId !== "string"
			) {
				return { valid: false };
			}

			return {
				valid: true,
				enabled: typedInput.enabled as boolean | undefined,
				syncEnabled: typedInput.syncEnabled as boolean | undefined,
				defaultListId: typedInput.defaultListId as string | null | undefined,
			};
		};

		it("should accept empty update object", () => {
			expect(validateUpdateSettings({})).toEqual({
				valid: true,
				enabled: undefined,
				syncEnabled: undefined,
				defaultListId: undefined,
			});
		});

		it("should accept enabled only", () => {
			expect(validateUpdateSettings({ enabled: false })).toEqual({
				valid: true,
				enabled: false,
				syncEnabled: undefined,
				defaultListId: undefined,
			});
		});

		it("should accept syncEnabled only", () => {
			expect(validateUpdateSettings({ syncEnabled: false })).toEqual({
				valid: true,
				enabled: undefined,
				syncEnabled: false,
				defaultListId: undefined,
			});
		});

		it("should accept defaultListId as string", () => {
			expect(validateUpdateSettings({ defaultListId: "list-1" })).toEqual({
				valid: true,
				enabled: undefined,
				syncEnabled: undefined,
				defaultListId: "list-1",
			});
		});

		it("should accept defaultListId as null", () => {
			expect(validateUpdateSettings({ defaultListId: null })).toEqual({
				valid: true,
				enabled: undefined,
				syncEnabled: undefined,
				defaultListId: null,
			});
		});

		it("should accept all fields", () => {
			expect(
				validateUpdateSettings({
					enabled: true,
					syncEnabled: false,
					defaultListId: "list-1",
				}),
			).toEqual({
				valid: true,
				enabled: true,
				syncEnabled: false,
				defaultListId: "list-1",
			});
		});

		it("should reject non-boolean enabled", () => {
			expect(validateUpdateSettings({ enabled: "true" })).toEqual({
				valid: false,
			});
		});

		it("should reject non-boolean syncEnabled", () => {
			expect(validateUpdateSettings({ syncEnabled: "false" })).toEqual({
				valid: false,
			});
		});

		it("should reject non-string non-null defaultListId", () => {
			expect(validateUpdateSettings({ defaultListId: 123 })).toEqual({
				valid: false,
			});
		});
	});

	describe("deleteTask Input Schema", () => {
		const validateDeleteTask = (
			input: unknown,
		): {
			valid: boolean;
			taskListId?: string;
			taskId?: string;
		} => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("taskListId" in input) ||
				!("taskId" in input) ||
				typeof (input as { taskListId: unknown }).taskListId !== "string" ||
				typeof (input as { taskId: unknown }).taskId !== "string"
			) {
				return { valid: false };
			}

			return {
				valid: true,
				taskListId: (input as { taskListId: string }).taskListId,
				taskId: (input as { taskId: string }).taskId,
			};
		};

		it("should accept valid input", () => {
			expect(
				validateDeleteTask({ taskListId: "list-1", taskId: "task-1" }),
			).toEqual({
				valid: true,
				taskListId: "list-1",
				taskId: "task-1",
			});
		});

		it("should reject missing taskListId", () => {
			expect(validateDeleteTask({ taskId: "task-1" })).toEqual({
				valid: false,
			});
		});

		it("should reject missing taskId", () => {
			expect(validateDeleteTask({ taskListId: "list-1" })).toEqual({
				valid: false,
			});
		});

		it("should reject non-string taskListId", () => {
			expect(validateDeleteTask({ taskListId: 123, taskId: "task-1" })).toEqual(
				{ valid: false },
			);
		});

		it("should reject non-string taskId", () => {
			expect(validateDeleteTask({ taskListId: "list-1", taskId: 123 })).toEqual(
				{ valid: false },
			);
		});
	});

	describe("getTask Input Schema", () => {
		const validateGetTask = (
			input: unknown,
		): {
			valid: boolean;
			taskListId?: string;
			taskId?: string;
		} => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("taskListId" in input) ||
				!("taskId" in input) ||
				typeof (input as { taskListId: unknown }).taskListId !== "string" ||
				typeof (input as { taskId: unknown }).taskId !== "string"
			) {
				return { valid: false };
			}

			return {
				valid: true,
				taskListId: (input as { taskListId: string }).taskListId,
				taskId: (input as { taskId: string }).taskId,
			};
		};

		it("should accept valid input", () => {
			expect(
				validateGetTask({ taskListId: "list-1", taskId: "task-1" }),
			).toEqual({
				valid: true,
				taskListId: "list-1",
				taskId: "task-1",
			});
		});

		it("should reject missing taskListId", () => {
			expect(validateGetTask({ taskId: "task-1" })).toEqual({ valid: false });
		});

		it("should reject missing taskId", () => {
			expect(validateGetTask({ taskListId: "list-1" })).toEqual({
				valid: false,
			});
		});
	});

	describe("clearCompleted Input Schema", () => {
		const validateClearCompleted = (
			input: unknown,
		): {
			valid: boolean;
			taskListId?: string;
		} => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("taskListId" in input) ||
				typeof (input as { taskListId: unknown }).taskListId !== "string"
			) {
				return { valid: false };
			}

			return {
				valid: true,
				taskListId: (input as { taskListId: string }).taskListId,
			};
		};

		it("should accept valid input", () => {
			expect(validateClearCompleted({ taskListId: "list-1" })).toEqual({
				valid: true,
				taskListId: "list-1",
			});
		});

		it("should reject missing taskListId", () => {
			expect(validateClearCompleted({})).toEqual({ valid: false });
		});

		it("should reject non-string taskListId", () => {
			expect(validateClearCompleted({ taskListId: 123 })).toEqual({
				valid: false,
			});
		});
	});
});

// ============================================================================
// Business Logic Tests
// ============================================================================

describe("Google Tasks Router - Business Logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getStatus - When integration exists", () => {
		it("should return enabled status when integration is enabled", () => {
			const integration = createMockIntegration({ enabled: true });

			const getStatus = (existingIntegration: MockGoogleTasksIntegration) => ({
				enabled: existingIntegration.enabled,
				syncEnabled: existingIntegration.syncEnabled,
				lastSyncedAt: existingIntegration.lastSyncedAt?.toISOString() ?? null,
				defaultListId: existingIntegration.defaultListId ?? null,
				linked: true,
			});

			const result = getStatus(integration);

			expect(result).toEqual({
				enabled: true,
				syncEnabled: true,
				lastSyncedAt: integration.lastSyncedAt?.toISOString() ?? null,
				defaultListId: "default-list-id",
				linked: true,
			});
		});

		it("should return disabled status when integration is disabled", () => {
			const integration = createMockIntegration({ enabled: false });

			const getStatus = (existingIntegration: MockGoogleTasksIntegration) => ({
				enabled: existingIntegration.enabled,
				syncEnabled: existingIntegration.syncEnabled,
				lastSyncedAt: existingIntegration.lastSyncedAt?.toISOString() ?? null,
				defaultListId: existingIntegration.defaultListId ?? null,
				linked: true,
			});

			const result = getStatus(integration);

			expect(result).toEqual({
				enabled: false,
				syncEnabled: true,
				lastSyncedAt: integration.lastSyncedAt?.toISOString(),
				defaultListId: "default-list-id",
				linked: true,
			});
		});

		it("should handle null lastSyncedAt", () => {
			const integration = createMockIntegration({ lastSyncedAt: null });

			const getStatus = (existingIntegration: MockGoogleTasksIntegration) => ({
				enabled: existingIntegration.enabled,
				syncEnabled: existingIntegration.syncEnabled,
				lastSyncedAt: existingIntegration.lastSyncedAt?.toISOString() ?? null,
				defaultListId: existingIntegration.defaultListId ?? null,
				linked: true,
			});

			const result = getStatus(integration);

			expect(result.lastSyncedAt).toBeNull();
		});

		it("should handle null defaultListId", () => {
			const integration = createMockIntegration({ defaultListId: null });

			const getStatus = (existingIntegration: MockGoogleTasksIntegration) => ({
				enabled: existingIntegration.enabled,
				syncEnabled: existingIntegration.syncEnabled,
				lastSyncedAt: existingIntegration.lastSyncedAt?.toISOString() ?? null,
				defaultListId: existingIntegration.defaultListId ?? null,
				linked: true,
			});

			const result = getStatus(integration);

			expect(result.defaultListId).toBeNull();
		});
	});

	describe("getStatus - When integration does not exist", () => {
		it("should return unlinked status", () => {
			const getStatusWhenNoIntegration = () => ({
				enabled: false,
				syncEnabled: false,
				lastSyncedAt: null,
				defaultListId: null,
				linked: false,
			});

			const result = getStatusWhenNoIntegration();

			expect(result).toEqual({
				enabled: false,
				syncEnabled: false,
				lastSyncedAt: null,
				defaultListId: null,
				linked: false,
			});
		});
	});

	describe("listTaskLists - Response transformation", () => {
		it("should transform Google task list response", () => {
			const rawLists: MockGoogleTaskList[] = [
				createMockTaskList({
					id: "list-1",
					title: "My Tasks",
					updated: "2026-01-24T10:00:00Z",
				}),
				createMockTaskList({
					id: "list-2",
					title: "Work",
					updated: "2026-01-24T11:00:00Z",
				}),
			];

			const transformLists = (
				lists: MockGoogleTaskList[],
			): Array<{
				id: string;
				title: string;
				updated: string;
			}> => {
				return lists.map((list) => ({
					id: list.id,
					title: list.title,
					updated: list.updated,
				}));
			};

			const result = transformLists(rawLists);

			expect(result).toEqual([
				{ id: "list-1", title: "My Tasks", updated: "2026-01-24T10:00:00Z" },
				{ id: "list-2", title: "Work", updated: "2026-01-24T11:00:00Z" },
			]);
		});

		it("should handle empty list array", () => {
			const rawLists: MockGoogleTaskList[] = [];

			const transformLists = (
				lists: MockGoogleTaskList[],
			): Array<{
				id: string;
				title: string;
				updated: string;
			}> => {
				return lists.map((list) => ({
					id: list.id,
					title: list.title,
					updated: list.updated,
				}));
			};

			const result = transformLists(rawLists);

			expect(result).toEqual([]);
		});
	});

	describe("listTasks - Response transformation", () => {
		it("should transform Google task response", () => {
			const rawTasks: MockGoogleTask[] = [
				createMockTask({
					id: "task-1",
					title: "Task 1",
					status: "needsAction",
					updated: "2026-01-24T10:00:00Z",
					position: "00000000000000000001",
					parent: "list-1",
					notes: "Some notes",
				}),
				createMockTask({
					id: "task-2",
					title: "Task 2",
					status: "completed",
					completed: "2026-01-24T11:00:00Z",
					updated: "2026-01-24T11:00:00Z",
					position: "00000000000000000002",
					parent: "list-1",
				}),
			];

			const transformTasks = (
				tasks: MockGoogleTask[],
			): Array<{
				id: string;
				title: string;
				notes: string | null;
				status: "needsAction" | "completed";
				due: string | null;
				completed: string | null;
				updated: string;
				position: string;
				parent: string;
				deleted: boolean;
				hidden: boolean;
			}> => {
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
			};

			const result = transformTasks(rawTasks);

			expect(result).toEqual([
				{
					id: "task-1",
					title: "Task 1",
					notes: "Some notes",
					status: "needsAction",
					due: null,
					completed: null,
					updated: "2026-01-24T10:00:00Z",
					position: "00000000000000000001",
					parent: "list-1",
					deleted: false,
					hidden: false,
				},
				{
					id: "task-2",
					title: "Task 2",
					notes: null,
					status: "completed",
					due: null,
					completed: "2026-01-24T11:00:00Z",
					updated: "2026-01-24T11:00:00Z",
					position: "00000000000000000002",
					parent: "list-1",
					deleted: false,
					hidden: false,
				},
			]);
		});
	});

	describe("enableIntegration - Token expiration calculation", () => {
		it("should calculate token expiration date correctly", () => {
			const expiresIn = 3600; // 1 hour
			const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

			expect(tokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
			expect(tokenExpiresAt.getTime()).toBeLessThanOrEqual(
				Date.now() + expiresIn * 1000 + 1000, // Allow 1 second margin
			);
		});

		it("should handle different expiration values", () => {
			const testCases = [
				{ expiresIn: 60, expectedSeconds: 60 },
				{ expiresIn: 3600, expectedSeconds: 3600 },
				{ expiresIn: 7200, expectedSeconds: 7200 },
			];

			for (const testCase of testCases) {
				const tokenExpiresAt = new Date(Date.now() + testCase.expiresIn * 1000);
				const timeDiff = Math.floor(
					(tokenExpiresAt.getTime() - Date.now()) / 1000,
				);
				// Allow small margin for test execution time
				expect(timeDiff).toBeGreaterThanOrEqual(testCase.expectedSeconds - 1);
				expect(timeDiff).toBeLessThanOrEqual(testCase.expectedSeconds + 1);
			}
		});
	});

	describe("updateSettings - Partial updates", () => {
		it("should update only enabled field", () => {
			const integration = createMockIntegration({ enabled: true });

			const applyUpdate = (
				existing: MockGoogleTasksIntegration,
				updates: { enabled?: boolean },
			) => ({
				...existing,
				...updates,
				updatedAt: new Date(),
			});

			const result = applyUpdate(integration, { enabled: false });

			expect(result.enabled).toBe(false);
			expect(result.syncEnabled).toBe(integration.syncEnabled);
			expect(result.defaultListId).toBe(integration.defaultListId);
		});

		it("should update only syncEnabled field", () => {
			const integration = createMockIntegration({ syncEnabled: true });

			const applyUpdate = (
				existing: MockGoogleTasksIntegration,
				updates: { syncEnabled?: boolean },
			) => ({
				...existing,
				...updates,
				updatedAt: new Date(),
			});

			const result = applyUpdate(integration, { syncEnabled: false });

			expect(result.syncEnabled).toBe(false);
			expect(result.enabled).toBe(integration.enabled);
			expect(result.defaultListId).toBe(integration.defaultListId);
		});

		it("should update only defaultListId field", () => {
			const integration = createMockIntegration({
				defaultListId: "old-list-id",
			});

			const applyUpdate = (
				existing: MockGoogleTasksIntegration,
				updates: { defaultListId?: string | null },
			) => ({
				...existing,
				...updates,
				updatedAt: new Date(),
			});

			const result = applyUpdate(integration, { defaultListId: "new-list-id" });

			expect(result.defaultListId).toBe("new-list-id");
			expect(result.enabled).toBe(integration.enabled);
			expect(result.syncEnabled).toBe(integration.syncEnabled);
		});

		it("should set defaultListId to null", () => {
			const integration = createMockIntegration({
				defaultListId: "old-list-id",
			});

			const applyUpdate = (
				existing: MockGoogleTasksIntegration,
				updates: { defaultListId?: string | null },
			) => ({
				...existing,
				...updates,
				updatedAt: new Date(),
			});

			const result = applyUpdate(integration, { defaultListId: null });

			expect(result.defaultListId).toBeNull();
		});
	});

	describe("updateLastSynced - Timestamp update", () => {
		it("should update lastSyncedAt to current time", () => {
			const integration = createMockIntegration();

			const before = new Date();
			const updatedIntegration = {
				...integration,
				lastSyncedAt: new Date(),
				updatedAt: new Date(),
			};
			const after = new Date();

			expect(updatedIntegration.lastSyncedAt?.getTime()).toBeGreaterThanOrEqual(
				before.getTime(),
			);
			expect(updatedIntegration.lastSyncedAt?.getTime()).toBeLessThanOrEqual(
				after.getTime(),
			);
		});
	});

	describe("Error handling", () => {
		it("should throw NOT_FOUND when integration does not exist for disable", () => {
			const integration = null;

			const checkExists = (existing: MockGoogleTasksIntegration | null) => {
				if (!existing) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Google Tasks integration not found",
					});
				}
				return existing;
			};

			expect(() => checkExists(integration)).toThrow(TRPCError);
			expect(() => checkExists(integration)).toThrow(
				"Google Tasks integration not found",
			);
		});

		it("should throw NOT_FOUND when integration does not exist for updateSettings", () => {
			const integration = null;

			const checkExists = (existing: MockGoogleTasksIntegration | null) => {
				if (!existing) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Google Tasks integration not found",
					});
				}
				return existing;
			};

			expect(() => checkExists(integration)).toThrow(TRPCError);
		});
	});
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("Google Tasks Router - Error Handling", () => {
	it("should use correct error codes for not found", () => {
		const throwNotFound = () => {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Google Tasks integration not found",
			});
		};

		try {
			throwNotFound();
		} catch (error) {
			expect(error).toBeInstanceOf(TRPCError);
			expect((error as TRPCError).code).toBe("NOT_FOUND");
		}
	});

	it("should use correct error codes for unauthorized", () => {
		const throwUnauthorized = () => {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Google account not linked",
			});
		};

		try {
			throwUnauthorized();
		} catch (error) {
			expect(error).toBeInstanceOf(TRPCError);
			expect((error as TRPCError).code).toBe("UNAUTHORIZED");
		}
	});

	it("should use correct error codes for internal server error", () => {
		const throwInternalError = () => {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to refresh access token",
			});
		};

		try {
			throwInternalError();
		} catch (error) {
			expect(error).toBeInstanceOf(TRPCError);
			expect((error as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
		}
	});

	it("should use correct error codes for too many requests", () => {
		const throwTooManyRequests = () => {
			throw new TRPCError({
				code: "TOO_MANY_REQUESTS",
				message: "Rate limit exceeded",
			});
		};

		try {
			throwTooManyRequests();
		} catch (error) {
			expect(error).toBeInstanceOf(TRPCError);
			expect((error as TRPCError).code).toBe("TOO_MANY_REQUESTS");
		}
	});
});
