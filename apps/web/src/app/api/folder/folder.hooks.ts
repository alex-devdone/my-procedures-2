"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useSession } from "@/lib/auth-client";
import * as localFolderStorage from "@/lib/local-folder-storage";
import { queryClient } from "@/utils/trpc";

import {
	getAllFoldersQueryOptions,
	getCreateFolderMutationOptions,
	getDeleteFolderMutationOptions,
	getFoldersQueryKey,
	getReorderFolderMutationOptions,
	getUpdateFolderMutationOptions,
} from "./folder.api";
import type {
	Folder,
	FolderColor,
	LocalCreateFolderInput,
	LocalFolder,
	RemoteFolder,
	UpdateFolderInput,
	UseFolderStorageReturn,
} from "./folder.types";

// ============================================================================
// Local Storage Sync (for useSyncExternalStore)
// ============================================================================

let localFoldersListeners: Array<() => void> = [];

// Cached snapshot to prevent infinite loops in useSyncExternalStore
// React requires getSnapshot to return a cached value when data hasn't changed
let cachedLocalFolders: LocalFolder[] = [];
let cachedLocalFoldersJson = "";

// Cached empty array for server snapshot (must be stable reference)
const emptyLocalFolders: LocalFolder[] = [];

function subscribeToLocalFolders(callback: () => void) {
	localFoldersListeners.push(callback);
	return () => {
		localFoldersListeners = localFoldersListeners.filter((l) => l !== callback);
	};
}

export function notifyLocalFoldersListeners() {
	for (const listener of localFoldersListeners) {
		listener();
	}
}

function getLocalFoldersSnapshot(): LocalFolder[] {
	const folders = localFolderStorage.getAll();
	const foldersJson = JSON.stringify(folders);

	// Only return a new reference if the data actually changed
	if (foldersJson !== cachedLocalFoldersJson) {
		cachedLocalFoldersJson = foldersJson;
		cachedLocalFolders = folders;
	}

	return cachedLocalFolders;
}

function getLocalFoldersServerSnapshot(): LocalFolder[] {
	return emptyLocalFolders;
}

// ============================================================================
// useFolderStorage Hook
// ============================================================================

/**
 * Unified hook for managing folders with dual-mode support:
 * - Authenticated users: folders stored remotely via tRPC
 * - Guest users: folders stored locally in browser localStorage
 */
export function useFolderStorage(): UseFolderStorageReturn {
	const { data: session, isPending: isSessionPending } = useSession();
	const isAuthenticated = !!session?.user;

	const localFolders = useSyncExternalStore(
		subscribeToLocalFolders,
		getLocalFoldersSnapshot,
		getLocalFoldersServerSnapshot,
	);

	const queryKey = getFoldersQueryKey();

	const {
		data: remoteFolders,
		isLoading: isRemoteFoldersLoading,
		refetch: refetchRemoteFolders,
	} = useQuery({
		...getAllFoldersQueryOptions(),
		enabled: isAuthenticated,
	});

	// Create mutation with optimistic updates
	const createMutation = useMutation({
		mutationFn: getCreateFolderMutationOptions().mutationFn,
		onMutate: async (newFolder: { name: string; color?: FolderColor }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousFolders =
				queryClient.getQueryData<RemoteFolder[]>(queryKey);

			const maxOrder = Math.max(
				0,
				...(previousFolders ?? []).map((f) => f.order),
			);

			queryClient.setQueryData<RemoteFolder[]>(queryKey, (old) => [
				...(old ?? []),
				{
					id: -Date.now(),
					name: newFolder.name,
					color: newFolder.color ?? "slate",
					userId: session?.user?.id ?? "",
					createdAt: new Date().toISOString(),
					order: maxOrder + 1,
				},
			]);

			return { previousFolders };
		},
		onError: (_err, _newFolder, context) => {
			if (context?.previousFolders) {
				queryClient.setQueryData(queryKey, context.previousFolders);
			}
		},
		onSettled: () => {
			refetchRemoteFolders();
		},
	});

	// Update mutation with optimistic updates
	const updateMutation = useMutation({
		mutationFn: getUpdateFolderMutationOptions().mutationFn,
		onMutate: async (updatedFolder: UpdateFolderInput) => {
			await queryClient.cancelQueries({ queryKey });

			const previousFolders =
				queryClient.getQueryData<RemoteFolder[]>(queryKey);

			queryClient.setQueryData<RemoteFolder[]>(queryKey, (old) =>
				old?.map((folder) =>
					folder.id === updatedFolder.id
						? {
								...folder,
								...(updatedFolder.name !== undefined && {
									name: updatedFolder.name,
								}),
								...(updatedFolder.color !== undefined && {
									color: updatedFolder.color,
								}),
							}
						: folder,
				),
			);

			return { previousFolders };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousFolders) {
				queryClient.setQueryData(queryKey, context.previousFolders);
			}
		},
		onSettled: () => {
			refetchRemoteFolders();
		},
	});

	// Delete mutation with optimistic updates
	const deleteMutation = useMutation({
		mutationFn: getDeleteFolderMutationOptions().mutationFn,
		onMutate: async ({ id }: { id: number }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousFolders =
				queryClient.getQueryData<RemoteFolder[]>(queryKey);

			queryClient.setQueryData<RemoteFolder[]>(queryKey, (old) =>
				old?.filter((folder) => folder.id !== id),
			);

			return { previousFolders };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousFolders) {
				queryClient.setQueryData(queryKey, context.previousFolders);
			}
		},
		onSettled: () => {
			refetchRemoteFolders();
		},
	});

	// Reorder mutation with optimistic updates
	const reorderMutation = useMutation({
		mutationFn: getReorderFolderMutationOptions().mutationFn,
		onMutate: async ({ id, newOrder }: { id: number; newOrder: number }) => {
			await queryClient.cancelQueries({ queryKey });

			const previousFolders =
				queryClient.getQueryData<RemoteFolder[]>(queryKey);

			if (previousFolders) {
				const folderToMove = previousFolders.find((f) => f.id === id);
				if (folderToMove) {
					const oldOrder = folderToMove.order;

					queryClient.setQueryData<RemoteFolder[]>(queryKey, (old) => {
						if (!old) return old;
						return old
							.map((folder) => {
								if (folder.id === id) {
									return { ...folder, order: newOrder };
								}
								// Adjust orders of other folders
								if (newOrder > oldOrder) {
									// Moving down: decrease order of folders between old and new position
									if (folder.order > oldOrder && folder.order <= newOrder) {
										return { ...folder, order: folder.order - 1 };
									}
								} else if (newOrder < oldOrder) {
									// Moving up: increase order of folders between new and old position
									if (folder.order >= newOrder && folder.order < oldOrder) {
										return { ...folder, order: folder.order + 1 };
									}
								}
								return folder;
							})
							.sort((a, b) => a.order - b.order);
					});
				}
			}

			return { previousFolders };
		},
		onError: (_err, _variables, context) => {
			if (context?.previousFolders) {
				queryClient.setQueryData(queryKey, context.previousFolders);
			}
		},
		onSettled: () => {
			refetchRemoteFolders();
		},
	});

	const create = useCallback(
		async (input: LocalCreateFolderInput) => {
			if (isAuthenticated) {
				await createMutation.mutateAsync(input);
			} else {
				localFolderStorage.create(input.name, input.color);
				notifyLocalFoldersListeners();
			}
		},
		[isAuthenticated, createMutation],
	);

	const update = useCallback(
		async (
			input:
				| UpdateFolderInput
				| { id: string; name?: string; color?: FolderColor },
		) => {
			if (isAuthenticated) {
				await updateMutation.mutateAsync(input as UpdateFolderInput);
			} else {
				localFolderStorage.update(
					input.id as string,
					input.name,
					input.color as FolderColor | undefined,
				);
				notifyLocalFoldersListeners();
			}
		},
		[isAuthenticated, updateMutation],
	);

	const deleteFolder = useCallback(
		async (id: number | string) => {
			if (isAuthenticated) {
				await deleteMutation.mutateAsync({ id: id as number });
			} else {
				localFolderStorage.deleteFolder(id as string);
				notifyLocalFoldersListeners();
			}
		},
		[isAuthenticated, deleteMutation],
	);

	const reorder = useCallback(
		async (id: number | string, newOrder: number) => {
			if (isAuthenticated) {
				await reorderMutation.mutateAsync({ id: id as number, newOrder });
			} else {
				localFolderStorage.reorder(id as string, newOrder);
				notifyLocalFoldersListeners();
			}
		},
		[isAuthenticated, reorderMutation],
	);

	const folders: Folder[] = useMemo(() => {
		if (isAuthenticated) {
			return (remoteFolders ?? [])
				.map((f) => ({
					id: f.id,
					name: f.name,
					color: f.color as FolderColor,
					order: f.order,
					createdAt: new Date(f.createdAt),
				}))
				.sort((a, b) => a.order - b.order);
		}
		return localFolders
			.map((f) => ({
				id: f.id,
				name: f.name,
				color: f.color,
				order: f.order,
				createdAt: new Date(f.createdAt),
			}))
			.sort((a, b) => a.order - b.order);
	}, [isAuthenticated, remoteFolders, localFolders]);

	// Initial loading state - only true during first data fetch
	// Does NOT include mutation pending states to allow optimistic updates to render
	const isLoading =
		isSessionPending || (isAuthenticated && isRemoteFoldersLoading);

	return {
		folders,
		create,
		update,
		deleteFolder,
		reorder,
		isLoading,
		isAuthenticated,
	};
}
