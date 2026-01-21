import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DueDateBadge,
	formatDueDate,
	isOverdue,
	isToday,
	isTomorrow,
} from "./due-date-badge";

// Mock the recurring-picker module
vi.mock("./recurring-picker", () => ({
	formatRecurringPattern: vi.fn((pattern) => {
		if (pattern.type === "daily") return "Daily";
		if (pattern.type === "weekly") {
			if (pattern.daysOfWeek?.length === 5) return "Weekdays";
			return "Weekly";
		}
		if (pattern.type === "monthly") return "Monthly";
		return "Custom";
	}),
}));

describe("DueDateBadge", () => {
	// Use a fixed date for testing
	const realDate = Date;
	const fixedDate = new Date("2026-01-21T10:00:00.000Z");

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(fixedDate);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Rendering", () => {
		it("returns null when no dueDate and no recurringPattern", () => {
			const { container } = render(<DueDateBadge />);
			expect(container.firstChild).toBeNull();
		});

		it("renders due date badge with calendar icon", () => {
			render(<DueDateBadge dueDate="2026-01-25T12:00:00.000Z" />);
			expect(screen.getByTestId("due-date-badge")).toBeInTheDocument();
			expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
		});

		it("renders due date text", () => {
			render(<DueDateBadge dueDate="2026-01-25T12:00:00.000Z" />);
			expect(screen.getByTestId("due-date-text")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<DueDateBadge
					dueDate="2026-01-25T12:00:00.000Z"
					className="custom-class"
				/>,
			);
			expect(screen.getByTestId("due-date-badge")).toHaveClass("custom-class");
		});
	});

	describe("Date Display", () => {
		it("shows 'Today' for today's date", () => {
			// Use a date in the middle of the day to avoid timezone issues
			const today = new Date("2026-01-21T10:00:00.000Z");
			const todayStr = today.toISOString();
			render(<DueDateBadge dueDate={todayStr} />);
			expect(screen.getByTestId("due-date-text")).toHaveTextContent("Today");
		});

		it("shows 'Tomorrow' for tomorrow's date", () => {
			const tomorrow = new Date("2026-01-22T10:00:00.000Z");
			render(<DueDateBadge dueDate={tomorrow.toISOString()} />);
			expect(screen.getByTestId("due-date-text")).toHaveTextContent("Tomorrow");
		});

		it("shows 'Yesterday' for yesterday's date", () => {
			const yesterday = new Date("2026-01-20T10:00:00.000Z");
			render(<DueDateBadge dueDate={yesterday.toISOString()} />);
			expect(screen.getByTestId("due-date-text")).toHaveTextContent(
				"Yesterday",
			);
		});

		it("shows weekday for dates within the next week", () => {
			// 2026-01-24 is Saturday
			render(<DueDateBadge dueDate="2026-01-24T10:00:00.000Z" />);
			expect(screen.getByTestId("due-date-text")).toHaveTextContent("Sat");
		});

		it("shows month and day for dates beyond a week", () => {
			render(<DueDateBadge dueDate="2026-02-15T10:00:00.000Z" />);
			expect(screen.getByTestId("due-date-text")).toHaveTextContent("Feb 15");
		});
	});

	describe("Overdue Styling", () => {
		it("shows overdue styling for past due dates on incomplete todos", () => {
			render(<DueDateBadge dueDate="2026-01-19T12:00:00.000Z" />);
			const badge = screen.getByTestId("due-date-badge");
			expect(badge).toHaveAttribute("data-overdue", "true");
			expect(screen.getByTestId("overdue-icon")).toBeInTheDocument();
		});

		it("does not show overdue styling for past due dates on completed todos", () => {
			render(
				<DueDateBadge dueDate="2026-01-19T12:00:00.000Z" isCompleted={true} />,
			);
			const badge = screen.getByTestId("due-date-badge");
			expect(badge).not.toHaveAttribute("data-overdue");
			expect(screen.queryByTestId("overdue-icon")).not.toBeInTheDocument();
		});

		it("does not show overdue styling for future dates", () => {
			render(<DueDateBadge dueDate="2026-01-25T12:00:00.000Z" />);
			const badge = screen.getByTestId("due-date-badge");
			expect(badge).not.toHaveAttribute("data-overdue");
		});

		it("does not show overdue styling for today's date", () => {
			render(<DueDateBadge dueDate="2026-01-21T23:59:59.000Z" />);
			const badge = screen.getByTestId("due-date-badge");
			expect(badge).not.toHaveAttribute("data-overdue");
		});
	});

	describe("Today Styling", () => {
		it("shows today styling for today's date", () => {
			render(<DueDateBadge dueDate="2026-01-21T12:00:00.000Z" />);
			const badge = screen.getByTestId("due-date-badge");
			expect(badge).toHaveAttribute("data-today", "true");
		});

		it("does not show today styling for other dates", () => {
			render(<DueDateBadge dueDate="2026-01-22T12:00:00.000Z" />);
			const badge = screen.getByTestId("due-date-badge");
			expect(badge).not.toHaveAttribute("data-today");
		});
	});

	describe("Completed Styling", () => {
		it("applies completed styling when isCompleted is true", () => {
			render(
				<DueDateBadge dueDate="2026-01-25T12:00:00.000Z" isCompleted={true} />,
			);
			const badge = screen.getByTestId("due-date-badge");
			expect(badge).toHaveClass("bg-muted/50");
		});
	});

	describe("Recurring Pattern", () => {
		it("shows recurring icon when only recurring pattern is provided", () => {
			render(<DueDateBadge recurringPattern={{ type: "daily" }} />);
			expect(screen.getByTestId("recurring-icon")).toBeInTheDocument();
			expect(screen.getByTestId("recurring-text")).toHaveTextContent("Daily");
		});

		it("shows recurring indicator when both date and pattern are provided", () => {
			render(
				<DueDateBadge
					dueDate="2026-01-25T12:00:00.000Z"
					recurringPattern={{ type: "daily" }}
				/>,
			);
			expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
			expect(screen.getByTestId("recurring-indicator")).toBeInTheDocument();
		});

		it("does not show recurring text when date is also provided", () => {
			render(
				<DueDateBadge
					dueDate="2026-01-25T12:00:00.000Z"
					recurringPattern={{ type: "daily" }}
				/>,
			);
			expect(screen.queryByTestId("recurring-text")).not.toBeInTheDocument();
		});
	});

	describe("Date Object Input", () => {
		it("accepts Date object for dueDate", () => {
			const date = new Date("2026-01-25T12:00:00.000Z");
			render(<DueDateBadge dueDate={date} />);
			expect(screen.getByTestId("due-date-badge")).toBeInTheDocument();
		});
	});
});

describe("isOverdue", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-21T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns true for past dates", () => {
		expect(isOverdue("2026-01-19T12:00:00.000Z")).toBe(true);
	});

	it("returns false for today", () => {
		expect(isOverdue("2026-01-21T23:59:59.000Z")).toBe(false);
	});

	it("returns false for future dates", () => {
		expect(isOverdue("2026-01-25T12:00:00.000Z")).toBe(false);
	});

	it("returns false when isCompleted is true regardless of date", () => {
		expect(isOverdue("2026-01-19T12:00:00.000Z", true)).toBe(false);
	});

	it("accepts Date object", () => {
		const pastDate = new Date("2026-01-19T12:00:00.000Z");
		expect(isOverdue(pastDate)).toBe(true);
	});
});

describe("isToday", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-21T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns true for today's date", () => {
		// Use a date in the middle of the day to avoid timezone edge cases
		expect(isToday("2026-01-21T10:00:00.000Z")).toBe(true);
	});

	it("returns true for today at different times", () => {
		expect(isToday("2026-01-21T08:00:00.000Z")).toBe(true);
		expect(isToday("2026-01-21T12:30:00.000Z")).toBe(true);
	});

	it("returns false for yesterday", () => {
		expect(isToday("2026-01-20T10:00:00.000Z")).toBe(false);
	});

	it("returns false for tomorrow", () => {
		expect(isToday("2026-01-22T10:00:00.000Z")).toBe(false);
	});

	it("accepts Date object", () => {
		expect(isToday(new Date("2026-01-21T10:00:00.000Z"))).toBe(true);
	});
});

describe("isTomorrow", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-21T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns true for tomorrow's date", () => {
		expect(isTomorrow("2026-01-22T12:00:00.000Z")).toBe(true);
	});

	it("returns false for today", () => {
		expect(isTomorrow("2026-01-21T12:00:00.000Z")).toBe(false);
	});

	it("returns false for day after tomorrow", () => {
		expect(isTomorrow("2026-01-23T12:00:00.000Z")).toBe(false);
	});

	it("accepts Date object", () => {
		expect(isTomorrow(new Date("2026-01-22T15:00:00.000Z"))).toBe(true);
	});
});

describe("formatDueDate", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-21T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns 'Today' for today's date", () => {
		expect(formatDueDate("2026-01-21T12:00:00.000Z")).toBe("Today");
	});

	it("returns 'Tomorrow' for tomorrow's date", () => {
		expect(formatDueDate("2026-01-22T12:00:00.000Z")).toBe("Tomorrow");
	});

	it("returns 'Yesterday' for yesterday's date", () => {
		expect(formatDueDate("2026-01-20T12:00:00.000Z")).toBe("Yesterday");
	});

	it("returns weekday for dates within next week", () => {
		// 2026-01-24 is Saturday
		const result = formatDueDate("2026-01-24T12:00:00.000Z");
		expect(result).toBe("Sat");
	});

	it("returns month and day for dates beyond a week", () => {
		const result = formatDueDate("2026-02-15T12:00:00.000Z");
		expect(result).toBe("Feb 15");
	});

	it("returns month and day for past dates beyond yesterday", () => {
		const result = formatDueDate("2026-01-10T12:00:00.000Z");
		expect(result).toBe("Jan 10");
	});

	it("accepts Date object", () => {
		const result = formatDueDate(new Date("2026-01-21T12:00:00.000Z"));
		expect(result).toBe("Today");
	});
});
