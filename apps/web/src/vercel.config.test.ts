import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface VercelHeader {
	source: string;
	headers: Array<{ key: string; value: string }>;
}

interface VercelRewrite {
	source: string;
	destination: string;
}

interface VercelConfig {
	buildCommand?: string;
	installCommand?: string;
	framework?: string;
	regions?: string[];
	headers?: VercelHeader[];
	rewrites?: VercelRewrite[];
	crons?: unknown[];
}

const vercelConfig = JSON.parse(
	readFileSync(resolve(__dirname, "../vercel.json"), "utf-8"),
) as VercelConfig;

describe("vercel.json", () => {
	it("should have valid schema", () => {
		expect(vercelConfig).toBeDefined();
		expect(vercelConfig).toBeTypeOf("object");
	});

	it("should have buildCommand set to bun run build", () => {
		expect(vercelConfig.buildCommand).toBe("bun run build");
	});

	it("should have installCommand set to bun install", () => {
		expect(vercelConfig.installCommand).toBe("bun install");
	});

	it("should have framework set to nextjs", () => {
		expect(vercelConfig.framework).toBe("nextjs");
	});

	it("should have regions defined", () => {
		expect(vercelConfig.regions).toBeDefined();
		expect(Array.isArray(vercelConfig.regions)).toBe(true);
	});

	it("should have headers for API routes", () => {
		expect(vercelConfig.headers).toBeDefined();
		expect(Array.isArray(vercelConfig.headers)).toBe(true);
	});

	it("should have CORS headers for API routes", () => {
		const apiHeaders = vercelConfig.headers?.find(
			(h: VercelHeader) => h.source === "/api/(.*)",
		);
		expect(apiHeaders).toBeDefined();

		const headers = apiHeaders?.headers || [];
		const headerKeys = headers.map((h) => h.key);

		expect(headerKeys).toContain("Access-Control-Allow-Credentials");
		expect(headerKeys).toContain("Access-Control-Allow-Methods");
		expect(headerKeys).toContain("Access-Control-Allow-Origin");
		expect(headerKeys).toContain("Access-Control-Allow-Headers");
	});

	it("should have rewrites array defined", () => {
		expect(vercelConfig.rewrites).toBeDefined();
		expect(Array.isArray(vercelConfig.rewrites)).toBe(true);
	});

	it("should have API route rewrite", () => {
		const apiRewrite = vercelConfig.rewrites?.find(
			(r: VercelRewrite) => r.source === "/api/:path*",
		);
		expect(apiRewrite).toBeDefined();
		expect(apiRewrite?.destination).toBe("/api/:path*");
	});

	it("should have crons array defined", () => {
		expect(vercelConfig.crons).toBeDefined();
		expect(Array.isArray(vercelConfig.crons)).toBe(true);
	});
});
