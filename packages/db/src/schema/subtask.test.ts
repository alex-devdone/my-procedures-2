import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { subtask, subtaskRelations } from "./subtask";

describe("subtask schema", () => {
	it("has all required columns", () => {
		const columns = getTableColumns(subtask);

		expect(columns.id).toBeDefined();
		expect(columns.text).toBeDefined();
		expect(columns.completed).toBeDefined();
		expect(columns.todoId).toBeDefined();
		expect(columns.order).toBeDefined();
	});

	it("has id as primary key", () => {
		const columns = getTableColumns(subtask);
		expect(columns.id.primary).toBe(true);
	});

	it("has text as not null", () => {
		const columns = getTableColumns(subtask);
		expect(columns.text.notNull).toBe(true);
	});

	it("has completed with default false", () => {
		const columns = getTableColumns(subtask);
		expect(columns.completed.notNull).toBe(true);
		expect(columns.completed.default).toBe(false);
	});

	it("has todoId as not null", () => {
		const columns = getTableColumns(subtask);
		expect(columns.todoId.notNull).toBe(true);
	});

	it("has order with default 0", () => {
		const columns = getTableColumns(subtask);
		expect(columns.order.notNull).toBe(true);
		expect(columns.order.default).toBe(0);
	});

	it("exports subtask relations", () => {
		expect(subtaskRelations).toBeDefined();
	});
});
