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
import { subtask } from "./subtask";

export interface RecurringPattern {
	type: "daily" | "weekly" | "monthly" | "yearly" | "custom";
	interval?: number;
	daysOfWeek?: number[];
	dayOfMonth?: number;
	monthOfYear?: number;
	endDate?: string;
	occurrences?: number;
	/** Time of day to send notification in HH:mm format (e.g., "09:00") */
	notifyAt?: string;
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
		googleTaskId: text("google_task_id"),
		googleSyncEnabled: boolean("google_sync_enabled").default(false).notNull(),
		lastSyncedAt: timestamp("last_synced_at"),
	},
	(table) => [
		index("todo_userId_idx").on(table.userId),
		index("todo_dueDate_idx").on(table.dueDate),
		index("todo_folderId_idx").on(table.folderId),
		index("todo_googleTaskId_idx").on(table.googleTaskId),
	],
);

export const todoRelations = relations(todo, ({ one, many }) => ({
	user: one(user, {
		fields: [todo.userId],
		references: [user.id],
	}),
	folder: one(folder, {
		fields: [todo.folderId],
		references: [folder.id],
	}),
	subtasks: many(subtask),
	completions: many(recurringTodoCompletion),
}));

export const recurringTodoCompletion = pgTable(
	"recurring_todo_completion",
	{
		id: serial("id").primaryKey(),
		todoId: integer("todo_id")
			.notNull()
			.references(() => todo.id, { onDelete: "cascade" }),
		scheduledDate: timestamp("scheduled_date").notNull(),
		completedAt: timestamp("completed_at"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		index("recurring_todo_completion_todoId_idx").on(table.todoId),
		index("recurring_todo_completion_userId_idx").on(table.userId),
		index("recurring_todo_completion_scheduledDate_idx").on(
			table.scheduledDate,
		),
	],
);

export const recurringTodoCompletionRelations = relations(
	recurringTodoCompletion,
	({ one }) => ({
		todo: one(todo, {
			fields: [recurringTodoCompletion.todoId],
			references: [todo.id],
		}),
		user: one(user, {
			fields: [recurringTodoCompletion.userId],
			references: [user.id],
		}),
	}),
);
