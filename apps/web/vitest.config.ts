import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./vitest.setup.ts"],
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		exclude: ["node_modules", ".next"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			reportsDirectory: "./coverage",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/**/*.{test,spec}.{ts,tsx}",
				"src/**/*.d.ts",
				"node_modules",
				".next",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			// More specific paths first
			"@my-procedures-2/api/lib/recurring": path.resolve(
				__dirname,
				"../../packages/api/src/lib/recurring.ts",
			),
			"@my-procedures-2/api/lib/google-tasks-client": path.resolve(
				__dirname,
				"../../packages/api/src/lib/google-tasks-client.ts",
			),
			// Then general paths
			"@my-procedures-2/api": path.resolve(
				__dirname,
				"../../packages/api/src/index.ts",
			),
			"@my-procedures-2/db": path.resolve(
				__dirname,
				"../../packages/db/src/index.ts",
			),
			"@my-procedures-2/env/web": path.resolve(
				__dirname,
				"../../packages/env/src/web.ts",
			),
			"@my-procedures-2/env/server": path.resolve(
				__dirname,
				"../../packages/env/src/server.ts",
			),
		},
	},
});
