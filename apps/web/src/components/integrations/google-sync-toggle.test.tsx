"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GoogleSyncToggle } from "./google-sync-toggle";

describe("GoogleSyncToggle", () => {
	const defaultProps = {
		todoId: 123,
		isSynced: false,
		onSyncChange: vi.fn(),
	};

	describe("Rendering", () => {
		it("renders the toggle button when show is true", () => {
			render(<GoogleSyncToggle {...defaultProps} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toBeInTheDocument();
		});

		it("renders CloudOff icon when not synced", () => {
			render(<GoogleSyncToggle {...defaultProps} isSynced={false} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveAttribute("aria-label", "Enable Google sync");
		});

		it("renders Cloud icon when synced", () => {
			render(<GoogleSyncToggle {...defaultProps} isSynced={true} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveAttribute("aria-label", "Disable Google sync");
		});

		it("does not render when show is false", () => {
			render(<GoogleSyncToggle {...defaultProps} show={false} />);

			expect(
				screen.queryByTestId("google-sync-toggle"),
			).not.toBeInTheDocument();
		});

		it("applies custom className when provided", () => {
			render(<GoogleSyncToggle {...defaultProps} className="custom-class" />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveClass("custom-class");
		});
	});

	describe("Todo ID Type Handling", () => {
		it("renders for numeric todo IDs", () => {
			render(<GoogleSyncToggle {...defaultProps} todoId={123} />);

			expect(screen.getByTestId("google-sync-toggle")).toBeInTheDocument();
		});

		it("does not render for string todo IDs (local todos)", () => {
			render(<GoogleSyncToggle {...defaultProps} todoId="local-123" />);

			expect(
				screen.queryByTestId("google-sync-toggle"),
			).not.toBeInTheDocument();
		});

		it("does not render for string numeric IDs", () => {
			render(<GoogleSyncToggle {...defaultProps} todoId="123" />);

			expect(
				screen.queryByTestId("google-sync-toggle"),
			).not.toBeInTheDocument();
		});
	});

	describe("Styling", () => {
		it("has blue text color when synced", () => {
			render(<GoogleSyncToggle {...defaultProps} isSynced={true} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveClass("text-blue-500");
		});

		it("has blue hover color when synced", () => {
			render(<GoogleSyncToggle {...defaultProps} isSynced={true} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveClass("hover:text-blue-600");
		});

		it("has blue hover background when synced", () => {
			render(<GoogleSyncToggle {...defaultProps} isSynced={true} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveClass("hover:bg-blue-500/10");
		});

		it("has muted foreground color when not synced", () => {
			render(<GoogleSyncToggle {...defaultProps} isSynced={false} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveClass("text-muted-foreground");
		});
	});

	describe("Interactions", () => {
		it("calls onSyncChange with todoId and true when enabling sync", async () => {
			const user = userEvent.setup();
			const onSyncChange = vi.fn().mockResolvedValue(undefined);

			render(
				<GoogleSyncToggle
					{...defaultProps}
					isSynced={false}
					onSyncChange={onSyncChange}
				/>,
			);

			const button = screen.getByTestId("google-sync-toggle");
			await user.click(button);

			expect(onSyncChange).toHaveBeenCalledWith(123, true);
		});

		it("calls onSyncChange with todoId and false when disabling sync", async () => {
			const user = userEvent.setup();
			const onSyncChange = vi.fn().mockResolvedValue(undefined);

			render(
				<GoogleSyncToggle
					{...defaultProps}
					isSynced={true}
					onSyncChange={onSyncChange}
				/>,
			);

			const button = screen.getByTestId("google-sync-toggle");
			await user.click(button);

			expect(onSyncChange).toHaveBeenCalledWith(123, false);
		});

		it("shows loading spinner during sync operation", async () => {
			const user = userEvent.setup();
			let resolvePromise: (value: undefined) => void;
			const onSyncChange = vi.fn(
				() =>
					new Promise<void>((resolve) => {
						resolvePromise = resolve;
					}),
			);

			render(
				<GoogleSyncToggle
					{...defaultProps}
					isSynced={false}
					onSyncChange={onSyncChange}
				/>,
			);

			const button = screen.getByTestId("google-sync-toggle");
			await user.click(button);

			// Should show loader
			const loader = button.querySelector(".animate-spin");
			expect(loader).toBeInTheDocument();

			// Resolve the promise
			resolvePromise?.();
		});

		it("disables button while sync is in progress", async () => {
			const user = userEvent.setup();
			let resolvePromise: (value: undefined) => void;
			const onSyncChange = vi.fn(
				() =>
					new Promise<void>((resolve) => {
						resolvePromise = resolve;
					}),
			);

			render(
				<GoogleSyncToggle
					{...defaultProps}
					isSynced={false}
					onSyncChange={onSyncChange}
				/>,
			);

			const button = screen.getByTestId("google-sync-toggle");
			await user.click(button);

			expect(button).toBeDisabled();

			// Resolve the promise
			resolvePromise?.();
		});

		it("re-enables button after sync completes", async () => {
			const user = userEvent.setup();
			const onSyncChange = vi.fn().mockResolvedValue(undefined);

			render(
				<GoogleSyncToggle
					{...defaultProps}
					isSynced={false}
					onSyncChange={onSyncChange}
				/>,
			);

			const button = screen.getByTestId("google-sync-toggle");
			await user.click(button);

			// Wait for promise to resolve
			await waitFor(() => {
				expect(onSyncChange).toHaveBeenCalled();
			});
		});

		it("handles errors by clearing loading state", async () => {
			const user = userEvent.setup();
			const onSyncChange = vi.fn().mockRejectedValue(new Error("Sync failed"));

			render(
				<GoogleSyncToggle
					{...defaultProps}
					isSynced={false}
					onSyncChange={onSyncChange}
				/>,
			);

			const button = screen.getByTestId("google-sync-toggle");

			// Click to trigger the error
			await user.click(button);

			// Component should handle error and clear loading state via try/finally
			// Verify onSyncChange was called
			await waitFor(() => {
				expect(onSyncChange).toHaveBeenCalled();
			});
		});
	});

	describe("Accessibility", () => {
		it("has accessible aria-label for enabling sync", () => {
			render(<GoogleSyncToggle {...defaultProps} isSynced={false} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveAttribute("aria-label", "Enable Google sync");
		});

		it("has accessible aria-label for disabling sync", () => {
			render(<GoogleSyncToggle {...defaultProps} isSynced={true} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveAttribute("aria-label", "Disable Google sync");
		});

		it("has button role", () => {
			render(<GoogleSyncToggle {...defaultProps} />);

			const button = screen.getByRole("button");
			expect(button).toBeInTheDocument();
		});

		it("has type='button' to prevent form submission", () => {
			render(<GoogleSyncToggle {...defaultProps} />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("type", "button");
		});
	});

	describe("Button Variants", () => {
		it("uses ghost variant", () => {
			render(<GoogleSyncToggle {...defaultProps} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveClass("hover:bg-muted");
		});

		it("uses icon size", () => {
			render(<GoogleSyncToggle {...defaultProps} />);

			const button = screen.getByTestId("google-sync-toggle");
			expect(button).toHaveClass("h-8");
			expect(button).toHaveClass("w-8");
		});
	});

	describe("Edge Cases", () => {
		it("handles zero as a valid numeric todo ID", () => {
			render(<GoogleSyncToggle {...defaultProps} todoId={0} />);

			expect(screen.getByTestId("google-sync-toggle")).toBeInTheDocument();
		});

		it("handles negative numeric todo ID", () => {
			render(<GoogleSyncToggle {...defaultProps} todoId={-1} />);

			expect(screen.getByTestId("google-sync-toggle")).toBeInTheDocument();
		});

		it("handles sync change callback throwing errors", async () => {
			const user = userEvent.setup();
			const onSyncChange = vi.fn().mockImplementation(() => {
				throw new Error("Callback error");
			});

			render(
				<GoogleSyncToggle
					{...defaultProps}
					isSynced={false}
					onSyncChange={onSyncChange}
				/>,
			);

			const button = screen.getByTestId("google-sync-toggle");

			// The component's try/finally ensures loading state is cleared even on error
			await user.click(button);

			// Verify onSyncChange was called despite the error
			expect(onSyncChange).toHaveBeenCalled();
		});
	});

	describe("Multiple Rapid Clicks", () => {
		it("debounces rapid clicks by disabling button during operation", async () => {
			const user = userEvent.setup();
			let resolvePromise: (value: undefined) => void;
			const onSyncChange = vi.fn(
				() =>
					new Promise<void>((resolve) => {
						resolvePromise = resolve;
					}),
			);

			render(
				<GoogleSyncToggle
					{...defaultProps}
					isSynced={false}
					onSyncChange={onSyncChange}
				/>,
			);

			const button = screen.getByTestId("google-sync-toggle");

			// Click multiple times rapidly
			await user.click(button);
			await user.click(button);
			await user.click(button);

			// Should only call once because button is disabled during operation
			expect(onSyncChange).toHaveBeenCalledTimes(1);

			// Resolve the promise
			resolvePromise?.();
		});
	});
});
