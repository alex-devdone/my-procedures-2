"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	DEFAULT_TIME_PRESETS,
	formatTimeDisplay,
	formatTimeValue,
	isValidTimeFormat,
	TimePicker,
	type TimePreset,
} from "./time-picker";

describe("TimePicker", () => {
	const defaultProps = {
		value: null,
		onChange: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders the time input", () => {
			render(<TimePicker {...defaultProps} />);

			expect(screen.getByTestId("time-picker-input")).toBeInTheDocument();
		});

		it("renders with default placeholder when no value", () => {
			render(<TimePicker {...defaultProps} />);

			expect(screen.getByPlaceholderText("Set time")).toBeInTheDocument();
		});

		it("renders with custom placeholder", () => {
			render(<TimePicker {...defaultProps} placeholder="Pick a time" />);

			expect(screen.getByPlaceholderText("Pick a time")).toBeInTheDocument();
		});

		it("renders clock icon", () => {
			render(<TimePicker {...defaultProps} />);

			const container = screen.getByTestId("time-picker-container");
			const icon = container.querySelector("svg");
			expect(icon).toBeInTheDocument();
		});

		it("renders value in input when value is set", () => {
			render(<TimePicker {...defaultProps} value="14:30" />);

			const input = screen.getByTestId("time-picker-input");
			expect(input).toHaveValue("14:30");
		});

		it("renders clear button when value is set and clearable is true", () => {
			render(<TimePicker {...defaultProps} value="09:00" clearable={true} />);

			expect(screen.getByTestId("time-picker-clear")).toBeInTheDocument();
		});

		it("does not render clear button when value is set and clearable is false", () => {
			render(<TimePicker {...defaultProps} value="09:00" clearable={false} />);

			expect(screen.queryByTestId("time-picker-clear")).not.toBeInTheDocument();
		});

		it("does not render clear button when no value", () => {
			render(<TimePicker {...defaultProps} />);

			expect(screen.queryByTestId("time-picker-clear")).not.toBeInTheDocument();
		});

		it("applies custom className to container", () => {
			render(<TimePicker {...defaultProps} className="custom-class" />);

			const container = screen.getByTestId("time-picker-container");
			expect(container).toHaveClass("custom-class");
		});
	});

	describe("Disabled State", () => {
		it("disables input when disabled is true", () => {
			render(<TimePicker {...defaultProps} disabled={true} />);

			expect(screen.getByTestId("time-picker-input")).toBeDisabled();
		});

		it("does not show clear button when disabled", () => {
			render(
				<TimePicker
					{...defaultProps}
					value="09:00"
					disabled={true}
					clearable
				/>,
			);

			expect(screen.queryByTestId("time-picker-clear")).not.toBeInTheDocument();
		});

		it("disables preset buttons when disabled", () => {
			render(<TimePicker {...defaultProps} disabled={true} />);

			const morningPreset = screen.getByTestId("time-picker-preset-morning");
			expect(morningPreset).toBeDisabled();
		});
	});

	describe("Presets", () => {
		it("renders all default presets", () => {
			render(<TimePicker {...defaultProps} />);

			expect(screen.getByTestId("time-picker-presets")).toBeInTheDocument();
			expect(
				screen.getByTestId("time-picker-preset-morning"),
			).toBeInTheDocument();
			expect(screen.getByTestId("time-picker-preset-noon")).toBeInTheDocument();
			expect(
				screen.getByTestId("time-picker-preset-evening"),
			).toBeInTheDocument();
		});

		it("renders custom presets when provided", () => {
			const customPresets: TimePreset[] = [
				{ label: "Early", value: "06:00" },
				{ label: "Late", value: "22:00" },
			];
			render(<TimePicker {...defaultProps} presets={customPresets} />);

			expect(
				screen.getByTestId("time-picker-preset-early"),
			).toBeInTheDocument();
			expect(screen.getByTestId("time-picker-preset-late")).toBeInTheDocument();
			expect(
				screen.queryByTestId("time-picker-preset-morning"),
			).not.toBeInTheDocument();
		});

		it("does not render presets section when presets is empty", () => {
			render(<TimePicker {...defaultProps} presets={[]} />);

			expect(
				screen.queryByTestId("time-picker-presets"),
			).not.toBeInTheDocument();
		});

		it("calls onChange when preset is clicked", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<TimePicker {...defaultProps} onChange={onChange} />);

			await user.click(screen.getByTestId("time-picker-preset-morning"));

			expect(onChange).toHaveBeenCalledWith("09:00");
		});

		it("updates input value when preset is clicked", async () => {
			const user = userEvent.setup();
			render(<TimePicker {...defaultProps} />);

			await user.click(screen.getByTestId("time-picker-preset-noon"));

			const input = screen.getByTestId("time-picker-input");
			expect(input).toHaveValue("12:00");
		});

		it("highlights selected preset", () => {
			render(<TimePicker {...defaultProps} value="09:00" />);

			const morningPreset = screen.getByTestId("time-picker-preset-morning");
			expect(morningPreset).toHaveAttribute("data-selected", "true");
		});

		it("does not highlight non-selected presets", () => {
			render(<TimePicker {...defaultProps} value="09:00" />);

			const noonPreset = screen.getByTestId("time-picker-preset-noon");
			expect(noonPreset).not.toHaveAttribute("data-selected");
		});
	});

	describe("Input Behavior", () => {
		it("calls onChange with formatted value when valid time is entered", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<TimePicker {...defaultProps} onChange={onChange} />);

			const input = screen.getByTestId("time-picker-input");
			await user.type(input, "9:30");

			expect(onChange).toHaveBeenCalledWith("09:30");
		});

		it("calls onChange with null when input is cleared", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<TimePicker {...defaultProps} value="09:00" onChange={onChange} />,
			);

			const input = screen.getByTestId("time-picker-input");
			await user.clear(input);

			expect(onChange).toHaveBeenCalledWith(null);
		});

		it("does not call onChange when invalid time is entered", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<TimePicker {...defaultProps} onChange={onChange} />);

			const input = screen.getByTestId("time-picker-input");
			await user.type(input, "25:00");

			// onChange should not be called with an invalid value
			expect(onChange).not.toHaveBeenCalledWith("25:00");
		});

		it("resets to last valid value on blur when input is invalid", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<TimePicker {...defaultProps} value="09:00" onChange={onChange} />,
			);

			const input = screen.getByTestId("time-picker-input");
			await user.clear(input);
			await user.type(input, "invalid");
			await user.tab(); // blur

			expect(input).toHaveValue("09:00");
		});

		it("formats time with leading zeros on blur", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(<TimePicker {...defaultProps} onChange={onChange} />);

			const input = screen.getByTestId("time-picker-input");
			await user.type(input, "9:5");
			// Type valid format first
			await user.clear(input);
			await user.type(input, "9:05");
			await user.tab(); // blur

			expect(input).toHaveValue("09:05");
		});

		it("sets aria-invalid when input has invalid format", async () => {
			const user = userEvent.setup();
			render(<TimePicker {...defaultProps} />);

			const input = screen.getByTestId("time-picker-input");
			await user.type(input, "abc");

			expect(input).toHaveAttribute("aria-invalid", "true");
		});

		it("does not set aria-invalid when input is empty", () => {
			render(<TimePicker {...defaultProps} />);

			const input = screen.getByTestId("time-picker-input");
			expect(input).not.toHaveAttribute("aria-invalid");
		});

		it("does not set aria-invalid when input is valid", async () => {
			const user = userEvent.setup();
			render(<TimePicker {...defaultProps} />);

			const input = screen.getByTestId("time-picker-input");
			await user.type(input, "14:30");

			expect(input).not.toHaveAttribute("aria-invalid");
		});
	});

	describe("Clear Functionality", () => {
		it("clears the value when clear button is clicked", async () => {
			const onChange = vi.fn();
			const user = userEvent.setup();
			render(
				<TimePicker {...defaultProps} value="09:00" onChange={onChange} />,
			);

			await user.click(screen.getByTestId("time-picker-clear"));

			expect(onChange).toHaveBeenCalledWith(null);
		});

		it("clears the input value when clear button is clicked", async () => {
			const user = userEvent.setup();
			render(<TimePicker {...defaultProps} value="09:00" />);

			await user.click(screen.getByTestId("time-picker-clear"));

			const input = screen.getByTestId("time-picker-input");
			expect(input).toHaveValue("");
		});
	});

	describe("Value Sync", () => {
		it("updates input when external value changes", () => {
			const { rerender } = render(
				<TimePicker {...defaultProps} value={null} />,
			);

			const input = screen.getByTestId("time-picker-input");
			expect(input).toHaveValue("");

			rerender(<TimePicker {...defaultProps} value="15:30" />);

			expect(input).toHaveValue("15:30");
		});

		it("clears input when external value is set to null", () => {
			const { rerender } = render(
				<TimePicker {...defaultProps} value="15:30" />,
			);

			const input = screen.getByTestId("time-picker-input");
			expect(input).toHaveValue("15:30");

			rerender(<TimePicker {...defaultProps} value={null} />);

			expect(input).toHaveValue("");
		});
	});

	describe("Accessibility", () => {
		it("input has accessible label when no value", () => {
			render(<TimePicker {...defaultProps} />);

			const input = screen.getByTestId("time-picker-input");
			expect(input).toHaveAttribute("aria-label", "Set time");
		});

		it("input has accessible label with formatted time when value is set", () => {
			render(<TimePicker {...defaultProps} value="14:30" />);

			const input = screen.getByTestId("time-picker-input");
			expect(input).toHaveAttribute("aria-label", "Time: 2:30 PM");
		});

		it("clear button has accessible label", () => {
			render(<TimePicker {...defaultProps} value="09:00" />);

			const clearButton = screen.getByTestId("time-picker-clear");
			expect(clearButton).toHaveAttribute("aria-label", "Clear time");
		});
	});
});

describe("Helper Functions", () => {
	describe("isValidTimeFormat", () => {
		it("returns true for valid 24-hour times", () => {
			expect(isValidTimeFormat("00:00")).toBe(true);
			expect(isValidTimeFormat("09:30")).toBe(true);
			expect(isValidTimeFormat("12:00")).toBe(true);
			expect(isValidTimeFormat("23:59")).toBe(true);
		});

		it("returns true for times without leading zeros", () => {
			expect(isValidTimeFormat("9:30")).toBe(true);
			expect(isValidTimeFormat("0:00")).toBe(true);
		});

		it("returns false for invalid hours", () => {
			expect(isValidTimeFormat("24:00")).toBe(false);
			expect(isValidTimeFormat("25:30")).toBe(false);
		});

		it("returns false for invalid minutes", () => {
			expect(isValidTimeFormat("12:60")).toBe(false);
			expect(isValidTimeFormat("12:99")).toBe(false);
		});

		it("returns false for invalid formats", () => {
			expect(isValidTimeFormat("")).toBe(false);
			expect(isValidTimeFormat("12")).toBe(false);
			expect(isValidTimeFormat("12:")).toBe(false);
			expect(isValidTimeFormat(":30")).toBe(false);
			expect(isValidTimeFormat("abc")).toBe(false);
			expect(isValidTimeFormat("12:30:00")).toBe(false);
		});
	});

	describe("formatTimeValue", () => {
		it("adds leading zeros to hours", () => {
			expect(formatTimeValue("9:30")).toBe("09:30");
			expect(formatTimeValue("0:00")).toBe("00:00");
		});

		it("preserves already formatted times", () => {
			expect(formatTimeValue("09:30")).toBe("09:30");
			expect(formatTimeValue("12:00")).toBe("12:00");
			expect(formatTimeValue("23:59")).toBe("23:59");
		});

		it("returns original string for invalid times", () => {
			expect(formatTimeValue("invalid")).toBe("invalid");
			expect(formatTimeValue("25:00")).toBe("25:00");
		});
	});

	describe("formatTimeDisplay", () => {
		it("formats AM times correctly", () => {
			expect(formatTimeDisplay("00:00")).toBe("12:00 AM");
			expect(formatTimeDisplay("01:30")).toBe("1:30 AM");
			expect(formatTimeDisplay("09:00")).toBe("9:00 AM");
			expect(formatTimeDisplay("11:59")).toBe("11:59 AM");
		});

		it("formats PM times correctly", () => {
			expect(formatTimeDisplay("12:00")).toBe("12:00 PM");
			expect(formatTimeDisplay("13:30")).toBe("1:30 PM");
			expect(formatTimeDisplay("18:00")).toBe("6:00 PM");
			expect(formatTimeDisplay("23:59")).toBe("11:59 PM");
		});

		it("returns original string for invalid times", () => {
			expect(formatTimeDisplay("invalid")).toBe("invalid");
			expect(formatTimeDisplay("25:00")).toBe("25:00");
		});
	});
});

describe("DEFAULT_TIME_PRESETS", () => {
	it("has 3 default presets", () => {
		expect(DEFAULT_TIME_PRESETS).toHaveLength(3);
	});

	it("Morning preset is 09:00", () => {
		const morningPreset = DEFAULT_TIME_PRESETS[0];
		expect(morningPreset.label).toBe("Morning");
		expect(morningPreset.value).toBe("09:00");
	});

	it("Noon preset is 12:00", () => {
		const noonPreset = DEFAULT_TIME_PRESETS[1];
		expect(noonPreset.label).toBe("Noon");
		expect(noonPreset.value).toBe("12:00");
	});

	it("Evening preset is 18:00", () => {
		const eveningPreset = DEFAULT_TIME_PRESETS[2];
		expect(eveningPreset.label).toBe("Evening");
		expect(eveningPreset.value).toBe("18:00");
	});
});
