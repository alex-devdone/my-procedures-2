"use client";

import {
	AlertCircle,
	CalendarDays,
	FolderIcon,
	Inbox,
	MoreHorizontal,
	Plus,
	Sun,
} from "lucide-react";
import type { Folder, FolderColor } from "@/app/api/folder";
import { useFolderStorage } from "@/app/api/folder";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Smart view types for filtering todos.
 */
export type SmartViewType = "today" | "upcoming" | "overdue";

/**
 * Smart view metadata.
 */
export interface SmartView {
	id: SmartViewType;
	label: string;
	icon: typeof Sun;
	"aria-label": string;
}

/**
 * Smart views available in the sidebar.
 */
const SMART_VIEWS: SmartView[] = [
	{
		id: "today",
		label: "Today",
		icon: Sun,
		"aria-label": "Today's todos",
	},
	{
		id: "upcoming",
		label: "Upcoming",
		icon: CalendarDays,
		"aria-label": "Upcoming todos",
	},
	{
		id: "overdue",
		label: "Overdue",
		icon: AlertCircle,
		"aria-label": "Overdue todos",
	},
];

/**
 * Maps folder colors to Tailwind CSS classes for the folder icon.
 */
const folderColorClasses: Record<FolderColor, string> = {
	slate: "text-slate-500",
	red: "text-red-500",
	orange: "text-orange-500",
	amber: "text-amber-500",
	yellow: "text-yellow-500",
	lime: "text-lime-500",
	green: "text-green-500",
	emerald: "text-emerald-500",
	teal: "text-teal-500",
	cyan: "text-cyan-500",
	sky: "text-sky-500",
	blue: "text-blue-500",
	indigo: "text-indigo-500",
	violet: "text-violet-500",
	purple: "text-purple-500",
	fuchsia: "text-fuchsia-500",
	pink: "text-pink-500",
	rose: "text-rose-500",
};

export interface FolderSidebarProps {
	/** Currently selected folder ID, or "inbox" for the default inbox view, or a smart view type */
	selectedFolderId?: string | number | "inbox" | SmartViewType;
	/** Callback when a folder or smart view is selected */
	onSelectFolder?: (
		folderId: string | number | "inbox" | SmartViewType,
	) => void;
	/** Callback when the "Create Folder" button is clicked */
	onCreateFolder?: () => void;
	/** Callback when the "Edit" option is clicked for a folder */
	onEditFolder?: (folder: Folder) => void;
	/** Callback when the "Delete" option is clicked for a folder */
	onDeleteFolder?: (folder: Folder) => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Sidebar component displaying smart views and folder list with quick actions.
 *
 * Features:
 * - Smart views (Today, Upcoming, Overdue)
 * - Inbox (default view for todos without a folder)
 * - List of user folders with color indicators
 * - Create folder button
 * - Edit/Delete actions via dropdown menu
 * - Loading skeleton state
 * - Selection state highlighting
 */
export function FolderSidebar({
	selectedFolderId = "inbox",
	onSelectFolder,
	onCreateFolder,
	onEditFolder,
	onDeleteFolder,
	className,
}: FolderSidebarProps) {
	const { folders, isLoading } = useFolderStorage();

	return (
		<aside
			className={cn(
				"flex w-64 flex-col border-border/50 border-r bg-sidebar",
				className,
			)}
			data-testid="folder-sidebar"
		>
			{/* Folder List */}
			<nav className="flex-1 overflow-y-auto p-2" aria-label="Navigation">
				{/* Smart Views */}
				<div className="space-y-1" data-testid="smart-views">
					{SMART_VIEWS.map((view) => {
						const Icon = view.icon;
						return (
							<button
								key={view.id}
								type="button"
								onClick={() => onSelectFolder?.(view.id)}
								className={cn(
									"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-sm transition-colors",
									selectedFolderId === view.id
										? "bg-sidebar-accent text-sidebar-accent-foreground"
										: "text-sidebar-foreground hover:bg-sidebar-accent/50",
								)}
								data-testid={`smart-view-${view.id}`}
								aria-current={selectedFolderId === view.id ? "page" : undefined}
								aria-label={view["aria-label"]}
							>
								<Icon className="h-4 w-4 text-muted-foreground" />
								<span className="flex-1 truncate">{view.label}</span>
							</button>
						);
					})}
				</div>

				{/* Divider */}
				<div
					className="mx-2 my-3 border-border/50 border-t"
					aria-hidden="true"
				/>

				{/* Header for folders */}
				<div className="flex items-center justify-between px-2 pb-2">
					<h2 className="font-semibold text-sidebar-foreground text-sm">
						Folders
					</h2>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={onCreateFolder}
						aria-label="Create folder"
						data-testid="create-folder-button"
					>
						<Plus className="h-4 w-4" />
					</Button>
				</div>
				{/* Inbox - always visible */}
				<button
					type="button"
					onClick={() => onSelectFolder?.("inbox")}
					className={cn(
						"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-sm transition-colors",
						selectedFolderId === "inbox"
							? "bg-sidebar-accent text-sidebar-accent-foreground"
							: "text-sidebar-foreground hover:bg-sidebar-accent/50",
					)}
					data-testid="inbox-folder"
					aria-current={selectedFolderId === "inbox" ? "page" : undefined}
				>
					<Inbox className="h-4 w-4 text-muted-foreground" />
					<span className="flex-1 truncate">Inbox</span>
				</button>

				{/* Loading State */}
				{isLoading ? (
					<div className="mt-2 space-y-1" data-testid="folder-loading-skeleton">
						{[1, 2, 3].map((i) => (
							<div key={i} className="flex items-center gap-3 px-3 py-2">
								<Skeleton className="h-4 w-4 rounded" />
								<Skeleton className="h-4 flex-1" />
							</div>
						))}
					</div>
				) : (
					/* Folder Items */
					<ul className="mt-2 space-y-1">
						{folders.map((folder) => (
							<FolderItem
								key={folder.id}
								folder={folder}
								isSelected={selectedFolderId === folder.id}
								onSelect={() => onSelectFolder?.(folder.id)}
								onEdit={() => onEditFolder?.(folder)}
								onDelete={() => onDeleteFolder?.(folder)}
							/>
						))}
					</ul>
				)}

				{/* Empty State */}
				{!isLoading && folders.length === 0 && (
					<div
						className="mt-4 px-3 text-center text-muted-foreground text-xs"
						data-testid="folder-empty-state"
					>
						<p>No folders yet.</p>
						<button
							type="button"
							onClick={onCreateFolder}
							className="mt-1 text-accent hover:underline"
						>
							Create your first folder
						</button>
					</div>
				)}
			</nav>
		</aside>
	);
}

interface FolderItemProps {
	folder: Folder;
	isSelected: boolean;
	onSelect: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

function FolderItem({
	folder,
	isSelected,
	onSelect,
	onEdit,
	onDelete,
}: FolderItemProps) {
	return (
		<li className="group relative">
			<button
				type="button"
				onClick={onSelect}
				className={cn(
					"flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-sm transition-colors",
					isSelected
						? "bg-sidebar-accent text-sidebar-accent-foreground"
						: "text-sidebar-foreground hover:bg-sidebar-accent/50",
				)}
				data-testid={`folder-item-${folder.id}`}
				aria-current={isSelected ? "page" : undefined}
			>
				<FolderIcon
					className={cn("h-4 w-4", folderColorClasses[folder.color])}
				/>
				<span className="flex-1 truncate">{folder.name}</span>
			</button>

			{/* Actions Dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-xs"
						className={cn(
							"absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100",
							isSelected && "opacity-100",
						)}
						aria-label={`Actions for ${folder.name}`}
						data-testid={`folder-actions-${folder.id}`}
					>
						<MoreHorizontal className="h-3 w-3" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-32">
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onEdit();
						}}
						data-testid={`folder-edit-${folder.id}`}
					>
						Edit
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
						className="text-destructive focus:text-destructive"
						data-testid={`folder-delete-${folder.id}`}
					>
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</li>
	);
}
