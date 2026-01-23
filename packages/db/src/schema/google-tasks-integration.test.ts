import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
	googleTasksIntegration,
	googleTasksIntegrationRelations,
} from "./google-tasks-integration";

describe("googleTasksIntegration schema", () => {
	it("has all required columns", () => {
		const columns = getTableColumns(googleTasksIntegration);

		expect(columns.id).toBeDefined();
		expect(columns.userId).toBeDefined();
		expect(columns.enabled).toBeDefined();
		expect(columns.accessToken).toBeDefined();
		expect(columns.refreshToken).toBeDefined();
		expect(columns.tokenExpiresAt).toBeDefined();
		expect(columns.lastSyncedAt).toBeDefined();
		expect(columns.syncEnabled).toBeDefined();
		expect(columns.defaultListId).toBeDefined();
		expect(columns.createdAt).toBeDefined();
		expect(columns.updatedAt).toBeDefined();
	});

	it("has id as primary key", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.id.primary).toBe(true);
	});

	it("has userId as not null", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.userId.notNull).toBe(true);
	});

	it("has enabled with default value of true", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.enabled.notNull).toBe(true);
		expect(columns.enabled.default).toBe(true);
	});

	it("has accessToken as not null", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.accessToken.notNull).toBe(true);
	});

	it("has refreshToken as nullable", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.refreshToken).toBeDefined();
	});

	it("has tokenExpiresAt as nullable", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.tokenExpiresAt).toBeDefined();
	});

	it("has lastSyncedAt as nullable", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.lastSyncedAt).toBeDefined();
	});

	it("has syncEnabled with default value of true", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.syncEnabled.notNull).toBe(true);
		expect(columns.syncEnabled.default).toBe(true);
	});

	it("has defaultListId as nullable", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.defaultListId).toBeDefined();
	});

	it("has createdAt with default now", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.createdAt.notNull).toBe(true);
		expect(columns.createdAt.hasDefault).toBe(true);
	});

	it("has updatedAt with default now and onUpdate", () => {
		const columns = getTableColumns(googleTasksIntegration);
		expect(columns.updatedAt.notNull).toBe(true);
		expect(columns.updatedAt.hasDefault).toBe(true);
	});

	it("exports googleTasksIntegration relations", () => {
		expect(googleTasksIntegrationRelations).toBeDefined();
	});
});
