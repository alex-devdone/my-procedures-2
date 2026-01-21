import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	serial,
	text,
} from "drizzle-orm/pg-core";
import { todo } from "./todo";

export const subtask = pgTable(
	"subtask",
	{
		id: serial("id").primaryKey(),
		text: text("text").notNull(),
		completed: boolean("completed").notNull().default(false),
		todoId: integer("todo_id")
			.notNull()
			.references(() => todo.id, { onDelete: "cascade" }),
		order: integer("order").notNull().default(0),
	},
	(table) => [index("subtask_todoId_idx").on(table.todoId)],
);

export const subtaskRelations = relations(subtask, ({ one }) => ({
	todo: one(todo, {
		fields: [subtask.todoId],
		references: [todo.id],
	}),
}));
