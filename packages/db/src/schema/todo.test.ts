import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { type RecurringPattern, todo, todoRelations } from "./todo";

describe("todo schema", () => {
	it("has all required columns", () => {
		const columns = getTableColumns(todo);

		expect(columns.id).toBeDefined();
		expect(columns.text).toBeDefined();
		expect(columns.completed).toBeDefined();
		expect(columns.userId).toBeDefined();
	});

	it("has all scheduling columns", () => {
		const columns = getTableColumns(todo);

		expect(columns.dueDate).toBeDefined();
		expect(columns.reminderAt).toBeDefined();
		expect(columns.recurringPattern).toBeDefined();
		expect(columns.folderId).toBeDefined();
	});

	it("has id as primary key", () => {
		const columns = getTableColumns(todo);
		expect(columns.id.primary).toBe(true);
	});

	it("has text as not null", () => {
		const columns = getTableColumns(todo);
		expect(columns.text.notNull).toBe(true);
	});

	it("has completed with default false", () => {
		const columns = getTableColumns(todo);
		expect(columns.completed.notNull).toBe(true);
		expect(columns.completed.default).toBe(false);
	});

	it("has userId as not null", () => {
		const columns = getTableColumns(todo);
		expect(columns.userId.notNull).toBe(true);
	});

	it("has dueDate as nullable", () => {
		const columns = getTableColumns(todo);
		expect(columns.dueDate.notNull).toBe(false);
	});

	it("has reminderAt as nullable", () => {
		const columns = getTableColumns(todo);
		expect(columns.reminderAt.notNull).toBe(false);
	});

	it("has recurringPattern as nullable", () => {
		const columns = getTableColumns(todo);
		expect(columns.recurringPattern.notNull).toBe(false);
	});

	it("has folderId as nullable", () => {
		const columns = getTableColumns(todo);
		expect(columns.folderId.notNull).toBe(false);
	});

	it("exports todo relations", () => {
		expect(todoRelations).toBeDefined();
	});
});

describe("RecurringPattern type", () => {
	it("accepts daily pattern", () => {
		const pattern: RecurringPattern = { type: "daily" };
		expect(pattern.type).toBe("daily");
	});

	it("accepts daily pattern with interval", () => {
		const pattern: RecurringPattern = { type: "daily", interval: 3 };
		expect(pattern.type).toBe("daily");
		expect(pattern.interval).toBe(3);
	});

	it("accepts weekly pattern with days of week", () => {
		const pattern: RecurringPattern = {
			type: "weekly",
			daysOfWeek: [1, 3, 5],
		};
		expect(pattern.type).toBe("weekly");
		expect(pattern.daysOfWeek).toEqual([1, 3, 5]);
	});

	it("accepts monthly pattern with day of month", () => {
		const pattern: RecurringPattern = { type: "monthly", dayOfMonth: 15 };
		expect(pattern.type).toBe("monthly");
		expect(pattern.dayOfMonth).toBe(15);
	});

	it("accepts yearly pattern with month and day", () => {
		const pattern: RecurringPattern = {
			type: "yearly",
			monthOfYear: 1,
			dayOfMonth: 1,
		};
		expect(pattern.type).toBe("yearly");
		expect(pattern.monthOfYear).toBe(1);
		expect(pattern.dayOfMonth).toBe(1);
	});

	it("accepts custom pattern with all options", () => {
		const pattern: RecurringPattern = {
			type: "custom",
			interval: 2,
			daysOfWeek: [2],
			endDate: "2026-12-31",
			occurrences: 10,
		};
		expect(pattern.type).toBe("custom");
		expect(pattern.interval).toBe(2);
		expect(pattern.daysOfWeek).toEqual([2]);
		expect(pattern.endDate).toBe("2026-12-31");
		expect(pattern.occurrences).toBe(10);
	});
});
