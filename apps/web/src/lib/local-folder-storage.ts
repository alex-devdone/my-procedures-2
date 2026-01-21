import type { FolderColor, LocalFolder } from "@/app/api/folder/folder.types";

const STORAGE_KEY = "folders";

function isLocalFolderArray(data: unknown): data is LocalFolder[] {
	if (!Array.isArray(data)) return false;
	return data.every(
		(item) =>
			typeof item === "object" &&
			item !== null &&
			typeof item.id === "string" &&
			typeof item.name === "string" &&
			typeof item.color === "string" &&
			typeof item.order === "number" &&
			typeof item.createdAt === "string",
	);
}

export function getAll(): LocalFolder[] {
	if (typeof window === "undefined") return [];

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];

		const parsed: unknown = JSON.parse(stored);
		if (!isLocalFolderArray(parsed)) {
			return [];
		}
		return parsed.sort((a, b) => a.order - b.order);
	} catch {
		return [];
	}
}

export function create(name: string, color?: FolderColor): LocalFolder {
	const folders = getAll();
	const maxOrder = Math.max(0, ...folders.map((f) => f.order));
	const newFolder: LocalFolder = {
		id: crypto.randomUUID(),
		name,
		color: color ?? "slate",
		order: maxOrder + 1,
		createdAt: new Date().toISOString(),
	};
	folders.push(newFolder);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
	return newFolder;
}

export function update(
	id: string,
	name?: string,
	color?: FolderColor,
): LocalFolder | null {
	const folders = getAll();
	const folder = folders.find((f) => f.id === id);
	if (!folder) return null;

	if (name !== undefined) {
		folder.name = name;
	}
	if (color !== undefined) {
		folder.color = color;
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
	return folder;
}

export function deleteFolder(id: string): boolean {
	const folders = getAll();
	const index = folders.findIndex((f) => f.id === id);
	if (index === -1) return false;

	folders.splice(index, 1);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
	return true;
}

export function reorder(id: string, newOrder: number): LocalFolder | null {
	const folders = getAll();
	const folderToMove = folders.find((f) => f.id === id);
	if (!folderToMove) return null;

	const oldOrder = folderToMove.order;

	// Update orders
	for (const folder of folders) {
		if (folder.id === id) {
			folder.order = newOrder;
		} else if (newOrder > oldOrder) {
			// Moving down: decrease order of folders between old and new position
			if (folder.order > oldOrder && folder.order <= newOrder) {
				folder.order -= 1;
			}
		} else if (newOrder < oldOrder) {
			// Moving up: increase order of folders between new and old position
			if (folder.order >= newOrder && folder.order < oldOrder) {
				folder.order += 1;
			}
		}
	}

	localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
	return folderToMove;
}

export function clearAll(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(STORAGE_KEY);
}
