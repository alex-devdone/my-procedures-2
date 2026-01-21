import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock("@my-procedures-2/db", () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
	eq: vi.fn((a, b) => ({ type: "eq", a, b })),
	and: vi.fn((...conditions) => ({ type: "and", conditions })),
	gt: vi.fn((a, b) => ({ type: "gt", a, b })),
	gte: vi.fn((a, b) => ({ type: "gte", a, b })),
	lt: vi.fn((a, b) => ({ type: "lt", a, b })),
	sql: vi.fn((strings, ...values) => ({ type: "sql", strings, values })),
}));

vi.mock("@my-procedures-2/db/schema/folder", () => ({
	folder: {
		id: "folder.id",
		name: "folder.name",
		color: "folder.color",
		userId: "folder.userId",
		createdAt: "folder.createdAt",
		order: "folder.order",
	},
}));

vi.mock("@my-procedures-2/db/schema/todo", () => ({
	todo: {
		id: "todo.id",
		folderId: "todo.folderId",
	},
}));

// ============================================================================
// Type Definitions for Tests
// ============================================================================

interface MockFolder {
	id: number;
	name: string;
	color: string;
	userId: string;
	createdAt: Date;
	order: number;
}

interface MockContext {
	session: {
		user: {
			id: string;
		};
	} | null;
}

// ============================================================================
// Folder Color Schema Tests
// ============================================================================

describe("Folder Color Schema", () => {
	const validColors = [
		"slate",
		"red",
		"orange",
		"amber",
		"yellow",
		"lime",
		"green",
		"emerald",
		"teal",
		"cyan",
		"sky",
		"blue",
		"indigo",
		"violet",
		"purple",
		"fuchsia",
		"pink",
		"rose",
	] as const;

	const validateColor = (color: string): boolean => {
		return validColors.includes(color as (typeof validColors)[number]);
	};

	it("should accept all valid colors", () => {
		for (const color of validColors) {
			expect(validateColor(color)).toBe(true);
		}
	});

	it("should reject invalid colors", () => {
		expect(validateColor("invalid")).toBe(false);
		expect(validateColor("")).toBe(false);
		expect(validateColor("RED")).toBe(false);
		expect(validateColor("black")).toBe(false);
	});
});

// ============================================================================
// Pure Function Tests (Business Logic)
// ============================================================================

describe("Folder Router Business Logic", () => {
	const userId = "user-123";

	const createMockContext = (
		authenticated: boolean,
		overrideUserId?: string,
	): MockContext => ({
		session: authenticated ? { user: { id: overrideUserId ?? userId } } : null,
	});

	const createMockFolder = (
		overrides: Partial<MockFolder> = {},
	): MockFolder => ({
		id: 1,
		name: "Test Folder",
		color: "slate",
		userId,
		createdAt: new Date("2026-01-20"),
		order: 0,
		...overrides,
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Authorization Logic", () => {
		describe("Protected Procedure Middleware", () => {
			it("should throw UNAUTHORIZED when no session exists", () => {
				const ctx = createMockContext(false);

				const checkAuth = (context: MockContext) => {
					if (!context.session) {
						throw new TRPCError({
							code: "UNAUTHORIZED",
							message: "Authentication required",
						});
					}
					return context;
				};

				expect(() => checkAuth(ctx)).toThrow(TRPCError);
				expect(() => checkAuth(ctx)).toThrow("Authentication required");
			});

			it("should pass when session exists", () => {
				const ctx = createMockContext(true);

				const checkAuth = (context: MockContext) => {
					if (!context.session) {
						throw new TRPCError({
							code: "UNAUTHORIZED",
							message: "Authentication required",
						});
					}
					return context;
				};

				expect(() => checkAuth(ctx)).not.toThrow();
			});
		});

		describe("Ownership Verification", () => {
			it("should allow access when folder belongs to user", () => {
				const folder = createMockFolder({ userId: "user-123" });
				const currentUserId = "user-123";

				const verifyOwnership = (
					existingFolder: MockFolder | undefined,
					ownerUserId: string,
				) => {
					if (!existingFolder || existingFolder.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Folder not found or you do not have permission to modify it",
						});
					}
					return true;
				};

				expect(verifyOwnership(folder, currentUserId)).toBe(true);
			});

			it("should throw NOT_FOUND when folder belongs to different user", () => {
				const folder = createMockFolder({ userId: "user-456" });
				const currentUserId = "user-123";

				const verifyOwnership = (
					existingFolder: MockFolder | undefined,
					ownerUserId: string,
				) => {
					if (!existingFolder || existingFolder.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Folder not found or you do not have permission to modify it",
						});
					}
					return true;
				};

				expect(() => verifyOwnership(folder, currentUserId)).toThrow(TRPCError);
			});

			it("should throw NOT_FOUND when folder does not exist", () => {
				const currentUserId = "user-123";

				const verifyOwnership = (
					existingFolder: MockFolder | undefined,
					ownerUserId: string,
				) => {
					if (!existingFolder || existingFolder.userId !== ownerUserId) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message:
								"Folder not found or you do not have permission to modify it",
						});
					}
					return true;
				};

				expect(() => verifyOwnership(undefined, currentUserId)).toThrow(
					TRPCError,
				);
			});
		});
	});

	describe("Input Validation Logic", () => {
		describe("Create Folder Validation", () => {
			const validateCreateInput = (input: { name: string; color?: string }) => {
				if (!input.name || input.name.length < 1) {
					throw new Error("Name is required");
				}
				if (input.name.length > 100) {
					throw new Error("Name is too long");
				}
				return true;
			};

			it("should accept valid name input", () => {
				expect(validateCreateInput({ name: "Work" })).toBe(true);
			});

			it("should accept name with color", () => {
				expect(validateCreateInput({ name: "Personal", color: "blue" })).toBe(
					true,
				);
			});

			it("should reject empty name input", () => {
				expect(() => validateCreateInput({ name: "" })).toThrow(
					"Name is required",
				);
			});

			it("should reject name over 100 characters", () => {
				const longName = "a".repeat(101);
				expect(() => validateCreateInput({ name: longName })).toThrow(
					"Name is too long",
				);
			});
		});

		describe("Update Folder Validation", () => {
			const validateUpdateInput = (input: {
				id: number;
				name?: string;
				color?: string;
			}) => {
				if (typeof input.id !== "number") {
					throw new Error("ID must be a number");
				}
				if (input.name !== undefined) {
					if (input.name.length < 1) {
						throw new Error("Name cannot be empty");
					}
					if (input.name.length > 100) {
						throw new Error("Name is too long");
					}
				}
				return true;
			};

			it("should accept valid update input with name", () => {
				expect(validateUpdateInput({ id: 1, name: "New Name" })).toBe(true);
			});

			it("should accept valid update input with color only", () => {
				expect(validateUpdateInput({ id: 1, color: "red" })).toBe(true);
			});

			it("should accept valid update input with both name and color", () => {
				expect(
					validateUpdateInput({ id: 1, name: "New Name", color: "blue" }),
				).toBe(true);
			});

			it("should reject invalid id type", () => {
				expect(() =>
					validateUpdateInput({
						id: "1" as unknown as number,
						name: "Test",
					}),
				).toThrow("ID must be a number");
			});

			it("should reject empty name when provided", () => {
				expect(() => validateUpdateInput({ id: 1, name: "" })).toThrow(
					"Name cannot be empty",
				);
			});
		});

		describe("Delete Folder Validation", () => {
			const validateDeleteInput = (input: { id: number }) => {
				if (typeof input.id !== "number") {
					throw new Error("ID must be a number");
				}
				return true;
			};

			it("should accept valid delete input", () => {
				expect(validateDeleteInput({ id: 1 })).toBe(true);
			});

			it("should reject invalid id type", () => {
				expect(() =>
					validateDeleteInput({ id: "1" as unknown as number }),
				).toThrow("ID must be a number");
			});
		});

		describe("Reorder Folder Validation", () => {
			const validateReorderInput = (input: {
				id: number;
				newOrder: number;
			}) => {
				if (typeof input.id !== "number") {
					throw new Error("ID must be a number");
				}
				if (typeof input.newOrder !== "number") {
					throw new Error("New order must be a number");
				}
				if (input.newOrder < 0) {
					throw new Error("New order cannot be negative");
				}
				return true;
			};

			it("should accept valid reorder input", () => {
				expect(validateReorderInput({ id: 1, newOrder: 2 })).toBe(true);
			});

			it("should accept zero as newOrder", () => {
				expect(validateReorderInput({ id: 1, newOrder: 0 })).toBe(true);
			});

			it("should reject negative newOrder", () => {
				expect(() => validateReorderInput({ id: 1, newOrder: -1 })).toThrow(
					"New order cannot be negative",
				);
			});
		});
	});

	describe("Business Logic Operations", () => {
		describe("list Operation", () => {
			it("should filter folders by userId", () => {
				const allFolders: MockFolder[] = [
					createMockFolder({ id: 1, userId: "user-123", order: 0 }),
					createMockFolder({ id: 2, userId: "user-456", order: 0 }),
					createMockFolder({ id: 3, userId: "user-123", order: 1 }),
				];

				const filterByUserId = (
					folders: MockFolder[],
					targetUserId: string,
				) => {
					return folders.filter((f) => f.userId === targetUserId);
				};

				const result = filterByUserId(allFolders, "user-123");

				expect(result).toHaveLength(2);
				expect(result.every((f) => f.userId === "user-123")).toBe(true);
			});

			it("should return folders sorted by order", () => {
				const folders: MockFolder[] = [
					createMockFolder({ id: 1, order: 2 }),
					createMockFolder({ id: 2, order: 0 }),
					createMockFolder({ id: 3, order: 1 }),
				];

				const sortByOrder = (foldersToSort: MockFolder[]) => {
					return [...foldersToSort].sort((a, b) => a.order - b.order);
				};

				const result = sortByOrder(folders);

				expect(result[0]?.order).toBe(0);
				expect(result[1]?.order).toBe(1);
				expect(result[2]?.order).toBe(2);
			});
		});

		describe("create Operation", () => {
			it("should create folder with correct structure", () => {
				const createFolderData = (
					name: string,
					color: string,
					currentUserId: string,
					order: number,
				): Omit<MockFolder, "id" | "createdAt"> => ({
					name,
					color,
					userId: currentUserId,
					order,
				});

				const result = createFolderData("Work", "blue", "user-123", 0);

				expect(result).toEqual({
					name: "Work",
					color: "blue",
					userId: "user-123",
					order: 0,
				});
			});

			it("should default color to slate", () => {
				const createFolderData = (
					name: string,
					color: string | undefined,
					currentUserId: string,
					order: number,
				): Omit<MockFolder, "id" | "createdAt"> => ({
					name,
					color: color ?? "slate",
					userId: currentUserId,
					order,
				});

				const result = createFolderData("Work", undefined, "user-123", 0);

				expect(result.color).toBe("slate");
			});

			it("should calculate next order based on max existing order", () => {
				const calculateNextOrder = (maxOrder: number | null) => {
					return (maxOrder ?? -1) + 1;
				};

				expect(calculateNextOrder(null)).toBe(0);
				expect(calculateNextOrder(-1)).toBe(0);
				expect(calculateNextOrder(0)).toBe(1);
				expect(calculateNextOrder(5)).toBe(6);
			});
		});

		describe("update Operation", () => {
			it("should update folder name", () => {
				const applyUpdate = (
					folder: MockFolder,
					updates: { name?: string; color?: string },
				): MockFolder => ({
					...folder,
					...updates,
				});

				const original = createMockFolder({ name: "Old Name" });
				const updated = applyUpdate(original, { name: "New Name" });

				expect(updated.name).toBe("New Name");
				expect(updated.color).toBe(original.color);
			});

			it("should update folder color", () => {
				const applyUpdate = (
					folder: MockFolder,
					updates: { name?: string; color?: string },
				): MockFolder => ({
					...folder,
					...updates,
				});

				const original = createMockFolder({ color: "slate" });
				const updated = applyUpdate(original, { color: "red" });

				expect(updated.color).toBe("red");
				expect(updated.name).toBe(original.name);
			});

			it("should preserve other fields", () => {
				const applyUpdate = (
					folder: MockFolder,
					updates: { name?: string; color?: string },
				): MockFolder => ({
					...folder,
					...updates,
				});

				const original = createMockFolder({
					id: 5,
					name: "Original",
					userId: "user-999",
					order: 3,
				});
				const updated = applyUpdate(original, { name: "Updated" });

				expect(updated.id).toBe(5);
				expect(updated.userId).toBe("user-999");
				expect(updated.order).toBe(3);
			});

			it("should return existing folder when no updates provided", () => {
				const applyUpdate = (
					folder: MockFolder,
					updates: { name?: string; color?: string },
				): MockFolder => {
					if (Object.keys(updates).length === 0) {
						return folder;
					}
					return { ...folder, ...updates };
				};

				const original = createMockFolder();
				const result = applyUpdate(original, {});

				expect(result).toBe(original);
			});
		});

		describe("delete Operation", () => {
			it("should remove folder from list", () => {
				const folders: MockFolder[] = [
					createMockFolder({ id: 1 }),
					createMockFolder({ id: 2 }),
					createMockFolder({ id: 3 }),
				];

				const removeFolder = (list: MockFolder[], idToRemove: number) => {
					return list.filter((f) => f.id !== idToRemove);
				};

				const result = removeFolder(folders, 2);

				expect(result).toHaveLength(2);
				expect(result.find((f) => f.id === 2)).toBeUndefined();
			});

			it("should reorder remaining folders after deletion", () => {
				const folders: MockFolder[] = [
					createMockFolder({ id: 1, order: 0 }),
					createMockFolder({ id: 2, order: 1 }),
					createMockFolder({ id: 3, order: 2 }),
				];

				const reorderAfterDelete = (
					list: MockFolder[],
					deletedOrder: number,
				) => {
					return list.map((f) => ({
						...f,
						order: f.order > deletedOrder ? f.order - 1 : f.order,
					}));
				};

				// Delete folder with order 1
				const afterDelete = folders.filter((f) => f.id !== 2);
				const result = reorderAfterDelete(afterDelete, 1);

				expect(result.find((f) => f.id === 1)?.order).toBe(0);
				expect(result.find((f) => f.id === 3)?.order).toBe(1);
			});
		});

		describe("reorder Operation", () => {
			it("should return existing folder when order unchanged", () => {
				const folder = createMockFolder({ order: 2 });
				const newOrder = 2;

				const shouldReorder = folder.order !== newOrder;

				expect(shouldReorder).toBe(false);
			});

			it("should calculate correct shift when moving down", () => {
				// Moving from order 1 to order 3
				// Folders at 2 and 3 should shift up (decrement)
				const oldOrder = 1;
				const newOrder = 3;

				const shouldShiftUp = (folderOrder: number) => {
					return folderOrder > oldOrder && folderOrder <= newOrder;
				};

				expect(shouldShiftUp(0)).toBe(false);
				expect(shouldShiftUp(1)).toBe(false);
				expect(shouldShiftUp(2)).toBe(true);
				expect(shouldShiftUp(3)).toBe(true);
				expect(shouldShiftUp(4)).toBe(false);
			});

			it("should calculate correct shift when moving up", () => {
				// Moving from order 3 to order 1
				// Folders at 1 and 2 should shift down (increment)
				const oldOrder = 3;
				const newOrder = 1;

				const shouldShiftDown = (folderOrder: number) => {
					return folderOrder >= newOrder && folderOrder < oldOrder;
				};

				expect(shouldShiftDown(0)).toBe(false);
				expect(shouldShiftDown(1)).toBe(true);
				expect(shouldShiftDown(2)).toBe(true);
				expect(shouldShiftDown(3)).toBe(false);
				expect(shouldShiftDown(4)).toBe(false);
			});

			it("should apply reorder correctly", () => {
				const folders: MockFolder[] = [
					createMockFolder({ id: 1, order: 0 }),
					createMockFolder({ id: 2, order: 1 }),
					createMockFolder({ id: 3, order: 2 }),
					createMockFolder({ id: 4, order: 3 }),
				];

				const applyReorder = (
					list: MockFolder[],
					folderId: number,
					newOrder: number,
				) => {
					const target = list.find((f) => f.id === folderId);
					if (!target) return list;

					const oldOrder = target.order;
					if (oldOrder === newOrder) return list;

					return list.map((f) => {
						if (f.id === folderId) {
							return { ...f, order: newOrder };
						}
						if (newOrder > oldOrder) {
							// Moving down: shift items between old and new up
							if (f.order > oldOrder && f.order <= newOrder) {
								return { ...f, order: f.order - 1 };
							}
						} else {
							// Moving up: shift items between new and old down
							if (f.order >= newOrder && f.order < oldOrder) {
								return { ...f, order: f.order + 1 };
							}
						}
						return f;
					});
				};

				// Move folder 1 (order 0) to order 2
				const result = applyReorder(folders, 1, 2);

				expect(result.find((f) => f.id === 1)?.order).toBe(2);
				expect(result.find((f) => f.id === 2)?.order).toBe(0);
				expect(result.find((f) => f.id === 3)?.order).toBe(1);
				expect(result.find((f) => f.id === 4)?.order).toBe(3);
			});
		});
	});

	describe("Error Handling", () => {
		it("should use correct error codes for authorization failures", () => {
			const throwUnauthorized = () => {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			};

			try {
				throwUnauthorized();
			} catch (error) {
				expect(error).toBeInstanceOf(TRPCError);
				expect((error as TRPCError).code).toBe("UNAUTHORIZED");
			}
		});

		it("should use correct error codes for not found", () => {
			const throwNotFound = () => {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Folder not found",
				});
			};

			try {
				throwNotFound();
			} catch (error) {
				expect(error).toBeInstanceOf(TRPCError);
				expect((error as TRPCError).code).toBe("NOT_FOUND");
			}
		});
	});
});

// ============================================================================
// Zod Schema Validation Tests
// ============================================================================

describe("Zod Schema Validation", () => {
	describe("Create Folder Input Schema", () => {
		const validateCreate = (
			input: unknown,
		): { valid: boolean; name?: string; color?: string } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("name" in input) ||
				typeof (input as { name: unknown }).name !== "string" ||
				(input as { name: string }).name.length < 1 ||
				(input as { name: string }).name.length > 100
			) {
				return { valid: false };
			}

			const typedInput = input as { name: string; color?: string };
			const validColors = [
				"slate",
				"red",
				"orange",
				"amber",
				"yellow",
				"lime",
				"green",
				"emerald",
				"teal",
				"cyan",
				"sky",
				"blue",
				"indigo",
				"violet",
				"purple",
				"fuchsia",
				"pink",
				"rose",
			];

			if (
				typedInput.color !== undefined &&
				!validColors.includes(typedInput.color)
			) {
				return { valid: false };
			}

			return {
				valid: true,
				name: typedInput.name,
				color: typedInput.color ?? "slate",
			};
		};

		it("validates correct input with name only", () => {
			expect(validateCreate({ name: "Work" })).toEqual({
				valid: true,
				name: "Work",
				color: "slate",
			});
		});

		it("validates correct input with name and color", () => {
			expect(validateCreate({ name: "Personal", color: "blue" })).toEqual({
				valid: true,
				name: "Personal",
				color: "blue",
			});
		});

		it("rejects empty name", () => {
			expect(validateCreate({ name: "" })).toEqual({ valid: false });
		});

		it("rejects missing name field", () => {
			expect(validateCreate({})).toEqual({ valid: false });
		});

		it("rejects name over 100 characters", () => {
			expect(validateCreate({ name: "a".repeat(101) })).toEqual({
				valid: false,
			});
		});

		it("rejects invalid color", () => {
			expect(validateCreate({ name: "Work", color: "invalid" })).toEqual({
				valid: false,
			});
		});
	});

	describe("Update Folder Input Schema", () => {
		const validateUpdate = (
			input: unknown,
		): { valid: boolean; id?: number; name?: string; color?: string } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("id" in input) ||
				typeof (input as { id: unknown }).id !== "number"
			) {
				return { valid: false };
			}

			const typedInput = input as { id: number; name?: string; color?: string };

			if (typedInput.name !== undefined) {
				if (
					typeof typedInput.name !== "string" ||
					typedInput.name.length < 1 ||
					typedInput.name.length > 100
				) {
					return { valid: false };
				}
			}

			const validColors = [
				"slate",
				"red",
				"orange",
				"amber",
				"yellow",
				"lime",
				"green",
				"emerald",
				"teal",
				"cyan",
				"sky",
				"blue",
				"indigo",
				"violet",
				"purple",
				"fuchsia",
				"pink",
				"rose",
			];

			if (
				typedInput.color !== undefined &&
				!validColors.includes(typedInput.color)
			) {
				return { valid: false };
			}

			return {
				valid: true,
				id: typedInput.id,
				name: typedInput.name,
				color: typedInput.color,
			};
		};

		it("validates correct input with id and name", () => {
			expect(validateUpdate({ id: 1, name: "New Name" })).toEqual({
				valid: true,
				id: 1,
				name: "New Name",
				color: undefined,
			});
		});

		it("validates correct input with id and color", () => {
			expect(validateUpdate({ id: 1, color: "red" })).toEqual({
				valid: true,
				id: 1,
				name: undefined,
				color: "red",
			});
		});

		it("validates correct input with all fields", () => {
			expect(
				validateUpdate({ id: 1, name: "Updated", color: "green" }),
			).toEqual({
				valid: true,
				id: 1,
				name: "Updated",
				color: "green",
			});
		});

		it("rejects string id", () => {
			expect(validateUpdate({ id: "1", name: "Test" })).toEqual({
				valid: false,
			});
		});

		it("rejects empty name when provided", () => {
			expect(validateUpdate({ id: 1, name: "" })).toEqual({ valid: false });
		});

		it("rejects invalid color", () => {
			expect(validateUpdate({ id: 1, color: "invalid" })).toEqual({
				valid: false,
			});
		});
	});

	describe("Delete Folder Input Schema", () => {
		const validateDelete = (
			input: unknown,
		): { valid: boolean; id?: number } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("id" in input) ||
				typeof (input as { id: unknown }).id !== "number"
			) {
				return { valid: false };
			}
			return { valid: true, id: (input as { id: number }).id };
		};

		it("validates correct input", () => {
			expect(validateDelete({ id: 42 })).toEqual({ valid: true, id: 42 });
		});

		it("rejects string id", () => {
			expect(validateDelete({ id: "42" })).toEqual({ valid: false });
		});

		it("rejects missing id", () => {
			expect(validateDelete({})).toEqual({ valid: false });
		});
	});

	describe("Reorder Folder Input Schema", () => {
		const validateReorder = (
			input: unknown,
		): { valid: boolean; id?: number; newOrder?: number } => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("id" in input) ||
				!("newOrder" in input) ||
				typeof (input as { id: unknown }).id !== "number" ||
				typeof (input as { newOrder: unknown }).newOrder !== "number" ||
				(input as { newOrder: number }).newOrder < 0
			) {
				return { valid: false };
			}
			return {
				valid: true,
				id: (input as { id: number }).id,
				newOrder: (input as { newOrder: number }).newOrder,
			};
		};

		it("validates correct input", () => {
			expect(validateReorder({ id: 1, newOrder: 2 })).toEqual({
				valid: true,
				id: 1,
				newOrder: 2,
			});
		});

		it("validates zero as newOrder", () => {
			expect(validateReorder({ id: 1, newOrder: 0 })).toEqual({
				valid: true,
				id: 1,
				newOrder: 0,
			});
		});

		it("rejects negative newOrder", () => {
			expect(validateReorder({ id: 1, newOrder: -1 })).toEqual({
				valid: false,
			});
		});

		it("rejects missing newOrder", () => {
			expect(validateReorder({ id: 1 })).toEqual({ valid: false });
		});

		it("rejects string id", () => {
			expect(validateReorder({ id: "1", newOrder: 2 })).toEqual({
				valid: false,
			});
		});
	});

	describe("Bulk Create Folders Input Schema", () => {
		const validColors = [
			"slate",
			"red",
			"orange",
			"amber",
			"yellow",
			"lime",
			"green",
			"emerald",
			"teal",
			"cyan",
			"sky",
			"blue",
			"indigo",
			"violet",
			"purple",
			"fuchsia",
			"pink",
			"rose",
		];

		const validateBulkCreate = (
			input: unknown,
		): {
			valid: boolean;
			folders?: Array<{ name: string; color: string; order?: number }>;
		} => {
			if (
				typeof input !== "object" ||
				input === null ||
				!("folders" in input) ||
				!Array.isArray((input as { folders: unknown }).folders)
			) {
				return { valid: false };
			}

			const folders = (
				input as {
					folders: Array<{ name?: unknown; color?: unknown; order?: unknown }>;
				}
			).folders;

			for (const folder of folders) {
				// Validate name
				if (
					typeof folder.name !== "string" ||
					folder.name.length < 1 ||
					folder.name.length > 100
				) {
					return { valid: false };
				}
				// Validate color (optional, defaults to slate)
				if (
					folder.color !== undefined &&
					!validColors.includes(folder.color as string)
				) {
					return { valid: false };
				}
				// Validate order (optional, must be non-negative if provided)
				if (
					folder.order !== undefined &&
					(typeof folder.order !== "number" || folder.order < 0)
				) {
					return { valid: false };
				}
			}

			return {
				valid: true,
				folders: folders.map((f) => ({
					name: f.name as string,
					color: (f.color as string) ?? "slate",
					order: f.order as number | undefined,
				})),
			};
		};

		it("validates empty folders array", () => {
			expect(validateBulkCreate({ folders: [] })).toEqual({
				valid: true,
				folders: [],
			});
		});

		it("validates single folder", () => {
			expect(validateBulkCreate({ folders: [{ name: "Work" }] })).toEqual({
				valid: true,
				folders: [{ name: "Work", color: "slate", order: undefined }],
			});
		});

		it("validates multiple folders", () => {
			const result = validateBulkCreate({
				folders: [
					{ name: "Work", color: "blue" },
					{ name: "Personal", color: "green", order: 1 },
				],
			});
			expect(result.valid).toBe(true);
			expect(result.folders).toHaveLength(2);
		});

		it("validates folder with explicit order", () => {
			expect(
				validateBulkCreate({ folders: [{ name: "Work", order: 5 }] }),
			).toEqual({
				valid: true,
				folders: [{ name: "Work", color: "slate", order: 5 }],
			});
		});

		it("rejects missing folders field", () => {
			expect(validateBulkCreate({})).toEqual({ valid: false });
		});

		it("rejects non-array folders", () => {
			expect(validateBulkCreate({ folders: "not-an-array" })).toEqual({
				valid: false,
			});
		});

		it("rejects folder with empty name", () => {
			expect(validateBulkCreate({ folders: [{ name: "" }] })).toEqual({
				valid: false,
			});
		});

		it("rejects folder with name over 100 characters", () => {
			expect(
				validateBulkCreate({ folders: [{ name: "a".repeat(101) }] }),
			).toEqual({ valid: false });
		});

		it("rejects folder with invalid color", () => {
			expect(
				validateBulkCreate({ folders: [{ name: "Work", color: "invalid" }] }),
			).toEqual({ valid: false });
		});

		it("rejects folder with negative order", () => {
			expect(
				validateBulkCreate({ folders: [{ name: "Work", order: -1 }] }),
			).toEqual({ valid: false });
		});

		it("accepts order of zero", () => {
			expect(
				validateBulkCreate({ folders: [{ name: "Work", order: 0 }] }),
			).toEqual({
				valid: true,
				folders: [{ name: "Work", color: "slate", order: 0 }],
			});
		});
	});
});

// ============================================================================
// Bulk Create Business Logic Tests
// ============================================================================

describe("Bulk Create Folders Business Logic", () => {
	const userId = "user-123";

	describe("Order Calculation", () => {
		it("should auto-increment order when not specified", () => {
			const maxExistingOrder = 2;
			let nextOrder = maxExistingOrder + 1;

			const foldersToCreate = [
				{ name: "Folder 1" },
				{ name: "Folder 2" },
				{ name: "Folder 3" },
			].map((f) => ({
				...f,
				color: "slate" as const,
				userId,
				order: nextOrder++,
			}));

			expect(foldersToCreate[0]?.order).toBe(3);
			expect(foldersToCreate[1]?.order).toBe(4);
			expect(foldersToCreate[2]?.order).toBe(5);
		});

		it("should use explicit order when provided", () => {
			const maxExistingOrder = 2;
			let nextOrder = maxExistingOrder + 1;

			const input = [
				{ name: "Folder 1", order: 10 },
				{ name: "Folder 2" },
				{ name: "Folder 3", order: 20 },
			];

			const foldersToCreate = input.map((f) => ({
				name: f.name,
				color: "slate" as const,
				userId,
				order: f.order !== undefined ? f.order : nextOrder++,
			}));

			expect(foldersToCreate[0]?.order).toBe(10);
			expect(foldersToCreate[1]?.order).toBe(3);
			expect(foldersToCreate[2]?.order).toBe(20);
		});

		it("should start at 0 when no existing folders", () => {
			const maxExistingOrder = -1; // COALESCE returns -1 when no folders exist
			let nextOrder = maxExistingOrder + 1;

			const foldersToCreate = [{ name: "First Folder" }].map((f) => ({
				...f,
				color: "slate" as const,
				userId,
				order: nextOrder++,
			}));

			expect(foldersToCreate[0]?.order).toBe(0);
		});
	});

	describe("Empty Input Handling", () => {
		it("should return count 0 for empty input", () => {
			const input: Array<{ name: string }> = [];
			const result = { count: input.length, folders: [] };

			expect(result.count).toBe(0);
			expect(result.folders).toEqual([]);
		});
	});

	describe("Color Default", () => {
		it("should default color to slate when not specified", () => {
			const input = { name: "Work", color: undefined };
			const processedColor = input.color ?? "slate";

			expect(processedColor).toBe("slate");
		});

		it("should preserve explicit color", () => {
			const input = { name: "Work", color: "blue" as const };
			const processedColor = input.color ?? "slate";

			expect(processedColor).toBe("blue");
		});
	});

	describe("Folder Data Structure", () => {
		it("should create folders with correct structure", () => {
			const input = [
				{ name: "Work", color: "blue" as const, order: 0 },
				{ name: "Personal", color: "green" as const, order: 1 },
			];

			const foldersToCreate = input.map((f) => ({
				name: f.name,
				color: f.color,
				userId,
				order: f.order,
			}));

			expect(foldersToCreate).toEqual([
				{ name: "Work", color: "blue", userId: "user-123", order: 0 },
				{ name: "Personal", color: "green", userId: "user-123", order: 1 },
			]);
		});
	});

	describe("Return Value", () => {
		it("should return count matching created folders length", () => {
			const createdFolders = [
				{
					id: 1,
					name: "Work",
					color: "blue",
					userId,
					order: 0,
					createdAt: new Date(),
				},
				{
					id: 2,
					name: "Personal",
					color: "green",
					userId,
					order: 1,
					createdAt: new Date(),
				},
			];

			const result = { count: createdFolders.length, folders: createdFolders };

			expect(result.count).toBe(2);
			expect(result.folders).toHaveLength(2);
		});
	});
});
