import { db } from "@my-procedures-2/db";
import * as schema from "@my-procedures-2/db/schema/auth";
import { env } from "@my-procedures-2/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

// Build trusted origins list from CORS_ORIGIN env var
// Also include Vercel preview URL if available
const trustedOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim());
if (env.VERCEL_URL) {
	trustedOrigins.push(`https://${env.VERCEL_URL}`);
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",

		schema: schema,
	}),
	trustedOrigins,
	emailAndPassword: {
		enabled: true,
	},
	plugins: [nextCookies()],
});
