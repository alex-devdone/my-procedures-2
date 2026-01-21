"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	emptyScheduleValue,
	formatScheduleValue,
	hasSchedule,
	type ScheduleValue,
	TodoSchedulePopover,
} from "./todo-schedule-popover";

describe("TodoSchedulePopover", () => {
	const emptyValue: ScheduleValue = {
		dueDate: null,
		reminderAt: null,
		recurringPattern: null,
	};

	const defaultProps = {
		value: emptyValue,
		onChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders the trigger button", () => {
			render(<TodoSchedulePopover {...defaultProps} />);

			expect(
				screen.getByTestId("todo-schedule-popover-trigger"),
			).toBeInTheDocument();
		});

		it("renders with default placeholder when no schedule", () => {
			render(<TodoSchedulePopover {...defaultProps} />);

			expect(screen.getByText("Schedule")).toBeInTheDocument();
		});

		it("renders with custom placeholder", () => {
			render(
				<TodoSchedulePopover {...defaultProps} placeholder="Add schedule" />,
			);

			expect(screen.getByText("Add schedule")).toBeInTheDocument();
		});

		it("renders calendar icon", () => {
			render(<TodoSchedulePopover {...defaultProps} />);

			const trigger = screen.getByTestId("todo-schedule-popover-trigger");
			const icon = trigger.querySelector("svg");
			expect(icon).toBeInTheDocument();
		});

		it("renders formatted schedule when value is set", () => {
			const date = new Date(2026, 0, 26);
			const value: ScheduleValue = {
				dueDate: date,
				reminderAt: null,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			expect(screen.getByText("Mon, Jan 26")).toBeInTheDocument();
		});

		it("renders 'Today' when due date is today", () => {
			const today = new Date();
			const value: ScheduleValue = {
				dueDate: today,
				reminderAt: null,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			expect(screen.getByText("Today")).toBeInTheDocument();
		});

		it("renders recurring pattern in trigger", () => {
			const value: ScheduleValue = {
				dueDate: null,
				reminderAt: null,
				recurringPattern: { type: "daily" },
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			expect(screen.getByText("Daily")).toBeInTheDocument();
		});

		it("renders combined display when both due date and recurring are set", () => {
			const date = new Date(2026, 0, 26);
			const value: ScheduleValue = {
				dueDate: date,
				reminderAt: null,
				recurringPattern: { type: "weekly" },
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			expect(screen.getByText("Mon, Jan 26 · Weekly")).toBeInTheDocument();
		});

		it("renders clear button when schedule is set and clearable is true", () => {
			const date = new Date(2026, 0, 25);
			const value: ScheduleValue = {
				dueDate: date,
				reminderAt: null,
				recurringPattern: null,
			};
			render(
				<TodoSchedulePopover
					{...defaultProps}
					value={value}
					clearable={true}
				/>,
			);

			expect(
				screen.getByTestId("todo-schedule-popover-clear"),
			).toBeInTheDocument();
		});

		it("does not render clear button when schedule is set and clearable is false", () => {
			const date = new Date(2026, 0, 25);
			const value: ScheduleValue = {
				dueDate: date,
				reminderAt: null,
				recurringPattern: null,
			};
			render(
				<TodoSchedulePopover
					{...defaultProps}
					value={value}
					clearable={false}
				/>,
			);

			expect(
				screen.queryByTestId("todo-schedule-popover-clear"),
			).not.toBeInTheDocument();
		});

		it("does not render clear button when no schedule", () => {
			render(<TodoSchedulePopover {...defaultProps} />);

			expect(
				screen.queryByTestId("todo-schedule-popover-clear"),
			).not.toBeInTheDocument();
		});

		it("applies custom className to container", () => {
			render(
				<TodoSchedulePopover {...defaultProps} className="custom-class" />,
			);

			const container = screen.getByTestId("todo-schedule-popover-container");
			expect(container).toHaveClass("custom-class");
		});
	});

	describe("Compact Mode", () => {
		it("renders icon-only trigger when compact is true", () => {
			render(<TodoSchedulePopover {...defaultProps} compact={true} />);

			const trigger = screen.getByTestId("todo-schedule-popover-trigger");
			expect(trigger).not.toHaveTextContent("Schedule");
		});

		it("does not render clear button when compact", () => {
			const date = new Date(2026, 0, 25);
			const value: ScheduleValue = {
				dueDate: date,
				reminderAt: null,
				recurringPattern: null,
			};
			render(
				<TodoSchedulePopover {...defaultProps} value={value} compact={true} />,
			);

			expect(
				screen.queryByTestId("todo-schedule-popover-clear"),
			).not.toBeInTheDocument();
		});

		it("still has proper aria-label when compact", () => {
			const date = new Date(2026, 0, 26);
			const value: ScheduleValue = {
				dueDate: date,
				reminderAt: null,
				recurringPattern: null,
			};
			render(
				<TodoSchedulePopover {...defaultProps} value={value} compact={true} />,
			);

			const trigger = screen.getByTestId("todo-schedule-popover-trigger");
			expect(trigger).toHaveAttribute("aria-label", "Schedule: Mon, Jan 26");
		});
	});

	describe("Disabled State", () => {
		it("disables trigger when disabled is true", () => {
			render(<TodoSchedulePopover {...defaultProps} disabled={true} />);

			expect(
				screen.getByTestId("todo-schedule-popover-trigger"),
			).toBeDisabled();
		});

		it("does not show clear button when disabled", () => {
			const date = new Date(2026, 0, 25);
			const value: ScheduleValue = {
				dueDate: date,
				reminderAt: null,
				recurringPattern: null,
			};
			render(
				<TodoSchedulePopover
					{...defaultProps}
					value={value}
					disabled={true}
					clearable
				/>,
			);

			expect(
				screen.queryByTestId("todo-schedule-popover-clear"),
			).not.toBeInTheDocument();
		});
	});

	describe("Popover Behavior", () => {
		it("opens popover when trigger is clicked", async () => {
			const user = userEvent.setup();
			render(<TodoSchedulePopover {...defaultProps} />);

			const trigger = screen.getByTestId("todo-schedule-popover-trigger");
			await user.click(trigger);

			await waitFor(() => {
				expect(screen.getByTestId("todo-schedule-popover")).toBeInTheDocument();
			});
		});

		it("renders header in popover", async () => {
			const user = userEvent.setup();
			render(<TodoSchedulePopover {...defaultProps} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-header"),
				).toBeInTheDocument();
			});

			// Check the header has the Schedule text (as h3)
			const header = screen.getByTestId("todo-schedule-popover-header");
			expect(header.querySelector("h3")).toHaveTextContent("Schedule");
		});

		it("renders due date section in popover", async () => {
			const user = userEvent.setup();
			render(<TodoSchedulePopover {...defaultProps} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-due-date-section"),
				).toBeInTheDocument();
				expect(screen.getByText("Due date")).toBeInTheDocument();
			});
		});

		it("renders reminder section in popover", async () => {
			const user = userEvent.setup();
			render(<TodoSchedulePopover {...defaultProps} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-reminder-section"),
				).toBeInTheDocument();
				expect(screen.getByText("Reminder")).toBeInTheDocument();
			});
		});

		it("renders recurring section in popover", async () => {
			const user = userEvent.setup();
			render(<TodoSchedulePopover {...defaultProps} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-recurring-section"),
				).toBeInTheDocument();
				expect(screen.getByText("Repeat")).toBeInTheDocument();
			});
		});

		it("renders reminder hint when no due date is set", async () => {
			const user = userEvent.setup();
			render(<TodoSchedulePopover {...defaultProps} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-reminder-hint"),
				).toBeInTheDocument();
				expect(
					screen.getByText("Set a due date first to add a reminder"),
				).toBeInTheDocument();
			});
		});

		it("does not render reminder hint when due date is set", async () => {
			const user = userEvent.setup();
			const value: ScheduleValue = {
				dueDate: new Date(2026, 0, 25),
				reminderAt: null,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("todo-schedule-popover-reminder-hint"),
				).not.toBeInTheDocument();
			});
		});

		it("renders clear all button when schedule is set", async () => {
			const user = userEvent.setup();
			const value: ScheduleValue = {
				dueDate: new Date(2026, 0, 25),
				reminderAt: null,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-clear-all"),
				).toBeInTheDocument();
			});
		});

		it("does not render clear all button when no schedule", async () => {
			const user = userEvent.setup();
			render(<TodoSchedulePopover {...defaultProps} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("todo-schedule-popover-clear-all"),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Summary Section", () => {
		it("renders summary when due date is set", async () => {
			const user = userEvent.setup();
			const value: ScheduleValue = {
				dueDate: new Date(2026, 0, 26),
				reminderAt: null,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-summary"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("todo-schedule-popover-summary-due"),
				).toHaveTextContent("Due: Mon, Jan 26");
			});
		});

		it("renders summary with reminder", async () => {
			const user = userEvent.setup();
			const dueDate = new Date(2026, 0, 26, 12, 0, 0);
			const reminderAt = new Date(2026, 0, 26, 11, 45, 0); // 15 min before
			const value: ScheduleValue = {
				dueDate,
				reminderAt,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-summary-reminder"),
				).toBeInTheDocument();
			});
		});

		it("renders summary with recurring pattern", async () => {
			const user = userEvent.setup();
			const value: ScheduleValue = {
				dueDate: new Date(2026, 0, 26),
				reminderAt: null,
				recurringPattern: { type: "weekly", daysOfWeek: [1, 3, 5] },
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-summary-recurring"),
				).toHaveTextContent("Weekly on Mon, Wed, Fri");
			});
		});

		it("does not render summary when no schedule", async () => {
			const user = userEvent.setup();
			render(<TodoSchedulePopover {...defaultProps} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("todo-schedule-popover-summary"),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Clear Functionality", () => {
		it("calls onChange with empty schedule when clear button is clicked", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const value: ScheduleValue = {
				dueDate: new Date(2026, 0, 25),
				reminderAt: null,
				recurringPattern: null,
			};
			render(
				<TodoSchedulePopover value={value} onChange={onChange} clearable />,
			);

			await user.click(screen.getByTestId("todo-schedule-popover-clear"));

			expect(onChange).toHaveBeenCalledWith(emptyScheduleValue());
		});

		it("calls onChange with empty schedule when clear all is clicked", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const value: ScheduleValue = {
				dueDate: new Date(2026, 0, 25),
				reminderAt: null,
				recurringPattern: { type: "daily" },
			};
			render(
				<TodoSchedulePopover value={value} onChange={onChange} clearable />,
			);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("todo-schedule-popover-clear-all"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("todo-schedule-popover-clear-all"));

			expect(onChange).toHaveBeenCalledWith(emptyScheduleValue());
		});

		it("does not open popover when clear button is clicked", async () => {
			const user = userEvent.setup();
			const value: ScheduleValue = {
				dueDate: new Date(2026, 0, 25),
				reminderAt: null,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} clearable />);

			await user.click(screen.getByTestId("todo-schedule-popover-clear"));

			expect(
				screen.queryByTestId("todo-schedule-popover"),
			).not.toBeInTheDocument();
		});
	});

	describe("Due Date Changes", () => {
		it("calls onChange with updated due date when date picker changes", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<TodoSchedulePopover value={emptyValue} onChange={onChange} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("todo-schedule-popover")).toBeInTheDocument();
			});

			// Click on the date picker trigger
			await user.click(screen.getByTestId("date-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("date-picker-popover")).toBeInTheDocument();
			});

			// Click on a preset (Today)
			await user.click(screen.getByTestId("date-picker-preset-today"));

			expect(onChange).toHaveBeenCalled();
			const callArg = onChange.mock.calls[0][0];
			expect(callArg.dueDate).toBeInstanceOf(Date);
			expect(callArg.reminderAt).toBeNull();
			expect(callArg.recurringPattern).toBeNull();
		});

		it("clears reminder when due date is cleared", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			const dueDate = new Date(2026, 0, 26, 12, 0, 0);
			const reminderAt = new Date(2026, 0, 26, 11, 45, 0);
			const value: ScheduleValue = {
				dueDate,
				reminderAt,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover value={value} onChange={onChange} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("todo-schedule-popover")).toBeInTheDocument();
			});

			// Click on the date picker clear button
			await user.click(screen.getByTestId("date-picker-clear"));

			expect(onChange).toHaveBeenCalledWith({
				dueDate: null,
				reminderAt: null,
				recurringPattern: null,
			});
		});
	});

	describe("Recurring Pattern Changes", () => {
		it("calls onChange with updated recurring pattern", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(<TodoSchedulePopover value={emptyValue} onChange={onChange} />);

			await user.click(screen.getByTestId("todo-schedule-popover-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("todo-schedule-popover")).toBeInTheDocument();
			});

			// Click on the recurring picker trigger
			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-popover"),
				).toBeInTheDocument();
			});

			// Click on Daily preset
			await user.click(screen.getByTestId("recurring-picker-preset-daily"));

			expect(onChange).toHaveBeenCalledWith({
				dueDate: null,
				reminderAt: null,
				recurringPattern: { type: "daily" },
			});
		});
	});

	describe("Accessibility", () => {
		it("has proper aria-label when no schedule", () => {
			render(<TodoSchedulePopover {...defaultProps} />);

			const trigger = screen.getByTestId("todo-schedule-popover-trigger");
			expect(trigger).toHaveAttribute("aria-label", "Schedule");
		});

		it("has proper aria-label when schedule is set", () => {
			const date = new Date(2026, 0, 26);
			const value: ScheduleValue = {
				dueDate: date,
				reminderAt: null,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			const trigger = screen.getByTestId("todo-schedule-popover-trigger");
			expect(trigger).toHaveAttribute("aria-label", "Schedule: Mon, Jan 26");
		});

		it("clear button has proper aria-label", () => {
			const date = new Date(2026, 0, 25);
			const value: ScheduleValue = {
				dueDate: date,
				reminderAt: null,
				recurringPattern: null,
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} clearable />);

			const clearButton = screen.getByTestId("todo-schedule-popover-clear");
			expect(clearButton).toHaveAttribute("aria-label", "Clear schedule");
		});
	});

	describe("Helper Functions", () => {
		describe("formatScheduleValue", () => {
			it("returns null when no schedule values are set", () => {
				expect(formatScheduleValue(emptyScheduleValue())).toBeNull();
			});

			it("formats due date only", () => {
				const value: ScheduleValue = {
					dueDate: new Date(2026, 0, 26),
					reminderAt: null,
					recurringPattern: null,
				};
				expect(formatScheduleValue(value)).toBe("Mon, Jan 26");
			});

			it("formats recurring pattern only", () => {
				const value: ScheduleValue = {
					dueDate: null,
					reminderAt: null,
					recurringPattern: { type: "daily" },
				};
				expect(formatScheduleValue(value)).toBe("Daily");
			});

			it("formats due date and recurring pattern", () => {
				const value: ScheduleValue = {
					dueDate: new Date(2026, 0, 26),
					reminderAt: null,
					recurringPattern: { type: "weekly" },
				};
				expect(formatScheduleValue(value)).toBe("Mon, Jan 26 · Weekly");
			});

			it("does not include reminder in display", () => {
				const dueDate = new Date(2026, 0, 26, 12, 0, 0);
				const reminderAt = new Date(2026, 0, 26, 11, 0, 0);
				const value: ScheduleValue = {
					dueDate,
					reminderAt,
					recurringPattern: null,
				};
				expect(formatScheduleValue(value)).toBe("Mon, Jan 26");
			});
		});

		describe("hasSchedule", () => {
			it("returns false when no values are set", () => {
				expect(hasSchedule(emptyScheduleValue())).toBe(false);
			});

			it("returns true when due date is set", () => {
				const value: ScheduleValue = {
					dueDate: new Date(),
					reminderAt: null,
					recurringPattern: null,
				};
				expect(hasSchedule(value)).toBe(true);
			});

			it("returns true when reminder is set", () => {
				const value: ScheduleValue = {
					dueDate: null,
					reminderAt: new Date(),
					recurringPattern: null,
				};
				expect(hasSchedule(value)).toBe(true);
			});

			it("returns true when recurring pattern is set", () => {
				const value: ScheduleValue = {
					dueDate: null,
					reminderAt: null,
					recurringPattern: { type: "daily" },
				};
				expect(hasSchedule(value)).toBe(true);
			});

			it("returns true when all values are set", () => {
				const value: ScheduleValue = {
					dueDate: new Date(),
					reminderAt: new Date(),
					recurringPattern: { type: "weekly" },
				};
				expect(hasSchedule(value)).toBe(true);
			});
		});

		describe("emptyScheduleValue", () => {
			it("returns object with all null values", () => {
				const empty = emptyScheduleValue();
				expect(empty.dueDate).toBeNull();
				expect(empty.reminderAt).toBeNull();
				expect(empty.recurringPattern).toBeNull();
			});

			it("returns new object each time", () => {
				const empty1 = emptyScheduleValue();
				const empty2 = emptyScheduleValue();
				expect(empty1).not.toBe(empty2);
			});
		});
	});

	describe("Edge Cases", () => {
		it("handles reminder without due date gracefully", () => {
			const value: ScheduleValue = {
				dueDate: null,
				reminderAt: new Date(),
				recurringPattern: null,
			};
			// Should not throw
			render(<TodoSchedulePopover {...defaultProps} value={value} />);
		});

		it("handles complex recurring patterns", () => {
			const value: ScheduleValue = {
				dueDate: null,
				reminderAt: null,
				recurringPattern: {
					type: "weekly",
					interval: 2,
					daysOfWeek: [1, 3, 5],
				},
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			expect(
				screen.getByText("Every 2 weeks on Mon, Wed, Fri"),
			).toBeInTheDocument();
		});

		it("handles monthly recurring pattern", () => {
			const value: ScheduleValue = {
				dueDate: null,
				reminderAt: null,
				recurringPattern: {
					type: "monthly",
					dayOfMonth: 15,
				},
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			expect(screen.getByText("Monthly on the 15th")).toBeInTheDocument();
		});

		it("handles weekdays pattern", () => {
			const value: ScheduleValue = {
				dueDate: null,
				reminderAt: null,
				recurringPattern: {
					type: "weekly",
					daysOfWeek: [1, 2, 3, 4, 5],
				},
			};
			render(<TodoSchedulePopover {...defaultProps} value={value} />);

			expect(screen.getByText("Weekdays")).toBeInTheDocument();
		});
	});
});
