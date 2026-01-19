"use client";

import { useForm } from "@tanstack/react-form";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	Eye,
	EyeOff,
	Lock,
	Mail,
	Sparkles,
	User,
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

const benefits = [
	"Free forever, no credit card",
	"Sync across all devices",
	"AI-powered suggestions",
];

export default function SignupPage() {
	const router = useRouter();
	const { isPending } = authClient.useSession();
	const [showPassword, setShowPassword] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			name: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
				},
				{
					onSuccess: () => {
						router.push("/dashboard");
						toast.success("Welcome to Flowdo!");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must be at least 2 characters"),
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
							Create your account
						</h1>
						<p className="mt-2 text-muted-foreground">
							Start organizing your work in seconds
						</p>
					</div>

					{/* Benefits */}
					<div className="mb-6 flex flex-wrap justify-center gap-x-4 gap-y-2">
						{benefits.map((benefit) => (
							<div
								key={benefit}
								className="flex items-center gap-1.5 text-muted-foreground text-xs"
							>
								<CheckCircle2 className="h-3.5 w-3.5 text-accent" />
								{benefit}
							</div>
						))}
					</div>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-5"
					>
						<form.Field name="name">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name} className="font-medium text-sm">
										Full name
									</Label>
									<div className="relative">
										<User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											id={field.name}
											name={field.name}
											placeholder="John Doe"
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
											placeholder="At least 8 characters"
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
											Creating account...
										</span>
									) : (
										<span className="flex items-center gap-2">
											Create account
											<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
										</span>
									)}
								</Button>
							)}
						</form.Subscribe>
					</form>

					{/* Terms */}
					<p className="mt-4 text-center text-muted-foreground text-xs">
						By creating an account, you agree to our{" "}
						<Link href="#" className="underline hover:text-foreground">
							Terms
						</Link>{" "}
						and{" "}
						<Link href="#" className="underline hover:text-foreground">
							Privacy Policy
						</Link>
					</p>

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

					{/* Sign in link */}
					<p className="text-center text-muted-foreground text-sm">
						Already have an account?{" "}
						<Link
							href="/login"
							className="font-medium text-accent transition-colors hover:text-accent/80"
						>
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
