import { db } from "@my-procedures-2/db";
import * as schema from "@my-procedures-2/db/schema/auth";
import { env } from "@my-procedures-2/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",

		schema: schema,
	}),
	trustedOrigins: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [nextCookies()],
});
