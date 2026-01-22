import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletionHistoryRecord } from "@/app/api/analytics/analytics.types";
import { CompletionHistoryList } from "./completion-history-list";

// Mock the analytics hooks
vi.mock("@/app/api/analytics", () => ({
	useUpdatePastCompletion: () => ({
		mutate: vi.fn(),
		isPending: false,
	}),
}));

// Mock Date.prototype.toLocaleTimeString and Date.prototype.toLocaleDateString
const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
const originalToLocaleDateString = Date.prototype.toLocaleDateString;

beforeEach(() => {
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
			screen.getByText("No completion history available"),
		).toBeInTheDocument();
	});

	it("shows empty state when history is empty array", () => {
		render(<CompletionHistoryList history={[]} />);

		expect(
			screen.getByText("No completion history available"),
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
