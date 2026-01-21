import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectionStatus } from "./connection-status";

describe("ConnectionStatus", () => {
	describe("Rendering", () => {
		it("renders with connecting status", () => {
			render(<ConnectionStatus status="connecting" />);
			const status = screen.getByRole("status");
			expect(status).toBeInTheDocument();
			expect(status).toHaveAttribute("data-connection-status", "connecting");
		});

		it("renders with connected status", () => {
			render(<ConnectionStatus status="connected" />);
			const status = screen.getByRole("status");
			expect(status).toBeInTheDocument();
			expect(status).toHaveAttribute("data-connection-status", "connected");
		});

		it("renders with disconnected status", () => {
			render(<ConnectionStatus status="disconnected" />);
			const status = screen.getByRole("status");
			expect(status).toBeInTheDocument();
			expect(status).toHaveAttribute("data-connection-status", "disconnected");
		});

		it("renders with not-configured status", () => {
			render(<ConnectionStatus status="not-configured" />);
			const status = screen.getByRole("status");
			expect(status).toBeInTheDocument();
			expect(status).toHaveAttribute(
				"data-connection-status",
				"not-configured",
			);
		});

		it("applies custom className", () => {
			const { container } = render(
				<ConnectionStatus status="connected" className="custom-class" />,
			);
			const status = container.querySelector("output");
			expect(status).toHaveClass("custom-class");
		});

		it("has data-connection-status attribute", () => {
			render(<ConnectionStatus status="connected" />);
			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("data-connection-status");
		});

		it("does not show label by default", () => {
			render(<ConnectionStatus status="connected" />);
			// Label should not be in document when showLabel is false
			expect(screen.queryByText("Synced")).not.toBeInTheDocument();
		});
	});

	describe("Label Display", () => {
		it("shows label when showLabel is true for connecting status", () => {
			render(<ConnectionStatus status="connecting" showLabel />);
			expect(screen.getByText("Connecting...")).toBeInTheDocument();
		});

		it("shows label when showLabel is true for connected status", () => {
			render(<ConnectionStatus status="connected" showLabel />);
			expect(screen.getByText("Synced")).toBeInTheDocument();
		});

		it("shows label when showLabel is true for disconnected status", () => {
			render(<ConnectionStatus status="disconnected" showLabel />);
			expect(screen.getByText("Disconnected")).toBeInTheDocument();
		});

		it("shows label when showLabel is true for not-configured status", () => {
			render(<ConnectionStatus status="not-configured" showLabel />);
			expect(screen.getByText("Not configured")).toBeInTheDocument();
		});

		it("uses custom label when provided for connected", () => {
			const customLabels = { connected: "All good!" };
			render(
				<ConnectionStatus status="connected" showLabel labels={customLabels} />,
			);
			expect(screen.getByText("All good!")).toBeInTheDocument();
			expect(screen.queryByText("Synced")).not.toBeInTheDocument();
		});

		it("uses custom label when provided for disconnected", () => {
			const customLabels = { disconnected: "Offline" };
			render(
				<ConnectionStatus
					status="disconnected"
					showLabel
					labels={customLabels}
				/>,
			);
			expect(screen.getByText("Offline")).toBeInTheDocument();
			expect(screen.queryByText("Disconnected")).not.toBeInTheDocument();
		});

		it("falls back to default label when custom label not provided", () => {
			const customLabels = { connected: "Connected!" };
			render(
				<ConnectionStatus
					status="disconnected"
					showLabel
					labels={customLabels}
				/>,
			);
			expect(screen.getByText("Disconnected")).toBeInTheDocument();
		});
	});

	describe("Icon Display", () => {
		it("shows spinner icon for connecting status", () => {
			render(<ConnectionStatus status="connecting" />);
			const icon = screen.getByRole("status").querySelector("svg");
			expect(icon).toBeInTheDocument();
			// Loader2 icon has animate-spin class
			expect(icon).toHaveClass("animate-spin");
		});

		it("shows check icon for connected status", () => {
			render(<ConnectionStatus status="connected" />);
			const icon = screen.getByRole("status").querySelector("svg");
			expect(icon).toBeInTheDocument();
			// Check icon should not have animate-spin
			expect(icon).not.toHaveClass("animate-spin");
		});

		it("shows x-circle icon for disconnected status", () => {
			render(<ConnectionStatus status="disconnected" />);
			const icon = screen.getByRole("status").querySelector("svg");
			expect(icon).toBeInTheDocument();
			expect(icon).not.toHaveClass("animate-spin");
		});

		it("shows x-circle icon for not-configured status", () => {
			render(<ConnectionStatus status="not-configured" />);
			const icon = screen.getByRole("status").querySelector("svg");
			expect(icon).toBeInTheDocument();
			expect(icon).not.toHaveClass("animate-spin");
		});
	});

	describe("Styling", () => {
		it("has emerald color for connected status", () => {
			render(<ConnectionStatus status="connected" />);
			const status = screen.getByRole("status");
			expect(status).toHaveClass("text-emerald-600");
		});

		it("has dark mode emerald color for connected status", () => {
			render(<ConnectionStatus status="connected" />);
			const status = screen.getByRole("status");
			expect(status).toHaveClass("dark:text-emerald-400");
		});

		it("has destructive color for disconnected status", () => {
			render(<ConnectionStatus status="disconnected" />);
			const status = screen.getByRole("status");
			expect(status).toHaveClass("text-destructive");
		});

		it("has muted color for connecting status", () => {
			render(<ConnectionStatus status="connecting" />);
			const status = screen.getByRole("status");
			expect(status).toHaveClass("text-muted-foreground");
		});

		it("has muted color for not-configured status", () => {
			render(<ConnectionStatus status="not-configured" />);
			const status = screen.getByRole("status");
			expect(status).toHaveClass("text-muted-foreground");
		});
	});

	describe("Size Variants", () => {
		it("has sm icon size by default", () => {
			render(<ConnectionStatus status="connected" />);
			const icon = screen.getByRole("status").querySelector("span");
			expect(icon).toHaveClass("h-3", "w-3");
		});

		it("has sm text size by default", () => {
			render(<ConnectionStatus status="connected" showLabel />);
			const label = screen.getByText("Synced");
			expect(label).toHaveClass("text-xs");
		});

		it("has md icon size when size is md", () => {
			render(<ConnectionStatus status="connected" size="md" />);
			const icon = screen.getByRole("status").querySelector("span");
			expect(icon).toHaveClass("h-4", "w-4");
		});

		it("has md text size when size is md", () => {
			render(<ConnectionStatus status="connected" showLabel size="md" />);
			const label = screen.getByText("Synced");
			expect(label).toHaveClass("text-sm");
		});

		it("has lg icon size when size is lg", () => {
			render(<ConnectionStatus status="connected" size="lg" />);
			const icon = screen.getByRole("status").querySelector("span");
			expect(icon).toHaveClass("h-5", "w-5");
		});

		it("has lg text size when size is lg", () => {
			render(<ConnectionStatus status="connected" showLabel size="lg" />);
			const label = screen.getByText("Synced");
			expect(label).toHaveClass("text-base");
		});
	});

	describe("Accessibility", () => {
		it("has role status", () => {
			render(<ConnectionStatus status="connected" />);
			const status = screen.getByRole("status");
			expect(status).toBeInTheDocument();
		});

		it("has aria-live polite", () => {
			render(<ConnectionStatus status="connected" />);
			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("aria-live", "polite");
		});

		it("has aria-hidden on icon container", () => {
			render(<ConnectionStatus status="connected" />);
			const iconContainer = screen.getByRole("status").querySelector("span");
			expect(iconContainer).toHaveAttribute("aria-hidden", "true");
		});
	});
});
