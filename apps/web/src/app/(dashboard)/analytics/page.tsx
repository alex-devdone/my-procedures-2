"use client";

import { Cloud, HardDrive, Menu, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { FolderSidebar } from "@/components/folders/folder-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFolderNavigation } from "@/hooks/use-folder-navigation";
import type { SelectedFolderId } from "@/hooks/use-todo-storage";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
	const { data: session } = useSession();
	const isAuthenticated = !!session?.user;
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const { navigateToFolder } = useFolderNavigation();

	const handleSelectFolder = (folderId: SelectedFolderId) => {
		setIsSidebarOpen(false);
		navigateToFolder(folderId);
	};

	return (
		<div className="flex min-h-full">
			{/* Mobile sidebar backdrop */}
			{isSidebarOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={() => setIsSidebarOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setIsSidebarOpen(false);
					}}
					aria-label="Close sidebar"
				/>
			)}

			{/* Sidebar */}
			<div
				className={cn(
					"fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:static lg:translate-x-0",
					isSidebarOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<FolderSidebar
					selectedFolderId="analytics"
					onSelectFolder={handleSelectFolder}
					className="h-full"
				/>
			</div>

			{/* Main content */}
			<div className="relative min-h-full flex-1 px-4 py-8 sm:px-6 lg:px-8">
				{/* Mobile menu button */}
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsSidebarOpen(true)}
					className="mb-4 lg:hidden"
					aria-label="Open sidebar"
				>
					<Menu className="h-5 w-5" />
				</Button>

				{/* Background decoration */}
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-20 -left-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
				</div>

				<div className="relative mx-auto max-w-5xl">
					{/* Sync Status Badge */}
					<div className="mb-6 flex justify-end">
						<div
							className={cn(
								"flex items-center gap-2 rounded-full px-4 py-2 font-medium text-sm transition-colors",
								isAuthenticated
									? "bg-green-500/10 text-green-600 dark:text-green-400"
									: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
							)}
							title={
								isAuthenticated
									? "Your analytics are synced to the cloud"
									: "Analytics are based on locally stored data"
							}
						>
							{isAuthenticated ? (
								<>
									<Cloud className="h-4 w-4" />
									<span className="hidden sm:inline">Synced</span>
								</>
							) : (
								<>
									<HardDrive className="h-4 w-4" />
									<span className="hidden sm:inline">Local</span>
								</>
							)}
						</div>
					</div>

					{/* Sign in prompt for guests */}
					{!isAuthenticated && (
						<Card className="mb-6 animate-fade-up border-accent/20 bg-gradient-to-r from-accent/5 to-accent/10 opacity-0">
							<CardContent className="flex items-center gap-4 p-4">
								<div className="rounded-xl bg-accent/20 p-2.5">
									<Sparkles className="h-5 w-5 text-accent" />
								</div>
								<div className="flex-1">
									<p className="font-medium text-sm">
										Want to access your analytics anywhere?
									</p>
									<p className="text-muted-foreground text-sm">
										<Link
											href="/login"
											className="font-semibold text-accent hover:underline"
										>
											Sign in
										</Link>{" "}
										to sync across all your devices.
									</p>
								</div>
							</CardContent>
						</Card>
					)}

					<AnalyticsDashboard />
				</div>
			</div>
		</div>
	);
}
