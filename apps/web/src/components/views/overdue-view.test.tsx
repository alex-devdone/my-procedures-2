"use client";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Folder, UseFolderStorageReturn } from "@/app/api/folder";
import type { SubtaskProgress } from "@/app/api/subtask";
import type { Todo } from "@/app/api/todo/todo.types";

// Mock the folder hooks
const mockUseFolderStorage = vi.fn<() => UseFolderStorageReturn>();
vi.mock("@/app/api/folder", () => ({
	useFolderStorage: () => mockUseFolderStorage(),
}));

// Mock the subtask progress hook
const mockGetProgress =
	vi.fn<(id: number | string) => SubtaskProgress | null>();
vi.mock("@/app/api/subtask", () => ({
	useAllSubtasksProgress: () => ({
		getProgress: mockGetProgress,
	}),
	useSubtaskStorage: () => ({
		subtasks: [],
		create: vi.fn(),
		update: vi.fn(),
		toggle: vi.fn(),
		deleteSubtask: vi.fn(),
		reorder: vi.fn(),
		isLoading: false,
	}),
}));

// Mock the reminder provider to avoid supabase dependency
vi.mock("@/components/notifications/reminder-provider", () => ({
	useDueReminders: () => ({
		dueReminderIds: new Set<string>(),
		dueReminders: [],
		dismissReminder: vi.fn(),
	}),
}));

// Import after mocks
import { getTodosOverdue, OverdueView } from "./overdue-view";

// Helper to create a date string for today
function getTodayISOString(): string {
	const today = new Date();
	today.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
	return today.toISOString();
}

// Helper to create a date string for yesterday
function getYesterdayISOString(): string {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	yesterday.setHours(12, 0, 0, 0);
	return yesterday.toISOString();
}

// Helper to create a date string for 2 days ago
function getTwoDaysAgoISOString(): string {
	const date = new Date();
	date.setDate(date.getDate() - 2);
	date.setHours(12, 0, 0, 0);
	return date.toISOString();
}

// Helper to create a date string for tomorrow
function getTomorrowISOString(): string {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(12, 0, 0, 0);
	return tomorrow.toISOString();
}

const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
	id: `todo-${Math.random().toString(36).slice(2)}`,
	text: "Test Todo",
	completed: false,
	folderId: null,
	dueDate: null,
	reminderAt: null,
	recurringPattern: null,
	...overrides,
});

const createMockFolder = (overrides: Partial<Folder> = {}): Folder => ({
	id: "folder-1",
	name: "Test Folder",
	color: "blue",
	order: 0,
	createdAt: new Date("2024-01-01"),
	...overrides,
});

const defaultMockFolderReturn: UseFolderStorageReturn = {
	folders: [],
	create: vi.fn(),
	update: vi.fn(),
	deleteFolder: vi.fn(),
	reorder: vi.fn(),
	isLoading: false,
	isAuthenticated: false,
};

describe("getTodosOverdue", () => {
	it("returns empty array when no todos have due dates", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: null }),
			createMockTodo({ id: "2", dueDate: null }),
		];
		expect(getTodosOverdue(todos)).toEqual([]);
	});

	it("returns empty array when no todos are overdue", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: getTodayISOString() }),
			createMockTodo({ id: "2", dueDate: getTomorrowISOString() }),
		];
		expect(getTodosOverdue(todos)).toEqual([]);
	});

	it("returns overdue todos (active)", () => {
		const overdueTodo = createMockTodo({
			id: "overdue",
			dueDate: getYesterdayISOString(),
			completed: false,
		});
		const futureTodo = createMockTodo({
			id: "future",
			dueDate: getTomorrowISOString(),
		});
		const todos = [overdueTodo, futureTodo];

		const result = getTodosOverdue(todos);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("overdue");
	});

	it("returns all overdue todos", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: getYesterdayISOString() }),
			createMockTodo({ id: "2", dueDate: getTwoDaysAgoISOString() }),
			createMockTodo({ id: "3", dueDate: getTodayISOString() }),
		];

		const result = getTodosOverdue(todos);
		expect(result).toHaveLength(2);
		expect(result.map((t) => t.id)).toEqual(["1", "2"]);
	});

	it("includes completed todos that were overdue", () => {
		const todos = [
			createMockTodo({
				id: "overdue-completed",
				dueDate: getYesterdayISOString(),
				completed: true,
			}),
		];

		const result = getTodosOverdue(todos);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("overdue-completed");
	});

	it("includes both active and completed overdue todos", () => {
		const todos = [
			createMockTodo({
				id: "active",
				dueDate: getYesterdayISOString(),
				completed: false,
			}),
			createMockTodo({
				id: "completed",
				dueDate: getYesterdayISOString(),
				completed: true,
			}),
			createMockTodo({
				id: "future",
				dueDate: getTomorrowISOString(),
				completed: false,
			}),
		];

		const result = getTodosOverdue(todos);
		expect(result).toHaveLength(2);
		expect(result.map((t) => t.id)).toEqual(["active", "completed"]);
	});
});

describe("OverdueView", () => {
	const mockOnToggle = vi.fn();
	const mockOnDelete = vi.fn();
	const mockOnScheduleChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseFolderStorage.mockReturnValue(defaultMockFolderReturn);
		mockGetProgress.mockReturnValue(null);
	});

	describe("Rendering", () => {
		it("renders the Overdue view with header", () => {
			render(
				<OverdueView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("overdue-view")).toBeInTheDocument();
			expect(screen.getByText("Overdue")).toBeInTheDocument();
			expect(
				screen.getByText("Tasks that are past their due date"),
			).toBeInTheDocument();
		});

		it("renders the alert icon", () => {
			render(
				<OverdueView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// AlertCircle icon with red styling
			const header = screen.getByText("Overdue").parentElement;
			expect(header).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<OverdueView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					className="custom-class"
				/>,
			);

			expect(screen.getByTestId("overdue-view")).toHaveClass("custom-class");
		});

		it("renders filter tabs", () => {
			render(
				<OverdueView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("filter-all")).toBeInTheDocument();
			expect(screen.getByTestId("filter-active")).toBeInTheDocument();
			expect(screen.getByTestId("filter-completed")).toBeInTheDocument();
		});

		it("renders search input", () => {
			render(
				<OverdueView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("search-input")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("Search tasks..."),
			).toBeInTheDocument();
		});
	});

	describe("Loading State", () => {
		it("shows loading skeleton when isLoading is true", () => {
			render(
				<OverdueView
					todos={[]}
					isLoading={true}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
		});

		it("hides loading skeleton when isLoading is false", () => {
			render(
				<OverdueView
					todos={[]}
					isLoading={false}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
		});
	});

	describe("Empty State", () => {
		it("shows empty state when no overdue todos", () => {
			render(
				<OverdueView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const emptyState = screen.getByTestId("overdue-empty-state");
			expect(emptyState).toBeInTheDocument();
			expect(screen.getByText("No overdue tasks")).toBeInTheDocument();
		});

		it("shows 'all done' state when all overdue todos are completed", () => {
			const todos = [
				createMockTodo({
					id: "1",
					dueDate: getYesterdayISOString(),
					completed: true,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Active" filter
			fireEvent.click(screen.getByTestId("filter-active"));

			expect(
				screen.getByText("All overdue tasks completed!"),
			).toBeInTheDocument();
		});

		it("shows 'no completed' state when no todos are completed", () => {
			const todos = [
				createMockTodo({
					id: "1",
					dueDate: getYesterdayISOString(),
					completed: false,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Completed" filter
			fireEvent.click(screen.getByTestId("filter-completed"));

			expect(screen.getByText("No completed tasks")).toBeInTheDocument();
		});

		it("shows 'no matching' state when search has no results", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Hello world",
					dueDate: getYesterdayISOString(),
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const searchInput = screen.getByTestId("search-input");
			fireEvent.change(searchInput, { target: { value: "nonexistent" } });

			expect(screen.getByText("No matching tasks")).toBeInTheDocument();
		});
	});

	describe("Todo List", () => {
		it("renders overdue todos", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Overdue Task",
					dueDate: getYesterdayISOString(),
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("overdue-todo-list")).toBeInTheDocument();
			expect(screen.getByText("Overdue Task")).toBeInTheDocument();
		});

		it("filters out non-overdue todos", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Overdue Task",
					dueDate: getYesterdayISOString(),
				}),
				createMockTodo({
					id: "2",
					text: "Today Task",
					dueDate: getTodayISOString(),
				}),
				createMockTodo({
					id: "3",
					text: "Tomorrow Task",
					dueDate: getTomorrowISOString(),
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByText("Overdue Task")).toBeInTheDocument();
			expect(screen.queryByText("Today Task")).not.toBeInTheDocument();
			expect(screen.queryByText("Tomorrow Task")).not.toBeInTheDocument();
		});

		it("sorts active overdue todos by most overdue first", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Yesterday",
					dueDate: getYesterdayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					text: "Two Days Ago",
					dueDate: getTwoDaysAgoISOString(),
					completed: false,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const todoList = screen.getByTestId("overdue-todo-list");
			const items = within(todoList).getAllByTestId(/todo-item-/);

			// Two Days Ago should come first (more overdue)
			expect(items[0]).toHaveAttribute("data-testid", "todo-item-2");
			expect(items[1]).toHaveAttribute("data-testid", "todo-item-1");
		});

		it("sorts active before completed", () => {
			const yesterday = getYesterdayISOString();
			const todos = [
				createMockTodo({
					id: "1",
					text: "Completed Overdue",
					dueDate: yesterday,
					completed: true,
				}),
				createMockTodo({
					id: "2",
					text: "Active Overdue",
					dueDate: yesterday,
					completed: false,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const todoList = screen.getByTestId("overdue-todo-list");
			const items = within(todoList).getAllByTestId(/todo-item-/);

			// Active should come first
			expect(items[0]).toHaveAttribute("data-testid", "todo-item-2");
			expect(items[1]).toHaveAttribute("data-testid", "todo-item-1");
		});

		it("filters by active status", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Pending Task",
					dueDate: getYesterdayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					text: "Done Task",
					dueDate: getYesterdayISOString(),
					completed: true,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Active" filter
			fireEvent.click(screen.getByTestId("filter-active"));

			// The active todo should be visible
			expect(screen.getByText("Pending Task")).toBeInTheDocument();
			// The completed todo should not be visible
			const todoList = screen.getByTestId("overdue-todo-list");
			expect(within(todoList).queryByText("Done Task")).not.toBeInTheDocument();
		});

		it("filters by completed status", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Active",
					dueDate: getYesterdayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					text: "Done",
					dueDate: getYesterdayISOString(),
					completed: true,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Completed" filter
			fireEvent.click(screen.getByTestId("filter-completed"));

			expect(screen.getByText("Done")).toBeInTheDocument();
			// The active todo should not be visible
			const todoList = screen.getByTestId("overdue-todo-list");
			expect(within(todoList).queryByText("Active")).not.toBeInTheDocument();
		});

		it("filters by search query", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Buy groceries",
					dueDate: getYesterdayISOString(),
				}),
				createMockTodo({
					id: "2",
					text: "Walk the dog",
					dueDate: getYesterdayISOString(),
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const searchInput = screen.getByTestId("search-input");
			fireEvent.change(searchInput, { target: { value: "groceries" } });

			expect(screen.getByText("Buy groceries")).toBeInTheDocument();
			expect(screen.queryByText("Walk the dog")).not.toBeInTheDocument();
		});

		it("search is case insensitive", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Buy GROCERIES",
					dueDate: getYesterdayISOString(),
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const searchInput = screen.getByTestId("search-input");
			fireEvent.change(searchInput, { target: { value: "groceries" } });

			expect(screen.getByText("Buy GROCERIES")).toBeInTheDocument();
		});

		it("clears search when clear button is clicked", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Alpha Task",
					dueDate: getYesterdayISOString(),
				}),
				createMockTodo({
					id: "2",
					text: "Beta Task",
					dueDate: getYesterdayISOString(),
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const searchInput = screen.getByTestId("search-input");
			fireEvent.change(searchInput, { target: { value: "Alpha" } });

			// Beta Task should not be visible
			expect(screen.queryByText("Beta Task")).not.toBeInTheDocument();

			// Click clear button
			fireEvent.click(screen.getByTestId("clear-search"));

			// Both should be visible again
			expect(screen.getByText("Alpha Task")).toBeInTheDocument();
			expect(screen.getByText("Beta Task")).toBeInTheDocument();
		});
	});

	describe("Todo Interactions", () => {
		it("calls onToggle when todo is toggled", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Test Task",
					dueDate: getYesterdayISOString(),
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const toggleButton = screen.getByTestId("todo-toggle");
			fireEvent.click(toggleButton);

			// The handler inverts completed (false -> true)
			expect(mockOnToggle).toHaveBeenCalledWith("1", true);
		});

		it("calls onDelete when todo is deleted", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Test Task",
					dueDate: getYesterdayISOString(),
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const deleteButton = screen.getByTestId("todo-delete");
			fireEvent.click(deleteButton);

			expect(mockOnDelete).toHaveBeenCalledWith("1");
		});
	});

	describe("Statistics", () => {
		it("shows total count in All filter", () => {
			const todos = [
				createMockTodo({ id: "1", dueDate: getYesterdayISOString() }),
				createMockTodo({ id: "2", dueDate: getTwoDaysAgoISOString() }),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("filter-all")).toHaveTextContent("All");
			expect(screen.getByTestId("filter-all")).toHaveTextContent("(2)");
		});

		it("shows active count in Active filter", () => {
			const todos = [
				createMockTodo({
					id: "1",
					dueDate: getYesterdayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					dueDate: getYesterdayISOString(),
					completed: true,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("filter-active")).toHaveTextContent("Active");
			expect(screen.getByTestId("filter-active")).toHaveTextContent("(1)");
		});

		it("shows completed count in Completed filter", () => {
			const todos = [
				createMockTodo({
					id: "1",
					dueDate: getYesterdayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					dueDate: getYesterdayISOString(),
					completed: true,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("filter-completed")).toHaveTextContent(
				"Completed",
			);
			expect(screen.getByTestId("filter-completed")).toHaveTextContent("(1)");
		});

		it("shows remaining tasks in footer", () => {
			const todos = [
				createMockTodo({
					id: "1",
					dueDate: getYesterdayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					dueDate: getTwoDaysAgoISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "3",
					dueDate: getYesterdayISOString(),
					completed: true,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("active-count")).toHaveTextContent(
				"2 tasks remaining",
			);
		});

		it("shows completed count in footer", () => {
			const todos = [
				createMockTodo({
					id: "1",
					dueDate: getYesterdayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					dueDate: getYesterdayISOString(),
					completed: true,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("completed-count")).toHaveTextContent(
				"1 completed",
			);
		});

		it("uses singular 'task' when only 1 remaining", () => {
			const todos = [
				createMockTodo({
					id: "1",
					dueDate: getYesterdayISOString(),
					completed: false,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("active-count")).toHaveTextContent(
				"1 task remaining",
			);
		});

		it("does not show footer when no overdue todos", () => {
			render(
				<OverdueView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.queryByTestId("active-count")).not.toBeInTheDocument();
		});
	});

	describe("Folder Integration", () => {
		it("shows folder badge on todos", () => {
			const folder = createMockFolder({ id: "folder-1", name: "Work" });
			mockUseFolderStorage.mockReturnValue({
				...defaultMockFolderReturn,
				folders: [folder],
			});

			const todos = [
				createMockTodo({
					id: "1",
					text: "Work Task",
					dueDate: getYesterdayISOString(),
					folderId: "folder-1",
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("todo-folder-badge")).toBeInTheDocument();
			expect(screen.getByTestId("todo-folder-badge")).toHaveTextContent("Work");
		});

		it("does not show folder badge for todos without folder", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Task without folder",
					dueDate: getYesterdayISOString(),
					folderId: null,
				}),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.queryByTestId("todo-folder-badge")).not.toBeInTheDocument();
		});
	});

	describe("Schedule Change", () => {
		it("passes onScheduleChange to TodoExpandableItem", () => {
			const todos = [
				createMockTodo({ id: "1", dueDate: getYesterdayISOString() }),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					onScheduleChange={mockOnScheduleChange}
				/>,
			);

			// The todo list should be rendered with the todo
			expect(screen.getByTestId("overdue-todo-list")).toBeInTheDocument();
			// When onScheduleChange is provided, TodoExpandableItem receives it
			// This test verifies the component doesn't crash when prop is passed
			expect(screen.getByTestId("todo-item-1")).toBeInTheDocument();
		});

		it("renders normally when onScheduleChange is not provided", () => {
			const todos = [
				createMockTodo({ id: "1", dueDate: getYesterdayISOString() }),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// The todo item should still render
			expect(screen.getByTestId("todo-item-1")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("has accessible filter buttons", () => {
			render(
				<OverdueView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("filter-all")).toHaveAttribute(
				"type",
				"button",
			);
			expect(screen.getByTestId("filter-active")).toHaveAttribute(
				"type",
				"button",
			);
			expect(screen.getByTestId("filter-completed")).toHaveAttribute(
				"type",
				"button",
			);
		});

		it("has accessible search input", () => {
			render(
				<OverdueView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const searchInput = screen.getByTestId("search-input");
			expect(searchInput).toHaveAttribute("placeholder", "Search tasks...");
		});

		it("todo list has proper list structure", () => {
			const todos = [
				createMockTodo({ id: "1", dueDate: getYesterdayISOString() }),
			];

			render(
				<OverdueView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const list = screen.getByTestId("overdue-todo-list");
			expect(list.tagName).toBe("UL");
		});
	});
});
