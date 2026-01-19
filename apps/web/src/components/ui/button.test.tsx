import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
	it("renders with default variant and size", () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole("button")).toHaveTextContent("Click me");
	});

	it("renders with custom className", () => {
		render(<Button className="custom-class">Test</Button>);
		expect(screen.getByRole("button")).toHaveClass("custom-class");
	});

	it("renders as disabled when disabled prop is set", () => {
		render(<Button disabled>Disabled</Button>);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("applies outline variant styles", () => {
		render(<Button variant="outline">Outline</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("border-border");
	});

	it("applies ghost variant styles", () => {
		render(<Button variant="ghost">Ghost</Button>);
		const button = screen.getByRole("button");
		expect(button).toHaveClass("hover:bg-muted");
	});
});
