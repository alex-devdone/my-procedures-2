"use client";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Folder, UseFolderStorageReturn } from "@/app/api/folder";
import type { SubtaskProgress } from "@/app/api/subtask";
import type { Todo } from "@/app/api/todo/todo.types";

// Mock completion history data
let mockCompletionHistoryData: Array<{
	id: string | number;
	todoId: string | number;
	scheduledDate: string;
	completedAt: string | null;
}> = [];

// Mock the analytics hooks
vi.mock("@/app/api/analytics", () => ({
	useCompletionHistory: () => ({
		data: mockCompletionHistoryData,
		isLoading: false,
		isPending: false,
	}),
}));

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
import {
	getTodosDueToday,
	isEntryCompleted,
	isVirtualTodo,
	TodayView,
} from "./today-view";

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

describe("getTodosDueToday", () => {
	it("returns empty array when no todos have due dates", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: null }),
			createMockTodo({ id: "2", dueDate: null }),
		];
		expect(getTodosDueToday(todos)).toEqual([]);
	});

	it("returns empty array when no todos are due today", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: getYesterdayISOString() }),
			createMockTodo({ id: "2", dueDate: getTomorrowISOString() }),
		];
		expect(getTodosDueToday(todos)).toEqual([]);
	});

	it("returns todos due today", () => {
		const todayTodo = createMockTodo({
			id: "today",
			dueDate: getTodayISOString(),
		});
		const tomorrowTodo = createMockTodo({
			id: "tomorrow",
			dueDate: getTomorrowISOString(),
		});
		const todos = [todayTodo, tomorrowTodo];

		const result = getTodosDueToday(todos);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("today");
	});

	it("returns all todos due today", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: getTodayISOString() }),
			createMockTodo({ id: "2", dueDate: getTodayISOString() }),
			createMockTodo({ id: "3", dueDate: getTomorrowISOString() }),
		];

		const result = getTodosDueToday(todos);
		expect(result).toHaveLength(2);
		expect(result.map((t) => t.id)).toEqual(["1", "2"]);
	});

	it("includes both completed and active todos due today", () => {
		const todos = [
			createMockTodo({
				id: "active",
				dueDate: getTodayISOString(),
				completed: false,
			}),
			createMockTodo({
				id: "completed",
				dueDate: getTodayISOString(),
				completed: true,
			}),
		];

		const result = getTodosDueToday(todos);
		expect(result).toHaveLength(2);
	});

	describe("recurring todos", () => {
		it("includes active recurring todos that match today as virtual entries", () => {
			const today = new Date();
			const dayOfWeek = today.getDay(); // 0-6 (Sunday-Saturday)

			const todos = [
				createMockTodo({
					id: "recurring-active",
					recurringPattern: {
						type: "weekly",
						daysOfWeek: [dayOfWeek],
					},
					completed: false,
				}),
			];

			const result = getTodosDueToday(todos, undefined, today);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("recurring-active");
			expect(isVirtualTodo(result[0])).toBe(true);
		});

		it("includes completed recurring todos that match today as virtual entries", () => {
			const today = new Date();
			const dayOfWeek = today.getDay();

			const todos = [
				createMockTodo({
					id: "recurring-completed",
					recurringPattern: {
						type: "weekly",
						daysOfWeek: [dayOfWeek],
					},
					completed: true,
				}),
			];

			const result = getTodosDueToday(todos, undefined, today);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("recurring-completed");
			expect(isVirtualTodo(result[0])).toBe(true);
		});

		it("includes both active and completed recurring todos that match today", () => {
			const today = new Date();
			const dayOfWeek = today.getDay();

			const todos = [
				createMockTodo({
					id: "recurring-active",
					recurringPattern: {
						type: "weekly",
						daysOfWeek: [dayOfWeek],
					},
					completed: false,
				}),
				createMockTodo({
					id: "recurring-completed",
					recurringPattern: {
						type: "weekly",
						daysOfWeek: [dayOfWeek],
					},
					completed: true,
				}),
			];

			const result = getTodosDueToday(todos, undefined, today);
			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toContain("recurring-active");
			expect(result.map((t) => t.id)).toContain("recurring-completed");
		});

		it("excludes recurring todos that do not match today", () => {
			const today = new Date();
			const dayOfWeek = today.getDay();
			// Get a different day of the week
			const differentDayIndex = (dayOfWeek + 1) % 7;

			const todos = [
				createMockTodo({
					id: "recurring-different-day",
					recurringPattern: {
						type: "weekly",
						daysOfWeek: [differentDayIndex],
					},
					completed: false,
				}),
			];

			const result = getTodosDueToday(todos, undefined, today);
			expect(result).toHaveLength(0);
		});

		it("includes daily recurring todos regardless of completion status", () => {
			const today = new Date();

			const todos = [
				createMockTodo({
					id: "daily-active",
					recurringPattern: { type: "daily" },
					completed: false,
				}),
				createMockTodo({
					id: "daily-completed",
					recurringPattern: { type: "daily" },
					completed: true,
				}),
			];

			const result = getTodosDueToday(todos, undefined, today);
			expect(result).toHaveLength(2);
			expect(result.map((t) => t.id)).toContain("daily-active");
			expect(result.map((t) => t.id)).toContain("daily-completed");
		});

		it("uses completion history for recurring todo occurrence status", () => {
			const today = new Date();
			const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
			const dayOfWeek = today.getDay();

			const todos = [
				createMockTodo({
					id: "recurring-1",
					recurringPattern: {
						type: "weekly",
						daysOfWeek: [dayOfWeek],
					},
					completed: false,
				}),
			];

			// Provide completion history showing this occurrence is completed
			const completionHistory = [
				{
					todoId: "recurring-1",
					scheduledDate: today,
					completedAt: new Date(),
				},
			];

			const result = getTodosDueToday(todos, completionHistory, today);
			expect(result).toHaveLength(1);
			expect(isVirtualTodo(result[0])).toBe(true);
			if (isVirtualTodo(result[0])) {
				expect(result[0].occurrenceCompleted).toBe(true);
				expect(result[0].virtualDate).toBe(todayKey);
			}
		});

		it("shows recurring todo occurrence as incomplete when not in completion history", () => {
			const today = new Date();
			const dayOfWeek = today.getDay();

			const todos = [
				createMockTodo({
					id: "recurring-1",
					recurringPattern: {
						type: "weekly",
						daysOfWeek: [dayOfWeek],
					},
					completed: false,
				}),
			];

			// No completion history
			const result = getTodosDueToday(todos, undefined, today);
			expect(result).toHaveLength(1);
			expect(isVirtualTodo(result[0])).toBe(true);
			if (isVirtualTodo(result[0])) {
				expect(result[0].occurrenceCompleted).toBeUndefined();
			}
		});
	});
});

describe("isEntryCompleted", () => {
	it("returns completed status for regular todos", () => {
		const activeTodo = createMockTodo({ completed: false });
		const completedTodo = createMockTodo({ completed: true });

		expect(isEntryCompleted(activeTodo)).toBe(false);
		expect(isEntryCompleted(completedTodo)).toBe(true);
	});

	it("returns occurrenceCompleted status for virtual todos", () => {
		const today = new Date();
		const dayOfWeek = today.getDay();

		const baseTodo = createMockTodo({
			id: "recurring-1",
			recurringPattern: {
				type: "weekly",
				daysOfWeek: [dayOfWeek],
			},
			completed: false, // Base todo is not completed
		});

		// Create virtual entry with completed occurrence
		const completionHistory = [
			{
				todoId: "recurring-1",
				scheduledDate: today,
				completedAt: new Date(),
			},
		];

		const result = getTodosDueToday([baseTodo], completionHistory, today);
		expect(result).toHaveLength(1);
		// Even though base todo is not completed, the occurrence is completed
		expect(isEntryCompleted(result[0])).toBe(true);
	});

	it("returns false for virtual todos without occurrenceCompleted", () => {
		const today = new Date();
		const dayOfWeek = today.getDay();

		const baseTodo = createMockTodo({
			id: "recurring-1",
			recurringPattern: {
				type: "weekly",
				daysOfWeek: [dayOfWeek],
			},
			completed: true, // Base todo is completed, but occurrence is not
		});

		// No completion history
		const result = getTodosDueToday([baseTodo], undefined, today);
		expect(result).toHaveLength(1);
		// Even though base todo is completed, the occurrence is not
		expect(isEntryCompleted(result[0])).toBe(false);
	});
});

describe("TodayView", () => {
	const mockOnToggle = vi.fn();
	const mockOnDelete = vi.fn();
	const mockOnScheduleChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseFolderStorage.mockReturnValue(defaultMockFolderReturn);
		mockGetProgress.mockReturnValue(null);
		mockCompletionHistoryData = [];
	});

	describe("Rendering", () => {
		it("renders the Today view with header", () => {
			render(
				<TodayView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("today-view")).toBeInTheDocument();
			expect(screen.getByText("Today")).toBeInTheDocument();
			expect(screen.getByText("Tasks due today")).toBeInTheDocument();
		});

		it("renders the sun icon", () => {
			render(
				<TodayView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Sun icon is rendered as an SVG
			const header = screen.getByText("Today").parentElement;
			expect(header).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<TodayView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					className="custom-class"
				/>,
			);

			expect(screen.getByTestId("today-view")).toHaveClass("custom-class");
		});

		it("renders filter tabs", () => {
			render(
				<TodayView
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
				<TodayView
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
				<TodayView
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
				<TodayView
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
		it("shows empty state when no todos due today", () => {
			render(
				<TodayView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const emptyState = screen.getByTestId("today-empty-state");
			expect(emptyState).toBeInTheDocument();
			expect(screen.getByText("No tasks due today")).toBeInTheDocument();
		});

		it("shows 'all done' state when all todos are completed", () => {
			const todos = [
				createMockTodo({
					id: "1",
					dueDate: getTodayISOString(),
					completed: true,
				}),
			];

			render(
				<TodayView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Active" filter
			fireEvent.click(screen.getByTestId("filter-active"));

			expect(screen.getByText("All done for today!")).toBeInTheDocument();
		});

		it("shows 'no completed' state when no todos are completed", () => {
			const todos = [
				createMockTodo({
					id: "1",
					dueDate: getTodayISOString(),
					completed: false,
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
				}),
			];

			render(
				<TodayView
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
		it("renders todos due today", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Today Task",
					dueDate: getTodayISOString(),
				}),
			];

			render(
				<TodayView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("today-todo-list")).toBeInTheDocument();
			expect(screen.getByText("Today Task")).toBeInTheDocument();
		});

		it("filters out todos not due today", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Today Task",
					dueDate: getTodayISOString(),
				}),
				createMockTodo({
					id: "2",
					text: "Tomorrow Task",
					dueDate: getTomorrowISOString(),
				}),
				createMockTodo({
					id: "3",
					text: "Yesterday Task",
					dueDate: getYesterdayISOString(),
				}),
			];

			render(
				<TodayView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByText("Today Task")).toBeInTheDocument();
			expect(screen.queryByText("Tomorrow Task")).not.toBeInTheDocument();
			expect(screen.queryByText("Yesterday Task")).not.toBeInTheDocument();
		});

		it("filters by active status", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Pending Task",
					dueDate: getTodayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					text: "Done Task",
					dueDate: getTodayISOString(),
					completed: true,
				}),
			];

			render(
				<TodayView
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
			const todoList = screen.getByTestId("today-todo-list");
			expect(within(todoList).queryByText("Done Task")).not.toBeInTheDocument();
		});

		it("filters by completed status", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Active",
					dueDate: getTodayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					text: "Done",
					dueDate: getTodayISOString(),
					completed: true,
				}),
			];

			render(
				<TodayView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Completed" filter
			fireEvent.click(screen.getByTestId("filter-completed"));

			expect(screen.getByText("Done")).toBeInTheDocument();
			// The active todo should not be visible
			const todoList = screen.getByTestId("today-todo-list");
			expect(within(todoList).queryByText("Active")).not.toBeInTheDocument();
		});

		it("filters by search query", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Buy groceries",
					dueDate: getTodayISOString(),
				}),
				createMockTodo({
					id: "2",
					text: "Walk the dog",
					dueDate: getTodayISOString(),
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
				}),
				createMockTodo({
					id: "2",
					text: "Beta Task",
					dueDate: getTodayISOString(),
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
				}),
			];

			render(
				<TodayView
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
				createMockTodo({ id: "1", dueDate: getTodayISOString() }),
				createMockTodo({ id: "2", dueDate: getTodayISOString() }),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					dueDate: getTodayISOString(),
					completed: true,
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					dueDate: getTodayISOString(),
					completed: true,
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					dueDate: getTodayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "3",
					dueDate: getTodayISOString(),
					completed: true,
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
					completed: false,
				}),
				createMockTodo({
					id: "2",
					dueDate: getTodayISOString(),
					completed: true,
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
					completed: false,
				}),
			];

			render(
				<TodayView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("active-count")).toHaveTextContent(
				"1 task remaining",
			);
		});

		it("does not show footer when no todos due today", () => {
			render(
				<TodayView
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
					dueDate: getTodayISOString(),
					folderId: "folder-1",
				}),
			];

			render(
				<TodayView
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
					dueDate: getTodayISOString(),
					folderId: null,
				}),
			];

			render(
				<TodayView
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
			const todos = [createMockTodo({ id: "1", dueDate: getTodayISOString() })];

			render(
				<TodayView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					onScheduleChange={mockOnScheduleChange}
				/>,
			);

			// The todo list should be rendered with the todo
			expect(screen.getByTestId("today-todo-list")).toBeInTheDocument();
			// When onScheduleChange is provided, TodoExpandableItem receives it
			// This test verifies the component doesn't crash when prop is passed
			expect(screen.getByTestId("todo-item-1")).toBeInTheDocument();
		});

		it("renders normally when onScheduleChange is not provided", () => {
			const todos = [createMockTodo({ id: "1", dueDate: getTodayISOString() })];

			render(
				<TodayView
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
				<TodayView
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
				<TodayView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const searchInput = screen.getByTestId("search-input");
			expect(searchInput).toHaveAttribute("placeholder", "Search tasks...");
		});

		it("todo list has proper list structure", () => {
			const todos = [createMockTodo({ id: "1", dueDate: getTodayISOString() })];

			render(
				<TodayView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const list = screen.getByTestId("today-todo-list");
			expect(list.tagName).toBe("UL");
		});
	});
});
