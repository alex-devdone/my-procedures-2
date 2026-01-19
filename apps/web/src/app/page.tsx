"use client";

import {
	ArrowRight,
	CheckCircle2,
	Cloud,
	Layers,
	Lock,
	Sparkles,
	Zap,
} from "lucide-react";
import Link from "next/link";

const features = [
	{
		icon: Zap,
		title: "Lightning Fast",
		description:
			"Optimistic updates and local-first architecture mean your tasks sync instantly.",
	},
	{
		icon: Cloud,
		title: "Sync Everywhere",
		description:
			"Work offline, sync when online. Your data follows you across all devices.",
	},
	{
		icon: Lock,
		title: "Private & Secure",
		description:
			"Your data stays yours. End-to-end encryption keeps your tasks confidential.",
	},
	{
		icon: Layers,
		title: "Organized Workflows",
		description:
			"Categories, filters, and smart views help you focus on what matters.",
	},
];

const benefits = [
	"Works offline with automatic sync",
	"Clean, distraction-free interface",
	"Keyboard shortcuts for power users",
	"Dark mode that's easy on the eyes",
	"AI-powered task suggestions",
	"Export and import your data anytime",
];

export default function Home() {
	return (
		<div className="relative overflow-hidden">
			{/* Background decoration */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl" />
				<div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent/3 blur-3xl" />
			</div>

			{/* Hero Section */}
			<section className="relative px-4 pt-12 pb-20 sm:px-6 sm:pt-20 sm:pb-32 lg:px-8">
				<div className="mx-auto max-w-5xl">
					{/* Badge */}
					<div className="mb-8 flex animate-fade-up justify-center opacity-0">
						<div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 font-medium text-accent text-sm">
							<Sparkles className="h-4 w-4" />
							<span>Now with AI-powered suggestions</span>
						</div>
					</div>

					{/* Main heading */}
					<h1 className="stagger-1 animate-fade-up text-center font-bold font-display text-4xl tracking-tight opacity-0 sm:text-5xl md:text-6xl lg:text-7xl">
						Focus on what
						<br />
						<span className="gradient-text">actually matters</span>
					</h1>

					{/* Subtitle */}
					<p className="stagger-2 mx-auto mt-6 max-w-2xl animate-fade-up text-center text-lg text-muted-foreground opacity-0 sm:text-xl">
						A thoughtful task manager that works the way you think. Simple
						enough for daily use, powerful enough for complex projects.
					</p>

					{/* CTA Buttons */}
					<div className="stagger-3 mt-10 flex animate-fade-up flex-col items-center justify-center gap-4 opacity-0 sm:flex-row">
						<Link
							href="/signup"
							className="group relative inline-flex h-9 w-full items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-accent px-8 font-medium text-accent-foreground text-xs shadow-medium transition-all duration-300 hover:scale-[1.02] hover:bg-accent/90 hover:shadow-large sm:w-auto"
						>
							Get started free
							<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
						</Link>
						<Link
							href="/login"
							className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-transparent px-8 font-medium text-xs transition-all duration-200 hover:border-accent/40 hover:bg-accent/5 sm:w-auto"
						>
							Sign in
						</Link>
					</div>

					{/* Social proof */}
					<div className="stagger-4 mt-12 flex animate-fade-up flex-col items-center gap-4 opacity-0">
						<div className="flex -space-x-2">
							{[1, 2, 3, 4, 5].map((i) => (
								<div
									key={i}
									className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-secondary font-semibold text-secondary-foreground text-xs shadow-soft"
									style={{
										backgroundColor: `oklch(${0.75 + i * 0.03} ${0.08 + i * 0.02} ${30 + i * 15})`,
									}}
								>
									{String.fromCharCode(64 + i)}
								</div>
							))}
						</div>
						<p className="text-muted-foreground text-sm">
							Trusted by{" "}
							<span className="font-semibold text-foreground">2,000+</span>{" "}
							productive people
						</p>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="relative border-border/50 border-t bg-secondary/30 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
				<div className="mx-auto max-w-6xl">
					<div className="text-center">
						<h2 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
							Built for clarity
						</h2>
						<p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
							Every feature is designed to reduce friction and help you stay in
							flow. No clutter, no complexity.
						</p>
					</div>

					<div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{features.map((feature, index) => (
							<div
								key={feature.title}
								className="group relative rounded-2xl border border-border/50 bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-medium"
								style={{ animationDelay: `${index * 0.1}s` }}
							>
								<div className="mb-4 inline-flex rounded-xl bg-accent/10 p-3 text-accent transition-transform duration-200 group-hover:scale-110">
									<feature.icon className="h-6 w-6" strokeWidth={1.5} />
								</div>
								<h3 className="font-display font-semibold text-lg">
									{feature.title}
								</h3>
								<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
									{feature.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="relative px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
				<div className="mx-auto max-w-5xl">
					<div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
						<div>
							<h2 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
								Everything you need,
								<br />
								<span className="text-muted-foreground">nothing you don't</span>
							</h2>
							<p className="mt-4 text-muted-foreground">
								We obsessed over every detail so you can focus on your work.
								Flowdo stays out of your way until you need it.
							</p>

							<ul className="mt-8 grid gap-3 sm:grid-cols-2">
								{benefits.map((benefit) => (
									<li key={benefit} className="flex items-center gap-3 text-sm">
										<CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
										<span>{benefit}</span>
									</li>
								))}
							</ul>

							<div className="mt-10">
								<Link
									href="/signup"
									className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-accent px-8 font-medium text-accent-foreground text-xs shadow-soft transition-all duration-300 hover:bg-accent/90 hover:shadow-medium"
								>
									Start organizing today
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</div>
						</div>

						{/* Visual element */}
						<div className="relative">
							<div className="aspect-square overflow-hidden rounded-3xl border border-border/50 bg-card p-8 shadow-large">
								{/* Mock task list */}
								<div className="space-y-4">
									<div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-4">
										<div className="h-5 w-5 rounded-full border-2 border-accent bg-accent/20" />
										<div className="flex-1">
											<div className="h-3 w-3/4 rounded-full bg-foreground/80" />
											<div className="mt-2 h-2 w-1/2 rounded-full bg-muted-foreground/40" />
										</div>
									</div>
									<div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-4">
										<div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
											<CheckCircle2 className="h-4 w-4" />
										</div>
										<div className="flex-1">
											<div className="h-3 w-2/3 rounded-full bg-muted-foreground/40 line-through" />
											<div className="mt-2 h-2 w-1/3 rounded-full bg-muted-foreground/20" />
										</div>
									</div>
									<div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
										<div className="h-5 w-5 rounded-full border-2 border-accent" />
										<div className="flex-1">
											<div className="h-3 w-4/5 rounded-full bg-foreground/80" />
											<div className="mt-2 h-2 w-2/5 rounded-full bg-accent/60" />
										</div>
									</div>
									<div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-4 opacity-60">
										<div className="h-5 w-5 rounded-full border-2 border-border" />
										<div className="flex-1">
											<div className="h-3 w-1/2 rounded-full bg-foreground/60" />
											<div className="mt-2 h-2 w-1/4 rounded-full bg-muted-foreground/30" />
										</div>
									</div>
								</div>

								{/* Floating elements */}
								<div className="absolute -top-4 -right-4 animate-float rounded-2xl border border-accent/30 bg-accent/10 p-3 shadow-medium">
									<Sparkles className="h-6 w-6 text-accent" />
								</div>
								<div
									className="absolute -bottom-2 -left-2 rounded-xl border border-border bg-card p-2 shadow-soft"
									style={{ animationDelay: "1s" }}
								>
									<Cloud className="h-5 w-5 text-muted-foreground" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="relative border-border/50 border-t bg-secondary/30 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
				<div className="mx-auto max-w-3xl text-center">
					<h2 className="font-bold font-display text-3xl tracking-tight sm:text-4xl">
						Ready to get organized?
					</h2>
					<p className="mx-auto mt-4 max-w-xl text-muted-foreground">
						Join thousands of people who have simplified their workflow with
						Flowdo. Free to start, no credit card required.
					</p>
					<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Link
							href="/signup"
							className="group inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-8 font-medium text-accent-foreground text-xs shadow-medium transition-all duration-300 hover:scale-[1.02] hover:bg-accent/90 hover:shadow-large sm:w-auto"
						>
							Create free account
							<ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
						</Link>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-border/50 border-t px-4 py-8 sm:px-6 lg:px-8">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
							<Sparkles className="h-4 w-4 text-accent" />
						</div>
						<span className="font-display font-semibold text-lg">Flowdo</span>
					</div>
					<p className="text-muted-foreground text-sm">
						© {new Date().getFullYear()} Flowdo. Built with care.
					</p>
				</div>
			</footer>
		</div>
	);
}
