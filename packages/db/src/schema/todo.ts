import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { folder } from "./folder";

export interface RecurringPattern {
	type: "daily" | "weekly" | "monthly" | "yearly" | "custom";
	interval?: number;
	daysOfWeek?: number[];
	dayOfMonth?: number;
	monthOfYear?: number;
	endDate?: string;
	occurrences?: number;
}

export const todo = pgTable(
	"todo",
	{
		id: serial("id").primaryKey(),
		text: text("text").notNull(),
		completed: boolean("completed").default(false).notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		dueDate: timestamp("due_date"),
		reminderAt: timestamp("reminder_at"),
		recurringPattern: jsonb("recurring_pattern"),
		folderId: integer("folder_id").references(() => folder.id, {
			onDelete: "set null",
		}),
	},
	(table) => [
		index("todo_userId_idx").on(table.userId),
		index("todo_dueDate_idx").on(table.dueDate),
		index("todo_folderId_idx").on(table.folderId),
	],
);

export const todoRelations = relations(todo, ({ one }) => ({
	user: one(user, {
		fields: [todo.userId],
		references: [user.id],
	}),
	folder: one(folder, {
		fields: [todo.folderId],
		references: [folder.id],
	}),
}));
