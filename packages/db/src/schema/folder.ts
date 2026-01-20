import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const folder = pgTable(
	"folder",
	{
		id: serial("id").primaryKey(),
		name: text("name").notNull(),
		color: text("color").notNull().default("slate"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		order: integer("order").notNull().default(0),
	},
	(table) => [index("folder_userId_idx").on(table.userId)],
);

export const folderRelations = relations(folder, ({ one }) => ({
	user: one(user, {
		fields: [folder.userId],
		references: [user.id],
	}),
}));
