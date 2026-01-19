"use client";

import { useForm } from "@tanstack/react-form";
import {
	AlertCircle,
	ArrowRight,
	Eye,
	EyeOff,
	Lock,
	Mail,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import Loader from "@/components/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
	const router = useRouter();
	const { isPending } = authClient.useSession();
	const [showPassword, setShowPassword] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						router.push("/dashboard");
						toast.success("Welcome back!");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	if (isPending) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<Loader />
			</div>
		);
	}

	return (
		<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
			{/* Background decoration */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-0 -right-40 h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
				<div className="absolute bottom-0 -left-40 h-[400px] w-[400px] rounded-full bg-accent/3 blur-3xl" />
			</div>

			<div className="relative w-full max-w-md">
				{/* Logo */}
				<div className="mb-8 flex animate-fade-up justify-center opacity-0">
					<Link href="/" className="group flex items-center gap-2.5">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-medium transition-shadow duration-200 group-hover:shadow-large">
							<Sparkles
								className="h-6 w-6 text-accent-foreground"
								strokeWidth={2.5}
							/>
						</div>
					</Link>
				</div>

				{/* Card */}
				<div className="stagger-1 animate-fade-up rounded-2xl border border-border/50 bg-card p-8 opacity-0 shadow-large">
					<div className="mb-8 text-center">
						<h1 className="font-bold font-display text-2xl tracking-tight">
							Welcome back
						</h1>
						<p className="mt-2 text-muted-foreground">
							Sign in to continue to your workspace
						</p>
					</div>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-5"
					>
						<form.Field name="email">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name} className="font-medium text-sm">
										Email address
									</Label>
									<div className="relative">
										<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											id={field.name}
											name={field.name}
											type="email"
											placeholder="you@example.com"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-11 pl-10 transition-all duration-200 focus:ring-2 focus:ring-accent/20"
										/>
									</div>
									{field.state.meta.errors.map((error) => (
										<p
											key={error?.message}
											className="flex items-center gap-1.5 text-destructive text-sm"
										>
											<AlertCircle className="h-3.5 w-3.5" />
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Field name="password">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name} className="font-medium text-sm">
										Password
									</Label>
									<div className="relative">
										<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											id={field.name}
											name={field.name}
											type={showPassword ? "text" : "password"}
											placeholder="Enter your password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-11 pr-10 pl-10 transition-all duration-200 focus:ring-2 focus:ring-accent/20"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
										>
											{showPassword ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</button>
									</div>
									{field.state.meta.errors.map((error) => (
										<p
											key={error?.message}
											className="flex items-center gap-1.5 text-destructive text-sm"
										>
											<AlertCircle className="h-3.5 w-3.5" />
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									disabled={!state.canSubmit || state.isSubmitting}
									className="group h-11 w-full bg-accent text-accent-foreground shadow-soft transition-all duration-300 hover:bg-accent/90 hover:shadow-medium disabled:opacity-50"
								>
									{state.isSubmitting ? (
										<span className="flex items-center gap-2">
											<Loader />
											Signing in...
										</span>
									) : (
										<span className="flex items-center gap-2">
											Sign in
											<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
										</span>
									)}
								</Button>
							)}
						</form.Subscribe>
					</form>

					{/* Divider */}
					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-border border-t" />
						</div>
						<div className="relative flex justify-center">
							<span className="bg-card px-3 text-muted-foreground text-xs">
								or
							</span>
						</div>
					</div>

					{/* Sign up link */}
					<p className="text-center text-muted-foreground text-sm">
						Don't have an account?{" "}
						<Link
							href="/signup"
							className="font-medium text-accent transition-colors hover:text-accent/80"
						>
							Create one
						</Link>
					</p>
				</div>

				{/* Social proof */}
				<p className="stagger-2 mt-6 animate-fade-up text-center text-muted-foreground text-xs opacity-0">
					Join 2,000+ people who trust Flowdo with their productivity
				</p>
			</div>
		</div>
	);
}
