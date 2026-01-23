import { describe, expect, it, vi } from "vitest";

// Mock the tRPC module
vi.mock("@/utils/trpc", () => ({
	trpc: {
		todo: {
			getAll: {
				queryOptions: vi.fn(() => ({
					queryKey: ["todo", "getAll"],
					queryFn: vi.fn(),
				})),
				queryKey: vi.fn(() => ["todo", "getAll"]),
			},
			getDueInRange: {
				queryOptions: vi.fn((input) => ({
					queryKey: ["todo", "getDueInRange", input],
					queryFn: vi.fn(),
				})),
				queryKey: vi.fn((input) => ["todo", "getDueInRange", input]),
			},
			create: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["todo", "create"],
					mutationFn: vi.fn(),
				})),
			},
			toggle: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["todo", "toggle"],
					mutationFn: vi.fn(),
				})),
			},
			delete: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["todo", "delete"],
					mutationFn: vi.fn(),
				})),
			},
			bulkCreate: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["todo", "bulkCreate"],
					mutationFn: vi.fn(),
				})),
			},
			updateFolder: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["todo", "updateFolder"],
					mutationFn: vi.fn(),
				})),
			},
			updateSchedule: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["todo", "updateSchedule"],
					mutationFn: vi.fn(),
				})),
			},
			completeRecurring: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["todo", "completeRecurring"],
					mutationFn: vi.fn(),
				})),
			},
			updatePastCompletion: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["todo", "updatePastCompletion"],
					mutationFn: vi.fn(),
				})),
			},
		},
	},
}));

import {
	getAllTodosQueryOptions,
	getBulkCreateTodosMutationOptions,
	getCompleteRecurringMutationOptions,
	getCreateTodoMutationOptions,
	getDeleteTodoMutationOptions,
	getDueInRangeQueryKey,
	getDueInRangeQueryOptions,
	getTodosQueryKey,
	getToggleTodoMutationOptions,
	getUpdatePastCompletionMutationOptions,
	getUpdateTodoFolderMutationOptions,
	getUpdateTodoScheduleMutationOptions,
} from "./todo.api";

describe("Todo API", () => {
	describe("Query Options", () => {
		describe("getAllTodosQueryOptions", () => {
			it("returns query options for fetching all todos", () => {
				const options = getAllTodosQueryOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("queryKey");
				expect(options).toHaveProperty("queryFn");
			});

			it("includes correct query key", () => {
				const options = getAllTodosQueryOptions();

				expect(options.queryKey).toContain("todo");
				expect(options.queryKey).toContain("getAll");
			});
		});

		describe("getTodosQueryKey", () => {
			it("returns query key for todo list", () => {
				const queryKey = getTodosQueryKey();

				expect(queryKey).toBeDefined();
				expect(Array.isArray(queryKey)).toBe(true);
			});

			it("includes 'todo' in query key", () => {
				const queryKey = getTodosQueryKey();

				expect(queryKey).toContain("todo");
				expect(queryKey).toContain("getAll");
			});
		});

		describe("getDueInRangeQueryOptions", () => {
			it("returns query options for fetching todos due in range", () => {
				const input = {
					startDate: "2026-01-21T00:00:00.000Z",
					endDate: "2026-01-28T00:00:00.000Z",
				};
				const options = getDueInRangeQueryOptions(input);

				expect(options).toBeDefined();
				expect(options).toHaveProperty("queryKey");
				expect(options).toHaveProperty("queryFn");
			});

			it("includes date range input in query options", () => {
				const input = {
					startDate: "2026-01-21T00:00:00.000Z",
					endDate: "2026-01-28T00:00:00.000Z",
				};
				const options = getDueInRangeQueryOptions(input);

				expect(options.queryKey).toContain("todo");
				expect(options.queryKey).toContain("getDueInRange");
				expect(options.queryKey).toContainEqual(input);
			});

			it("handles different date ranges", () => {
				const todayInput = {
					startDate: "2026-01-21T00:00:00.000Z",
					endDate: "2026-01-21T23:59:59.999Z",
				};
				const options = getDueInRangeQueryOptions(todayInput);

				expect(options).toBeDefined();
				expect(options.queryKey).toContainEqual(todayInput);
			});
		});

		describe("getDueInRangeQueryKey", () => {
			it("returns query key for todos due in range", () => {
				const input = {
					startDate: "2026-01-21T00:00:00.000Z",
					endDate: "2026-01-28T00:00:00.000Z",
				};
				const queryKey = getDueInRangeQueryKey(input);

				expect(queryKey).toBeDefined();
				expect(Array.isArray(queryKey)).toBe(true);
			});

			it("includes date range in query key", () => {
				const input = {
					startDate: "2026-01-21T00:00:00.000Z",
					endDate: "2026-01-28T00:00:00.000Z",
				};
				const queryKey = getDueInRangeQueryKey(input);

				expect(queryKey).toContain("todo");
				expect(queryKey).toContain("getDueInRange");
				expect(queryKey).toContainEqual(input);
			});

			it("generates different keys for different date ranges", () => {
				const input1 = {
					startDate: "2026-01-21T00:00:00.000Z",
					endDate: "2026-01-28T00:00:00.000Z",
				};
				const input2 = {
					startDate: "2026-02-01T00:00:00.000Z",
					endDate: "2026-02-28T00:00:00.000Z",
				};
				const queryKey1 = getDueInRangeQueryKey(input1);
				const queryKey2 = getDueInRangeQueryKey(input2);

				expect(queryKey1).toContainEqual(input1);
				expect(queryKey2).toContainEqual(input2);
			});
		});
	});

	describe("Mutation Options", () => {
		describe("getCreateTodoMutationOptions", () => {
			it("returns mutation options for creating a todo", () => {
				const options = getCreateTodoMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getCreateTodoMutationOptions();

				expect(options.mutationKey).toContain("todo");
				expect(options.mutationKey).toContain("create");
			});
		});

		describe("getToggleTodoMutationOptions", () => {
			it("returns mutation options for toggling a todo", () => {
				const options = getToggleTodoMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getToggleTodoMutationOptions();

				expect(options.mutationKey).toContain("todo");
				expect(options.mutationKey).toContain("toggle");
			});
		});

		describe("getDeleteTodoMutationOptions", () => {
			it("returns mutation options for deleting a todo", () => {
				const options = getDeleteTodoMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getDeleteTodoMutationOptions();

				expect(options.mutationKey).toContain("todo");
				expect(options.mutationKey).toContain("delete");
			});
		});

		describe("getBulkCreateTodosMutationOptions", () => {
			it("returns mutation options for bulk creating todos", () => {
				const options = getBulkCreateTodosMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getBulkCreateTodosMutationOptions();

				expect(options.mutationKey).toContain("todo");
				expect(options.mutationKey).toContain("bulkCreate");
			});
		});

		describe("getUpdateTodoFolderMutationOptions", () => {
			it("returns mutation options for updating todo folder", () => {
				const options = getUpdateTodoFolderMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getUpdateTodoFolderMutationOptions();

				expect(options.mutationKey).toContain("todo");
				expect(options.mutationKey).toContain("updateFolder");
			});
		});

		describe("getUpdateTodoScheduleMutationOptions", () => {
			it("returns mutation options for updating todo schedule", () => {
				const options = getUpdateTodoScheduleMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getUpdateTodoScheduleMutationOptions();

				expect(options.mutationKey).toContain("todo");
				expect(options.mutationKey).toContain("updateSchedule");
			});
		});

		describe("getCompleteRecurringMutationOptions", () => {
			it("returns mutation options for completing a recurring todo", () => {
				const options = getCompleteRecurringMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getCompleteRecurringMutationOptions();

				expect(options.mutationKey).toContain("todo");
				expect(options.mutationKey).toContain("completeRecurring");
			});
		});

		describe("getUpdatePastCompletionMutationOptions", () => {
			it("returns mutation options for updating a past recurring todo completion", () => {
				const options = getUpdatePastCompletionMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getUpdatePastCompletionMutationOptions();

				expect(options.mutationKey).toContain("todo");
				expect(options.mutationKey).toContain("updatePastCompletion");
			});
		});
	});

	describe("Module Exports", () => {
		it("exports all query option functions", () => {
			expect(typeof getAllTodosQueryOptions).toBe("function");
			expect(typeof getTodosQueryKey).toBe("function");
			expect(typeof getDueInRangeQueryOptions).toBe("function");
			expect(typeof getDueInRangeQueryKey).toBe("function");
		});

		it("exports all mutation option functions", () => {
			expect(typeof getCreateTodoMutationOptions).toBe("function");
			expect(typeof getToggleTodoMutationOptions).toBe("function");
			expect(typeof getDeleteTodoMutationOptions).toBe("function");
			expect(typeof getBulkCreateTodosMutationOptions).toBe("function");
			expect(typeof getUpdateTodoFolderMutationOptions).toBe("function");
			expect(typeof getUpdateTodoScheduleMutationOptions).toBe("function");
			expect(typeof getCompleteRecurringMutationOptions).toBe("function");
			expect(typeof getUpdatePastCompletionMutationOptions).toBe("function");
		});
	});
});
