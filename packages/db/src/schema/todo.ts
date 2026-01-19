import { relations } from "drizzle-orm";
import { boolean, index, pgTable, serial, text } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const todo = pgTable(
	"todo",
	{
		id: serial("id").primaryKey(),
		text: text("text").notNull(),
		completed: boolean("completed").default(false).notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("todo_userId_idx").on(table.userId)],
);

export const todoRelations = relations(todo, ({ one }) => ({
	user: one(user, {
		fields: [todo.userId],
		references: [user.id],
	}),
}));
