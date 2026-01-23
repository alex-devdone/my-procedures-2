import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const googleTasksIntegration = pgTable(
	"google_tasks_integration",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		enabled: boolean("enabled").default(true).notNull(),
		accessToken: text("access_token").notNull(),
		refreshToken: text("refresh_token"),
		tokenExpiresAt: timestamp("token_expires_at"),
		lastSyncedAt: timestamp("last_synced_at"),
		syncEnabled: boolean("sync_enabled").default(true).notNull(),
		defaultListId: text("default_list_id"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("google_tasks_integration_userId_idx").on(table.userId),
		index("google_tasks_integration_enabled_idx").on(table.enabled),
	],
);

export const googleTasksIntegrationRelations = relations(
	googleTasksIntegration,
	({ one }) => ({
		user: one(user, {
			fields: [googleTasksIntegration.userId],
			references: [user.id],
		}),
	}),
);
