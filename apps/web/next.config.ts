import "@my-procedures-2/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	transpilePackages: ["shiki"],
	typescript: {
		// Skip type checking during build - use `bun run check-types` instead
		ignoreBuildErrors: true,
	},
};

export default nextConfig;
