"use client";

import { LogOut, Mail, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function UserMenu() {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="h-9 w-9 rounded-full" />;
	}

	if (!session) {
		return (
			<div className="flex items-center gap-2">
				<Link
					href="/login"
					className="inline-flex h-7 items-center justify-center gap-1 rounded-lg px-2.5 font-medium text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
				>
					Sign In
				</Link>
				<Link
					href="/signup"
					className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-accent px-2.5 font-medium text-accent-foreground text-xs shadow-soft transition-colors hover:bg-accent/90"
				>
					Sign Up
				</Link>
			</div>
		);
	}

	const initials =
		session.user.name
			?.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase()
			.slice(0, 2) || "U";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						className="relative h-9 w-9 rounded-full bg-accent/10 p-0 text-accent hover:bg-accent/20"
					/>
				}
			>
				<span className="font-semibold text-sm">{initials}</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col gap-1">
						<p className="font-display font-semibold text-sm">
							{session.user.name}
						</p>
						<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
							<Mail className="h-3 w-3" />
							{session.user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem className="flex items-center gap-2">
						<User className="h-4 w-4" />
						Profile
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					variant="destructive"
					onClick={() => {
						authClient.signOut({
							fetchOptions: {
								onSuccess: () => {
									router.push("/");
								},
							},
						});
					}}
					className="flex items-center gap-2"
				>
					<LogOut className="h-4 w-4" />
					Sign Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
