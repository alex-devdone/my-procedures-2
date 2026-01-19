"use client";

import {
	LayoutDashboard,
	ListTodo,
	MessageSquare,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const pathname = usePathname();

	const links = [
		{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
		{ to: "/todos", label: "Todos", icon: ListTodo },
		{ to: "/ai", label: "AI Chat", icon: MessageSquare },
	] as const;

	const isLandingPage = pathname === "/";

	return (
		<header
			className={cn(
				"sticky top-0 z-50 w-full transition-all duration-300",
				isLandingPage ? "bg-transparent" : "glass border-border/50 border-b",
			)}
		>
			<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
				{/* Logo */}
				<Link
					href="/"
					className="group flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02]"
				>
					<div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-soft transition-shadow duration-200 group-hover:shadow-medium">
						<Sparkles
							className="h-5 w-5 text-accent-foreground"
							strokeWidth={2.5}
						/>
						<div className="absolute -inset-1 rounded-xl bg-accent/20 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
					</div>
					<span className="font-bold font-display text-xl tracking-tight">
						Flowdo
					</span>
				</Link>

				{/* Navigation */}
				<nav className="hidden items-center gap-1 md:flex">
					{links.map(({ to, label, icon: Icon }) => {
						const isActive = pathname === to || pathname.startsWith(`${to}/`);
						return (
							<Link
								key={to}
								href={to}
								className={cn(
									"group relative flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200",
									isActive
										? "text-accent"
										: "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
								)}
							>
								<Icon
									className={cn(
										"h-4 w-4 transition-transform duration-200 group-hover:scale-110",
										isActive && "text-accent",
									)}
								/>
								{label}
								{isActive && (
									<span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent" />
								)}
							</Link>
						);
					})}
				</nav>

				{/* Actions */}
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>

			{/* Mobile Navigation */}
			<nav className="flex items-center justify-center gap-1 border-border/50 border-t px-4 py-2 md:hidden">
				{links.map(({ to, label, icon: Icon }) => {
					const isActive = pathname === to || pathname.startsWith(`${to}/`);
					return (
						<Link
							key={to}
							href={to}
							className={cn(
								"flex flex-1 flex-col items-center gap-1 rounded-lg px-3 py-2 font-medium text-xs transition-all duration-200",
								isActive
									? "bg-accent/10 text-accent"
									: "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
							)}
						>
							<Icon className="h-5 w-5" />
							{label}
						</Link>
					);
				})}
			</nav>
		</header>
	);
}
