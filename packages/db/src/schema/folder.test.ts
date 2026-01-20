import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { folder, folderRelations } from "./folder";

describe("folder schema", () => {
	it("has all required columns", () => {
		const columns = getTableColumns(folder);

		expect(columns.id).toBeDefined();
		expect(columns.name).toBeDefined();
		expect(columns.color).toBeDefined();
		expect(columns.userId).toBeDefined();
		expect(columns.createdAt).toBeDefined();
		expect(columns.order).toBeDefined();
	});

	it("has id as primary key", () => {
		const columns = getTableColumns(folder);
		expect(columns.id.primary).toBe(true);
	});

	it("has name as not null", () => {
		const columns = getTableColumns(folder);
		expect(columns.name.notNull).toBe(true);
	});

	it("has color with default value of slate", () => {
		const columns = getTableColumns(folder);
		expect(columns.color.notNull).toBe(true);
		expect(columns.color.default).toBe("slate");
	});

	it("has userId as not null", () => {
		const columns = getTableColumns(folder);
		expect(columns.userId.notNull).toBe(true);
	});

	it("has createdAt with default now", () => {
		const columns = getTableColumns(folder);
		expect(columns.createdAt.notNull).toBe(true);
		expect(columns.createdAt.hasDefault).toBe(true);
	});

	it("has order with default 0", () => {
		const columns = getTableColumns(folder);
		expect(columns.order.notNull).toBe(true);
		expect(columns.order.default).toBe(0);
	});

	it("exports folder relations", () => {
		expect(folderRelations).toBeDefined();
	});
});
