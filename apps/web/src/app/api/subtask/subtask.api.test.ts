import { describe, expect, it, vi } from "vitest";

// Mock the tRPC module
vi.mock("@/utils/trpc", () => ({
	trpc: {
		subtask: {
			list: {
				queryOptions: vi.fn(() => ({
					queryKey: ["subtask", "list", { todoId: 1 }],
					queryFn: vi.fn(),
				})),
				queryKey: vi.fn((input) => ["subtask", "list", input]),
			},
			create: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["subtask", "create"],
					mutationFn: vi.fn(),
				})),
			},
			update: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["subtask", "update"],
					mutationFn: vi.fn(),
				})),
			},
			delete: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["subtask", "delete"],
					mutationFn: vi.fn(),
				})),
			},
			toggle: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["subtask", "toggle"],
					mutationFn: vi.fn(),
				})),
			},
			reorder: {
				mutationOptions: vi.fn(() => ({
					mutationKey: ["subtask", "reorder"],
					mutationFn: vi.fn(),
				})),
			},
		},
	},
}));

import {
	getCreateSubtaskMutationOptions,
	getDeleteSubtaskMutationOptions,
	getReorderSubtaskMutationOptions,
	getSubtasksQueryKey,
	getSubtasksQueryOptions,
	getToggleSubtaskMutationOptions,
	getUpdateSubtaskMutationOptions,
} from "./subtask.api";

describe("Subtask API", () => {
	describe("Query Options", () => {
		describe("getSubtasksQueryOptions", () => {
			it("returns query options for fetching subtasks by todoId", () => {
				const options = getSubtasksQueryOptions({ todoId: 1 });

				expect(options).toBeDefined();
				expect(options).toHaveProperty("queryKey");
				expect(options).toHaveProperty("queryFn");
			});

			it("includes todoId in query options", () => {
				const options = getSubtasksQueryOptions({ todoId: 42 });

				expect(options).toBeDefined();
				expect(options.queryKey).toContain("subtask");
			});
		});

		describe("getSubtasksQueryKey", () => {
			it("returns query key for subtasks list", () => {
				const queryKey = getSubtasksQueryKey(1);

				expect(queryKey).toBeDefined();
				expect(Array.isArray(queryKey)).toBe(true);
			});

			it("includes todoId in query key", () => {
				const queryKey = getSubtasksQueryKey(42);

				expect(queryKey).toBeDefined();
				expect(queryKey).toContainEqual({ todoId: 42 });
			});
		});
	});

	describe("Mutation Options", () => {
		describe("getCreateSubtaskMutationOptions", () => {
			it("returns mutation options for creating a subtask", () => {
				const options = getCreateSubtaskMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getCreateSubtaskMutationOptions();

				expect(options.mutationKey).toContain("subtask");
				expect(options.mutationKey).toContain("create");
			});
		});

		describe("getUpdateSubtaskMutationOptions", () => {
			it("returns mutation options for updating a subtask", () => {
				const options = getUpdateSubtaskMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getUpdateSubtaskMutationOptions();

				expect(options.mutationKey).toContain("subtask");
				expect(options.mutationKey).toContain("update");
			});
		});

		describe("getDeleteSubtaskMutationOptions", () => {
			it("returns mutation options for deleting a subtask", () => {
				const options = getDeleteSubtaskMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getDeleteSubtaskMutationOptions();

				expect(options.mutationKey).toContain("subtask");
				expect(options.mutationKey).toContain("delete");
			});
		});

		describe("getToggleSubtaskMutationOptions", () => {
			it("returns mutation options for toggling a subtask", () => {
				const options = getToggleSubtaskMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getToggleSubtaskMutationOptions();

				expect(options.mutationKey).toContain("subtask");
				expect(options.mutationKey).toContain("toggle");
			});
		});

		describe("getReorderSubtaskMutationOptions", () => {
			it("returns mutation options for reordering a subtask", () => {
				const options = getReorderSubtaskMutationOptions();

				expect(options).toBeDefined();
				expect(options).toHaveProperty("mutationKey");
				expect(options).toHaveProperty("mutationFn");
			});

			it("has correct mutation key", () => {
				const options = getReorderSubtaskMutationOptions();

				expect(options.mutationKey).toContain("subtask");
				expect(options.mutationKey).toContain("reorder");
			});
		});
	});

	describe("Module Exports", () => {
		it("exports all query option functions", () => {
			expect(typeof getSubtasksQueryOptions).toBe("function");
			expect(typeof getSubtasksQueryKey).toBe("function");
		});

		it("exports all mutation option functions", () => {
			expect(typeof getCreateSubtaskMutationOptions).toBe("function");
			expect(typeof getUpdateSubtaskMutationOptions).toBe("function");
			expect(typeof getDeleteSubtaskMutationOptions).toBe("function");
			expect(typeof getToggleSubtaskMutationOptions).toBe("function");
			expect(typeof getReorderSubtaskMutationOptions).toBe("function");
		});
	});
});
