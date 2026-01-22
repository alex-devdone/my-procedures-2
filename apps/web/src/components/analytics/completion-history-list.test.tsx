import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	CompletionHistoryRecord,
	RecurringOccurrenceWithStatus,
} from "@/app/api/analytics/analytics.types";
import { CompletionHistoryList } from "./completion-history-list";

// Create a mock mutate function we can track
const mockMutate = vi.fn();

// Mock the analytics hooks
vi.mock("@/app/api/analytics", () => ({
	useUpdatePastCompletion: () => ({
		mutate: mockMutate,
		isPending: false,
	}),
}));

// Mock Date.prototype.toLocaleTimeString and Date.prototype.toLocaleDateString
const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
const originalToLocaleDateString = Date.prototype.toLocaleDateString;

beforeEach(() => {
	mockMutate.mockClear();

	Date.prototype.toLocaleTimeString = vi.fn(function (this: Date) {
		const hour = this.getHours();
		const minute = this.getMinutes();
		const ampm = hour >= 12 ? "PM" : "AM";
		const displayHour = hour % 12 || 12;
		const displayMinute = minute.toString().padStart(2, "0");
		return `${displayHour}:${displayMinute} ${ampm}`;
		// biome-ignore lint/suspicious/noExplicitAny: Intentionally mocking prototype method
	}) as any;

	Date.prototype.toLocaleDateString = vi.fn(function (this: Date) {
		const months = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		];
		return `${months[this.getMonth()]} ${this.getDate()}, ${this.getFullYear()}`;
		// biome-ignore lint/suspicious/noExplicitAny: Intentionally mocking prototype method
	}) as any;
});

afterEach(() => {
	Date.prototype.toLocaleTimeString = originalToLocaleTimeString;
	Date.prototype.toLocaleDateString = originalToLocaleDateString;
});

const mockHistory: CompletionHistoryRecord[] = [
	{
		id: 1,
		todoId: 101,
		scheduledDate: new Date("2024-01-15T09:00:00Z"),
		completedAt: new Date("2024-01-15T10:30:00Z"),
		createdAt: new Date("2024-01-14T08:00:00Z"),
		todoText: "Morning meditation",
	},
	{
		id: 2,
		todoId: 102,
		scheduledDate: new Date("2024-01-15T09:00:00Z"),
		completedAt: null,
		createdAt: new Date("2024-01-14T08:00:00Z"),
		todoText: "Evening exercise",
	},
	{
		id: 3,
		todoId: 103,
		scheduledDate: new Date("2024-01-16T09:00:00Z"),
		completedAt: new Date("2024-01-16T08:45:00Z"),
		createdAt: new Date("2024-01-15T08:00:00Z"),
		todoText: "Daily reading",
	},
];

describe("CompletionHistoryList", () => {
	it("renders the card title", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		expect(screen.getByText("Completion History")).toBeInTheDocument();
	});

	it("renders header row on larger screens", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		expect(screen.getByText("Todo")).toBeInTheDocument();
		expect(screen.getByText("Scheduled")).toBeInTheDocument();
		expect(screen.getByText("Status")).toBeInTheDocument();
		expect(screen.getByText("Action")).toBeInTheDocument();
	});

	it("renders all completion rows", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		const rows = screen.getAllByTestId("completion-row");
		expect(rows).toHaveLength(3);
	});

	it("renders completed status with timestamp", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		// The first item shows completion time (the exact time varies by timezone)
		const times = screen.getAllByText(/\d{1,2}:\d{2} [AP]M/);
		expect(times.length).toBeGreaterThan(0);
	});

	it("renders missed status", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		expect(screen.getByText("Missed")).toBeInTheDocument();
	});

	it("renders todo text", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		expect(screen.getByText("Morning meditation")).toBeInTheDocument();
		expect(screen.getByText("Evening exercise")).toBeInTheDocument();
		expect(screen.getByText("Daily reading")).toBeInTheDocument();
	});

	it("renders scheduled dates", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		// Should show date formatted like "Jan 15, 2024"
		const dates = screen.getAllByText(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
		expect(dates.length).toBeGreaterThan(0);
	});

	it("renders toggle buttons", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		// Should have "Done" buttons for completed items
		const doneButtons = screen.getAllByText("Done");
		expect(doneButtons.length).toBeGreaterThan(0);

		// Should have "Miss" buttons for missed items
		const missButtons = screen.getAllByText("Miss");
		expect(missButtons.length).toBeGreaterThan(0);
	});

	it("shows loading skeleton when isLoading is true and no data", () => {
		render(<CompletionHistoryList history={undefined} isLoading={true} />);

		const skeletons = screen.getAllByTestId("loading-row");
		expect(skeletons).toHaveLength(5);

		// Should not show completion rows or empty message
		expect(screen.queryByTestId("completion-row")).not.toBeInTheDocument();
		expect(
			screen.queryByText("No completion history available"),
		).not.toBeInTheDocument();
	});

	it("shows empty state when history is undefined", () => {
		render(<CompletionHistoryList history={undefined} />);

		expect(
			screen.getByText("No recurring occurrences in this period"),
		).toBeInTheDocument();
	});

	it("shows empty state when history is empty array", () => {
		render(<CompletionHistoryList history={[]} />);

		expect(
			screen.getByText("No recurring occurrences in this period"),
		).toBeInTheDocument();
	});

	it("shows data when history has records", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		expect(
			screen.queryByText("No completion history available"),
		).not.toBeInTheDocument();
		// Should have completion rows (multiple elements)
		const rows = screen.getAllByTestId("completion-row");
		expect(rows.length).toBeGreaterThan(0);
	});

	it("renders single record correctly", () => {
		const singleRecord: CompletionHistoryRecord[] = [
			{
				id: 1,
				todoId: 101,
				scheduledDate: new Date("2024-01-15T09:00:00Z"),
				completedAt: new Date("2024-01-15T10:30:00Z"),
				createdAt: new Date("2024-01-14T08:00:00Z"),
				todoText: "Single todo",
			},
		];

		render(<CompletionHistoryList history={singleRecord} />);

		const rows = screen.getAllByTestId("completion-row");
		expect(rows).toHaveLength(1);
		expect(screen.getByText("Single todo")).toBeInTheDocument();
	});

	it("prioritizes data display over loading state when data exists", () => {
		render(<CompletionHistoryList history={mockHistory} isLoading={true} />);

		// Should show actual data, not loading skeleton
		const rows = screen.getAllByTestId("completion-row");
		expect(rows.length).toBeGreaterThan(0);
		expect(screen.queryByTestId("loading-row")).not.toBeInTheDocument();
	});

	it("assigns correct data attributes to rows", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		const rows = screen.getAllByTestId("completion-row");
		expect(rows[0]).toHaveAttribute("data-todo-id", "101");
		expect(rows[1]).toHaveAttribute("data-todo-id", "102");
	});

	it("renders completed items with green styling", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		// Get the first row which is completed
		const rows = screen.getAllByTestId("completion-row");
		const firstRow = rows[0];
		const doneButton = within(firstRow).getByText("Done");

		expect(doneButton).toHaveClass("border-green-600/30");
	});

	it("renders missed items with neutral styling", () => {
		render(<CompletionHistoryList history={mockHistory} />);

		// Get the second row which is missed
		const rows = screen.getAllByTestId("completion-row");
		const secondRow = rows[1];
		const missButton = within(secondRow).getByText("Miss");

		expect(missButton).toHaveClass("border-border");
	});
});

// ============================================================================
// Tests for RecurringOccurrenceWithStatus (new prop)
// ============================================================================

const mockOccurrences: RecurringOccurrenceWithStatus[] = [
	{
		id: "101-2024-01-15",
		todoId: 101,
		todoText: "Morning meditation",
		scheduledDate: new Date("2024-01-15T09:00:00Z"),
		completedAt: new Date("2024-01-15T10:30:00Z"),
		status: "completed",
		hasCompletionRecord: true,
	},
	{
		id: "102-2024-01-15",
		todoId: 102,
		todoText: "Evening exercise",
		scheduledDate: new Date("2024-01-15T09:00:00Z"),
		completedAt: null,
		status: "missed",
		hasCompletionRecord: false,
	},
	{
		id: "103-2024-01-20",
		todoId: 103,
		todoText: "Weekly review",
		scheduledDate: new Date("2024-01-20T09:00:00Z"),
		completedAt: null,
		status: "pending",
		hasCompletionRecord: false,
	},
];

describe("CompletionHistoryList with occurrences prop", () => {
	it("renders the card title", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		expect(screen.getByText("Completion History")).toBeInTheDocument();
	});

	it("renders all occurrence rows", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		const rows = screen.getAllByTestId("completion-row");
		expect(rows).toHaveLength(3);
	});

	it("renders completed status with timestamp", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		// The first item shows completion time
		const times = screen.getAllByText(/\d{1,2}:\d{2} [AP]M/);
		expect(times.length).toBeGreaterThan(0);
	});

	it("renders missed status", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		expect(screen.getByText("Missed")).toBeInTheDocument();
	});

	it("renders pending status", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		expect(screen.getByText("Pending")).toBeInTheDocument();
	});

	it("renders todo text for all occurrences", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		expect(screen.getByText("Morning meditation")).toBeInTheDocument();
		expect(screen.getByText("Evening exercise")).toBeInTheDocument();
		expect(screen.getByText("Weekly review")).toBeInTheDocument();
	});

	it("renders scheduled dates", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		// Should show dates formatted like "Jan 15, 2024"
		const dates = screen.getAllByText(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
		expect(dates.length).toBeGreaterThan(0);
	});

	it("renders toggle buttons", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		// Should have "Done" button for completed item
		const doneButtons = screen.getAllByText("Done");
		expect(doneButtons).toHaveLength(1);

		// Should have "Miss" buttons for missed and pending items
		const missButtons = screen.getAllByText("Miss");
		expect(missButtons).toHaveLength(2);
	});

	it("shows empty state when occurrences is empty array", () => {
		render(<CompletionHistoryList occurrences={[]} />);

		expect(
			screen.getByText("No recurring occurrences in this period"),
		).toBeInTheDocument();
	});

	it("shows empty state when occurrences is undefined", () => {
		render(<CompletionHistoryList occurrences={undefined} />);

		expect(
			screen.getByText("No recurring occurrences in this period"),
		).toBeInTheDocument();
	});

	it("assigns correct data attributes including status", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		const rows = screen.getAllByTestId("completion-row");
		expect(rows[0]).toHaveAttribute("data-todo-id", "101");
		expect(rows[0]).toHaveAttribute("data-status", "completed");
		expect(rows[1]).toHaveAttribute("data-todo-id", "102");
		expect(rows[1]).toHaveAttribute("data-status", "missed");
		expect(rows[2]).toHaveAttribute("data-todo-id", "103");
		expect(rows[2]).toHaveAttribute("data-status", "pending");
	});

	it("renders completed items with green styling", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		const rows = screen.getAllByTestId("completion-row");
		const completedRow = rows[0];
		const doneButton = within(completedRow).getByText("Done");

		expect(doneButton).toHaveClass("border-green-600/30");
	});

	it("renders pending items with neutral styling", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		// Find the pending row (third row)
		const rows = screen.getAllByTestId("completion-row");
		const pendingRow = rows[2];
		const missButton = within(pendingRow).getByText("Miss");

		expect(missButton).toHaveClass("border-border");
	});

	it("prefers occurrences over history when both are provided", () => {
		const singleOccurrence: RecurringOccurrenceWithStatus[] = [
			{
				id: "999-2024-01-01",
				todoId: 999,
				todoText: "Occurrence from occurrences prop",
				scheduledDate: new Date("2024-01-01T09:00:00Z"),
				completedAt: null,
				status: "pending",
				hasCompletionRecord: false,
			},
		];

		// When both are provided, occurrences should be preferred
		render(
			<CompletionHistoryList
				occurrences={singleOccurrence}
				history={mockHistory}
			/>,
		);

		// Should show the occurrence, not the history
		expect(
			screen.getByText("Occurrence from occurrences prop"),
		).toBeInTheDocument();
		expect(screen.queryByText("Morning meditation")).not.toBeInTheDocument();
	});

	it("falls back to history when occurrences is undefined", () => {
		render(
			<CompletionHistoryList occurrences={undefined} history={mockHistory} />,
		);

		// Should show history items
		expect(screen.getByText("Morning meditation")).toBeInTheDocument();
	});

	it("shows loading skeleton when isLoading is true and no data", () => {
		render(<CompletionHistoryList occurrences={undefined} isLoading={true} />);

		const skeletons = screen.getAllByTestId("loading-row");
		expect(skeletons).toHaveLength(5);
	});

	it("prioritizes data display over loading state when data exists", () => {
		render(
			<CompletionHistoryList occurrences={mockOccurrences} isLoading={true} />,
		);

		// Should show actual data, not loading skeleton
		const rows = screen.getAllByTestId("completion-row");
		expect(rows.length).toBeGreaterThan(0);
		expect(screen.queryByTestId("loading-row")).not.toBeInTheDocument();
	});
});

// ============================================================================
// Tests for toggling past occurrence completion status
// ============================================================================

describe("CompletionHistoryList toggle functionality", () => {
	it("calls mutate when toggling a completed occurrence to missed", () => {
		const completedOccurrence: RecurringOccurrenceWithStatus[] = [
			{
				id: "101-2024-01-15",
				todoId: 101,
				todoText: "Morning meditation",
				scheduledDate: new Date("2024-01-15T09:00:00Z"),
				completedAt: new Date("2024-01-15T10:30:00Z"),
				status: "completed",
				hasCompletionRecord: true,
			},
		];

		render(<CompletionHistoryList occurrences={completedOccurrence} />);

		// Find the "Done" button and click it to toggle to missed
		const doneButton = screen.getByText("Done");
		fireEvent.click(doneButton);

		// Verify mutation was called with correct parameters
		expect(mockMutate).toHaveBeenCalledTimes(1);
		expect(mockMutate).toHaveBeenCalledWith({
			todoId: 101,
			scheduledDate: expect.stringContaining("2024-01-15"),
			completed: false, // Toggling from completed to not completed
		});
	});

	it("calls mutate when toggling a missed occurrence to completed", () => {
		const missedOccurrence: RecurringOccurrenceWithStatus[] = [
			{
				id: "102-2024-01-15",
				todoId: 102,
				todoText: "Evening exercise",
				scheduledDate: new Date("2024-01-15T09:00:00Z"),
				completedAt: null,
				status: "missed",
				hasCompletionRecord: false,
			},
		];

		render(<CompletionHistoryList occurrences={missedOccurrence} />);

		// Find the "Miss" button and click it to toggle to completed
		const missButton = screen.getByText("Miss");
		fireEvent.click(missButton);

		// Verify mutation was called with correct parameters
		expect(mockMutate).toHaveBeenCalledTimes(1);
		expect(mockMutate).toHaveBeenCalledWith({
			todoId: 102,
			scheduledDate: expect.stringContaining("2024-01-15"),
			completed: true, // Toggling from missed to completed
		});
	});

	it("calls mutate when toggling a pending occurrence to completed", () => {
		const pendingOccurrence: RecurringOccurrenceWithStatus[] = [
			{
				id: "103-2024-01-20",
				todoId: 103,
				todoText: "Weekly review",
				scheduledDate: new Date("2024-01-20T09:00:00Z"),
				completedAt: null,
				status: "pending",
				hasCompletionRecord: false,
			},
		];

		render(<CompletionHistoryList occurrences={pendingOccurrence} />);

		// Find the "Miss" button (pending items show "Miss" since they're not completed)
		const missButton = screen.getByText("Miss");
		fireEvent.click(missButton);

		// Verify mutation was called with correct parameters
		expect(mockMutate).toHaveBeenCalledTimes(1);
		expect(mockMutate).toHaveBeenCalledWith({
			todoId: 103,
			scheduledDate: expect.stringContaining("2024-01-20"),
			completed: true, // Toggling to completed
		});
	});

	it("calls mutate with string todoId for local storage occurrences", () => {
		const localOccurrence: RecurringOccurrenceWithStatus[] = [
			{
				id: "local-abc123-2024-01-15",
				todoId: "local-abc123", // String ID for local storage
				todoText: "Local todo",
				scheduledDate: new Date("2024-01-15T09:00:00Z"),
				completedAt: null,
				status: "missed",
				hasCompletionRecord: false,
			},
		];

		render(<CompletionHistoryList occurrences={localOccurrence} />);

		const missButton = screen.getByText("Miss");
		fireEvent.click(missButton);

		expect(mockMutate).toHaveBeenCalledWith({
			todoId: "local-abc123",
			scheduledDate: expect.stringContaining("2024-01-15"),
			completed: true,
		});
	});

	it("toggles correct item when multiple occurrences exist", () => {
		render(<CompletionHistoryList occurrences={mockOccurrences} />);

		const rows = screen.getAllByTestId("completion-row");

		// Click the toggle button in the second row (missed occurrence)
		const secondRow = rows[1];
		const missButton = within(secondRow).getByText("Miss");
		fireEvent.click(missButton);

		// Should only call mutate once with the correct todoId
		expect(mockMutate).toHaveBeenCalledTimes(1);
		expect(mockMutate).toHaveBeenCalledWith({
			todoId: 102, // The todoId of the second occurrence
			scheduledDate: expect.stringContaining("2024-01-15"),
			completed: true,
		});
	});

	it("works with legacy history prop", () => {
		const historyWithToggle: CompletionHistoryRecord[] = [
			{
				id: 1,
				todoId: 201,
				scheduledDate: new Date("2024-02-10T09:00:00Z"),
				completedAt: new Date("2024-02-10T11:00:00Z"),
				createdAt: new Date("2024-02-09T08:00:00Z"),
				todoText: "Legacy completed todo",
			},
		];

		render(<CompletionHistoryList history={historyWithToggle} />);

		const doneButton = screen.getByText("Done");
		fireEvent.click(doneButton);

		expect(mockMutate).toHaveBeenCalledWith({
			todoId: 201,
			scheduledDate: expect.stringContaining("2024-02-10"),
			completed: false,
		});
	});
});
