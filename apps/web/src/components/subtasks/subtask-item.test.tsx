"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Subtask } from "@/app/api/subtask";
import { SubtaskItem } from "./subtask-item";

const createMockSubtask = (overrides: Partial<Subtask> = {}): Subtask => ({
	id: "subtask-1",
	text: "Test Subtask",
	completed: false,
	todoId: "todo-1",
	order: 0,
	...overrides,
});

describe("SubtaskItem", () => {
	describe("Rendering", () => {
		it("renders subtask text", () => {
			const subtask = createMockSubtask({ text: "My subtask text" });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByText("My subtask text")).toBeInTheDocument();
		});

		it("renders with correct data-testid", () => {
			const subtask = createMockSubtask({ id: "test-id-123" });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(
				screen.getByTestId("subtask-item-test-id-123"),
			).toBeInTheDocument();
		});

		it("renders checkbox with correct data-testid", () => {
			const subtask = createMockSubtask({ id: "checkbox-test" });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(
				screen.getByTestId("subtask-checkbox-checkbox-test"),
			).toBeInTheDocument();
		});

		it("renders delete button with correct data-testid", () => {
			const subtask = createMockSubtask({ id: "delete-test" });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(
				screen.getByTestId("subtask-delete-delete-test"),
			).toBeInTheDocument();
		});

		it("renders text element with correct data-testid", () => {
			const subtask = createMockSubtask({ id: "text-test" });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-text-text-test")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			const subtask = createMockSubtask({ id: "custom-class" });

			render(
				<SubtaskItem
					subtask={subtask}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
					className="my-custom-class"
				/>,
			);

			expect(screen.getByTestId("subtask-item-custom-class")).toHaveClass(
				"my-custom-class",
			);
		});

		it("handles numeric subtask IDs", () => {
			const subtask = createMockSubtask({ id: 456 });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-item-456")).toBeInTheDocument();
			expect(screen.getByTestId("subtask-checkbox-456")).toBeInTheDocument();
			expect(screen.getByTestId("subtask-delete-456")).toBeInTheDocument();
		});
	});

	describe("Checkbox", () => {
		it("shows unchecked state for incomplete subtask", () => {
			const subtask = createMockSubtask({ completed: false });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			const checkbox = screen.getByTestId("subtask-checkbox-subtask-1");
			expect(checkbox).not.toHaveAttribute("data-checked");
		});

		it("shows checked state for completed subtask", () => {
			const subtask = createMockSubtask({ completed: true });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			const checkbox = screen.getByTestId("subtask-checkbox-subtask-1");
			expect(checkbox).toHaveAttribute("data-checked");
		});

		it("calls onToggle when checkbox is clicked", () => {
			const onToggle = vi.fn();
			const subtask = createMockSubtask();

			render(
				<SubtaskItem
					subtask={subtask}
					onToggle={onToggle}
					onDelete={vi.fn()}
				/>,
			);

			fireEvent.click(screen.getByTestId("subtask-checkbox-subtask-1"));

			expect(onToggle).toHaveBeenCalledOnce();
		});

		it("has accessible label for incomplete subtask", () => {
			const subtask = createMockSubtask({
				text: "My Task",
				completed: false,
			});

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(
				screen.getByTestId("subtask-checkbox-subtask-1"),
			).toHaveAccessibleName('Mark "My Task" as complete');
		});

		it("has accessible label for completed subtask", () => {
			const subtask = createMockSubtask({
				text: "My Task",
				completed: true,
			});

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(
				screen.getByTestId("subtask-checkbox-subtask-1"),
			).toHaveAccessibleName('Mark "My Task" as incomplete');
		});
	});

	describe("Delete Button", () => {
		it("renders delete button by default", () => {
			const subtask = createMockSubtask();

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(
				screen.getByTestId("subtask-delete-subtask-1"),
			).toBeInTheDocument();
		});

		it("calls onDelete when delete button is clicked", () => {
			const onDelete = vi.fn();
			const subtask = createMockSubtask();

			render(
				<SubtaskItem
					subtask={subtask}
					onToggle={vi.fn()}
					onDelete={onDelete}
				/>,
			);

			fireEvent.click(screen.getByTestId("subtask-delete-subtask-1"));

			expect(onDelete).toHaveBeenCalledOnce();
		});

		it("has accessible label for delete button", () => {
			const subtask = createMockSubtask({ text: "Important Task" });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(
				screen.getByTestId("subtask-delete-subtask-1"),
			).toHaveAccessibleName('Delete "Important Task"');
		});
	});

	describe("Completed Styling", () => {
		it("applies strikethrough to completed subtask text", () => {
			const subtask = createMockSubtask({ completed: true });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-text-subtask-1")).toHaveClass(
				"line-through",
			);
		});

		it("applies muted text color to completed subtask", () => {
			const subtask = createMockSubtask({ completed: true });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-text-subtask-1")).toHaveClass(
				"text-muted-foreground",
			);
		});

		it("does not apply strikethrough to incomplete subtask text", () => {
			const subtask = createMockSubtask({ completed: false });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-text-subtask-1")).not.toHaveClass(
				"line-through",
			);
		});

		it("does not apply muted text color to incomplete subtask", () => {
			const subtask = createMockSubtask({ completed: false });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-text-subtask-1")).not.toHaveClass(
				"text-muted-foreground",
			);
		});
	});

	describe("Read-Only Mode", () => {
		it("hides delete button in read-only mode", () => {
			const subtask = createMockSubtask();

			render(
				<SubtaskItem
					subtask={subtask}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
					readOnly
				/>,
			);

			expect(
				screen.queryByTestId("subtask-delete-subtask-1"),
			).not.toBeInTheDocument();
		});

		it("disables checkbox in read-only mode", () => {
			const subtask = createMockSubtask();

			render(
				<SubtaskItem
					subtask={subtask}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
					readOnly
				/>,
			);

			// base-ui Checkbox uses aria-disabled instead of native disabled
			expect(screen.getByTestId("subtask-checkbox-subtask-1")).toHaveAttribute(
				"aria-disabled",
				"true",
			);
		});

		it("still renders subtask text in read-only mode", () => {
			const subtask = createMockSubtask({ text: "Read-only task" });

			render(
				<SubtaskItem
					subtask={subtask}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
					readOnly
				/>,
			);

			expect(screen.getByText("Read-only task")).toBeInTheDocument();
		});

		it("still shows completed styling in read-only mode", () => {
			const subtask = createMockSubtask({ completed: true });

			render(
				<SubtaskItem
					subtask={subtask}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
					readOnly
				/>,
			);

			expect(screen.getByTestId("subtask-text-subtask-1")).toHaveClass(
				"line-through",
			);
		});
	});

	describe("Accessibility", () => {
		it("is a list item element", () => {
			const subtask = createMockSubtask();

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByRole("listitem")).toBeInTheDocument();
		});

		it("checkbox is keyboard accessible", () => {
			const onToggle = vi.fn();
			const subtask = createMockSubtask();

			render(
				<SubtaskItem
					subtask={subtask}
					onToggle={onToggle}
					onDelete={vi.fn()}
				/>,
			);

			const checkbox = screen.getByTestId("subtask-checkbox-subtask-1");
			checkbox.focus();
			fireEvent.keyDown(checkbox, { key: "Enter" });

			expect(onToggle).toHaveBeenCalled();
		});

		it("delete button is keyboard accessible", () => {
			const onDelete = vi.fn();
			const subtask = createMockSubtask();

			render(
				<SubtaskItem
					subtask={subtask}
					onToggle={vi.fn()}
					onDelete={onDelete}
				/>,
			);

			const deleteButton = screen.getByTestId("subtask-delete-subtask-1");
			// Button elements can be focused and activated via keyboard
			expect(deleteButton.tagName).toBe("BUTTON");
			expect(deleteButton).not.toHaveAttribute("tabindex", "-1");
		});
	});

	describe("Edge Cases", () => {
		it("handles empty text", () => {
			const subtask = createMockSubtask({ text: "" });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-text-subtask-1")).toHaveTextContent(
				"",
			);
		});

		it("handles long text", () => {
			const longText = "A".repeat(500);
			const subtask = createMockSubtask({ text: longText });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-text-subtask-1")).toHaveTextContent(
				longText,
			);
		});

		it("handles special characters in text", () => {
			const subtask = createMockSubtask({
				text: '<script>alert("xss")</script>',
			});

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-text-subtask-1")).toHaveTextContent(
				'<script>alert("xss")</script>',
			);
		});

		it("handles unicode characters in text", () => {
			const subtask = createMockSubtask({ text: "任务 🎯 задача" });

			render(
				<SubtaskItem subtask={subtask} onToggle={vi.fn()} onDelete={vi.fn()} />,
			);

			expect(screen.getByTestId("subtask-text-subtask-1")).toHaveTextContent(
				"任务 🎯 задача",
			);
		});
	});
});
