import { describe, expect, it } from "vitest";
import {
	bulkCreateFoldersInputSchema,
	createFolderInputSchema,
	deleteFolderInputSchema,
	FOLDER_COLORS,
	folderColorSchema,
	localCreateFolderInputSchema,
	localDeleteFolderInputSchema,
	localReorderFolderInputSchema,
	localUpdateFolderInputSchema,
	reorderFolderInputSchema,
	updateFolderInputSchema,
} from "./folder.types";

describe("Folder Color Schema", () => {
	describe("folderColorSchema", () => {
		it("accepts all valid folder colors", () => {
			for (const color of FOLDER_COLORS) {
				const result = folderColorSchema.safeParse(color);
				expect(result.success).toBe(true);
			}
		});

		it("rejects invalid colors", () => {
			const result = folderColorSchema.safeParse("invalid-color");
			expect(result.success).toBe(false);
		});

		it("rejects empty string", () => {
			const result = folderColorSchema.safeParse("");
			expect(result.success).toBe(false);
		});

		it("rejects non-string values", () => {
			const result = folderColorSchema.safeParse(123);
			expect(result.success).toBe(false);
		});
	});
});

describe("Create Folder Input Schema", () => {
	describe("createFolderInputSchema", () => {
		it("accepts valid input with name only", () => {
			const result = createFolderInputSchema.safeParse({ name: "Work" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe("Work");
				expect(result.data.color).toBe("slate"); // default
			}
		});

		it("accepts valid input with name and color", () => {
			const result = createFolderInputSchema.safeParse({
				name: "Personal",
				color: "blue",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe("Personal");
				expect(result.data.color).toBe("blue");
			}
		});

		it("rejects empty name", () => {
			const result = createFolderInputSchema.safeParse({ name: "" });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe("Folder name is required");
			}
		});

		it("rejects name exceeding 100 characters", () => {
			const longName = "a".repeat(101);
			const result = createFolderInputSchema.safeParse({ name: longName });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toBe(
					"Folder name must be 100 characters or less",
				);
			}
		});

		it("accepts name with exactly 100 characters", () => {
			const maxName = "a".repeat(100);
			const result = createFolderInputSchema.safeParse({ name: maxName });
			expect(result.success).toBe(true);
		});

		it("rejects invalid color", () => {
			const result = createFolderInputSchema.safeParse({
				name: "Work",
				color: "rainbow",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing name", () => {
			const result = createFolderInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});
});

describe("Update Folder Input Schema", () => {
	describe("updateFolderInputSchema", () => {
		it("accepts valid input with id and name", () => {
			const result = updateFolderInputSchema.safeParse({
				id: 1,
				name: "Updated",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
				expect(result.data.name).toBe("Updated");
			}
		});

		it("accepts valid input with id and color", () => {
			const result = updateFolderInputSchema.safeParse({
				id: 1,
				color: "green",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
				expect(result.data.color).toBe("green");
			}
		});

		it("accepts valid input with id, name, and color", () => {
			const result = updateFolderInputSchema.safeParse({
				id: 1,
				name: "Updated",
				color: "red",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
				expect(result.data.name).toBe("Updated");
				expect(result.data.color).toBe("red");
			}
		});

		it("accepts valid input with only id (no updates)", () => {
			const result = updateFolderInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(true);
		});

		it("rejects missing id", () => {
			const result = updateFolderInputSchema.safeParse({ name: "Updated" });
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = updateFolderInputSchema.safeParse({
				id: "abc",
				name: "Updated",
			});
			expect(result.success).toBe(false);
		});

		it("rejects empty name", () => {
			const result = updateFolderInputSchema.safeParse({ id: 1, name: "" });
			expect(result.success).toBe(false);
		});

		it("rejects name exceeding 100 characters", () => {
			const longName = "a".repeat(101);
			const result = updateFolderInputSchema.safeParse({
				id: 1,
				name: longName,
			});
			expect(result.success).toBe(false);
		});

		it("rejects invalid color", () => {
			const result = updateFolderInputSchema.safeParse({
				id: 1,
				color: "rainbow",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Delete Folder Input Schema", () => {
	describe("deleteFolderInputSchema", () => {
		it("accepts valid numeric id", () => {
			const result = deleteFolderInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
			}
		});

		it("rejects missing id", () => {
			const result = deleteFolderInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = deleteFolderInputSchema.safeParse({ id: "abc" });
			expect(result.success).toBe(false);
		});

		it("rejects string id", () => {
			const result = deleteFolderInputSchema.safeParse({
				id: "uuid-123",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Reorder Folder Input Schema", () => {
	describe("reorderFolderInputSchema", () => {
		it("accepts valid input with id and newOrder", () => {
			const result = reorderFolderInputSchema.safeParse({
				id: 1,
				newOrder: 2,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(1);
				expect(result.data.newOrder).toBe(2);
			}
		});

		it("accepts newOrder of 0", () => {
			const result = reorderFolderInputSchema.safeParse({
				id: 1,
				newOrder: 0,
			});
			expect(result.success).toBe(true);
		});

		it("rejects negative newOrder", () => {
			const result = reorderFolderInputSchema.safeParse({
				id: 1,
				newOrder: -1,
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing id", () => {
			const result = reorderFolderInputSchema.safeParse({ newOrder: 2 });
			expect(result.success).toBe(false);
		});

		it("rejects missing newOrder", () => {
			const result = reorderFolderInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(false);
		});

		it("rejects non-numeric id", () => {
			const result = reorderFolderInputSchema.safeParse({
				id: "abc",
				newOrder: 2,
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("Local Folder Input Schemas", () => {
	describe("localCreateFolderInputSchema", () => {
		it("accepts valid input with name only", () => {
			const result = localCreateFolderInputSchema.safeParse({ name: "Work" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe("Work");
				expect(result.data.color).toBe("slate");
			}
		});

		it("accepts valid input with name and color", () => {
			const result = localCreateFolderInputSchema.safeParse({
				name: "Personal",
				color: "blue",
			});
			expect(result.success).toBe(true);
		});

		it("rejects empty name", () => {
			const result = localCreateFolderInputSchema.safeParse({ name: "" });
			expect(result.success).toBe(false);
		});
	});

	describe("localUpdateFolderInputSchema", () => {
		it("accepts valid input with string id", () => {
			const result = localUpdateFolderInputSchema.safeParse({
				id: "uuid-123",
				name: "Updated",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe("uuid-123");
			}
		});

		it("rejects numeric id", () => {
			const result = localUpdateFolderInputSchema.safeParse({
				id: 123,
				name: "Updated",
			});
			expect(result.success).toBe(false);
		});

		it("accepts valid input with id, name, and color", () => {
			const result = localUpdateFolderInputSchema.safeParse({
				id: "uuid-123",
				name: "Updated",
				color: "purple",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("localDeleteFolderInputSchema", () => {
		it("accepts valid string id", () => {
			const result = localDeleteFolderInputSchema.safeParse({
				id: "uuid-123",
			});
			expect(result.success).toBe(true);
		});

		it("rejects numeric id", () => {
			const result = localDeleteFolderInputSchema.safeParse({ id: 123 });
			expect(result.success).toBe(false);
		});
	});

	describe("localReorderFolderInputSchema", () => {
		it("accepts valid input with string id", () => {
			const result = localReorderFolderInputSchema.safeParse({
				id: "uuid-123",
				newOrder: 2,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe("uuid-123");
				expect(result.data.newOrder).toBe(2);
			}
		});

		it("rejects negative newOrder", () => {
			const result = localReorderFolderInputSchema.safeParse({
				id: "uuid-123",
				newOrder: -1,
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("FOLDER_COLORS constant", () => {
	it("contains 18 predefined colors", () => {
		expect(FOLDER_COLORS).toHaveLength(18);
	});

	it("includes common colors", () => {
		expect(FOLDER_COLORS).toContain("slate");
		expect(FOLDER_COLORS).toContain("red");
		expect(FOLDER_COLORS).toContain("blue");
		expect(FOLDER_COLORS).toContain("green");
	});

	it("starts with slate as default color", () => {
		expect(FOLDER_COLORS[0]).toBe("slate");
	});
});

describe("Bulk Create Folders Input Schema", () => {
	describe("bulkCreateFoldersInputSchema", () => {
		it("accepts empty folders array", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({ folders: [] });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.folders).toEqual([]);
			}
		});

		it("accepts single folder with name only", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "Work" }],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.folders[0].name).toBe("Work");
				expect(result.data.folders[0].color).toBe("slate"); // default
			}
		});

		it("accepts single folder with name and color", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "Personal", color: "blue" }],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.folders[0].name).toBe("Personal");
				expect(result.data.folders[0].color).toBe("blue");
			}
		});

		it("accepts single folder with name, color, and order", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "Work", color: "green", order: 5 }],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.folders[0].order).toBe(5);
			}
		});

		it("accepts multiple folders", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [
					{ name: "Work", color: "blue" },
					{ name: "Personal", color: "green", order: 1 },
					{ name: "Archive" },
				],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.folders).toHaveLength(3);
			}
		});

		it("rejects folder with empty name", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "" }],
			});
			expect(result.success).toBe(false);
		});

		it("rejects folder with name exceeding 100 characters", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "a".repeat(101) }],
			});
			expect(result.success).toBe(false);
		});

		it("accepts folder with exactly 100 character name", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "a".repeat(100) }],
			});
			expect(result.success).toBe(true);
		});

		it("rejects folder with invalid color", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "Work", color: "rainbow" }],
			});
			expect(result.success).toBe(false);
		});

		it("rejects folder with negative order", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "Work", order: -1 }],
			});
			expect(result.success).toBe(false);
		});

		it("accepts folder with order of 0", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "Work", order: 0 }],
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.folders[0].order).toBe(0);
			}
		});

		it("rejects missing folders field", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it("rejects non-array folders field", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: "not-an-array",
			});
			expect(result.success).toBe(false);
		});

		it("rejects when one folder is invalid in array", () => {
			const result = bulkCreateFoldersInputSchema.safeParse({
				folders: [{ name: "Valid" }, { name: "" }],
			});
			expect(result.success).toBe(false);
		});
	});
});
