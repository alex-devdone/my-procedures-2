import "@my-procedures-2/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	transpilePackages: [
		"shiki",
		"@my-procedures-2/api",
		"@my-procedures-2/auth",
		"@my-procedures-2/db",
		"@my-procedures-2/env",
	],
	typescript: {
		// Skip type checking during build - use `bun run check-types` instead
		ignoreBuildErrors: true,
	},
};

export default nextConfig;
