import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export { GoogleTasksClient } from "./lib/google-tasks-client";
export {
	formatRecurringPattern,
	getNextNotificationTime,
	getNextOccurrence,
	isPatternExpired,
	parseRecurringDescription,
	type RecurringPattern,
	recurringPatternSchema,
} from "./lib/recurring";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});
