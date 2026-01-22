"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Folder, UseFolderStorageReturn } from "@/app/api/folder";

// Mock the folder hooks
const mockUseFolderStorage = vi.fn<() => UseFolderStorageReturn>();
vi.mock("@/app/api/folder", () => ({
	useFolderStorage: () => mockUseFolderStorage(),
}));

// Import after mocks
import { FolderSidebar, type SmartViewType } from "./folder-sidebar";

const createMockFolder = (overrides: Partial<Folder> = {}): Folder => ({
	id: "folder-1",
	name: "Test Folder",
	color: "blue",
	order: 0,
	createdAt: new Date("2024-01-01"),
	...overrides,
});

const defaultMockReturn: UseFolderStorageReturn = {
	folders: [],
	create: vi.fn(),
	update: vi.fn(),
	deleteFolder: vi.fn(),
	reorder: vi.fn(),
	isLoading: false,
	isAuthenticated: false,
};

describe("FolderSidebar", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseFolderStorage.mockReturnValue(defaultMockReturn);
	});

	describe("Rendering", () => {
		it("renders the sidebar with smart views", () => {
			render(<FolderSidebar />);

			expect(screen.getByTestId("folder-sidebar")).toBeInTheDocument();
			expect(screen.getByTestId("smart-views")).toBeInTheDocument();
		});

		it("renders all smart views", () => {
			render(<FolderSidebar />);

			expect(screen.getByTestId("smart-view-today")).toBeInTheDocument();
			expect(screen.getByTestId("smart-view-upcoming")).toBeInTheDocument();
			expect(screen.getByTestId("smart-view-overdue")).toBeInTheDocument();
			expect(screen.getByTestId("smart-view-analytics")).toBeInTheDocument();
		});

		it("renders smart view labels", () => {
			render(<FolderSidebar />);

			expect(screen.getByText("Today")).toBeInTheDocument();
			expect(screen.getByText("Upcoming")).toBeInTheDocument();
			expect(screen.getByText("Overdue")).toBeInTheDocument();
			expect(screen.getByText("Analytics")).toBeInTheDocument();
		});

		it("renders divider between smart views and folders", () => {
			render(<FolderSidebar />);

			const nav = screen.getByRole("navigation");
			const divider = nav.querySelector('div[class*="border-t"]');
			expect(divider).toBeInTheDocument();
			expect(divider).toHaveClass("border-t");
		});

		it("renders the folder header", () => {
			render(<FolderSidebar />);

			expect(screen.getByText("Folders")).toBeInTheDocument();
		});

		it("renders the create folder button", () => {
			render(<FolderSidebar />);

			const createButton = screen.getByTestId("create-folder-button");
			expect(createButton).toBeInTheDocument();
			expect(createButton).toHaveAccessibleName("Create folder");
		});

		it("renders the inbox folder", () => {
			render(<FolderSidebar />);

			const inbox = screen.getByTestId("inbox-folder");
			expect(inbox).toBeInTheDocument();
			expect(inbox).toHaveTextContent("Inbox");
		});

		it("applies custom className", () => {
			render(<FolderSidebar className="custom-class" />);

			expect(screen.getByTestId("folder-sidebar")).toHaveClass("custom-class");
		});
	});

	describe("Loading State", () => {
		it("shows loading skeleton when isLoading is true", () => {
			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				isLoading: true,
			});

			render(<FolderSidebar />);

			expect(screen.getByTestId("folder-loading-skeleton")).toBeInTheDocument();
		});

		it("hides loading skeleton when isLoading is false", () => {
			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				isLoading: false,
				folders: [createMockFolder()],
			});

			render(<FolderSidebar />);

			expect(
				screen.queryByTestId("folder-loading-skeleton"),
			).not.toBeInTheDocument();
		});
	});

	describe("Empty State", () => {
		it("shows empty state when no folders exist", () => {
			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders: [],
			});

			render(<FolderSidebar />);

			expect(screen.getByTestId("folder-empty-state")).toBeInTheDocument();
			expect(screen.getByText("No folders yet.")).toBeInTheDocument();
			expect(screen.getByText("Create your first folder")).toBeInTheDocument();
		});

		it("clicking empty state create link calls onCreateFolder", () => {
			const onCreateFolder = vi.fn();
			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders: [],
			});

			render(<FolderSidebar onCreateFolder={onCreateFolder} />);

			fireEvent.click(screen.getByText("Create your first folder"));
			expect(onCreateFolder).toHaveBeenCalledOnce();
		});

		it("does not show empty state when folders exist", () => {
			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders: [createMockFolder()],
			});

			render(<FolderSidebar />);

			expect(
				screen.queryByTestId("folder-empty-state"),
			).not.toBeInTheDocument();
		});

		it("does not show empty state when loading", () => {
			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				isLoading: true,
				folders: [],
			});

			render(<FolderSidebar />);

			expect(
				screen.queryByTestId("folder-empty-state"),
			).not.toBeInTheDocument();
		});
	});

	describe("Folder List", () => {
		it("renders list of folders", () => {
			const folders = [
				createMockFolder({ id: "folder-1", name: "Work", color: "blue" }),
				createMockFolder({ id: "folder-2", name: "Personal", color: "green" }),
				createMockFolder({ id: "folder-3", name: "Archive", color: "slate" }),
			];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			expect(screen.getByTestId("folder-item-folder-1")).toBeInTheDocument();
			expect(screen.getByTestId("folder-item-folder-2")).toBeInTheDocument();
			expect(screen.getByTestId("folder-item-folder-3")).toBeInTheDocument();

			expect(screen.getByText("Work")).toBeInTheDocument();
			expect(screen.getByText("Personal")).toBeInTheDocument();
			expect(screen.getByText("Archive")).toBeInTheDocument();
		});

		it("displays folder color indicator", () => {
			const folders = [
				createMockFolder({ id: "folder-1", name: "Work", color: "red" }),
			];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			const folderItem = screen.getByTestId("folder-item-folder-1");
			const folderIcon = folderItem.querySelector("svg");
			expect(folderIcon).toHaveClass("text-red-500");
		});
	});

	describe("Selection", () => {
		it("inbox is selected by default", () => {
			render(<FolderSidebar />);

			const inbox = screen.getByTestId("inbox-folder");
			expect(inbox).toHaveAttribute("aria-current", "page");
		});

		it("highlights selected folder", () => {
			const folders = [
				createMockFolder({ id: "folder-1", name: "Work" }),
				createMockFolder({ id: "folder-2", name: "Personal" }),
			];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar selectedFolderId="folder-2" />);

			const folder1 = screen.getByTestId("folder-item-folder-1");
			const folder2 = screen.getByTestId("folder-item-folder-2");

			expect(folder1).not.toHaveAttribute("aria-current");
			expect(folder2).toHaveAttribute("aria-current", "page");
		});

		it("inbox is not selected when a folder is selected", () => {
			const folders = [createMockFolder({ id: "folder-1" })];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar selectedFolderId="folder-1" />);

			const inbox = screen.getByTestId("inbox-folder");
			expect(inbox).not.toHaveAttribute("aria-current");
		});
	});

	describe("Interactions", () => {
		it("calls onSelectFolder with 'inbox' when inbox is clicked", () => {
			const onSelectFolder = vi.fn();

			render(
				<FolderSidebar
					selectedFolderId="folder-1"
					onSelectFolder={onSelectFolder}
				/>,
			);

			fireEvent.click(screen.getByTestId("inbox-folder"));
			expect(onSelectFolder).toHaveBeenCalledWith("inbox");
		});

		it("calls onSelectFolder with folder id when folder is clicked", () => {
			const onSelectFolder = vi.fn();
			const folders = [createMockFolder({ id: "folder-123" })];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar onSelectFolder={onSelectFolder} />);

			fireEvent.click(screen.getByTestId("folder-item-folder-123"));
			expect(onSelectFolder).toHaveBeenCalledWith("folder-123");
		});

		it("calls onCreateFolder when create button is clicked", () => {
			const onCreateFolder = vi.fn();

			render(<FolderSidebar onCreateFolder={onCreateFolder} />);

			fireEvent.click(screen.getByTestId("create-folder-button"));
			expect(onCreateFolder).toHaveBeenCalledOnce();
		});
	});

	describe("Folder Actions Dropdown", () => {
		it("renders action button for each folder", () => {
			const folders = [
				createMockFolder({ id: "folder-1", name: "Work" }),
				createMockFolder({ id: "folder-2", name: "Personal" }),
			];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			expect(screen.getByTestId("folder-actions-folder-1")).toBeInTheDocument();
			expect(screen.getByTestId("folder-actions-folder-2")).toBeInTheDocument();
		});

		it("opens dropdown menu when action button is clicked", () => {
			const folders = [createMockFolder({ id: "folder-1", name: "Work" })];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			fireEvent.click(screen.getByTestId("folder-actions-folder-1"));

			expect(screen.getByTestId("folder-edit-folder-1")).toBeInTheDocument();
			expect(screen.getByTestId("folder-delete-folder-1")).toBeInTheDocument();
		});

		it("calls onEditFolder when edit is clicked", () => {
			const onEditFolder = vi.fn();
			const folder = createMockFolder({ id: "folder-1", name: "Work" });

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders: [folder],
			});

			render(<FolderSidebar onEditFolder={onEditFolder} />);

			fireEvent.click(screen.getByTestId("folder-actions-folder-1"));
			fireEvent.click(screen.getByTestId("folder-edit-folder-1"));

			expect(onEditFolder).toHaveBeenCalledWith(folder);
		});

		it("calls onDeleteFolder when delete is clicked", () => {
			const onDeleteFolder = vi.fn();
			const folder = createMockFolder({ id: "folder-1", name: "Work" });

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders: [folder],
			});

			render(<FolderSidebar onDeleteFolder={onDeleteFolder} />);

			fireEvent.click(screen.getByTestId("folder-actions-folder-1"));
			fireEvent.click(screen.getByTestId("folder-delete-folder-1"));

			expect(onDeleteFolder).toHaveBeenCalledWith(folder);
		});
	});

	describe("Smart Views", () => {
		describe("Selection", () => {
			const smartViewTypes: SmartViewType[] = [
				"today",
				"upcoming",
				"overdue",
				"analytics",
			];

			it.each(smartViewTypes)("highlights selected %s view", (viewType) => {
				render(<FolderSidebar selectedFolderId={viewType} />);

				const smartView = screen.getByTestId(`smart-view-${viewType}`);
				expect(smartView).toHaveAttribute("aria-current", "page");
			});

			it.each(
				smartViewTypes,
			)("does not highlight other views when %s is selected", (viewType) => {
				render(<FolderSidebar selectedFolderId={viewType} />);

				const otherViews = smartViewTypes.filter((v) => v !== viewType);
				otherViews.forEach((otherView) => {
					const smartView = screen.getByTestId(`smart-view-${otherView}`);
					expect(smartView).not.toHaveAttribute("aria-current");
				});
			});

			it("deselects smart view when inbox is selected", () => {
				render(<FolderSidebar selectedFolderId="inbox" />);

				expect(screen.getByTestId("inbox-folder")).toHaveAttribute(
					"aria-current",
					"page",
				);
				expect(screen.getByTestId("smart-view-today")).not.toHaveAttribute(
					"aria-current",
				);
			});

			it("deselects smart view when folder is selected", () => {
				const folders = [createMockFolder({ id: "folder-1" })];

				mockUseFolderStorage.mockReturnValue({
					...defaultMockReturn,
					folders,
				});

				render(<FolderSidebar selectedFolderId="folder-1" />);

				expect(screen.getByTestId("folder-item-folder-1")).toHaveAttribute(
					"aria-current",
					"page",
				);
				expect(screen.getByTestId("smart-view-today")).not.toHaveAttribute(
					"aria-current",
				);
			});
		});

		describe("Interactions", () => {
			const smartViewCases: Array<{ viewType: SmartViewType; label: string }> =
				[
					{ viewType: "today", label: "Today's todos" },
					{ viewType: "upcoming", label: "Upcoming todos" },
					{ viewType: "overdue", label: "Overdue todos" },
					{ viewType: "analytics", label: "Analytics dashboard" },
				];

			it.each(
				smartViewCases,
			)("calls onSelectFolder with '$viewType' when $label is clicked", ({
				viewType,
			}) => {
				const onSelectFolder = vi.fn();

				render(<FolderSidebar onSelectFolder={onSelectFolder} />);

				fireEvent.click(screen.getByTestId(`smart-view-${viewType}`));
				expect(onSelectFolder).toHaveBeenCalledWith(viewType);
			});

			it.each(smartViewCases)("has correct aria-label for $viewType view", ({
				viewType,
				label,
			}) => {
				render(<FolderSidebar />);

				const smartView = screen.getByTestId(`smart-view-${viewType}`);
				expect(smartView).toHaveAttribute("aria-label", label);
			});
		});

		describe("Visual State", () => {
			it("shows correct icon for each smart view", () => {
				render(<FolderSidebar />);

				// Each smart view should have an icon (svg element)
				const todayView = screen.getByTestId("smart-view-today");
				const upcomingView = screen.getByTestId("smart-view-upcoming");
				const overdueView = screen.getByTestId("smart-view-overdue");
				const analyticsView = screen.getByTestId("smart-view-analytics");

				expect(todayView.querySelector("svg")).toBeInTheDocument();
				expect(upcomingView.querySelector("svg")).toBeInTheDocument();
				expect(overdueView.querySelector("svg")).toBeInTheDocument();
				expect(analyticsView.querySelector("svg")).toBeInTheDocument();
			});

			it("applies active styling when smart view is selected", () => {
				render(<FolderSidebar selectedFolderId="today" />);

				const todayView = screen.getByTestId("smart-view-today");
				expect(todayView).toHaveClass("bg-sidebar-accent");
			});

			it("applies hover styling when smart view is not selected", () => {
				render(<FolderSidebar selectedFolderId="inbox" />);

				const todayView = screen.getByTestId("smart-view-today");
				expect(todayView).toHaveClass("hover:bg-sidebar-accent/50");
			});
		});

		describe("Positioning", () => {
			it("renders smart views above folders", () => {
				const folders = [createMockFolder({ id: "folder-1" })];

				mockUseFolderStorage.mockReturnValue({
					...defaultMockReturn,
					folders,
				});

				render(<FolderSidebar />);

				const nav = screen.getByRole("navigation");
				const children = nav?.children;

				// First child should be smart views container
				expect(children?.[0]).toHaveAttribute("data-testid", "smart-views");
			});
		});
	});

	describe("Accessibility", () => {
		it("has accessible navigation landmark", () => {
			render(<FolderSidebar />);

			expect(screen.getByRole("navigation")).toHaveAccessibleName("Navigation");
		});

		it("uses semantic list for folders", () => {
			const folders = [createMockFolder({ id: "folder-1" })];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			expect(screen.getByRole("list")).toBeInTheDocument();
			expect(screen.getAllByRole("listitem")).toHaveLength(1);
		});

		it("action buttons have accessible names", () => {
			const folders = [createMockFolder({ id: "folder-1", name: "Work" })];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			expect(
				screen.getByTestId("folder-actions-folder-1"),
			).toHaveAccessibleName("Actions for Work");
		});
	});

	describe("Folder Colors", () => {
		const colorTestCases: Array<{
			color: Folder["color"];
			expectedClass: string;
		}> = [
			{ color: "slate", expectedClass: "text-slate-500" },
			{ color: "red", expectedClass: "text-red-500" },
			{ color: "orange", expectedClass: "text-orange-500" },
			{ color: "amber", expectedClass: "text-amber-500" },
			{ color: "yellow", expectedClass: "text-yellow-500" },
			{ color: "lime", expectedClass: "text-lime-500" },
			{ color: "green", expectedClass: "text-green-500" },
			{ color: "emerald", expectedClass: "text-emerald-500" },
			{ color: "teal", expectedClass: "text-teal-500" },
			{ color: "cyan", expectedClass: "text-cyan-500" },
			{ color: "sky", expectedClass: "text-sky-500" },
			{ color: "blue", expectedClass: "text-blue-500" },
			{ color: "indigo", expectedClass: "text-indigo-500" },
			{ color: "violet", expectedClass: "text-violet-500" },
			{ color: "purple", expectedClass: "text-purple-500" },
			{ color: "fuchsia", expectedClass: "text-fuchsia-500" },
			{ color: "pink", expectedClass: "text-pink-500" },
			{ color: "rose", expectedClass: "text-rose-500" },
		];

		it.each(colorTestCases)("applies correct class for $color color", ({
			color,
			expectedClass,
		}) => {
			const folders = [createMockFolder({ id: "folder-1", color })];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			const folderItem = screen.getByTestId("folder-item-folder-1");
			const folderIcon = folderItem.querySelector("svg");
			expect(folderIcon).toHaveClass(expectedClass);
		});
	});

	describe("Numeric IDs", () => {
		it("handles numeric folder IDs", () => {
			const folders = [createMockFolder({ id: 123, name: "Work" })];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar selectedFolderId={123} />);

			const folderItem = screen.getByTestId("folder-item-123");
			expect(folderItem).toBeInTheDocument();
			expect(folderItem).toHaveAttribute("aria-current", "page");
		});

		it("calls onSelectFolder with numeric id", () => {
			const onSelectFolder = vi.fn();
			const folders = [createMockFolder({ id: 456, name: "Work" })];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar onSelectFolder={onSelectFolder} />);

			fireEvent.click(screen.getByTestId("folder-item-456"));
			expect(onSelectFolder).toHaveBeenCalledWith(456);
		});
	});

	describe("Drag-and-Drop Reordering", () => {
		it("shows drag handle when 2+ folders exist", () => {
			const folders = [
				createMockFolder({ id: "folder-1", name: "First", order: 0 }),
				createMockFolder({ id: "folder-2", name: "Second", order: 1 }),
			];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			const { container } = render(<FolderSidebar />);

			const folderItems = screen.getAllByTestId(/^folder-item-/);
			expect(folderItems).toHaveLength(2);

			// Each folder item should have draggable attribute when 2+ folders
			folderItems.forEach((item) => {
				expect(item).toHaveAttribute("draggable", "true");
			});

			// Each folder should have a GripVertical icon (drag handle)
			const gripIcons = container.querySelectorAll(
				'svg[class*="grip-vertical"]',
			);
			expect(gripIcons.length).toBeGreaterThan(0);
		});

		it("does not show drag handle when only 1 folder exists", () => {
			const folders = [
				createMockFolder({ id: "folder-1", name: "Only", order: 0 }),
			];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			const folderItem = screen.getByTestId("folder-item-folder-1");
			expect(folderItem).toHaveAttribute("draggable", "false");
		});

		it("renders folder items with cursor-grab class when draggable", () => {
			const folders = [
				createMockFolder({ id: "folder-1", name: "First", order: 0 }),
				createMockFolder({ id: "folder-2", name: "Second", order: 1 }),
			];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			const folderItems = screen.getAllByTestId(/^folder-item-/);
			folderItems.forEach((item) => {
				// Check for cursor-grab class (indicates draggable)
				expect(item).toHaveClass(/cursor-grab/);
			});
		});

		it("does not have cursor-grab class when not draggable", () => {
			const folders = [
				createMockFolder({ id: "folder-1", name: "Only", order: 0 }),
			];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			render(<FolderSidebar />);

			const folderItem = screen.getByTestId("folder-item-folder-1");
			// Should not have cursor-grab when not draggable
			expect(folderItem).not.toHaveClass(/cursor-grab/);
		});

		it("passes onReorderFolders callback prop", () => {
			const onReorderFolders = vi.fn();
			const folders = [
				createMockFolder({ id: "folder-1", name: "First", order: 0 }),
			];

			mockUseFolderStorage.mockReturnValue({
				...defaultMockReturn,
				folders,
			});

			// Just verify the component accepts the prop without error
			expect(() => {
				render(<FolderSidebar onReorderFolders={onReorderFolders} />);
			}).not.toThrow();
		});
	});
});
