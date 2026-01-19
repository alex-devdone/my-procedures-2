import type { Metadata } from "next";

import { Geist_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const syne = Syne({
	variable: "--font-heading",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
	variable: "--font-body",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Flowdo — Thoughtful Task Management",
	description:
		"A warm, focused space for organizing your work and life. Built for clarity, designed for calm.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${syne.variable} ${plusJakarta.variable} ${geistMono.variable}`}
			>
				<Providers>
					<div className="relative grid min-h-svh grid-rows-[auto_1fr]">
						<Header />
						<main className="relative">{children}</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}
