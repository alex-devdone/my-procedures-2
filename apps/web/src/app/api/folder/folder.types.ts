import { z } from "zod";

// ============================================================================
// Base Types
// ============================================================================

/**
 * Available folder colors for visual organization.
 */
export const FOLDER_COLORS = [
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

export type FolderColor = (typeof FOLDER_COLORS)[number];

/**
 * Unified folder type for frontend use.
 * Supports both local (string UUID) and remote (numeric) IDs.
 */
export interface Folder {
	id: number | string;
	name: string;
	color: FolderColor;
	order: number;
	createdAt: Date;
}

/**
 * Remote folder from the database (via tRPC).
 * Note: createdAt is serialized as ISO string over JSON.
 */
export interface RemoteFolder {
	id: number;
	name: string;
	color: string;
	userId: string;
	createdAt: string;
	order: number;
}

/**
 * Local folder stored in browser localStorage.
 */
export interface LocalFolder {
	id: string;
	name: string;
	color: FolderColor;
	order: number;
	createdAt: string; // ISO string for localStorage serialization
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const folderColorSchema = z.enum(FOLDER_COLORS);

export const createFolderInputSchema = z.object({
	name: z
		.string()
		.min(1, "Folder name is required")
		.max(100, "Folder name must be 100 characters or less"),
	color: folderColorSchema.optional().default("slate"),
});

export const updateFolderInputSchema = z.object({
	id: z.number(),
	name: z
		.string()
		.min(1, "Folder name is required")
		.max(100, "Folder name must be 100 characters or less")
		.optional(),
	color: folderColorSchema.optional(),
});

export const deleteFolderInputSchema = z.object({
	id: z.number(),
});

export const reorderFolderInputSchema = z.object({
	id: z.number(),
	newOrder: z.number().min(0),
});

// Local folder schemas (using string IDs)
export const localCreateFolderInputSchema = z.object({
	name: z
		.string()
		.min(1, "Folder name is required")
		.max(100, "Folder name must be 100 characters or less"),
	color: folderColorSchema.optional().default("slate"),
});

export const localUpdateFolderInputSchema = z.object({
	id: z.string(),
	name: z
		.string()
		.min(1, "Folder name is required")
		.max(100, "Folder name must be 100 characters or less")
		.optional(),
	color: folderColorSchema.optional(),
});

export const localDeleteFolderInputSchema = z.object({
	id: z.string(),
});

export const localReorderFolderInputSchema = z.object({
	id: z.string(),
	newOrder: z.number().min(0),
});

// ============================================================================
// Input Types (inferred from Zod schemas)
// ============================================================================

export type CreateFolderInput = z.infer<typeof createFolderInputSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderInputSchema>;
export type DeleteFolderInput = z.infer<typeof deleteFolderInputSchema>;
export type ReorderFolderInput = z.infer<typeof reorderFolderInputSchema>;

// Use z.input for the input type (before .default() is applied)
export type LocalCreateFolderInput = z.input<
	typeof localCreateFolderInputSchema
>;
export type LocalUpdateFolderInput = z.infer<
	typeof localUpdateFolderInputSchema
>;
export type LocalDeleteFolderInput = z.infer<
	typeof localDeleteFolderInputSchema
>;
export type LocalReorderFolderInput = z.infer<
	typeof localReorderFolderInputSchema
>;

// ============================================================================
// Output Types
// ============================================================================

export interface DeleteFolderOutput {
	success: boolean;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseFolderStorageReturn {
	folders: Folder[];
	create: (input: LocalCreateFolderInput) => Promise<void>;
	update: (input: LocalUpdateFolderInput | UpdateFolderInput) => Promise<void>;
	deleteFolder: (id: number | string) => Promise<void>;
	reorder: (id: number | string, newOrder: number) => Promise<void>;
	isLoading: boolean;
	isAuthenticated: boolean;
}
