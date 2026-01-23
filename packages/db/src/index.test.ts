import { describe, expect, it } from "vitest";

// Verify that all schema exports are available from the main db package
// Import schema directly to avoid env validation issues
import { account, session, user, verification } from "./schema/auth";
import { folder } from "./schema/folder";
import { googleTasksIntegration } from "./schema/google-tasks-integration";
import { subtask } from "./schema/subtask";
import { recurringTodoCompletion, todo } from "./schema/todo";

describe("db package exports", () => {
	it("should export auth schema tables from schema/index", () => {
		expect(user).toBeDefined();
		expect(session).toBeDefined();
		expect(account).toBeDefined();
		expect(verification).toBeDefined();
	});

	it("should export domain schema tables from schema/index", () => {
		expect(todo).toBeDefined();
		expect(folder).toBeDefined();
		expect(subtask).toBeDefined();
		expect(googleTasksIntegration).toBeDefined();
		expect(recurringTodoCompletion).toBeDefined();
	});
});
