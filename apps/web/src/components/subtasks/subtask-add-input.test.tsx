"use client";

import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SubtaskAddInput } from "./subtask-add-input";

describe("SubtaskAddInput", () => {
	describe("Rendering", () => {
		it("renders input and button", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			expect(screen.getByTestId("subtask-add-input")).toBeInTheDocument();
			expect(screen.getByTestId("subtask-add-input-field")).toBeInTheDocument();
			expect(screen.getByTestId("subtask-add-button")).toBeInTheDocument();
		});

		it("renders with default placeholder", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			expect(
				screen.getByPlaceholderText("Add a subtask..."),
			).toBeInTheDocument();
		});

		it("renders with custom placeholder", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} placeholder="Enter your task" />);

			expect(
				screen.getByPlaceholderText("Enter your task"),
			).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} className="my-custom-class" />);

			expect(screen.getByTestId("subtask-add-input")).toHaveClass(
				"my-custom-class",
			);
		});

		it("input starts empty", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			expect(screen.getByTestId("subtask-add-input-field")).toHaveValue("");
		});
	});

	describe("Input Interaction", () => {
		it("updates value when typing", async () => {
			const user = userEvent.setup();
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "New subtask");

			expect(input).toHaveValue("New subtask");
		});

		it("clears input after successful submission", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "My new subtask");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				expect(input).toHaveValue("");
			});
		});

		it("trims whitespace from input before submission", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "  Trimmed text  ");
			await user.keyboard("{Enter}");

			expect(onAdd).toHaveBeenCalledWith("Trimmed text");
		});

		it("does not submit when input is empty", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			input.focus();
			await user.keyboard("{Enter}");

			expect(onAdd).not.toHaveBeenCalled();
		});

		it("does not submit when input is only whitespace", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "   ");
			await user.keyboard("{Enter}");

			expect(onAdd).not.toHaveBeenCalled();
		});
	});

	describe("Enter Key Submission", () => {
		it("submits on Enter key press", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "Submit with Enter");
			await user.keyboard("{Enter}");

			expect(onAdd).toHaveBeenCalledWith("Submit with Enter");
		});

		it("does not submit on Shift+Enter", async () => {
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			fireEvent.change(input, { target: { value: "Some text" } });
			fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

			expect(onAdd).not.toHaveBeenCalled();
		});

		it("prevents default form submission on Enter", async () => {
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");

			// Set a value manually
			await act(async () => {
				fireEvent.change(input, { target: { value: "Test" } });
			});

			// Create and dispatch a cancelable keydown event
			let defaultPrevented = false;
			await act(async () => {
				const enterEvent = new KeyboardEvent("keydown", {
					key: "Enter",
					bubbles: true,
					cancelable: true,
				});
				defaultPrevented = !input.dispatchEvent(enterEvent);
			});

			expect(defaultPrevented).toBe(true);
		});
	});

	describe("Button Submission", () => {
		it("submits when button is clicked", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			const button = screen.getByTestId("subtask-add-button");

			await user.type(input, "Submit with button");
			await user.click(button);

			expect(onAdd).toHaveBeenCalledWith("Submit with button");
		});

		it("button is disabled when input is empty", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			const button = screen.getByTestId("subtask-add-button");
			expect(button).toBeDisabled();
		});

		it("button is enabled when input has text", async () => {
			const user = userEvent.setup();
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "Some text");

			const button = screen.getByTestId("subtask-add-button");
			expect(button).toBeEnabled();
		});

		it("button is disabled when input is only whitespace", async () => {
			const user = userEvent.setup();
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "   ");

			const button = screen.getByTestId("subtask-add-button");
			expect(button).toBeDisabled();
		});
	});

	describe("Disabled State", () => {
		it("disables input when disabled prop is true", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} disabled />);

			expect(screen.getByTestId("subtask-add-input-field")).toBeDisabled();
		});

		it("disables button when disabled prop is true", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} disabled />);

			expect(screen.getByTestId("subtask-add-button")).toBeDisabled();
		});

		it("does not submit when disabled", async () => {
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} disabled />);

			const input = screen.getByTestId("subtask-add-input-field");
			fireEvent.keyDown(input, { key: "Enter" });

			expect(onAdd).not.toHaveBeenCalled();
		});
	});

	describe("Async Submission", () => {
		it("handles async onAdd callback", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn().mockResolvedValue(undefined);
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "Async task");
			await user.keyboard("{Enter}");

			await waitFor(() => {
				expect(onAdd).toHaveBeenCalledWith("Async task");
				expect(input).toHaveValue("");
			});
		});

		it("prevents double submission during async", async () => {
			const user = userEvent.setup();
			const resolveRef: { current: (() => void) | null } = { current: null };
			const onAdd = vi.fn().mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						resolveRef.current = resolve;
					}),
			);
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "Task");
			await user.keyboard("{Enter}");

			// Try to submit again while first is pending
			await user.type(input, " more text");
			await user.keyboard("{Enter}");

			// Should only have been called once
			expect(onAdd).toHaveBeenCalledTimes(1);

			// Resolve the first call
			resolveRef.current?.();

			await waitFor(() => {
				expect(input).toHaveValue("");
			});
		});

		it("disables input during submission", async () => {
			const user = userEvent.setup();
			const resolveRef: { current: (() => void) | null } = { current: null };
			const onAdd = vi.fn().mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						resolveRef.current = resolve;
					}),
			);
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "Task");
			await user.keyboard("{Enter}");

			// Input should be disabled during submission
			expect(input).toBeDisabled();

			// Resolve the promise
			resolveRef.current?.();

			await waitFor(() => {
				expect(input).toBeEnabled();
			});
		});

		it("disables button during submission", async () => {
			const user = userEvent.setup();
			const resolveRef: { current: (() => void) | null } = { current: null };
			const onAdd = vi.fn().mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						resolveRef.current = resolve;
					}),
			);
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			const button = screen.getByTestId("subtask-add-button");

			await user.type(input, "Task");
			await user.click(button);

			// Button should be disabled during submission
			expect(button).toBeDisabled();

			// Resolve the promise
			resolveRef.current?.();

			await waitFor(() => {
				// Button should be disabled after clear (empty input)
				expect(button).toBeDisabled();
			});
		});
	});

	describe("AutoFocus", () => {
		it("does not auto-focus by default", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			expect(screen.getByTestId("subtask-add-input-field")).not.toHaveFocus();
		});

		it("auto-focuses when autoFocus is true", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} autoFocus />);

			expect(screen.getByTestId("subtask-add-input-field")).toHaveFocus();
		});
	});

	describe("Accessibility", () => {
		it("input has accessible label", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			expect(screen.getByLabelText("New subtask text")).toBeInTheDocument();
		});

		it("button has accessible label", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			expect(screen.getByLabelText("Add subtask")).toBeInTheDocument();
		});

		it("input is keyboard navigable", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			const input = screen.getByTestId("subtask-add-input-field");
			expect(input.tagName).toBe("INPUT");
			expect(input).not.toHaveAttribute("tabindex", "-1");
		});

		it("button is keyboard navigable", () => {
			render(<SubtaskAddInput onAdd={vi.fn()} />);

			const button = screen.getByTestId("subtask-add-button");
			expect(button.tagName).toBe("BUTTON");
			expect(button).not.toHaveAttribute("tabindex", "-1");
		});
	});

	describe("Edge Cases", () => {
		it("handles very long text input", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn();
			const longText = "A".repeat(100);
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, longText);
			await user.keyboard("{Enter}");

			expect(onAdd).toHaveBeenCalledWith(longText);
		});

		it("handles special characters", async () => {
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			// Use fireEvent instead of userEvent for special characters
			// since userEvent.type() has issues with < and > in jsdom environment
			fireEvent.change(input, {
				target: { value: "<script>alert('xss')</script>" },
			});
			fireEvent.keyDown(input, { key: "Enter" });

			expect(onAdd).toHaveBeenCalledWith("<script>alert('xss')</script>");
		});

		it("handles unicode characters", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");
			await user.type(input, "任务 🎯 задача");
			await user.keyboard("{Enter}");

			expect(onAdd).toHaveBeenCalledWith("任务 🎯 задача");
		});

		it("handles rapid submissions", async () => {
			const user = userEvent.setup();
			const onAdd = vi.fn();
			render(<SubtaskAddInput onAdd={onAdd} />);

			const input = screen.getByTestId("subtask-add-input-field");

			// Type and submit multiple times rapidly
			await user.type(input, "First");
			await user.keyboard("{Enter}");
			await user.type(input, "Second");
			await user.keyboard("{Enter}");

			expect(onAdd).toHaveBeenCalledTimes(2);
			expect(onAdd).toHaveBeenNthCalledWith(1, "First");
			expect(onAdd).toHaveBeenNthCalledWith(2, "Second");
		});
	});
});
