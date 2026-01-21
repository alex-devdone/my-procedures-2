"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	DAY_LABELS,
	DEFAULT_RECURRING_PRESETS,
	FULL_DAY_LABELS,
	formatOrdinal,
	formatRecurringPattern,
	PATTERN_TYPE_LABELS,
	patternsEqual,
	RecurringPicker,
	type RecurringPreset,
} from "./recurring-picker";

describe("RecurringPicker", () => {
	const defaultProps = {
		value: null,
		onChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders the trigger button", () => {
			render(<RecurringPicker {...defaultProps} />);

			expect(
				screen.getByTestId("recurring-picker-trigger"),
			).toBeInTheDocument();
		});

		it("renders with default placeholder when no value", () => {
			render(<RecurringPicker {...defaultProps} />);

			expect(screen.getByText("Set recurrence")).toBeInTheDocument();
		});

		it("renders with custom placeholder", () => {
			render(<RecurringPicker {...defaultProps} placeholder="Add repeat" />);

			expect(screen.getByText("Add repeat")).toBeInTheDocument();
		});

		it("renders repeat icon", () => {
			render(<RecurringPicker {...defaultProps} />);

			const trigger = screen.getByTestId("recurring-picker-trigger");
			const icon = trigger.querySelector("svg");
			expect(icon).toBeInTheDocument();
		});

		it("renders formatted pattern when value is set", () => {
			render(<RecurringPicker {...defaultProps} value={{ type: "daily" }} />);

			expect(screen.getByText("Daily")).toBeInTheDocument();
		});

		it("renders clear button when value is set and clearable is true", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily" }}
					clearable={true}
				/>,
			);

			expect(screen.getByTestId("recurring-picker-clear")).toBeInTheDocument();
		});

		it("does not render clear button when value is set and clearable is false", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily" }}
					clearable={false}
				/>,
			);

			expect(
				screen.queryByTestId("recurring-picker-clear"),
			).not.toBeInTheDocument();
		});

		it("does not render clear button when no value", () => {
			render(<RecurringPicker {...defaultProps} />);

			expect(
				screen.queryByTestId("recurring-picker-clear"),
			).not.toBeInTheDocument();
		});

		it("applies custom className to container", () => {
			render(<RecurringPicker {...defaultProps} className="custom-class" />);

			const container = screen.getByTestId("recurring-picker-container");
			expect(container).toHaveClass("custom-class");
		});
	});

	describe("Disabled State", () => {
		it("disables trigger when disabled is true", () => {
			render(<RecurringPicker {...defaultProps} disabled={true} />);

			expect(screen.getByTestId("recurring-picker-trigger")).toBeDisabled();
		});

		it("does not show clear button when disabled", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily" }}
					disabled={true}
					clearable
				/>,
			);

			expect(
				screen.queryByTestId("recurring-picker-clear"),
			).not.toBeInTheDocument();
		});
	});

	describe("Popover Behavior", () => {
		it("opens popover when trigger is clicked", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			const trigger = screen.getByTestId("recurring-picker-trigger");
			await user.click(trigger);

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-popover"),
				).toBeInTheDocument();
			});
		});

		it("renders presets section in popover", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-presets"),
				).toBeInTheDocument();
			});
		});

		it("renders all default presets", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-preset-daily"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("recurring-picker-preset-weekly"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("recurring-picker-preset-weekdays"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("recurring-picker-preset-monthly"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("recurring-picker-preset-yearly"),
				).toBeInTheDocument();
			});
		});

		it("renders custom presets when provided", async () => {
			const customPresets: RecurringPreset[] = [
				{ label: "Biweekly", pattern: { type: "weekly", interval: 2 } },
				{ label: "Quarterly", pattern: { type: "monthly", interval: 3 } },
			];
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} presets={customPresets} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-preset-biweekly"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("recurring-picker-preset-quarterly"),
				).toBeInTheDocument();
			});
		});

		it("renders custom pattern builder section", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-custom"),
				).toBeInTheDocument();
			});
		});

		it("renders pattern type selector in custom section", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-trigger"),
				).toBeInTheDocument();
			});
		});

		it("renders interval input in custom section", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-interval"),
				).toBeInTheDocument();
			});
		});

		it("renders apply button in custom section", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-apply"),
				).toBeInTheDocument();
			});
		});
	});

	describe("Preset Selection", () => {
		it("calls onChange with preset pattern when preset is selected", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-preset-daily"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-preset-daily"));

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith({ type: "daily" });
		});

		it("calls onChange with weekdays pattern", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-preset-weekdays"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-preset-weekdays"));

			expect(onChange).toHaveBeenCalledWith({
				type: "weekly",
				daysOfWeek: [1, 2, 3, 4, 5],
			});
		});

		it("closes popover after selecting a preset", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-popover"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-preset-daily"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("recurring-picker-popover"),
				).not.toBeInTheDocument();
			});
		});

		it("highlights currently selected preset", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "daily" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				const dailyPreset = screen.getByTestId("recurring-picker-preset-daily");
				expect(dailyPreset).toHaveAttribute("aria-pressed", "true");
			});
		});

		it("does not highlight non-selected presets", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "daily" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				const weeklyPreset = screen.getByTestId(
					"recurring-picker-preset-weekly",
				);
				expect(weeklyPreset).toHaveAttribute("aria-pressed", "false");
			});
		});
	});

	describe("Pattern Type Selector", () => {
		it("shows current pattern type in selector", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "weekly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				const typeSelector = screen.getByTestId(
					"recurring-picker-type-trigger",
				);
				expect(typeSelector).toHaveTextContent("Weekly");
			});
		});

		it("opens type dropdown when clicked", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-trigger"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-type-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-dropdown"),
				).toBeInTheDocument();
			});
		});

		it("shows all pattern types in dropdown", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));
			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-trigger"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-type-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-daily"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("recurring-picker-type-weekly"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("recurring-picker-type-monthly"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("recurring-picker-type-yearly"),
				).toBeInTheDocument();
				expect(
					screen.getByTestId("recurring-picker-type-custom"),
				).toBeInTheDocument();
			});
		});

		it("changes pattern type when option is selected", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));
			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-trigger"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-type-trigger"));
			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-weekly"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-type-weekly"));

			await waitFor(() => {
				// Type dropdown should close
				expect(
					screen.queryByTestId("recurring-picker-type-dropdown"),
				).not.toBeInTheDocument();
				// Type selector should show new value
				const typeSelector = screen.getByTestId(
					"recurring-picker-type-trigger",
				);
				expect(typeSelector).toHaveTextContent("Weekly");
			});
		});
	});

	describe("Interval Input", () => {
		it("shows interval input with default value of 1", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				const input = screen.getByTestId("recurring-picker-interval-input");
				expect(input).toHaveValue(1);
			});
		});

		it("allows changing interval value", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-interval-input"),
				).toBeInTheDocument();
			});

			const input = screen.getByTestId(
				"recurring-picker-interval-input",
			) as HTMLInputElement;
			// Focus, select all with Ctrl+A, then type
			await user.click(input);
			await user.keyboard("{Control>}a{/Control}");
			await user.keyboard("3");

			expect(input).toHaveValue(3);
		});

		it("displays correct unit label for daily", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				const interval = screen.getByTestId("recurring-picker-interval");
				expect(interval).toHaveTextContent("day");
			});
		});

		it("displays plural unit label when interval > 1", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-interval-input"),
				).toBeInTheDocument();
			});

			const input = screen.getByTestId("recurring-picker-interval-input");
			await user.clear(input);
			await user.type(input, "2");

			const interval = screen.getByTestId("recurring-picker-interval");
			expect(interval).toHaveTextContent("days");
		});
	});

	describe("Day Selector (Weekly/Custom)", () => {
		it("shows day selector when pattern type is weekly", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "weekly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-day-selector"),
				).toBeInTheDocument();
			});
		});

		it("shows day selector when pattern type is custom", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "custom" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-day-selector"),
				).toBeInTheDocument();
			});
		});

		it("does not show day selector for daily", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "daily" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("recurring-picker-day-selector"),
				).not.toBeInTheDocument();
			});
		});

		it("renders all 7 days in day selector", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "weekly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				for (let i = 0; i < 7; i++) {
					expect(
						screen.getByTestId(`recurring-picker-day-${i}`),
					).toBeInTheDocument();
				}
			});
		});

		it("highlights selected days", async () => {
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "weekly", daysOfWeek: [1, 3, 5] }}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("recurring-picker-day-1")).toHaveAttribute(
					"aria-pressed",
					"true",
				);
				expect(screen.getByTestId("recurring-picker-day-3")).toHaveAttribute(
					"aria-pressed",
					"true",
				);
				expect(screen.getByTestId("recurring-picker-day-5")).toHaveAttribute(
					"aria-pressed",
					"true",
				);
				expect(screen.getByTestId("recurring-picker-day-0")).toHaveAttribute(
					"aria-pressed",
					"false",
				);
			});
		});

		it("toggles day selection when clicked", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "weekly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-day-1"),
				).toBeInTheDocument();
			});

			// Click Monday (day 1)
			await user.click(screen.getByTestId("recurring-picker-day-1"));

			await waitFor(() => {
				expect(screen.getByTestId("recurring-picker-day-1")).toHaveAttribute(
					"aria-pressed",
					"true",
				);
			});

			// Click again to deselect
			await user.click(screen.getByTestId("recurring-picker-day-1"));

			await waitFor(() => {
				expect(screen.getByTestId("recurring-picker-day-1")).toHaveAttribute(
					"aria-pressed",
					"false",
				);
			});
		});
	});

	describe("Day of Month Input (Monthly)", () => {
		it("shows day of month input when pattern type is monthly", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "monthly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-day-of-month"),
				).toBeInTheDocument();
			});
		});

		it("does not show day of month input for weekly", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "weekly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("recurring-picker-day-of-month"),
				).not.toBeInTheDocument();
			});
		});

		it("allows entering day of month", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "monthly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-day-of-month-input"),
				).toBeInTheDocument();
			});

			const input = screen.getByTestId("recurring-picker-day-of-month-input");
			await user.type(input, "15");

			expect(input).toHaveValue(15);
		});
	});

	describe("Apply Button", () => {
		it("calls onChange with edited pattern when Apply is clicked", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-interval-input"),
				).toBeInTheDocument();
			});

			// Change interval to 3 by selecting all and typing
			const input = screen.getByTestId(
				"recurring-picker-interval-input",
			) as HTMLInputElement;
			await user.click(input);
			await user.keyboard("{Control>}a{/Control}");
			await user.keyboard("3");

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			expect(onChange).toHaveBeenCalledWith({ type: "daily", interval: 3 });
		});

		it("closes popover after Apply is clicked", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-popover"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-apply"));

			await waitFor(() => {
				expect(
					screen.queryByTestId("recurring-picker-popover"),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Clear Functionality", () => {
		it("clears the value when clear button is clicked", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily" }}
					onChange={onChange}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-clear"));

			expect(onChange).toHaveBeenCalledWith(null);
		});

		it("does not open popover when clear button is clicked", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "daily" }} />);

			await user.click(screen.getByTestId("recurring-picker-clear"));

			expect(
				screen.queryByTestId("recurring-picker-popover"),
			).not.toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("trigger has accessible label when no value", () => {
			render(<RecurringPicker {...defaultProps} />);

			const trigger = screen.getByTestId("recurring-picker-trigger");
			expect(trigger).toHaveAttribute("aria-label", "Set recurrence");
		});

		it("trigger has accessible label with pattern when value is set", () => {
			render(<RecurringPicker {...defaultProps} value={{ type: "daily" }} />);

			const trigger = screen.getByTestId("recurring-picker-trigger");
			expect(trigger).toHaveAttribute("aria-label", "Recurrence: Daily");
		});

		it("clear button has accessible label", () => {
			render(<RecurringPicker {...defaultProps} value={{ type: "daily" }} />);

			const clearButton = screen.getByTestId("recurring-picker-clear");
			expect(clearButton).toHaveAttribute("aria-label", "Clear recurrence");
		});

		it("day buttons have aria-pressed attribute", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "weekly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				const day = screen.getByTestId("recurring-picker-day-0");
				expect(day.getAttribute("aria-pressed")).toBeDefined();
			});
		});

		it("day buttons have full day name as aria-label", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "weekly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("recurring-picker-day-0")).toHaveAttribute(
					"aria-label",
					"Sunday",
				);
				expect(screen.getByTestId("recurring-picker-day-1")).toHaveAttribute(
					"aria-label",
					"Monday",
				);
			});
		});

		it("interval input has accessible label", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				const input = screen.getByTestId("recurring-picker-interval-input");
				expect(input).toHaveAttribute("aria-label", "Interval value");
			});
		});

		it("day of month input has accessible label", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} value={{ type: "monthly" }} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				const input = screen.getByTestId("recurring-picker-day-of-month-input");
				expect(input).toHaveAttribute("aria-label", "Day of month");
			});
		});

		it("icons are hidden from assistive technology", () => {
			render(<RecurringPicker {...defaultProps} />);

			const triggerIcon = screen
				.getByTestId("recurring-picker-trigger")
				.querySelector("svg");
			expect(triggerIcon).toHaveAttribute("aria-hidden", "true");
		});
	});

	describe("Display Values", () => {
		it("displays 'Daily' for daily pattern", () => {
			render(<RecurringPicker {...defaultProps} value={{ type: "daily" }} />);

			expect(screen.getByText("Daily")).toBeInTheDocument();
		});

		it("displays 'Every 3 days' for daily pattern with interval", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily", interval: 3 }}
				/>,
			);

			expect(screen.getByText("Every 3 days")).toBeInTheDocument();
		});

		it("displays 'Weekly' for weekly pattern", () => {
			render(<RecurringPicker {...defaultProps} value={{ type: "weekly" }} />);

			expect(screen.getByText("Weekly")).toBeInTheDocument();
		});

		it("displays 'Weekdays' for Mon-Fri pattern", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "weekly", daysOfWeek: [1, 2, 3, 4, 5] }}
				/>,
			);

			expect(screen.getByText("Weekdays")).toBeInTheDocument();
		});

		it("displays 'Weekends' for Sat-Sun pattern", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "weekly", daysOfWeek: [0, 6] }}
				/>,
			);

			expect(screen.getByText("Weekends")).toBeInTheDocument();
		});

		it("displays 'Weekly on Mon, Wed, Fri' for specific days", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "weekly", daysOfWeek: [1, 3, 5] }}
				/>,
			);

			expect(screen.getByText("Weekly on Mon, Wed, Fri")).toBeInTheDocument();
		});

		it("displays 'Monthly' for monthly pattern", () => {
			render(<RecurringPicker {...defaultProps} value={{ type: "monthly" }} />);

			expect(screen.getByText("Monthly")).toBeInTheDocument();
		});

		it("displays 'Monthly on the 15th' for monthly with dayOfMonth", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "monthly", dayOfMonth: 15 }}
				/>,
			);

			expect(screen.getByText("Monthly on the 15th")).toBeInTheDocument();
		});

		it("displays 'Yearly' for yearly pattern", () => {
			render(<RecurringPicker {...defaultProps} value={{ type: "yearly" }} />);

			expect(screen.getByText("Yearly")).toBeInTheDocument();
		});

		it("displays 'Every 2 years' for yearly with interval", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "yearly", interval: 2 }}
				/>,
			);

			expect(screen.getByText("Every 2 years")).toBeInTheDocument();
		});

		it("displays time when notifyAt is set", () => {
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily", notifyAt: "09:00" }}
				/>,
			);

			expect(screen.getByText("Daily at 9:00 AM")).toBeInTheDocument();
		});
	});

	describe("TimePicker Integration", () => {
		it("renders time picker in popover", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("recurring-picker-time")).toBeInTheDocument();
			});
		});

		it("renders time picker input", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("time-picker-input")).toBeInTheDocument();
			});
		});

		it("renders time presets", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("time-picker-presets")).toBeInTheDocument();
			});
		});

		it("sets notifyAt when time is selected from presets", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("time-picker-preset-morning"),
				).toBeInTheDocument();
			});

			// Click morning preset (09:00)
			await user.click(screen.getByTestId("time-picker-preset-morning"));

			// Click Apply to save the pattern with the time
			await user.click(screen.getByTestId("recurring-picker-apply"));

			expect(onChange).toHaveBeenCalledWith({
				type: "daily",
				notifyAt: "09:00",
			});
		});

		it("shows existing notifyAt value in time picker", async () => {
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily", notifyAt: "14:30" }}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				const input = screen.getByTestId("time-picker-input");
				expect(input).toHaveValue("14:30");
			});
		});

		it("allows changing notifyAt value", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily", notifyAt: "09:00" }}
					onChange={onChange}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("time-picker-input")).toBeInTheDocument();
			});

			// Click noon preset (12:00)
			await user.click(screen.getByTestId("time-picker-preset-noon"));

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			expect(onChange).toHaveBeenCalledWith({
				type: "daily",
				notifyAt: "12:00",
			});
		});

		it("clears notifyAt when time is cleared", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily", notifyAt: "09:00" }}
					onChange={onChange}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("time-picker-clear")).toBeInTheDocument();
			});

			// Clear the time
			await user.click(screen.getByTestId("time-picker-clear"));

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			// notifyAt should be undefined (not in the pattern)
			expect(onChange).toHaveBeenCalledWith({ type: "daily" });
		});

		it("preserves notifyAt when changing pattern type", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily", notifyAt: "09:00" }}
					onChange={onChange}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			// Change pattern type to weekly
			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-trigger"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-type-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-weekly"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-type-weekly"));

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			// notifyAt should be preserved
			expect(onChange).toHaveBeenCalledWith({
				type: "weekly",
				notifyAt: "09:00",
			});
		});

		it("allows typing time directly into input", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("time-picker-input")).toBeInTheDocument();
			});

			const input = screen.getByTestId("time-picker-input");
			await user.type(input, "14:30");

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			expect(onChange).toHaveBeenCalledWith({
				type: "daily",
				notifyAt: "14:30",
			});
		});

		it("selects evening preset correctly", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("time-picker-preset-evening"),
				).toBeInTheDocument();
			});

			// Click evening preset (18:00)
			await user.click(screen.getByTestId("time-picker-preset-evening"));

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			expect(onChange).toHaveBeenCalledWith({
				type: "daily",
				notifyAt: "18:00",
			});
		});

		it("preserves notifyAt when changing interval", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily", notifyAt: "09:00" }}
					onChange={onChange}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-interval-input"),
				).toBeInTheDocument();
			});

			// Change interval to 2
			const input = screen.getByTestId("recurring-picker-interval-input");
			await user.click(input);
			await user.keyboard("{Control>}a{/Control}");
			await user.keyboard("2");

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			// notifyAt and interval should both be set
			expect(onChange).toHaveBeenCalledWith({
				type: "daily",
				interval: 2,
				notifyAt: "09:00",
			});
		});

		it("preserves notifyAt when selecting days of week", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "weekly", notifyAt: "10:00" }}
					onChange={onChange}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-day-selector"),
				).toBeInTheDocument();
			});

			// Select Monday (day 1)
			await user.click(screen.getByTestId("recurring-picker-day-1"));

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			expect(onChange).toHaveBeenCalledWith({
				type: "weekly",
				daysOfWeek: [1],
				notifyAt: "10:00",
			});
		});

		it("preserves notifyAt when setting day of month", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "monthly", notifyAt: "08:00" }}
					onChange={onChange}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-day-of-month-input"),
				).toBeInTheDocument();
			});

			// Set day of month to 15
			const input = screen.getByTestId("recurring-picker-day-of-month-input");
			await user.type(input, "15");

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			expect(onChange).toHaveBeenCalledWith({
				type: "monthly",
				dayOfMonth: 15,
				notifyAt: "08:00",
			});
		});

		it("shows clear button only when time is set", async () => {
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("time-picker-input")).toBeInTheDocument();
			});

			// Clear button should not be visible initially
			expect(screen.queryByTestId("time-picker-clear")).not.toBeInTheDocument();

			// Set a time via preset
			await user.click(screen.getByTestId("time-picker-preset-morning"));

			// Clear button should now be visible
			await waitFor(() => {
				expect(screen.getByTestId("time-picker-clear")).toBeInTheDocument();
			});
		});

		it("resets time when popover is reopened after clearing", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<RecurringPicker
					{...defaultProps}
					value={{ type: "daily", notifyAt: "09:00" }}
					onChange={onChange}
				/>,
			);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			await waitFor(() => {
				expect(screen.getByTestId("time-picker-input")).toHaveValue("09:00");
			});

			// Clear the time
			await user.click(screen.getByTestId("time-picker-clear"));

			// Input should be empty
			expect(screen.getByTestId("time-picker-input")).toHaveValue("");

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			// notifyAt should not be in the pattern
			expect(onChange).toHaveBeenCalledWith({ type: "daily" });
		});

		it("combines pattern type, interval, and time correctly", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<RecurringPicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("recurring-picker-trigger"));

			// Change to weekly
			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-trigger"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-type-trigger"));

			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-type-weekly"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-type-weekly"));

			// Set interval to 2
			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-interval-input"),
				).toBeInTheDocument();
			});

			const intervalInput = screen.getByTestId(
				"recurring-picker-interval-input",
			);
			await user.click(intervalInput);
			await user.keyboard("{Control>}a{/Control}");
			await user.keyboard("2");

			// Select Monday and Friday
			await waitFor(() => {
				expect(
					screen.getByTestId("recurring-picker-day-1"),
				).toBeInTheDocument();
			});

			await user.click(screen.getByTestId("recurring-picker-day-1"));
			await user.click(screen.getByTestId("recurring-picker-day-5"));

			// Set time
			await user.click(screen.getByTestId("time-picker-preset-noon"));

			// Click Apply
			await user.click(screen.getByTestId("recurring-picker-apply"));

			expect(onChange).toHaveBeenCalledWith({
				type: "weekly",
				interval: 2,
				daysOfWeek: [1, 5],
				notifyAt: "12:00",
			});
		});
	});
});

describe("Helper Functions", () => {
	describe("formatRecurringPattern", () => {
		it("returns 'Daily' for basic daily pattern", () => {
			expect(formatRecurringPattern({ type: "daily" })).toBe("Daily");
		});

		it("returns 'Every N days' for daily with interval", () => {
			expect(formatRecurringPattern({ type: "daily", interval: 3 })).toBe(
				"Every 3 days",
			);
		});

		it("returns 'Weekly' for basic weekly pattern", () => {
			expect(formatRecurringPattern({ type: "weekly" })).toBe("Weekly");
		});

		it("returns 'Every N weeks' for weekly with interval", () => {
			expect(formatRecurringPattern({ type: "weekly", interval: 2 })).toBe(
				"Every 2 weeks",
			);
		});

		it("returns 'Weekdays' for Mon-Fri pattern", () => {
			expect(
				formatRecurringPattern({ type: "weekly", daysOfWeek: [1, 2, 3, 4, 5] }),
			).toBe("Weekdays");
		});

		it("returns 'Weekends' for Sat-Sun pattern", () => {
			expect(
				formatRecurringPattern({ type: "weekly", daysOfWeek: [0, 6] }),
			).toBe("Weekends");
		});

		it("returns 'Weekly on X, Y, Z' for specific days", () => {
			expect(
				formatRecurringPattern({ type: "weekly", daysOfWeek: [1, 3, 5] }),
			).toBe("Weekly on Mon, Wed, Fri");
		});

		it("returns 'Every N weeks on X, Y' for weekly with interval and days", () => {
			expect(
				formatRecurringPattern({
					type: "weekly",
					interval: 2,
					daysOfWeek: [1, 5],
				}),
			).toBe("Every 2 weeks on Mon, Fri");
		});

		it("returns 'Monthly' for basic monthly pattern", () => {
			expect(formatRecurringPattern({ type: "monthly" })).toBe("Monthly");
		});

		it("returns 'Every N months' for monthly with interval", () => {
			expect(formatRecurringPattern({ type: "monthly", interval: 3 })).toBe(
				"Every 3 months",
			);
		});

		it("returns 'Monthly on the Nth' for monthly with dayOfMonth", () => {
			expect(formatRecurringPattern({ type: "monthly", dayOfMonth: 15 })).toBe(
				"Monthly on the 15th",
			);
		});

		it("returns 'Every N months on the Nth' for monthly with interval and day", () => {
			expect(
				formatRecurringPattern({ type: "monthly", interval: 2, dayOfMonth: 1 }),
			).toBe("Every 2 months on the 1st");
		});

		it("returns 'Yearly' for basic yearly pattern", () => {
			expect(formatRecurringPattern({ type: "yearly" })).toBe("Yearly");
		});

		it("returns 'Every N years' for yearly with interval", () => {
			expect(formatRecurringPattern({ type: "yearly", interval: 5 })).toBe(
				"Every 5 years",
			);
		});

		it("returns 'Custom: X, Y' for custom pattern with days", () => {
			expect(
				formatRecurringPattern({ type: "custom", daysOfWeek: [2, 4] }),
			).toBe("Custom: Tue, Thu");
		});

		it("returns 'Custom' for custom pattern without days", () => {
			expect(formatRecurringPattern({ type: "custom" })).toBe("Custom");
		});

		it("appends time when notifyAt is set for daily", () => {
			expect(formatRecurringPattern({ type: "daily", notifyAt: "09:00" })).toBe(
				"Daily at 9:00 AM",
			);
		});

		it("appends time when notifyAt is set for weekly", () => {
			expect(
				formatRecurringPattern({ type: "weekly", notifyAt: "14:30" }),
			).toBe("Weekly at 2:30 PM");
		});

		it("appends time when notifyAt is set for monthly with dayOfMonth", () => {
			expect(
				formatRecurringPattern({
					type: "monthly",
					dayOfMonth: 15,
					notifyAt: "08:00",
				}),
			).toBe("Monthly on the 15th at 8:00 AM");
		});

		it("appends time when notifyAt is set for yearly with interval", () => {
			expect(
				formatRecurringPattern({
					type: "yearly",
					interval: 2,
					notifyAt: "18:00",
				}),
			).toBe("Every 2 years at 6:00 PM");
		});

		it("appends time when notifyAt is set for custom pattern", () => {
			expect(
				formatRecurringPattern({
					type: "custom",
					daysOfWeek: [1, 3],
					notifyAt: "12:00",
				}),
			).toBe("Custom: Mon, Wed at 12:00 PM");
		});
	});

	describe("formatOrdinal", () => {
		it("formats 1 as 1st", () => {
			expect(formatOrdinal(1)).toBe("1st");
		});

		it("formats 2 as 2nd", () => {
			expect(formatOrdinal(2)).toBe("2nd");
		});

		it("formats 3 as 3rd", () => {
			expect(formatOrdinal(3)).toBe("3rd");
		});

		it("formats 4 as 4th", () => {
			expect(formatOrdinal(4)).toBe("4th");
		});

		it("formats 11 as 11th", () => {
			expect(formatOrdinal(11)).toBe("11th");
		});

		it("formats 12 as 12th", () => {
			expect(formatOrdinal(12)).toBe("12th");
		});

		it("formats 13 as 13th", () => {
			expect(formatOrdinal(13)).toBe("13th");
		});

		it("formats 21 as 21st", () => {
			expect(formatOrdinal(21)).toBe("21st");
		});

		it("formats 22 as 22nd", () => {
			expect(formatOrdinal(22)).toBe("22nd");
		});

		it("formats 23 as 23rd", () => {
			expect(formatOrdinal(23)).toBe("23rd");
		});

		it("formats 31 as 31st", () => {
			expect(formatOrdinal(31)).toBe("31st");
		});
	});

	describe("patternsEqual", () => {
		it("returns true for two null patterns", () => {
			expect(patternsEqual(null, null)).toBe(true);
		});

		it("returns false when one is null", () => {
			expect(patternsEqual({ type: "daily" }, null)).toBe(false);
			expect(patternsEqual(null, { type: "daily" })).toBe(false);
		});

		it("returns true for identical daily patterns", () => {
			expect(patternsEqual({ type: "daily" }, { type: "daily" })).toBe(true);
		});

		it("returns true for daily patterns with same interval", () => {
			expect(
				patternsEqual(
					{ type: "daily", interval: 3 },
					{ type: "daily", interval: 3 },
				),
			).toBe(true);
		});

		it("returns false for different types", () => {
			expect(patternsEqual({ type: "daily" }, { type: "weekly" })).toBe(false);
		});

		it("returns false for different intervals", () => {
			expect(
				patternsEqual(
					{ type: "daily", interval: 2 },
					{ type: "daily", interval: 3 },
				),
			).toBe(false);
		});

		it("returns true for weekly patterns with same days (different order)", () => {
			expect(
				patternsEqual(
					{ type: "weekly", daysOfWeek: [5, 1, 3] },
					{ type: "weekly", daysOfWeek: [1, 3, 5] },
				),
			).toBe(true);
		});

		it("returns false for weekly patterns with different days", () => {
			expect(
				patternsEqual(
					{ type: "weekly", daysOfWeek: [1, 3] },
					{ type: "weekly", daysOfWeek: [1, 3, 5] },
				),
			).toBe(false);
		});

		it("returns true for monthly patterns with same dayOfMonth", () => {
			expect(
				patternsEqual(
					{ type: "monthly", dayOfMonth: 15 },
					{ type: "monthly", dayOfMonth: 15 },
				),
			).toBe(true);
		});

		it("returns false for monthly patterns with different dayOfMonth", () => {
			expect(
				patternsEqual(
					{ type: "monthly", dayOfMonth: 15 },
					{ type: "monthly", dayOfMonth: 20 },
				),
			).toBe(false);
		});

		it("treats undefined interval as 1", () => {
			expect(
				patternsEqual({ type: "daily" }, { type: "daily", interval: 1 }),
			).toBe(true);
		});

		it("treats empty daysOfWeek as equivalent to undefined", () => {
			expect(
				patternsEqual({ type: "weekly", daysOfWeek: [] }, { type: "weekly" }),
			).toBe(true);
		});
	});
});

describe("Constants", () => {
	describe("DEFAULT_RECURRING_PRESETS", () => {
		it("has 5 default presets", () => {
			expect(DEFAULT_RECURRING_PRESETS).toHaveLength(5);
		});

		it("includes Daily preset", () => {
			const daily = DEFAULT_RECURRING_PRESETS.find((p) => p.label === "Daily");
			expect(daily).toBeDefined();
			expect(daily?.pattern.type).toBe("daily");
		});

		it("includes Weekly preset", () => {
			const weekly = DEFAULT_RECURRING_PRESETS.find(
				(p) => p.label === "Weekly",
			);
			expect(weekly).toBeDefined();
			expect(weekly?.pattern.type).toBe("weekly");
		});

		it("includes Weekdays preset", () => {
			const weekdays = DEFAULT_RECURRING_PRESETS.find(
				(p) => p.label === "Weekdays",
			);
			expect(weekdays).toBeDefined();
			expect(weekdays?.pattern.type).toBe("weekly");
			expect(weekdays?.pattern.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
		});

		it("includes Monthly preset", () => {
			const monthly = DEFAULT_RECURRING_PRESETS.find(
				(p) => p.label === "Monthly",
			);
			expect(monthly).toBeDefined();
			expect(monthly?.pattern.type).toBe("monthly");
		});

		it("includes Yearly preset", () => {
			const yearly = DEFAULT_RECURRING_PRESETS.find(
				(p) => p.label === "Yearly",
			);
			expect(yearly).toBeDefined();
			expect(yearly?.pattern.type).toBe("yearly");
		});
	});

	describe("PATTERN_TYPE_LABELS", () => {
		it("has label for daily", () => {
			expect(PATTERN_TYPE_LABELS.daily).toBe("Daily");
		});

		it("has label for weekly", () => {
			expect(PATTERN_TYPE_LABELS.weekly).toBe("Weekly");
		});

		it("has label for monthly", () => {
			expect(PATTERN_TYPE_LABELS.monthly).toBe("Monthly");
		});

		it("has label for yearly", () => {
			expect(PATTERN_TYPE_LABELS.yearly).toBe("Yearly");
		});

		it("has label for custom", () => {
			expect(PATTERN_TYPE_LABELS.custom).toBe("Custom");
		});
	});

	describe("DAY_LABELS", () => {
		it("has 7 day labels", () => {
			expect(DAY_LABELS).toHaveLength(7);
		});

		it("starts with Sunday", () => {
			expect(DAY_LABELS[0]).toBe("Sun");
		});

		it("ends with Saturday", () => {
			expect(DAY_LABELS[6]).toBe("Sat");
		});

		it("has all days in order", () => {
			expect(DAY_LABELS).toEqual([
				"Sun",
				"Mon",
				"Tue",
				"Wed",
				"Thu",
				"Fri",
				"Sat",
			]);
		});
	});

	describe("FULL_DAY_LABELS", () => {
		it("has 7 day labels", () => {
			expect(FULL_DAY_LABELS).toHaveLength(7);
		});

		it("has full day names", () => {
			expect(FULL_DAY_LABELS).toEqual([
				"Sunday",
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
			]);
		});
	});
});
