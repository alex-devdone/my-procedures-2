import { cn } from "@/lib/utils";

interface LoaderProps {
	className?: string;
	size?: "sm" | "md" | "lg";
}

export default function Loader({ className, size = "md" }: LoaderProps) {
	const sizeClasses = {
		sm: "h-4 w-4 border-2",
		md: "h-6 w-6 border-2",
		lg: "h-8 w-8 border-3",
	};

	return (
		<div
			className={cn(
				"animate-spin rounded-full border-muted-foreground/30 border-t-accent",
				sizeClasses[size],
				className,
			)}
		/>
	);
}

export function PageLoader() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<Loader size="lg" />
				<p className="animate-pulse-soft text-muted-foreground text-sm">
					Loading...
				</p>
			</div>
		</div>
	);
}
