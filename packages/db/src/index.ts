import { env } from "@my-procedures-2/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export const db = drizzle(env.DATABASE_URL, { schema });

// Re-export drizzle-orm utilities to ensure consistent package resolution
export { and, asc, desc, eq, not, or, sql } from "drizzle-orm";
