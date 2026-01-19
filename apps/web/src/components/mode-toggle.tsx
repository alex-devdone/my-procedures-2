"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ModeToggle() {
	const { setTheme, theme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="relative h-9 w-9 rounded-lg hover:bg-secondary"
					/>
				}
			>
				<Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
				<Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
				<span className="sr-only">Toggle theme</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-36">
				<DropdownMenuItem
					onClick={() => setTheme("light")}
					className="flex items-center gap-2"
				>
					<Sun className="h-4 w-4" />
					Light
					{theme === "light" && (
						<span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
					)}
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("dark")}
					className="flex items-center gap-2"
				>
					<Moon className="h-4 w-4" />
					Dark
					{theme === "dark" && (
						<span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
					)}
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme("system")}
					className="flex items-center gap-2"
				>
					<Monitor className="h-4 w-4" />
					System
					{theme === "system" && (
						<span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
					)}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
