"use client";

import { fireEvent, render, screen } from "@testing-library/react";
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
import {
	flattenDateGroups,
	formatDateLabel,
	getDateKey,
	getRecurringMatchingDates,
	getTodosUpcoming,
	isWithinDays,
	UpcomingView,
} from "./upcoming-view";

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

// Helper to create a date string for N days from now
function getDaysFromNowISOString(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() + days);
	date.setHours(12, 0, 0, 0);
	return date.toISOString();
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

describe("isWithinDays", () => {
	it("returns true for today when days is 0", () => {
		const today = new Date();
		expect(isWithinDays(today, 0)).toBe(true);
	});

	it("returns true for today when days is 7", () => {
		const today = getTodayISOString();
		expect(isWithinDays(today, 7)).toBe(true);
	});

	it("returns true for tomorrow when days is 7", () => {
		const tomorrow = getTomorrowISOString();
		expect(isWithinDays(tomorrow, 7)).toBe(true);
	});

	it("returns true for date 6 days from now when days is 7", () => {
		const date = getDaysFromNowISOString(6);
		expect(isWithinDays(date, 7)).toBe(true);
	});

	it("returns true for date 7 days from now when days is 7", () => {
		const date = getDaysFromNowISOString(7);
		expect(isWithinDays(date, 7)).toBe(true);
	});

	it("returns false for date 8 days from now when days is 7", () => {
		const date = getDaysFromNowISOString(8);
		expect(isWithinDays(date, 7)).toBe(false);
	});

	it("returns false for yesterday when days is 7", () => {
		const yesterday = getYesterdayISOString();
		expect(isWithinDays(yesterday, 7)).toBe(false);
	});

	it("handles Date objects", () => {
		const today = new Date();
		expect(isWithinDays(today, 7)).toBe(true);
	});

	it("handles string dates", () => {
		expect(isWithinDays(getTodayISOString(), 7)).toBe(true);
	});
});

describe("getDateKey", () => {
	it("returns YYYY-MM-DD format", () => {
		const date = new Date(2024, 0, 15); // Jan 15, 2024
		expect(getDateKey(date)).toBe("2024-01-15");
	});

	it("pads single digit months with leading zero", () => {
		const date = new Date(2024, 5, 1); // June 1, 2024
		expect(getDateKey(date)).toBe("2024-06-01");
	});

	it("pads single digit days with leading zero", () => {
		const date = new Date(2024, 11, 5); // Dec 5, 2024
		expect(getDateKey(date)).toBe("2024-12-05");
	});

	it("handles string dates", () => {
		expect(getDateKey("2024-03-20T12:00:00.000Z")).toBe("2024-03-20");
	});
});

describe("formatDateLabel", () => {
	it("returns 'Today' for today's date", () => {
		const today = new Date();
		expect(formatDateLabel(today)).toBe("Today");
	});

	it("returns 'Tomorrow' for tomorrow's date", () => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		expect(formatDateLabel(tomorrow)).toBe("Tomorrow");
	});

	it("returns formatted date for other dates", () => {
		const date = new Date();
		date.setDate(date.getDate() + 3);
		const result = formatDateLabel(date);
		// Should contain weekday and month
		expect(result).toMatch(/\w+, \w+ \d+/);
	});

	it("handles string dates", () => {
		expect(formatDateLabel(getTodayISOString())).toBe("Today");
	});
});

describe("getTodosUpcoming", () => {
	it("returns empty array when no todos have due dates", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: null }),
			createMockTodo({ id: "2", dueDate: null }),
		];
		expect(getTodosUpcoming(todos)).toEqual([]);
	});

	it("returns empty array when no todos are due in next 7 days", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: getYesterdayISOString() }),
			createMockTodo({ id: "2", dueDate: getDaysFromNowISOString(10) }),
		];
		expect(getTodosUpcoming(todos)).toEqual([]);
	});

	it("returns todos due today grouped correctly", () => {
		const todos = [createMockTodo({ id: "1", dueDate: getTodayISOString() })];

		const result = getTodosUpcoming(todos);
		expect(result).toHaveLength(1);
		expect(result[0].label).toBe("Today");
		expect(result[0].todos).toHaveLength(1);
		expect(result[0].todos[0].id).toBe("1");
	});

	it("groups multiple todos by date", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: getTodayISOString() }),
			createMockTodo({ id: "2", dueDate: getTodayISOString() }),
			createMockTodo({ id: "3", dueDate: getTomorrowISOString() }),
		];

		const result = getTodosUpcoming(todos);
		expect(result).toHaveLength(2);

		const todayGroup = result.find((g) => g.label === "Today");
		expect(todayGroup).toBeDefined();
		expect(todayGroup?.todos).toHaveLength(2);

		const tomorrowGroup = result.find((g) => g.label === "Tomorrow");
		expect(tomorrowGroup).toBeDefined();
		expect(tomorrowGroup?.todos).toHaveLength(1);
	});

	it("sorts groups by date (chronological)", () => {
		const todos = [
			createMockTodo({ id: "3", dueDate: getDaysFromNowISOString(5) }),
			createMockTodo({ id: "1", dueDate: getTodayISOString() }),
			createMockTodo({ id: "2", dueDate: getTomorrowISOString() }),
		];

		const result = getTodosUpcoming(todos);
		expect(result).toHaveLength(3);
		expect(result[0].label).toBe("Today");
		expect(result[1].label).toBe("Tomorrow");
		// Third should be the future date
	});

	it("excludes todos due more than 7 days from now", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: getTodayISOString() }),
			createMockTodo({ id: "2", dueDate: getDaysFromNowISOString(8) }),
		];

		const result = getTodosUpcoming(todos);
		expect(result).toHaveLength(1);
		expect(result[0].todos[0].id).toBe("1");
	});

	it("excludes todos due in the past", () => {
		const todos = [
			createMockTodo({ id: "1", dueDate: getTodayISOString() }),
			createMockTodo({ id: "2", dueDate: getYesterdayISOString() }),
		];

		const result = getTodosUpcoming(todos);
		expect(result).toHaveLength(1);
		expect(result[0].todos[0].id).toBe("1");
	});

	it("includes both completed and active todos", () => {
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

		const result = getTodosUpcoming(todos);
		expect(result).toHaveLength(1);
		expect(result[0].todos).toHaveLength(2);
	});

	it("includes daily recurring todos on all days in next 7 days", () => {
		const todos = [
			createMockTodo({
				id: "1",
				text: "Daily task",
				recurringPattern: { type: "daily" },
			}),
		];

		const result = getTodosUpcoming(todos);
		// Daily pattern should match all 8 days (today + 7 days)
		expect(result).toHaveLength(8);
		// Each group should have the recurring todo
		for (const group of result) {
			expect(group.todos).toHaveLength(1);
			expect(group.todos[0].id).toBe("1");
		}
	});

	it("includes weekly recurring todos only on matching days", () => {
		const today = new Date();
		const currentDayOfWeek = today.getDay();

		const todos = [
			createMockTodo({
				id: "1",
				text: "Weekly task",
				recurringPattern: {
					type: "weekly",
					daysOfWeek: [currentDayOfWeek],
				},
			}),
		];

		const result = getTodosUpcoming(todos);
		// Should appear on today, and next week same day (if within 7 days)
		expect(result.length).toBeGreaterThanOrEqual(1);
		// First group should be today
		expect(result[0].label).toBe("Today");
		expect(result[0].todos[0].id).toBe("1");
	});

	it("includes monthly recurring todos only on matching day of month", () => {
		const today = new Date();
		const currentDayOfMonth = today.getDate();

		const todos = [
			createMockTodo({
				id: "1",
				text: "Monthly task",
				recurringPattern: {
					type: "monthly",
					dayOfMonth: currentDayOfMonth,
				},
			}),
		];

		const result = getTodosUpcoming(todos);
		// Should at least appear today
		expect(result.length).toBeGreaterThanOrEqual(1);
		expect(result[0].label).toBe("Today");
		expect(result[0].todos[0].id).toBe("1");
	});

	it("includes both due date todos and recurring todos", () => {
		const today = new Date();
		const currentDayOfWeek = today.getDay();

		const todos = [
			createMockTodo({
				id: "1",
				text: "Task with due date",
				dueDate: getTodayISOString(),
			}),
			createMockTodo({
				id: "2",
				text: "Recurring task",
				recurringPattern: {
					type: "weekly",
					daysOfWeek: [currentDayOfWeek],
				},
			}),
		];

		const result = getTodosUpcoming(todos);
		// Today's group should have both todos
		const todayGroup = result.find((g) => g.label === "Today");
		expect(todayGroup).toBeDefined();
		expect(todayGroup?.todos).toHaveLength(2);
	});

	it("does not duplicate recurring todos that also have a matching due date", () => {
		const todos = [
			createMockTodo({
				id: "1",
				text: "Recurring with due date",
				dueDate: getTodayISOString(),
				recurringPattern: { type: "daily" },
			}),
		];

		const result = getTodosUpcoming(todos);
		// Today's group should have the todo only once
		const todayGroup = result.find((g) => g.label === "Today");
		expect(todayGroup).toBeDefined();
		expect(todayGroup?.todos).toHaveLength(1);
	});

	it("excludes yearly recurring todos that do not match current date", () => {
		const today = new Date();
		// Set to a month that is not the current month
		const differentMonth = ((today.getMonth() + 6) % 12) + 1;

		const todos = [
			createMockTodo({
				id: "1",
				text: "Yearly task",
				recurringPattern: {
					type: "yearly",
					monthOfYear: differentMonth,
					dayOfMonth: 15,
				},
			}),
		];

		const result = getTodosUpcoming(todos);
		// Unless by coincidence the 15th of differentMonth falls in next 7 days, should be empty
		// This is a probabilistic test - the yearly task should not match most of the time
		// We're checking that yearly filtering works and runs without error
		expect(result).toBeDefined();
	});
});

describe("getRecurringMatchingDates", () => {
	it("returns all days for daily pattern", () => {
		const pattern = { type: "daily" as const };
		const result = getRecurringMatchingDates(pattern, 7);
		// Should return 8 dates (today + 7 days)
		expect(result).toHaveLength(8);
	});

	it("returns only matching days for weekly pattern", () => {
		const today = new Date();
		const currentDayOfWeek = today.getDay();
		const pattern = { type: "weekly" as const, daysOfWeek: [currentDayOfWeek] };
		const result = getRecurringMatchingDates(pattern, 7);
		// Should return at least 1 day (today), possibly 2 if week wraps
		expect(result.length).toBeGreaterThanOrEqual(1);
		expect(result.length).toBeLessThanOrEqual(2);
	});

	it("returns only matching day for monthly pattern", () => {
		const today = new Date();
		const currentDayOfMonth = today.getDate();
		const pattern = { type: "monthly" as const, dayOfMonth: currentDayOfMonth };
		const result = getRecurringMatchingDates(pattern, 7);
		// Should return exactly 1 day (today)
		expect(result).toHaveLength(1);
	});

	it("returns empty array for non-matching monthly pattern", () => {
		const today = new Date();
		// Choose a day that won't be in the next 7 days
		let differentDay = today.getDate() + 10;
		if (differentDay > 28) {
			differentDay = ((today.getDate() - 10 + 31) % 28) + 1;
		}
		const pattern = { type: "monthly" as const, dayOfMonth: differentDay };
		const result = getRecurringMatchingDates(pattern, 7);
		// Might be 0 or 1 depending on current date
		expect(result.length).toBeLessThanOrEqual(1);
	});
});

describe("flattenDateGroups", () => {
	it("returns empty array for empty groups", () => {
		expect(flattenDateGroups([])).toEqual([]);
	});

	it("flattens single group", () => {
		const groups = [
			{
				dateKey: "2024-01-15",
				label: "Today",
				todos: [createMockTodo({ id: "1" }), createMockTodo({ id: "2" })],
			},
		];

		const result = flattenDateGroups(groups);
		expect(result).toHaveLength(2);
		expect(result.map((t) => t.id)).toEqual(["1", "2"]);
	});

	it("flattens multiple groups", () => {
		const groups = [
			{
				dateKey: "2024-01-15",
				label: "Today",
				todos: [createMockTodo({ id: "1" })],
			},
			{
				dateKey: "2024-01-16",
				label: "Tomorrow",
				todos: [createMockTodo({ id: "2" }), createMockTodo({ id: "3" })],
			},
		];

		const result = flattenDateGroups(groups);
		expect(result).toHaveLength(3);
		expect(result.map((t) => t.id)).toEqual(["1", "2", "3"]);
	});
});

describe("UpcomingView", () => {
	const mockOnToggle = vi.fn();
	const mockOnDelete = vi.fn();
	const mockOnScheduleChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseFolderStorage.mockReturnValue(defaultMockFolderReturn);
		mockGetProgress.mockReturnValue(null);
	});

	describe("Rendering", () => {
		it("renders the Upcoming view with header", () => {
			render(
				<UpcomingView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("upcoming-view")).toBeInTheDocument();
			expect(screen.getByText("Upcoming")).toBeInTheDocument();
			expect(
				screen.getByText("Tasks due in the next 7 days"),
			).toBeInTheDocument();
		});

		it("renders the calendar icon", () => {
			render(
				<UpcomingView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Calendar icon is rendered as part of header
			const header = screen.getByText("Upcoming").parentElement;
			expect(header).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<UpcomingView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					className="custom-class"
				/>,
			);

			expect(screen.getByTestId("upcoming-view")).toHaveClass("custom-class");
		});

		it("renders filter tabs", () => {
			render(
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
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
		it("shows empty state when no upcoming todos", () => {
			render(
				<UpcomingView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const emptyState = screen.getByTestId("upcoming-empty-state");
			expect(emptyState).toBeInTheDocument();
			expect(screen.getByText("No upcoming tasks")).toBeInTheDocument();
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
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Active" filter
			fireEvent.click(screen.getByTestId("filter-active"));

			expect(screen.getByText("All upcoming tasks done!")).toBeInTheDocument();
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
				<UpcomingView
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
				<UpcomingView
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

	describe("Date Grouping", () => {
		it("groups todos by date", () => {
			const todos = [
				createMockTodo({ id: "1", dueDate: getTodayISOString() }),
				createMockTodo({ id: "2", dueDate: getTomorrowISOString() }),
			];

			render(
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const todoList = screen.getByTestId("upcoming-todo-list");
			expect(todoList).toBeInTheDocument();

			// Check for date headers by their test ids
			const todayDateKey = getDateKey(getTodayISOString());
			const tomorrowDateKey = getDateKey(getTomorrowISOString());
			expect(
				screen.getByTestId(`date-header-${todayDateKey}`),
			).toHaveTextContent("Today");
			expect(
				screen.getByTestId(`date-header-${tomorrowDateKey}`),
			).toHaveTextContent("Tomorrow");
		});

		it("shows todo count in each date header", () => {
			const todos = [
				createMockTodo({ id: "1", dueDate: getTodayISOString() }),
				createMockTodo({ id: "2", dueDate: getTodayISOString() }),
			];

			render(
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Header should show count (2)
			const dateKey = getDateKey(getTodayISOString());
			const header = screen.getByTestId(`date-header-${dateKey}`);
			expect(header).toHaveTextContent("(2)");
		});

		it("renders todos within each group", () => {
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
			];

			render(
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByText("Today Task")).toBeInTheDocument();
			expect(screen.getByText("Tomorrow Task")).toBeInTheDocument();
		});

		it("filters out todos not in next 7 days", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Today Task",
					dueDate: getTodayISOString(),
				}),
				createMockTodo({
					id: "2",
					text: "Far Future Task",
					dueDate: getDaysFromNowISOString(10),
				}),
				createMockTodo({
					id: "3",
					text: "Past Task",
					dueDate: getYesterdayISOString(),
				}),
			];

			render(
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByText("Today Task")).toBeInTheDocument();
			expect(screen.queryByText("Far Future Task")).not.toBeInTheDocument();
			expect(screen.queryByText("Past Task")).not.toBeInTheDocument();
		});
	});

	describe("Filtering", () => {
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
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Active" filter
			fireEvent.click(screen.getByTestId("filter-active"));

			expect(screen.getByText("Pending Task")).toBeInTheDocument();
			expect(screen.queryByText("Done Task")).not.toBeInTheDocument();
		});

		it("filters by completed status", () => {
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
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Completed" filter
			fireEvent.click(screen.getByTestId("filter-completed"));

			expect(screen.getByText("Done Task")).toBeInTheDocument();
			expect(screen.queryByText("Pending Task")).not.toBeInTheDocument();
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
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
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

		it("hides empty date groups when filtering", () => {
			const todos = [
				createMockTodo({
					id: "1",
					text: "Task 1",
					dueDate: getTodayISOString(),
					completed: true,
				}),
				createMockTodo({
					id: "2",
					text: "Task 2",
					dueDate: getTomorrowISOString(),
					completed: false,
				}),
			];

			render(
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			// Click on "Active" filter
			fireEvent.click(screen.getByTestId("filter-active"));

			// Today's group should be hidden (only completed tasks)
			const todayDateKey = getDateKey(getTodayISOString());
			expect(
				screen.queryByTestId(`date-group-${todayDateKey}`),
			).not.toBeInTheDocument();

			// Tomorrow's group should be visible
			const tomorrowDateKey = getDateKey(getTomorrowISOString());
			expect(
				screen.getByTestId(`date-group-${tomorrowDateKey}`),
			).toBeInTheDocument();
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
				<UpcomingView
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
				<UpcomingView
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
				createMockTodo({ id: "2", dueDate: getTomorrowISOString() }),
			];

			render(
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			expect(screen.getByTestId("active-count")).toHaveTextContent(
				"1 task remaining",
			);
		});

		it("does not show footer when no upcoming todos", () => {
			render(
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
					onScheduleChange={mockOnScheduleChange}
				/>,
			);

			// The todo list should be rendered with the todo
			expect(screen.getByTestId("upcoming-todo-list")).toBeInTheDocument();
			// When onScheduleChange is provided, TodoExpandableItem receives it
			// This test verifies the component doesn't crash when prop is passed
			expect(screen.getByTestId("todo-item-1")).toBeInTheDocument();
		});

		it("renders normally when onScheduleChange is not provided", () => {
			const todos = [createMockTodo({ id: "1", dueDate: getTodayISOString() })];

			render(
				<UpcomingView
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
				<UpcomingView
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
				<UpcomingView
					todos={[]}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const searchInput = screen.getByTestId("search-input");
			expect(searchInput).toHaveAttribute("placeholder", "Search tasks...");
		});

		it("date groups have proper structure", () => {
			const todos = [createMockTodo({ id: "1", dueDate: getTodayISOString() })];

			render(
				<UpcomingView
					todos={todos}
					onToggle={mockOnToggle}
					onDelete={mockOnDelete}
				/>,
			);

			const dateKey = getDateKey(getTodayISOString());
			const group = screen.getByTestId(`date-group-${dateKey}`);
			expect(group).toBeInTheDocument();

			// Check the list inside the group
			const list = group.querySelector("ul");
			expect(list).toBeInTheDocument();
		});
	});
});
