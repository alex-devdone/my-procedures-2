import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
			"@": resolve(__dirname, "./src"),
			"@my-procedures-2/env/web": resolve(
				__dirname,
				"../../packages/env/src/web.ts",
			),
			"@my-procedures-2/env/server": resolve(
				__dirname,
				"../../packages/env/src/server.ts",
			),
		},
	},
});
