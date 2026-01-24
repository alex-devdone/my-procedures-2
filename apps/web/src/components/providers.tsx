"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/utils/trpc";

import { GoogleTasksProvider } from "./integrations/google-tasks-provider";
import { ReminderProvider } from "./notifications";
import { SyncProvider } from "./sync";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<QueryClientProvider client={queryClient}>
				<GoogleTasksProvider>
					<SyncProvider>
						<ReminderProvider>{children}</ReminderProvider>
					</SyncProvider>
				</GoogleTasksProvider>
				<ReactQueryDevtools />
			</QueryClientProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
