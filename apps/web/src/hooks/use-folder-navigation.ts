import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { SelectedFolderId } from "./use-todo-storage";

/**
 * Hook to handle folder and smart view navigation.
 * Provides a consistent navigation handler across all pages.
 */
export function useFolderNavigation() {
	const router = useRouter();

	const navigateToFolder = useCallback(
		(folderId: SelectedFolderId) => {
			if (folderId === "today") {
				router.push("/today");
			} else if (folderId === "upcoming") {
				router.push("/upcoming");
			} else if (folderId === "overdue") {
				router.push("/overdue");
			} else if (folderId === "analytics") {
				router.push("/analytics");
			} else if (folderId === "inbox") {
				router.push("/todos");
			} else {
				router.push(`/todos?folder=${folderId}`);
			}
		},
		[router],
	);

	return { navigateToFolder };
}
