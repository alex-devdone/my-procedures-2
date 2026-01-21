"use client";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SubtaskProgress } from "@/app/api/subtask";
import { SubtaskProgressIndicator } from "./subtask-progress-indicator";

const createProgress = (completed: number, total: number): SubtaskProgress => ({
	completed,
	total,
});

describe("SubtaskProgressIndicator", () => {
	describe("Rendering", () => {
		it("renders progress text with completed and total counts", () => {
			render(<SubtaskProgressIndicator progress={createProgress(2, 5)} />);

			expect(screen.getByTestId("subtask-progress-text")).toHaveTextContent(
				"2/5",
			);
		});

		it("renders with data-testid attribute", () => {
			render(<SubtaskProgressIndicator progress={createProgress(1, 3)} />);

			expect(
				screen.getByTestId("subtask-progress-indicator"),
			).toBeInTheDocument();
		});

		it("renders icon by default", () => {
			render(<SubtaskProgressIndicator progress={createProgress(1, 2)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			const svg = indicator.querySelector("svg");
			expect(svg).toBeInTheDocument();
		});

		it("hides icon when showIcon is false", () => {
			render(
				<SubtaskProgressIndicator
					progress={createProgress(1, 2)}
					showIcon={false}
				/>,
			);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			const svg = indicator.querySelector("svg");
			expect(svg).not.toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<SubtaskProgressIndicator
					progress={createProgress(1, 2)}
					className="custom-class"
				/>,
			);

			expect(screen.getByTestId("subtask-progress-indicator")).toHaveClass(
				"custom-class",
			);
		});
	});

	describe("Empty state", () => {
		it("returns null when total is 0", () => {
			const { container } = render(
				<SubtaskProgressIndicator progress={createProgress(0, 0)} />,
			);

			expect(container.firstChild).toBeNull();
		});

		it("does not render indicator when no subtasks exist", () => {
			render(<SubtaskProgressIndicator progress={createProgress(0, 0)} />);

			expect(
				screen.queryByTestId("subtask-progress-indicator"),
			).not.toBeInTheDocument();
		});
	});

	describe("Completion styling", () => {
		it("applies green styling when all subtasks are completed", () => {
			render(<SubtaskProgressIndicator progress={createProgress(5, 5)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveClass("text-green-600");
		});

		it("applies muted styling when not all subtasks are completed", () => {
			render(<SubtaskProgressIndicator progress={createProgress(3, 5)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveClass("text-muted-foreground");
		});

		it("applies green styling when only 1 subtask exists and is completed", () => {
			render(<SubtaskProgressIndicator progress={createProgress(1, 1)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveClass("text-green-600");
		});

		it("applies muted styling when 0 subtasks are completed", () => {
			render(<SubtaskProgressIndicator progress={createProgress(0, 3)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveClass("text-muted-foreground");
		});
	});

	describe("Size variants", () => {
		it("applies small text size by default", () => {
			render(<SubtaskProgressIndicator progress={createProgress(1, 2)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveClass("text-xs");
		});

		it("applies small text size when size is 'sm'", () => {
			render(
				<SubtaskProgressIndicator progress={createProgress(1, 2)} size="sm" />,
			);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveClass("text-xs");
		});

		it("applies medium text size when size is 'md'", () => {
			render(
				<SubtaskProgressIndicator progress={createProgress(1, 2)} size="md" />,
			);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveClass("text-sm");
		});

		it("applies small icon size when size is 'sm'", () => {
			render(
				<SubtaskProgressIndicator progress={createProgress(1, 2)} size="sm" />,
			);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			const svg = indicator.querySelector("svg");
			expect(svg).toHaveClass("h-3", "w-3");
		});

		it("applies medium icon size when size is 'md'", () => {
			render(
				<SubtaskProgressIndicator progress={createProgress(1, 2)} size="md" />,
			);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			const svg = indicator.querySelector("svg");
			expect(svg).toHaveClass("h-4", "w-4");
		});
	});

	describe("Accessibility", () => {
		it("has proper aria-label describing progress", () => {
			render(<SubtaskProgressIndicator progress={createProgress(2, 5)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveAttribute(
				"aria-label",
				"2 of 5 subtasks completed",
			);
		});

		it("has aria-hidden on icon", () => {
			render(<SubtaskProgressIndicator progress={createProgress(1, 2)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			const svg = indicator.querySelector("svg");
			expect(svg).toHaveAttribute("aria-hidden", "true");
		});

		it("updates aria-label when all subtasks are completed", () => {
			render(<SubtaskProgressIndicator progress={createProgress(3, 3)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveAttribute(
				"aria-label",
				"3 of 3 subtasks completed",
			);
		});

		it("updates aria-label when no subtasks are completed", () => {
			render(<SubtaskProgressIndicator progress={createProgress(0, 4)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toHaveAttribute(
				"aria-label",
				"0 of 4 subtasks completed",
			);
		});
	});

	describe("Progress values", () => {
		it("renders 0/1 correctly", () => {
			render(<SubtaskProgressIndicator progress={createProgress(0, 1)} />);

			expect(screen.getByTestId("subtask-progress-text")).toHaveTextContent(
				"0/1",
			);
		});

		it("renders 1/1 correctly", () => {
			render(<SubtaskProgressIndicator progress={createProgress(1, 1)} />);

			expect(screen.getByTestId("subtask-progress-text")).toHaveTextContent(
				"1/1",
			);
		});

		it("renders large numbers correctly", () => {
			render(<SubtaskProgressIndicator progress={createProgress(50, 100)} />);

			expect(screen.getByTestId("subtask-progress-text")).toHaveTextContent(
				"50/100",
			);
		});

		it("renders when completed equals total", () => {
			render(<SubtaskProgressIndicator progress={createProgress(7, 7)} />);

			expect(screen.getByTestId("subtask-progress-text")).toHaveTextContent(
				"7/7",
			);
		});
	});

	describe("Icon styling", () => {
		it("applies green icon color when all completed", () => {
			render(<SubtaskProgressIndicator progress={createProgress(2, 2)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			const svg = indicator.querySelector("svg");
			expect(svg).toHaveClass("text-green-600");
		});

		it("applies muted icon color when not all completed", () => {
			render(<SubtaskProgressIndicator progress={createProgress(1, 2)} />);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			const svg = indicator.querySelector("svg");
			expect(svg).toHaveClass("text-muted-foreground");
		});
	});
});
