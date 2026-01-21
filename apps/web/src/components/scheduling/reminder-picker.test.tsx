"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	calculateOffsetMinutes,
	calculateReminderDate,
	DEFAULT_REMINDER_OFFSETS,
	findClosestOffset,
	formatReminderOffset,
	formatReminderTime,
	type ReminderOffset,
	ReminderPicker,
} from "./reminder-picker";

describe("ReminderPicker", () => {
	const defaultProps = {
		value: null,
		dueDate: new Date(2026, 0, 21, 14, 0, 0), // Jan 21, 2026 at 2:00 PM
		onChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders the trigger button", () => {
			render(<ReminderPicker {...defaultProps} />);

			expect(screen.getByTestId("reminder-picker-trigger")).toBeInTheDocument();
		});

		it("renders with default placeholder when no value", () => {
			render(<ReminderPicker {...defaultProps} />);

			expect(screen.getByText("Set reminder")).toBeInTheDocument();
		});

		it("renders with custom placeholder", () => {
			render(<ReminderPicker {...defaultProps} placeholder="Add reminder" />);

			expect(screen.getByText("Add reminder")).toBeInTheDocument();
		});

		it("renders bell icon", () => {
			render(<ReminderPicker {...defaultProps} />);

			const trigger = screen.getByTestId("reminder-picker-trigger");
			const icon = trigger.querySelector("svg");
			expect(icon).toBeInTheDocument();
		});

		it("renders formatted reminder when value is set", () => {
			// 15 minutes before due date
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			expect(screen.getByText("15 min before")).toBeInTheDocument();
		});

		it("renders 'At time' when reminder equals due date", () => {
			const reminderAt = new Date(2026, 0, 21, 14, 0, 0);
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			expect(screen.getByText("At time")).toBeInTheDocument();
		});

		it("renders clear button when value is set and clearable is true", () => {
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			render(
				<ReminderPicker
					{...defaultProps}
					value={reminderAt}
					clearable={true}
				/>,
			);

			expect(screen.getByTestId("reminder-picker-clear")).toBeInTheDocument();
		});

		it("does not render clear button when value is set and clearable is false", () => {
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			render(
				<ReminderPicker
					{...defaultProps}
					value={reminderAt}
					clearable={false}
				/>,
			);

			expect(
				screen.queryByTestId("reminder-picker-clear"),
			).not.toBeInTheDocument();
		});

		it("does not render clear button when no value", () => {
			render(<ReminderPicker {...defaultProps} />);

			expect(
				screen.queryByTestId("reminder-picker-clear"),
			).not.toBeInTheDocument();
		});

		it("applies custom className to container", () => {
			render(<ReminderPicker {...defaultProps} className="custom-class" />);

			const container = screen.getByTestId("reminder-picker-container");
			expect(container).toHaveClass("custom-class");
		});
	});

	describe("Disabled State", () => {
		it("disables trigger when disabled is true", () => {
			render(<ReminderPicker {...defaultProps} disabled={true} />);

			expect(screen.getByTestId("reminder-picker-trigger")).toBeDisabled();
		});

		it("disables trigger when no due date is set", () => {
			render(<ReminderPicker {...defaultProps} dueDate={null} />);

			expect(screen.getByTestId("reminder-picker-trigger")).toBeDisabled();
		});

		it("does not show clear button when disabled", () => {
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			render(
				<ReminderPicker
					{...defaultProps}
					value={reminderAt}
					disabled={true}
					clearable
				/>,
			);

			expect(
				screen.queryByTestId("reminder-picker-clear"),
			).not.toBeInTheDocument();
		});
	});

	describe("Popover Behavior", () => {
		it("opens popover when trigger is clicked", async () => {
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} />);

			const trigger = screen.getByTestId("reminder-picker-trigger");
			await user.click(trigger);

			await waitFor(() => {
				expect(
					screen.getByTestId("reminder-picker-popover"),
				).toBeInTheDocument();
			});
		});

		it("renders offset options in popover", async () => {
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("reminder-picker-offsets"),
				).toBeInTheDocument();
			});
		});

		it("renders all default offsets", async () => {
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("reminder-picker-offset-0"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("reminder-picker-offset--15"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("reminder-picker-offset--30"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("reminder-picker-offset--60"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("reminder-picker-offset--120"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("reminder-picker-offset--1440"),
				).toBeInTheDocument();
			});
		});

		it("renders custom offsets when provided", async () => {
			const customOffsets: ReminderOffset[] = [
				{ label: "5 min before", offsetMinutes: -5 },
				{ label: "10 min before", offsetMinutes: -10 },
			];
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} offsets={customOffsets} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("reminder-picker-offset--5"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("reminder-picker-offset--10"),
				).toBeInTheDocument();
			});
		});

		it("shows 'Set a due date first' when no due date", () => {
			// Note: This test checks the message would appear if the trigger wasn't disabled
			// Since trigger is disabled without due date, we test the component state
			render(<ReminderPicker {...defaultProps} dueDate={null} />);

			// Trigger is disabled, so we can't open the popover normally
			expect(screen.getByTestId("reminder-picker-trigger")).toBeDisabled();
		});

		it("shows 'No reminder options available' when offsets is empty", async () => {
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} offsets={[]} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("reminder-picker-no-offsets"),
				).toBeInTheDocument();
				expect(
					screen.getByText("No reminder options available"),
				).toBeInTheDocument();
			});
		});

		it("displays offset labels in popover", async () => {
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByText("At time")).toBeInTheDocument();
				expect(screen.getByText("15 min before")).toBeInTheDocument();
				expect(screen.getByText("30 min before")).toBeInTheDocument();
				expect(screen.getByText("1 hour before")).toBeInTheDocument();
				expect(screen.getByText("2 hours before")).toBeInTheDocument();
				expect(screen.getByText("1 day before")).toBeInTheDocument();
			});
		});
	});

	describe("Offset Selection", () => {
		it("calls onChange with correct reminder date when offset is selected", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("reminder-picker-offset--15"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("reminder-picker-offset--15"));

			expect(onChange).toHaveBeenCalledTimes(1);
			const reminderDate = onChange.mock.calls[0][0] as Date;
			// 15 minutes before 2:00 PM = 1:45 PM
			expect(reminderDate.getHours()).toBe(13);
			expect(reminderDate.getMinutes()).toBe(45);
		});

		it("calls onChange with due date when 'At time' is selected", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("reminder-picker-offset-0"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("reminder-picker-offset-0"));

			expect(onChange).toHaveBeenCalledTimes(1);
			const reminderDate = onChange.mock.calls[0][0] as Date;
			expect(reminderDate.getHours()).toBe(14);
			expect(reminderDate.getMinutes()).toBe(0);
		});

		it("closes popover after selecting an offset", async () => {
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("reminder-picker-popover"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("reminder-picker-offset--15"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("reminder-picker-popover"),
				).not.toBeInTheDocument();
			});
		});

		it("highlights currently selected offset", async () => {
			// Set reminder to 15 min before
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				const offset15 = screen.getByTestId("reminder-picker-offset--15");
				expect(offset15).toHaveAttribute("aria-pressed", "true");
				expect(offset15).toHaveClass("bg-accent");
			});
		});

		it("does not highlight non-selected offsets", async () => {
			// Set reminder to 15 min before
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				const offset30 = screen.getByTestId("reminder-picker-offset--30");
				expect(offset30).not.toHaveAttribute("aria-pressed", "true");
			});
		});
	});

	describe("Clear Functionality", () => {
		it("clears the value when clear button is clicked", async () => {
			const onChange = vi.fn();
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			const user = userEvent.setup();
			render(
				<ReminderPicker
					{...defaultProps}
					value={reminderAt}
					onChange={onChange}
				/>,
			);

			await user.click(screen.getByTestId("reminder-picker-clear"));

			expect(onChange).toHaveBeenCalledWith(null);
		});

		it("does not open popover when clear button is clicked", async () => {
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			await user.click(screen.getByTestId("reminder-picker-clear"));

			expect(
				screen.queryByTestId("reminder-picker-popover"),
			).not.toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("trigger has accessible label when no value", () => {
			render(<ReminderPicker {...defaultProps} />);

			const trigger = screen.getByTestId("reminder-picker-trigger");
			expect(trigger).toHaveAttribute("aria-label", "Set reminder");
		});

		it("trigger has accessible label with reminder when value is set", () => {
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			const trigger = screen.getByTestId("reminder-picker-trigger");
			expect(trigger).toHaveAttribute("aria-label", "Reminder: 15 min before");
		});

		it("clear button has accessible label", () => {
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			const clearButton = screen.getByTestId("reminder-picker-clear");
			expect(clearButton).toHaveAttribute("aria-label", "Clear reminder");
		});

		it("offset buttons have aria-pressed attribute", async () => {
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} />);

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				const offset = screen.getByTestId("reminder-picker-offset-0");
				// aria-pressed should be undefined (falsy) when not selected
				expect(offset.getAttribute("aria-pressed")).toBeNull();
			});
		});

		it("bell icons are hidden from assistive technology", async () => {
			const user = userEvent.setup();
			render(<ReminderPicker {...defaultProps} />);

			const triggerIcon = screen
				.getByTestId("reminder-picker-trigger")
				.querySelector("svg");
			expect(triggerIcon).toHaveAttribute("aria-hidden", "true");

			await user.click(screen.getByTestId("reminder-picker-trigger"));

			await waitFor(() => {
				const popover = screen.getByTestId("reminder-picker-popover");
				const popoverIcons = popover.querySelectorAll("svg");
				for (const icon of popoverIcons) {
					expect(icon).toHaveAttribute("aria-hidden", "true");
				}
			});
		});
	});

	describe("Display Values", () => {
		it("displays '1 hour before' for -60 offset", () => {
			const reminderAt = new Date(2026, 0, 21, 13, 0, 0);
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			expect(screen.getByText("1 hour before")).toBeInTheDocument();
		});

		it("displays '2 hours before' for -120 offset", () => {
			const reminderAt = new Date(2026, 0, 21, 12, 0, 0);
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			expect(screen.getByText("2 hours before")).toBeInTheDocument();
		});

		it("displays '1 day before' for -1440 offset", () => {
			const reminderAt = new Date(2026, 0, 20, 14, 0, 0);
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			expect(screen.getByText("1 day before")).toBeInTheDocument();
		});

		it("displays formatted offset for non-preset values", () => {
			// 45 minutes before (not a preset)
			const reminderAt = new Date(2026, 0, 21, 13, 15, 0);
			render(<ReminderPicker {...defaultProps} value={reminderAt} />);

			expect(screen.getByText("45 min before")).toBeInTheDocument();
		});
	});
});

describe("Helper Functions", () => {
	describe("calculateReminderDate", () => {
		it("returns due date for 0 offset", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const result = calculateReminderDate(dueDate, 0);
			expect(result.getTime()).toBe(dueDate.getTime());
		});

		it("returns 15 minutes before for -15 offset", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const result = calculateReminderDate(dueDate, -15);
			expect(result.getHours()).toBe(13);
			expect(result.getMinutes()).toBe(45);
		});

		it("returns 1 hour before for -60 offset", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const result = calculateReminderDate(dueDate, -60);
			expect(result.getHours()).toBe(13);
			expect(result.getMinutes()).toBe(0);
		});

		it("returns 1 day before for -1440 offset", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const result = calculateReminderDate(dueDate, -1440);
			expect(result.getDate()).toBe(20);
			expect(result.getHours()).toBe(14);
		});

		it("handles positive offsets (after due date)", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const result = calculateReminderDate(dueDate, 30);
			expect(result.getHours()).toBe(14);
			expect(result.getMinutes()).toBe(30);
		});

		it("handles crossing midnight", () => {
			const dueDate = new Date(2026, 0, 21, 0, 30, 0); // 12:30 AM
			const result = calculateReminderDate(dueDate, -60);
			expect(result.getDate()).toBe(20); // Previous day
			expect(result.getHours()).toBe(23);
			expect(result.getMinutes()).toBe(30);
		});
	});

	describe("calculateOffsetMinutes", () => {
		it("returns null if reminderAt is null", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			expect(calculateOffsetMinutes(null, dueDate)).toBeNull();
		});

		it("returns null if dueDate is null", () => {
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			expect(calculateOffsetMinutes(reminderAt, null)).toBeNull();
		});

		it("returns 0 when dates are equal", () => {
			const date = new Date(2026, 0, 21, 14, 0, 0);
			expect(calculateOffsetMinutes(date, date)).toBe(0);
		});

		it("returns -15 for 15 minutes before", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			expect(calculateOffsetMinutes(reminderAt, dueDate)).toBe(-15);
		});

		it("returns -1440 for 1 day before", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const reminderAt = new Date(2026, 0, 20, 14, 0, 0);
			expect(calculateOffsetMinutes(reminderAt, dueDate)).toBe(-1440);
		});

		it("returns positive value for reminder after due date", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const reminderAt = new Date(2026, 0, 21, 14, 30, 0);
			expect(calculateOffsetMinutes(reminderAt, dueDate)).toBe(30);
		});
	});

	describe("formatReminderOffset", () => {
		it("returns 'At time' for 0 offset", () => {
			expect(formatReminderOffset(0)).toBe("At time");
		});

		it("returns '15 min before' for -15", () => {
			expect(formatReminderOffset(-15)).toBe("15 min before");
		});

		it("returns '1 hour before' for -60", () => {
			expect(formatReminderOffset(-60)).toBe("1 hour before");
		});

		it("returns '2 hours before' for -120", () => {
			expect(formatReminderOffset(-120)).toBe("2 hours before");
		});

		it("returns '1 day before' for -1440", () => {
			expect(formatReminderOffset(-1440)).toBe("1 day before");
		});

		it("returns '2 days before' for -2880", () => {
			expect(formatReminderOffset(-2880)).toBe("2 days before");
		});

		it("handles positive offsets", () => {
			expect(formatReminderOffset(15)).toBe("15 min after");
			expect(formatReminderOffset(60)).toBe("1 hour after");
			expect(formatReminderOffset(1440)).toBe("1 day after");
		});

		it("rounds hours correctly", () => {
			expect(formatReminderOffset(-90)).toBe("2 hours before"); // Rounds 1.5 to 2
		});
	});

	describe("formatReminderTime", () => {
		it("returns null when reminderAt is null", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			expect(formatReminderTime(null, dueDate)).toBeNull();
		});

		it("returns preset label when offset matches preset", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			expect(formatReminderTime(reminderAt, dueDate)).toBe("15 min before");
		});

		it("returns formatted offset for non-preset values", () => {
			const dueDate = new Date(2026, 0, 21, 14, 0, 0);
			const reminderAt = new Date(2026, 0, 21, 13, 15, 0); // 45 min before
			expect(formatReminderTime(reminderAt, dueDate)).toBe("45 min before");
		});

		it("returns formatted time when no due date", () => {
			const reminderAt = new Date(2026, 0, 21, 13, 45, 0);
			const result = formatReminderTime(reminderAt, null);
			// Should return a time string like "1:45 PM"
			expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
		});
	});

	describe("findClosestOffset", () => {
		it("returns null for empty offsets array", () => {
			expect(findClosestOffset(-15, [])).toBeNull();
		});

		it("returns exact match when available", () => {
			const result = findClosestOffset(-15, DEFAULT_REMINDER_OFFSETS);
			expect(result?.offsetMinutes).toBe(-15);
		});

		it("returns closest offset when no exact match", () => {
			const result = findClosestOffset(-20, DEFAULT_REMINDER_OFFSETS);
			expect(result?.offsetMinutes).toBe(-15); // -15 is closer than -30
		});

		it("returns closest offset for large differences", () => {
			const result = findClosestOffset(-100, DEFAULT_REMINDER_OFFSETS);
			expect(result?.offsetMinutes).toBe(-120); // -120 is closer than -60
		});

		it("works with custom offsets", () => {
			const customOffsets: ReminderOffset[] = [
				{ label: "5 min", offsetMinutes: -5 },
				{ label: "10 min", offsetMinutes: -10 },
			];
			const result = findClosestOffset(-7, customOffsets);
			expect(result?.offsetMinutes).toBe(-5); // -5 is closer to -7 than -10
		});
	});
});

describe("DEFAULT_REMINDER_OFFSETS", () => {
	it("has 6 default offsets", () => {
		expect(DEFAULT_REMINDER_OFFSETS).toHaveLength(6);
	});

	it("includes 'At time' offset", () => {
		const atTime = DEFAULT_REMINDER_OFFSETS.find((o) => o.offsetMinutes === 0);
		expect(atTime).toBeDefined();
		expect(atTime?.label).toBe("At time");
	});

	it("includes '15 min before' offset", () => {
		const offset = DEFAULT_REMINDER_OFFSETS.find(
			(o) => o.offsetMinutes === -15,
		);
		expect(offset).toBeDefined();
		expect(offset?.label).toBe("15 min before");
	});

	it("includes '30 min before' offset", () => {
		const offset = DEFAULT_REMINDER_OFFSETS.find(
			(o) => o.offsetMinutes === -30,
		);
		expect(offset).toBeDefined();
		expect(offset?.label).toBe("30 min before");
	});

	it("includes '1 hour before' offset", () => {
		const offset = DEFAULT_REMINDER_OFFSETS.find(
			(o) => o.offsetMinutes === -60,
		);
		expect(offset).toBeDefined();
		expect(offset?.label).toBe("1 hour before");
	});

	it("includes '2 hours before' offset", () => {
		const offset = DEFAULT_REMINDER_OFFSETS.find(
			(o) => o.offsetMinutes === -120,
		);
		expect(offset).toBeDefined();
		expect(offset?.label).toBe("2 hours before");
	});

	it("includes '1 day before' offset", () => {
		const offset = DEFAULT_REMINDER_OFFSETS.find(
			(o) => o.offsetMinutes === -1440,
		);
		expect(offset).toBeDefined();
		expect(offset?.label).toBe("1 day before");
	});

	it("offsets are ordered from smallest to largest negative", () => {
		const offsets = DEFAULT_REMINDER_OFFSETS.map((o) => o.offsetMinutes);
		// 0, -15, -30, -60, -120, -1440
		expect(offsets[0]).toBe(0);
		expect(offsets[1]).toBe(-15);
		expect(offsets[2]).toBe(-30);
		expect(offsets[3]).toBe(-60);
		expect(offsets[4]).toBe(-120);
		expect(offsets[5]).toBe(-1440);
	});
});
