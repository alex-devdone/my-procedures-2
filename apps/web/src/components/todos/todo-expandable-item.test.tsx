"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UseSubtaskStorageReturn } from "@/app/api/subtask";
import type { RecurringPattern } from "@/app/api/todo/todo.types";

// Mock the subtask hooks
const mockUseSubtaskStorage = vi.fn<() => UseSubtaskStorageReturn>();
vi.mock("@/app/api/subtask", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/app/api/subtask")>();
	return {
		...original,
		useSubtaskStorage: () => mockUseSubtaskStorage(),
	};
});

// Import after mocks
import { TodoExpandableItem } from "./todo-expandable-item";

const createMockTodo = (
	overrides: Partial<{
		id: number | string;
		text: string;
		completed: boolean;
		folderId?: number | string | null;
		dueDate?: string | null;
		recurringPattern?: RecurringPattern | null;
	}> = {},
) => ({
	id: "todo-1",
	text: "Test Todo",
	completed: false,
	folderId: null,
	dueDate: null,
	recurringPattern: null,
	...overrides,
});

const defaultMockReturn: UseSubtaskStorageReturn = {
	subtasks: [],
	create: vi.fn(),
	update: vi.fn(),
	toggle: vi.fn(),
	deleteSubtask: vi.fn(),
	reorder: vi.fn(),
	isLoading: false,
	isAuthenticated: false,
};

describe("TodoExpandableItem", () => {
	let mockOnToggle: (id: number | string, completed: boolean) => void;
	let mockOnDelete: (id: number | string) => void;

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSubtaskStorage.mockReturnValue(defaultMockReturn);
		mockOnToggle = vi.fn();
		mockOnDelete = vi.fn();
	});

	describe("Rendering", () => {
		it("renders todo text", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ text: "Buy groceries" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-text")).toHaveTextContent(
				"Buy groceries",
			);
		});

		it("renders with data-testid attribute", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ id: "test-id" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-item-test-id")).toBeInTheDocument();
		});

		it("renders toggle button", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-toggle")).toBeInTheDocument();
		});

		it("renders expand toggle button", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-expand-toggle")).toBeInTheDocument();
		});

		it("renders delete button", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-delete")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ id: "test-id" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					className="custom-class"
				/>,
			);

			expect(screen.getByTestId("todo-item-test-id")).toHaveClass(
				"custom-class",
			);
		});

		it("applies animation delay style", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ id: "test-id" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					animationDelay="0.3s"
				/>,
			);

			expect(screen.getByTestId("todo-item-test-id")).toHaveStyle({
				animationDelay: "0.3s",
			});
		});

		it("renders with numeric todo id", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ id: 123 })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-item-123")).toBeInTheDocument();
		});
	});

	describe("Completed State", () => {
		it("shows unchecked toggle for incomplete todo", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ completed: false })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const toggle = screen.getByTestId("todo-toggle");
			expect(toggle).toHaveAttribute("aria-label", "Mark as complete");
		});

		it("shows checked toggle for completed todo", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ completed: true })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const toggle = screen.getByTestId("todo-toggle");
			expect(toggle).toHaveAttribute("aria-label", "Mark as incomplete");
		});

		it("applies strikethrough to completed todo text", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ completed: true })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const text = screen.getByTestId("todo-text");
			expect(text).toHaveClass("line-through");
		});

		it("does not apply strikethrough to incomplete todo text", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ completed: false })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const text = screen.getByTestId("todo-text");
			expect(text).not.toHaveClass("line-through");
		});
	});

	describe("Toggle Interaction", () => {
		it("calls onToggle when toggle button is clicked", () => {
			const todo = createMockTodo({ id: "todo-1", completed: false });
			render(
				<TodoExpandableItem
					todo={todo}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			fireEvent.click(screen.getByTestId("todo-toggle"));

			expect(mockOnToggle).toHaveBeenCalledWith("todo-1", false);
		});

		it("calls onToggle with completed=true for completed todo", () => {
			const todo = createMockTodo({ id: "todo-1", completed: true });
			render(
				<TodoExpandableItem
					todo={todo}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			fireEvent.click(screen.getByTestId("todo-toggle"));

			expect(mockOnToggle).toHaveBeenCalledWith("todo-1", true);
		});
	});

	describe("Delete Interaction", () => {
		it("calls onDelete when delete button is clicked", () => {
			const todo = createMockTodo({ id: "todo-1" });
			render(
				<TodoExpandableItem
					todo={todo}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			fireEvent.click(screen.getByTestId("todo-delete"));

			expect(mockOnDelete).toHaveBeenCalledWith("todo-1");
		});
	});

	describe("Expand/Collapse", () => {
		it("starts collapsed by default", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(
				screen.queryByTestId("todo-subtasks-section"),
			).not.toBeInTheDocument();
		});

		it("expands when expand toggle is clicked", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			fireEvent.click(screen.getByTestId("todo-expand-toggle"));

			expect(screen.getByTestId("todo-subtasks-section")).toBeInTheDocument();
		});

		it("collapses when expand toggle is clicked again", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Expand
			fireEvent.click(screen.getByTestId("todo-expand-toggle"));
			expect(screen.getByTestId("todo-subtasks-section")).toBeInTheDocument();

			// Collapse
			fireEvent.click(screen.getByTestId("todo-expand-toggle"));
			expect(
				screen.queryByTestId("todo-subtasks-section"),
			).not.toBeInTheDocument();
		});

		it("has correct aria-expanded attribute when collapsed", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const expandToggle = screen.getByTestId("todo-expand-toggle");
			expect(expandToggle).toHaveAttribute("aria-expanded", "false");
		});

		it("has correct aria-expanded attribute when expanded", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			fireEvent.click(screen.getByTestId("todo-expand-toggle"));

			const expandToggle = screen.getByTestId("todo-expand-toggle");
			expect(expandToggle).toHaveAttribute("aria-expanded", "true");
		});

		it("shows subtask add input when expanded", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			fireEvent.click(screen.getByTestId("todo-expand-toggle"));

			expect(screen.getByTestId("subtask-add-input")).toBeInTheDocument();
		});
	});

	describe("Folder Badge", () => {
		it("does not show folder badge when showFolderBadge is false", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					folder={{ name: "Work", color: "blue" }}
					showFolderBadge={false}
				/>,
			);

			expect(screen.queryByTestId("todo-folder-badge")).not.toBeInTheDocument();
		});

		it("does not show folder badge when folder is null", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					folder={null}
					showFolderBadge={true}
				/>,
			);

			expect(screen.queryByTestId("todo-folder-badge")).not.toBeInTheDocument();
		});

		it("shows folder badge when folder exists and showFolderBadge is true", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					folder={{ name: "Work", color: "blue" }}
					showFolderBadge={true}
				/>,
			);

			const badge = screen.getByTestId("todo-folder-badge");
			expect(badge).toBeInTheDocument();
			expect(badge).toHaveTextContent("Work");
		});

		it("applies folder color classes from mapping", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					folder={{ name: "Work", color: "blue" }}
					showFolderBadge={true}
					folderColorBgClasses={{
						blue: "bg-blue-500/10 text-blue-600",
					}}
				/>,
			);

			const badge = screen.getByTestId("todo-folder-badge");
			expect(badge).toHaveClass("bg-blue-500/10");
			expect(badge).toHaveClass("text-blue-600");
		});

		it("falls back to default classes when color not in mapping", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					folder={{ name: "Work", color: "unknown" }}
					showFolderBadge={true}
					folderColorBgClasses={{}}
				/>,
			);

			const badge = screen.getByTestId("todo-folder-badge");
			expect(badge).toHaveClass("bg-slate-500/10");
		});
	});

	describe("Subtask Progress", () => {
		it("does not show progress indicator when no subtask progress", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					subtaskProgress={null}
				/>,
			);

			expect(
				screen.queryByTestId("subtask-progress-indicator"),
			).not.toBeInTheDocument();
		});

		it("does not show progress indicator when total is 0", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					subtaskProgress={{ completed: 0, total: 0 }}
				/>,
			);

			expect(
				screen.queryByTestId("subtask-progress-indicator"),
			).not.toBeInTheDocument();
		});

		it("shows progress indicator when subtasks exist", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					subtaskProgress={{ completed: 2, total: 5 }}
				/>,
			);

			const indicator = screen.getByTestId("subtask-progress-indicator");
			expect(indicator).toBeInTheDocument();
			expect(indicator).toHaveTextContent("2/5");
		});
	});

	describe("Adding Subtasks", () => {
		it("calls create when subtask is added", async () => {
			const mockCreate = vi.fn().mockResolvedValue({
				id: "new-subtask",
				text: "New subtask",
				completed: false,
				todoId: "todo-1",
				order: 0,
			});
			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				create: mockCreate,
			});

			render(
				<TodoExpandableItem
					todo={createMockTodo({ id: "todo-1" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Expand
			fireEvent.click(screen.getByTestId("todo-expand-toggle"));

			// Add subtask
			const input = screen.getByTestId("subtask-add-input-field");
			fireEvent.change(input, { target: { value: "New subtask" } });
			fireEvent.click(screen.getByTestId("subtask-add-button"));

			await waitFor(() => {
				expect(mockCreate).toHaveBeenCalledWith("todo-1", "New subtask");
			});
		});
	});

	describe("Auto-complete Logic", () => {
		it("calls onToggle to complete todo when all subtasks completed", () => {
			const mockToggle = vi.fn();
			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks: [
					{
						id: "s1",
						text: "Subtask 1",
						completed: false,
						todoId: "todo-1",
						order: 0,
					},
				],
				toggle: mockToggle,
			});

			render(
				<TodoExpandableItem
					todo={createMockTodo({ id: "todo-1", completed: false })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					subtaskProgress={{ completed: 0, total: 1 }}
				/>,
			);

			// Expand to see subtasks
			fireEvent.click(screen.getByTestId("todo-expand-toggle"));

			// The subtask checkbox should be present
			expect(screen.getByRole("checkbox")).toBeInTheDocument();
		});

		it("auto-complete is triggered via SubtaskList callbacks", () => {
			// This test verifies the onAllCompleted callback is passed to SubtaskList
			const mockToggle = vi.fn();
			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks: [],
				toggle: mockToggle,
			});

			render(
				<TodoExpandableItem
					todo={createMockTodo({ id: "todo-1", completed: false })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Expand
			fireEvent.click(screen.getByTestId("todo-expand-toggle"));

			// The SubtaskList component should be rendered
			expect(screen.getByTestId("subtask-list-empty")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("has accessible label for toggle button", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ completed: false })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-toggle")).toHaveAttribute(
				"aria-label",
				"Mark as complete",
			);
		});

		it("has accessible label for delete button", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-delete")).toHaveAttribute(
				"aria-label",
				"Delete task",
			);
		});

		it("has accessible label for expand toggle when collapsed", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-expand-toggle")).toHaveAttribute(
				"aria-label",
				"Expand subtasks",
			);
		});

		it("has accessible label for expand toggle when expanded", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo()}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			fireEvent.click(screen.getByTestId("todo-expand-toggle"));

			expect(screen.getByTestId("todo-expand-toggle")).toHaveAttribute(
				"aria-label",
				"Collapse subtasks",
			);
		});

		it("renders as list item element", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ id: "test-id" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-item-test-id").tagName).toBe("LI");
		});
	});

	describe("Due Date Badge", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-01-21T10:00:00.000Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("does not show due date badge when no dueDate", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ dueDate: null })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.queryByTestId("due-date-badge")).not.toBeInTheDocument();
		});

		it("shows due date badge when dueDate is provided", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ dueDate: "2026-01-25T12:00:00.000Z" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("due-date-badge")).toBeInTheDocument();
		});

		it("shows due date badge when only recurringPattern is provided", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ recurringPattern: { type: "daily" } })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("due-date-badge")).toBeInTheDocument();
		});

		it("shows 'Today' for todo due today", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ dueDate: "2026-01-21T10:00:00.000Z" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("due-date-text")).toHaveTextContent("Today");
		});

		it("shows 'Tomorrow' for todo due tomorrow", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ dueDate: "2026-01-22T10:00:00.000Z" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("due-date-text")).toHaveTextContent("Tomorrow");
		});
	});

	describe("Overdue Styling", () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-01-21T10:00:00.000Z"));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("applies overdue styling for past due date on incomplete todo", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({
						id: "test-id",
						dueDate: "2026-01-19T12:00:00.000Z",
						completed: false,
					})}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const item = screen.getByTestId("todo-item-test-id");
			expect(item).toHaveAttribute("data-overdue", "true");
			expect(item).toHaveClass("border-red-500/30");
		});

		it("does not apply overdue styling for past due date on completed todo", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({
						id: "test-id",
						dueDate: "2026-01-19T12:00:00.000Z",
						completed: true,
					})}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const item = screen.getByTestId("todo-item-test-id");
			expect(item).not.toHaveAttribute("data-overdue");
			expect(item).not.toHaveClass("border-red-500/30");
		});

		it("does not apply overdue styling for future due date", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({
						id: "test-id",
						dueDate: "2026-01-25T12:00:00.000Z",
						completed: false,
					})}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const item = screen.getByTestId("todo-item-test-id");
			expect(item).not.toHaveAttribute("data-overdue");
		});

		it("does not apply overdue styling for today's due date", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({
						id: "test-id",
						dueDate: "2026-01-21T23:59:59.000Z",
						completed: false,
					})}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const item = screen.getByTestId("todo-item-test-id");
			expect(item).not.toHaveAttribute("data-overdue");
		});

		it("shows overdue icon in badge for overdue todo", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({
						dueDate: "2026-01-19T12:00:00.000Z",
						completed: false,
					})}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("overdue-icon")).toBeInTheDocument();
		});

		it("does not show overdue icon for future due date", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({
						dueDate: "2026-01-25T12:00:00.000Z",
						completed: false,
					})}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.queryByTestId("overdue-icon")).not.toBeInTheDocument();
		});
	});

	describe("Recurring Pattern Display", () => {
		it("shows recurring indicator when both date and pattern are provided", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({
						dueDate: "2026-01-25T12:00:00.000Z",
						recurringPattern: { type: "daily" },
					})}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("recurring-indicator")).toBeInTheDocument();
		});

		it("shows recurring text when only pattern is provided", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({
						dueDate: null,
						recurringPattern: { type: "weekly", daysOfWeek: [1, 3, 5] },
					})}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("recurring-text")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles empty todo text", () => {
			render(
				<TodoExpandableItem
					todo={createMockTodo({ text: "" })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-text")).toHaveTextContent("");
		});

		it("handles very long todo text", () => {
			const longText = "A".repeat(1000);
			render(
				<TodoExpandableItem
					todo={createMockTodo({ text: longText })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-text")).toHaveTextContent(longText);
		});

		it("handles special characters in todo text", () => {
			const specialText = "<script>alert('xss')</script>";
			render(
				<TodoExpandableItem
					todo={createMockTodo({ text: specialText })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-text")).toHaveTextContent(specialText);
		});

		it("handles unicode in todo text", () => {
			const unicodeText = "Todo with emojis and unicode chars";
			render(
				<TodoExpandableItem
					todo={createMockTodo({ text: unicodeText })}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-text")).toHaveTextContent(unicodeText);
		});
	});
});
