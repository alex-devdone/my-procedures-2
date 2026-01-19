import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
	it("merges class names", () => {
		expect(cn("foo", "bar")).toBe("foo bar");
	});

	it("handles conditional classes", () => {
		expect(cn("base", true && "included", false && "excluded")).toBe(
			"base included",
		);
	});

	it("resolves tailwind conflicts by taking last value", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});

	it("handles arrays of classes", () => {
		expect(cn(["foo", "bar"])).toBe("foo bar");
	});

	it("handles undefined and null values", () => {
		expect(cn("base", undefined, null, "end")).toBe("base end");
	});
});
