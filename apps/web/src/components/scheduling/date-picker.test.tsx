"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	DatePicker,
	type DatePreset,
	DEFAULT_DATE_PRESETS,
	formatDate,
	getDaysInMonth,
	getFirstDayOfMonth,
	isSameDay,
} from "./date-picker";

describe("DatePicker", () => {
	const defaultProps = {
		value: null,
		onChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders the trigger button", () => {
			render(<DatePicker {...defaultProps} />);

			expect(screen.getByTestId("date-picker-trigger")).toBeInTheDocument();
		});

		it("renders with default placeholder when no value", () => {
			render(<DatePicker {...defaultProps} />);

			expect(screen.getByText("Set due date")).toBeInTheDocument();
		});

		it("renders with custom placeholder", () => {
			render(<DatePicker {...defaultProps} placeholder="Pick a date" />);

			expect(screen.getByText("Pick a date")).toBeInTheDocument();
		});

		it("renders calendar icon", () => {
			render(<DatePicker {...defaultProps} />);

			const trigger = screen.getByTestId("date-picker-trigger");
			const icon = trigger.querySelector("svg");
			expect(icon).toBeInTheDocument();
		});

		it("renders formatted date when value is set", () => {
			// Use a date that we know the day of week for
			const date = new Date(2026, 0, 26); // Monday
			render(<DatePicker {...defaultProps} value={date} />);

			expect(screen.getByText("Mon, Jan 26")).toBeInTheDocument();
		});

		it("renders 'Today' when value is today", () => {
			const today = new Date();
			render(<DatePicker {...defaultProps} value={today} />);

			expect(screen.getByText("Today")).toBeInTheDocument();
		});

		it("renders 'Tomorrow' when value is tomorrow", () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			render(<DatePicker {...defaultProps} value={tomorrow} />);

			expect(screen.getByText("Tomorrow")).toBeInTheDocument();
		});

		it("renders clear button when value is set and clearable is true", () => {
			const date = new Date(2026, 0, 25);
			render(<DatePicker {...defaultProps} value={date} clearable={true} />);

			expect(screen.getByTestId("date-picker-clear")).toBeInTheDocument();
		});

		it("does not render clear button when value is set and clearable is false", () => {
			const date = new Date(2026, 0, 25);
			render(<DatePicker {...defaultProps} value={date} clearable={false} />);

			expect(screen.queryByTestId("date-picker-clear")).not.toBeInTheDocument();
		});

		it("does not render clear button when no value", () => {
			render(<DatePicker {...defaultProps} />);

			expect(screen.queryByTestId("date-picker-clear")).not.toBeInTheDocument();
		});

		it("applies custom className to container", () => {
			render(<DatePicker {...defaultProps} className="custom-class" />);

			const container = screen.getByTestId("date-picker-container");
			expect(container).toHaveClass("custom-class");
		});
	});

	describe("Disabled State", () => {
		it("disables trigger when disabled is true", () => {
			render(<DatePicker {...defaultProps} disabled={true} />);

			expect(screen.getByTestId("date-picker-trigger")).toBeDisabled();
		});

		it("does not show clear button when disabled", () => {
			const date = new Date(2026, 0, 25);
			render(
				<DatePicker {...defaultProps} value={date} disabled={true} clearable />,
			);

			expect(screen.queryByTestId("date-picker-clear")).not.toBeInTheDocument();
		});
	});

	describe("Popover Behavior", () => {
		it("opens popover when trigger is clicked", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} />);

			const trigger = screen.getByTestId("date-picker-trigger");
			await user.click(trigger);

			await waitFor(() => {
				expect(screen.getByTestId("date-picker-popover")).toBeInTheDocument();
			});
		});

		it("renders presets section in popover", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("date-picker-presets")).toBeInTheDocument();
			});
		});

		it("renders all default presets", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-preset-today"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("date-picker-preset-tomorrow"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("date-picker-preset-next-week"),
				).toBeInTheDocument();
			});
		});

		it("renders custom presets when provided", async () => {
			const customPresets: DatePreset[] = [
				{ label: "In 3 days", getValue: () => new Date() },
				{ label: "Next month", getValue: () => new Date() },
			];
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} presets={customPresets} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-preset-in-3-days"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("date-picker-preset-next-month"),
				).toBeInTheDocument();
			});
		});

		it("does not render presets section when presets is empty", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} presets={[]} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("date-picker-popover")).toBeInTheDocument();
			});

			expect(
				screen.queryByTestId("date-picker-presets"),
			).not.toBeInTheDocument();
		});

		it("renders calendar navigation", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-navigation"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("date-picker-prev-month"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("date-picker-next-month"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toBeInTheDocument();
			});
		});

		it("renders calendar grid", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-calendar-grid"),
				).toBeInTheDocument();
			});
		});

		it("shows current month and year in popover", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			const today = new Date();
			const expectedMonth = today.toLocaleString("en-US", { month: "long" });
			const expectedYear = today.getFullYear();

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toHaveTextContent(`${expectedMonth} ${expectedYear}`);
			});
		});

		it("shows selected date's month when value is set", async () => {
			const date = new Date(2026, 5, 15); // June 15, 2026
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} value={date} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toHaveTextContent("June 2026");
			});
		});
	});

	describe("Calendar Navigation", () => {
		it("navigates to previous month", async () => {
			const user = userEvent.setup();
			// Use a date in February so we know going back is January
			const date = new Date(2026, 1, 15); // February 2026
			render(<DatePicker {...defaultProps} value={date} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toHaveTextContent("February 2026");
			});

			await user.click(screen.getByTestId("date-picker-prev-month"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toHaveTextContent("January 2026");
			});
		});

		it("navigates to next month", async () => {
			const user = userEvent.setup();
			const date = new Date(2026, 0, 15); // January 2026
			render(<DatePicker {...defaultProps} value={date} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toHaveTextContent("January 2026");
			});

			await user.click(screen.getByTestId("date-picker-next-month"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toHaveTextContent("February 2026");
			});
		});

		it("navigates across year boundaries", async () => {
			const user = userEvent.setup();
			const date = new Date(2026, 0, 15); // January 2026
			render(<DatePicker {...defaultProps} value={date} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toHaveTextContent("January 2026");
			});

			// Go back to December 2025
			await user.click(screen.getByTestId("date-picker-prev-month"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toHaveTextContent("December 2025");
			});

			// Go forward to January 2026
			await user.click(screen.getByTestId("date-picker-next-month"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-current-month"),
				).toHaveTextContent("January 2026");
			});
		});
	});

	describe("Date Selection", () => {
		it("calls onChange when a date is selected", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			const startDate = new Date(2026, 0, 15);
			render(
				<DatePicker {...defaultProps} onChange={onChange} value={startDate} />,
			);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("date-picker-day-20")).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("date-picker-day-20"));

			expect(onChange).toHaveBeenCalledTimes(1);
			const selectedDate = onChange.mock.calls[0][0] as Date;
			expect(selectedDate.getDate()).toBe(20);
			expect(selectedDate.getMonth()).toBe(0); // January
			expect(selectedDate.getFullYear()).toBe(2026);
		});

		it("closes popover after selecting a date", async () => {
			const user = userEvent.setup();
			const startDate = new Date(2026, 0, 15);
			render(<DatePicker {...defaultProps} value={startDate} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("date-picker-popover")).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("date-picker-day-20"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("date-picker-popover"),
				).not.toBeInTheDocument();
			});
		});

		it("highlights currently selected date", async () => {
			const date = new Date(2026, 0, 15);
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} value={date} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				const day15 = screen.getByTestId("date-picker-day-15");
				expect(day15).toHaveAttribute("aria-pressed", "true");
				expect(day15).toHaveClass("bg-primary");
			});
		});

		it("highlights today's date", async () => {
			const user = userEvent.setup();
			const today = new Date();
			render(<DatePicker {...defaultProps} value={today} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				const todayCell = screen.getByTestId(
					`date-picker-day-${today.getDate()}`,
				);
				expect(todayCell).toHaveAttribute("aria-current", "date");
			});
		});
	});

	describe("Preset Selection", () => {
		it("selects today when Today preset is clicked", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-preset-today"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("date-picker-preset-today"));

			expect(onChange).toHaveBeenCalledTimes(1);
			const selectedDate = onChange.mock.calls[0][0] as Date;
			const today = new Date();
			expect(selectedDate.getDate()).toBe(today.getDate());
			expect(selectedDate.getMonth()).toBe(today.getMonth());
			expect(selectedDate.getFullYear()).toBe(today.getFullYear());
		});

		it("selects tomorrow when Tomorrow preset is clicked", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-preset-tomorrow"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("date-picker-preset-tomorrow"));

			expect(onChange).toHaveBeenCalledTimes(1);
			const selectedDate = onChange.mock.calls[0][0] as Date;
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			expect(selectedDate.getDate()).toBe(tomorrow.getDate());
		});

		it("selects next week when Next week preset is clicked", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("date-picker-preset-next-week"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("date-picker-preset-next-week"));

			expect(onChange).toHaveBeenCalledTimes(1);
			const selectedDate = onChange.mock.calls[0][0] as Date;
			const nextWeek = new Date();
			nextWeek.setDate(nextWeek.getDate() + 7);
			expect(selectedDate.getDate()).toBe(nextWeek.getDate());
		});

		it("closes popover after selecting a preset", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("date-picker-popover")).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("date-picker-preset-today"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("date-picker-popover"),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Clear Functionality", () => {
		it("clears the value when clear button is clicked", async () => {
			const onChange = vi.fn();
			const date = new Date(2026, 0, 25);
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} value={date} onChange={onChange} />);

			await user.click(screen.getByTestId("date-picker-clear"));

			expect(onChange).toHaveBeenCalledWith(null);
		});

		it("does not open popover when clear button is clicked", async () => {
			const date = new Date(2026, 0, 25);
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} value={date} />);

			await user.click(screen.getByTestId("date-picker-clear"));

			expect(
				screen.queryByTestId("date-picker-popover"),
			).not.toBeInTheDocument();
		});
	});

	describe("Min/Max Date Constraints", () => {
		it("disables dates before minDate", async () => {
			const minDate = new Date(2026, 0, 15);
			const startDate = new Date(2026, 0, 20);
			const user = userEvent.setup();
			render(
				<DatePicker {...defaultProps} minDate={minDate} value={startDate} />,
			);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				const day10 = screen.getByTestId("date-picker-day-10");
				expect(day10).toBeDisabled();
				expect(day10).toHaveAttribute("aria-disabled", "true");
			});
		});

		it("disables dates after maxDate", async () => {
			const maxDate = new Date(2026, 0, 20);
			const startDate = new Date(2026, 0, 15);
			const user = userEvent.setup();
			render(
				<DatePicker {...defaultProps} maxDate={maxDate} value={startDate} />,
			);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				const day25 = screen.getByTestId("date-picker-day-25");
				expect(day25).toBeDisabled();
				expect(day25).toHaveAttribute("aria-disabled", "true");
			});
		});

		it("allows dates within range", async () => {
			const minDate = new Date(2026, 0, 10);
			const maxDate = new Date(2026, 0, 30);
			const startDate = new Date(2026, 0, 15);
			const user = userEvent.setup();
			render(
				<DatePicker
					{...defaultProps}
					minDate={minDate}
					maxDate={maxDate}
					value={startDate}
				/>,
			);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				const day15 = screen.getByTestId("date-picker-day-15");
				expect(day15).not.toBeDisabled();
			});
		});

		it("does not call onChange when disabled date is clicked", async () => {
			const onChange = vi.fn();
			const minDate = new Date(2026, 0, 15);
			const startDate = new Date(2026, 0, 20);
			const user = userEvent.setup();
			render(
				<DatePicker
					{...defaultProps}
					onChange={onChange}
					minDate={minDate}
					value={startDate}
				/>,
			);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("date-picker-day-10")).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("date-picker-day-10"));

			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe("Accessibility", () => {
		it("trigger has accessible label when no value", () => {
			render(<DatePicker {...defaultProps} />);

			const trigger = screen.getByTestId("date-picker-trigger");
			expect(trigger).toHaveAttribute("aria-label", "Set due date");
		});

		it("trigger has accessible label with date when value is set", () => {
			const date = new Date(2026, 0, 26); // Monday Jan 26
			render(<DatePicker {...defaultProps} value={date} />);

			const trigger = screen.getByTestId("date-picker-trigger");
			expect(trigger).toHaveAttribute("aria-label", "Due date: Mon, Jan 26");
		});

		it("clear button has accessible label", () => {
			const date = new Date(2026, 0, 25);
			render(<DatePicker {...defaultProps} value={date} />);

			const clearButton = screen.getByTestId("date-picker-clear");
			expect(clearButton).toHaveAttribute("aria-label", "Clear due date");
		});

		it("navigation buttons have accessible labels", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("date-picker-prev-month")).toHaveAttribute(
					"aria-label",
					"Previous month",
				);
				expect(screen.getByTestId("date-picker-next-month")).toHaveAttribute(
					"aria-label",
					"Next month",
				);
			});
		});

		it("calendar grid has accessible label", async () => {
			const user = userEvent.setup();
			const date = new Date(2026, 0, 15);
			render(<DatePicker {...defaultProps} value={date} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				const grid = screen.getByTestId("date-picker-calendar-grid");
				expect(grid).toHaveAttribute("aria-label", "January 2026");
			});
		});

		it("day of week headers are visible", async () => {
			const user = userEvent.setup();
			render(<DatePicker {...defaultProps} />);

			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByText("Su")).toBeInTheDocument();
				expect(screen.getByText("Mo")).toBeInTheDocument();
				expect(screen.getByText("Tu")).toBeInTheDocument();
				expect(screen.getByText("We")).toBeInTheDocument();
				expect(screen.getByText("Th")).toBeInTheDocument();
				expect(screen.getByText("Fr")).toBeInTheDocument();
				expect(screen.getByText("Sa")).toBeInTheDocument();
			});
		});
	});
});

describe("Helper Functions", () => {
	describe("formatDate", () => {
		it("returns 'Today' for today's date", () => {
			const today = new Date();
			expect(formatDate(today)).toBe("Today");
		});

		it("returns 'Tomorrow' for tomorrow's date", () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			expect(formatDate(tomorrow)).toBe("Tomorrow");
		});

		it("returns formatted date for other dates", () => {
			// January 26, 2026 is a Monday
			const date = new Date(2026, 0, 26);
			expect(formatDate(date)).toBe("Mon, Jan 26");
		});

		it("formats dates in different months", () => {
			// June 15, 2026 is a Monday
			const date = new Date(2026, 5, 15);
			expect(formatDate(date)).toBe("Mon, Jun 15");
		});
	});

	describe("isSameDay", () => {
		it("returns true for same day", () => {
			const date1 = new Date(2026, 0, 21, 10, 30);
			const date2 = new Date(2026, 0, 21, 15, 45);
			expect(isSameDay(date1, date2)).toBe(true);
		});

		it("returns false for different days", () => {
			const date1 = new Date(2026, 0, 21);
			const date2 = new Date(2026, 0, 22);
			expect(isSameDay(date1, date2)).toBe(false);
		});

		it("returns false for same day different month", () => {
			const date1 = new Date(2026, 0, 21);
			const date2 = new Date(2026, 1, 21);
			expect(isSameDay(date1, date2)).toBe(false);
		});

		it("returns false for same day different year", () => {
			const date1 = new Date(2026, 0, 21);
			const date2 = new Date(2025, 0, 21);
			expect(isSameDay(date1, date2)).toBe(false);
		});
	});

	describe("getDaysInMonth", () => {
		it("returns 31 for January", () => {
			expect(getDaysInMonth(2026, 0)).toBe(31);
		});

		it("returns 28 for February in non-leap year", () => {
			expect(getDaysInMonth(2025, 1)).toBe(28);
		});

		it("returns 29 for February in leap year", () => {
			expect(getDaysInMonth(2024, 1)).toBe(29);
		});

		it("returns 30 for April", () => {
			expect(getDaysInMonth(2026, 3)).toBe(30);
		});
	});

	describe("getFirstDayOfMonth", () => {
		it("returns correct first day for January 2026 (Thursday = 4)", () => {
			expect(getFirstDayOfMonth(2026, 0)).toBe(4);
		});

		it("returns correct first day for February 2026 (Sunday = 0)", () => {
			expect(getFirstDayOfMonth(2026, 1)).toBe(0);
		});

		it("returns 0-6 range (Sunday-Saturday)", () => {
			for (let month = 0; month < 12; month++) {
				const firstDay = getFirstDayOfMonth(2026, month);
				expect(firstDay).toBeGreaterThanOrEqual(0);
				expect(firstDay).toBeLessThanOrEqual(6);
			}
		});
	});
});

describe("DEFAULT_DATE_PRESETS", () => {
	it("has 3 default presets", () => {
		expect(DEFAULT_DATE_PRESETS).toHaveLength(3);
	});

	it("Today preset returns current date at end of day", () => {
		const todayPreset = DEFAULT_DATE_PRESETS[0];
		expect(todayPreset.label).toBe("Today");

		const date = todayPreset.getValue();
		const today = new Date();
		expect(date.getDate()).toBe(today.getDate());
		expect(date.getMonth()).toBe(today.getMonth());
		expect(date.getFullYear()).toBe(today.getFullYear());
		expect(date.getHours()).toBe(23);
		expect(date.getMinutes()).toBe(59);
	});

	it("Tomorrow preset returns next day at end of day", () => {
		const tomorrowPreset = DEFAULT_DATE_PRESETS[1];
		expect(tomorrowPreset.label).toBe("Tomorrow");

		const date = tomorrowPreset.getValue();
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		expect(date.getDate()).toBe(tomorrow.getDate());
		expect(date.getHours()).toBe(23);
		expect(date.getMinutes()).toBe(59);
	});

	it("Next week preset returns 7 days from now at end of day", () => {
		const nextWeekPreset = DEFAULT_DATE_PRESETS[2];
		expect(nextWeekPreset.label).toBe("Next week");

		const date = nextWeekPreset.getValue();
		const nextWeek = new Date();
		nextWeek.setDate(nextWeek.getDate() + 7);
		expect(date.getDate()).toBe(nextWeek.getDate());
		expect(date.getHours()).toBe(23);
		expect(date.getMinutes()).toBe(59);
	});
});
