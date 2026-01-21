import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as localFolderStorage from "./local-folder-storage";

const STORAGE_KEY = "folders";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string): string | null => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get _store() {
			return store;
		},
	};
})();

// Mock crypto.randomUUID
const mockUUID = vi.fn(() => "test-uuid-1234");

describe("local-folder-storage", () => {
	beforeEach(() => {
		vi.stubGlobal("localStorage", localStorageMock);
		vi.stubGlobal("crypto", { randomUUID: mockUUID });
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("getAll", () => {
		it("returns empty array when localStorage is empty", () => {
			const result = localFolderStorage.getAll();
			expect(result).toEqual([]);
		});

		it("returns empty array when stored value is null", () => {
			localStorageMock.getItem.mockReturnValueOnce(null);
			const result = localFolderStorage.getAll();
			expect(result).toEqual([]);
		});

		it("returns folders sorted by order", () => {
			const folders = [
				{
					id: "folder-2",
					name: "Work",
					color: "blue",
					order: 2,
					createdAt: "2026-01-20T10:00:00.000Z",
				},
				{
					id: "folder-1",
					name: "Personal",
					color: "green",
					order: 1,
					createdAt: "2026-01-20T09:00:00.000Z",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(folders));

			const result = localFolderStorage.getAll();

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("Personal");
			expect(result[1].name).toBe("Work");
		});

		it("returns empty array for invalid JSON", () => {
			localStorageMock.setItem(STORAGE_KEY, "not valid json");

			const result = localFolderStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when data is not an array", () => {
			localStorageMock.setItem(
				STORAGE_KEY,
				JSON.stringify({ id: "folder-1", name: "Test" }),
			);

			const result = localFolderStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when folder item is missing required fields", () => {
			const invalidFolders = [
				{ id: "folder-1", name: "Test" }, // missing color, order, createdAt
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidFolders));

			const result = localFolderStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when folder has wrong field types", () => {
			const invalidFolders = [
				{
					id: 123, // should be string
					name: "Test",
					color: "blue",
					order: 1,
					createdAt: "2026-01-20T10:00:00.000Z",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidFolders));

			const result = localFolderStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when order is not a number", () => {
			const invalidFolders = [
				{
					id: "folder-1",
					name: "Test",
					color: "blue",
					order: "1", // should be number
					createdAt: "2026-01-20T10:00:00.000Z",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(invalidFolders));

			const result = localFolderStorage.getAll();

			expect(result).toEqual([]);
		});

		it("returns empty array when window is undefined (SSR)", () => {
			vi.stubGlobal("window", undefined);

			const result = localFolderStorage.getAll();

			expect(result).toEqual([]);
		});
	});

	describe("create", () => {
		it("creates a new folder with default color", () => {
			const result = localFolderStorage.create("Work");

			expect(result).toMatchObject({
				id: "test-uuid-1234",
				name: "Work",
				color: "slate",
				order: 1,
			});
			expect(result.createdAt).toBeDefined();
			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEY,
				expect.any(String),
			);
		});

		it("creates a new folder with specified color", () => {
			const result = localFolderStorage.create("Personal", "blue");

			expect(result.color).toBe("blue");
		});

		it("assigns order based on existing folders", () => {
			const existingFolders = [
				{
					id: "folder-1",
					name: "Existing",
					color: "slate",
					order: 5,
					createdAt: "2026-01-20T10:00:00.000Z",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(existingFolders));

			const result = localFolderStorage.create("New Folder");

			expect(result.order).toBe(6);
		});

		it("assigns order 1 when no folders exist", () => {
			const result = localFolderStorage.create("First Folder");

			expect(result.order).toBe(1);
		});

		it("stores the new folder in localStorage", () => {
			localFolderStorage.create("Test Folder");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored).toHaveLength(1);
			expect(stored[0].name).toBe("Test Folder");
		});

		it("appends to existing folders", () => {
			const existingFolders = [
				{
					id: "folder-1",
					name: "Existing",
					color: "slate",
					order: 1,
					createdAt: "2026-01-20T10:00:00.000Z",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(existingFolders));

			localFolderStorage.create("New Folder");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored).toHaveLength(2);
		});
	});

	describe("update", () => {
		beforeEach(() => {
			const folders = [
				{
					id: "folder-1",
					name: "Original",
					color: "slate",
					order: 1,
					createdAt: "2026-01-20T10:00:00.000Z",
				},
				{
					id: "folder-2",
					name: "Another",
					color: "blue",
					order: 2,
					createdAt: "2026-01-20T11:00:00.000Z",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(folders));
		});

		it("updates folder name", () => {
			const result = localFolderStorage.update("folder-1", "Updated Name");

			expect(result).not.toBeNull();
			expect(result?.name).toBe("Updated Name");
			expect(result?.color).toBe("slate"); // unchanged
		});

		it("updates folder color", () => {
			const result = localFolderStorage.update("folder-1", undefined, "green");

			expect(result).not.toBeNull();
			expect(result?.color).toBe("green");
			expect(result?.name).toBe("Original"); // unchanged
		});

		it("updates both name and color", () => {
			const result = localFolderStorage.update(
				"folder-1",
				"New Name",
				"purple",
			);

			expect(result).not.toBeNull();
			expect(result?.name).toBe("New Name");
			expect(result?.color).toBe("purple");
		});

		it("returns null for non-existent folder", () => {
			const result = localFolderStorage.update(
				"non-existent",
				"New Name",
				"red",
			);

			expect(result).toBeNull();
		});

		it("persists changes to localStorage", () => {
			localFolderStorage.update("folder-1", "Updated Name", "red");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const updated = stored.find((f: { id: string }) => f.id === "folder-1");
			expect(updated.name).toBe("Updated Name");
			expect(updated.color).toBe("red");
		});

		it("does not modify other folders", () => {
			localFolderStorage.update("folder-1", "Updated Name");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const other = stored.find((f: { id: string }) => f.id === "folder-2");
			expect(other.name).toBe("Another");
			expect(other.color).toBe("blue");
		});
	});

	describe("deleteFolder", () => {
		beforeEach(() => {
			const folders = [
				{
					id: "folder-1",
					name: "First",
					color: "slate",
					order: 1,
					createdAt: "2026-01-20T10:00:00.000Z",
				},
				{
					id: "folder-2",
					name: "Second",
					color: "blue",
					order: 2,
					createdAt: "2026-01-20T11:00:00.000Z",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(folders));
		});

		it("deletes an existing folder", () => {
			const result = localFolderStorage.deleteFolder("folder-1");

			expect(result).toBe(true);
			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe("folder-2");
		});

		it("returns false for non-existent folder", () => {
			const result = localFolderStorage.deleteFolder("non-existent");

			expect(result).toBe(false);
		});

		it("persists deletion to localStorage", () => {
			localFolderStorage.deleteFolder("folder-1");

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			expect(stored.some((f: { id: string }) => f.id === "folder-1")).toBe(
				false,
			);
		});
	});

	describe("reorder", () => {
		beforeEach(() => {
			const folders = [
				{
					id: "folder-1",
					name: "First",
					color: "slate",
					order: 1,
					createdAt: "2026-01-20T10:00:00.000Z",
				},
				{
					id: "folder-2",
					name: "Second",
					color: "blue",
					order: 2,
					createdAt: "2026-01-20T11:00:00.000Z",
				},
				{
					id: "folder-3",
					name: "Third",
					color: "green",
					order: 3,
					createdAt: "2026-01-20T12:00:00.000Z",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(folders));
		});

		it("returns null for non-existent folder", () => {
			const result = localFolderStorage.reorder("non-existent", 2);

			expect(result).toBeNull();
		});

		it("moves folder down (from order 1 to order 3)", () => {
			localFolderStorage.reorder("folder-1", 3);

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const folder1 = stored.find((f: { id: string }) => f.id === "folder-1");
			const folder2 = stored.find((f: { id: string }) => f.id === "folder-2");
			const folder3 = stored.find((f: { id: string }) => f.id === "folder-3");

			expect(folder1.order).toBe(3);
			expect(folder2.order).toBe(1); // moved up
			expect(folder3.order).toBe(2); // moved up
		});

		it("moves folder up (from order 3 to order 1)", () => {
			localFolderStorage.reorder("folder-3", 1);

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const folder1 = stored.find((f: { id: string }) => f.id === "folder-1");
			const folder2 = stored.find((f: { id: string }) => f.id === "folder-2");
			const folder3 = stored.find((f: { id: string }) => f.id === "folder-3");

			expect(folder3.order).toBe(1);
			expect(folder1.order).toBe(2); // moved down
			expect(folder2.order).toBe(3); // moved down
		});

		it("does not change order when moving to same position", () => {
			localFolderStorage.reorder("folder-2", 2);

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const folder1 = stored.find((f: { id: string }) => f.id === "folder-1");
			const folder2 = stored.find((f: { id: string }) => f.id === "folder-2");
			const folder3 = stored.find((f: { id: string }) => f.id === "folder-3");

			expect(folder1.order).toBe(1);
			expect(folder2.order).toBe(2);
			expect(folder3.order).toBe(3);
		});

		it("returns the updated folder", () => {
			const result = localFolderStorage.reorder("folder-1", 3);

			expect(result).not.toBeNull();
			expect(result?.id).toBe("folder-1");
			expect(result?.order).toBe(3);
		});

		it("persists reorder to localStorage", () => {
			localFolderStorage.reorder("folder-1", 3);

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				STORAGE_KEY,
				expect.any(String),
			);
		});

		it("handles moving to middle position (from 1 to 2)", () => {
			localFolderStorage.reorder("folder-1", 2);

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const folder1 = stored.find((f: { id: string }) => f.id === "folder-1");
			const folder2 = stored.find((f: { id: string }) => f.id === "folder-2");
			const folder3 = stored.find((f: { id: string }) => f.id === "folder-3");

			expect(folder1.order).toBe(2);
			expect(folder2.order).toBe(1); // moved up
			expect(folder3.order).toBe(3); // unchanged
		});

		it("handles moving from middle to first (from 2 to 1)", () => {
			localFolderStorage.reorder("folder-2", 1);

			const stored = JSON.parse(localStorageMock._store[STORAGE_KEY]);
			const folder1 = stored.find((f: { id: string }) => f.id === "folder-1");
			const folder2 = stored.find((f: { id: string }) => f.id === "folder-2");
			const folder3 = stored.find((f: { id: string }) => f.id === "folder-3");

			expect(folder2.order).toBe(1);
			expect(folder1.order).toBe(2); // moved down
			expect(folder3.order).toBe(3); // unchanged
		});
	});

	describe("clearAll", () => {
		it("removes all folders from localStorage", () => {
			const folders = [
				{
					id: "folder-1",
					name: "Test",
					color: "slate",
					order: 1,
					createdAt: "2026-01-20T10:00:00.000Z",
				},
			];
			localStorageMock.setItem(STORAGE_KEY, JSON.stringify(folders));

			localFolderStorage.clearAll();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
		});

		it("handles clearing when no folders exist", () => {
			localFolderStorage.clearAll();

			expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
		});

		it("does not throw when window is undefined (SSR)", () => {
			vi.stubGlobal("window", undefined);

			expect(() => localFolderStorage.clearAll()).not.toThrow();
		});
	});
});
