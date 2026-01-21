"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase environment variables
vi.mock("@my-procedures-2/env/web", () => ({
	env: {
		NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
		NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key-12345678",
		BETTER_AUTH_SECRET: "test-better-auth-secret-at-least-32-chars",
		BETTER_AUTH_URL: "http://localhost:4757",
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
	},
}));

import { FOLDER_COLORS } from "@/app/api/folder";

import { FolderCreateDialog } from "./folder-create-dialog";

describe("FolderCreateDialog", () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		onCreate: vi.fn().mockResolvedValue(undefined),
		isLoading: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders the dialog when open is true", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			expect(screen.getByTestId("folder-create-dialog")).toBeInTheDocument();
		});

		it("does not render when open is false", () => {
			render(<FolderCreateDialog {...defaultProps} open={false} />);

			expect(
				screen.queryByTestId("folder-create-dialog"),
			).not.toBeInTheDocument();
		});

		it("renders dialog title and description", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			expect(
				screen.getByRole("heading", { name: "Create Folder" }),
			).toBeInTheDocument();
			expect(
				screen.getByText("Create a new folder to organize your todos."),
			).toBeInTheDocument();
		});

		it("renders name input field", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			expect(screen.getByTestId("folder-name-input")).toBeInTheDocument();
			expect(screen.getByLabelText("Name")).toBeInTheDocument();
			expect(
				screen.getByPlaceholderText("Enter folder name"),
			).toBeInTheDocument();
		});

		it("renders color picker with all colors", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			const colorPicker = screen.getByTestId("folder-color-picker");
			expect(colorPicker).toBeInTheDocument();

			for (const color of FOLDER_COLORS) {
				expect(screen.getByTestId(`folder-color-${color}`)).toBeInTheDocument();
			}
		});

		it("renders preview section", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			expect(screen.getByTestId("folder-preview")).toBeInTheDocument();
		});

		it("renders cancel and submit buttons", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			expect(screen.getByTestId("folder-create-cancel")).toBeInTheDocument();
			expect(screen.getByTestId("folder-create-submit")).toBeInTheDocument();
		});

		it("renders close button", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
		});
	});

	describe("Name Input", () => {
		it("allows typing in name input", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "My Folder");

			expect(input).toHaveValue("My Folder");
		});

		it("updates preview when name changes", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "Work Tasks");

			const preview = screen.getByTestId("folder-preview");
			expect(preview).toHaveTextContent("Work Tasks");
		});

		it("shows default preview text when name is empty", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			const preview = screen.getByTestId("folder-preview");
			expect(preview).toHaveTextContent("New Folder");
		});

		it("has maxLength of 100", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			const input = screen.getByTestId("folder-name-input");
			expect(input).toHaveAttribute("maxLength", "100");
		});
	});

	describe("Color Picker", () => {
		it("defaults to slate color", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			const slateRadio = screen.getByTestId("folder-color-slate");
			expect(slateRadio).toBeChecked();
		});

		it("selects color when clicked", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const blueRadio = screen.getByTestId("folder-color-blue");
			await user.click(blueRadio);

			expect(blueRadio).toBeChecked();

			const slateRadio = screen.getByTestId("folder-color-slate");
			expect(slateRadio).not.toBeChecked();
		});

		it("updates preview icon color when color changes", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const preview = screen.getByTestId("folder-preview");
			const initialIcon = preview.querySelector("svg");
			expect(initialIcon).toHaveClass("text-slate-500");

			const redRadio = screen.getByTestId("folder-color-red");
			await user.click(redRadio);

			const updatedIcon = preview.querySelector("svg");
			expect(updatedIcon).toHaveClass("text-red-500");
		});

		it("renders a fieldset for the color picker", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			expect(screen.getByRole("group")).toBeInTheDocument();
		});

		it("each color input is a radio button", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			const colorRadios = screen.getAllByRole("radio");
			expect(colorRadios).toHaveLength(FOLDER_COLORS.length);
		});

		it("each color input has accessible label", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			for (const color of FOLDER_COLORS) {
				const radio = screen.getByTestId(`folder-color-${color}`);
				expect(radio).toHaveAccessibleName(color);
			}
		});
	});

	describe("Form Validation", () => {
		it("submit button is disabled when name is empty (prevents empty submission)", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			const submitButton = screen.getByTestId("folder-create-submit");
			expect(submitButton).toBeDisabled();
		});

		it("submit button is disabled when name is only whitespace (prevents whitespace-only submission)", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "   ");

			const submitButton = screen.getByTestId("folder-create-submit");
			expect(submitButton).toBeDisabled();
		});

		it("shows error when name exceeds 100 characters", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const input = screen.getByTestId("folder-name-input");
			const longName = "a".repeat(101);
			// Clear and type directly since maxLength may prevent full input
			await user.clear(input);
			fireEvent.change(input, { target: { value: longName } });

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);

			expect(
				screen.getByText("Folder name must be 100 characters or less"),
			).toBeInTheDocument();
		});

		it("clears error after successful submission with valid name", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			// First trigger an error with too-long name
			const input = screen.getByTestId("folder-name-input");
			const longName = "a".repeat(101);
			fireEvent.change(input, { target: { value: longName } });

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);
			expect(screen.getByTestId("folder-name-error")).toBeInTheDocument();

			// Now change to valid name and submit
			fireEvent.change(input, { target: { value: "Valid Name" } });
			await user.click(submitButton);

			await waitFor(() => {
				expect(
					screen.queryByTestId("folder-name-error"),
				).not.toBeInTheDocument();
			});
		});

		it("sets aria-invalid on input when error exists", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const input = screen.getByTestId("folder-name-input");
			const longName = "a".repeat(101);
			fireEvent.change(input, { target: { value: longName } });

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);

			expect(input).toHaveAttribute("aria-invalid", "true");
		});

		it("error message has alert role", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const input = screen.getByTestId("folder-name-input");
			const longName = "a".repeat(101);
			fireEvent.change(input, { target: { value: longName } });

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);

			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
	});

	describe("Form Submission", () => {
		it("calls onCreate with trimmed name and color", async () => {
			const onCreate = vi.fn().mockResolvedValue(undefined);
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} onCreate={onCreate} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "  My Folder  ");

			const blueButton = screen.getByTestId("folder-color-blue");
			await user.click(blueButton);

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);

			expect(onCreate).toHaveBeenCalledWith({
				name: "My Folder",
				color: "blue",
			});
		});

		it("calls onCreate with default color if not changed", async () => {
			const onCreate = vi.fn().mockResolvedValue(undefined);
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} onCreate={onCreate} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "Test Folder");

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);

			expect(onCreate).toHaveBeenCalledWith({
				name: "Test Folder",
				color: "slate",
			});
		});

		it("closes dialog after successful creation", async () => {
			const onOpenChange = vi.fn();
			const onCreate = vi.fn().mockResolvedValue(undefined);
			const user = userEvent.setup();

			render(
				<FolderCreateDialog
					{...defaultProps}
					onOpenChange={onOpenChange}
					onCreate={onCreate}
				/>,
			);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "New Folder");

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);

			await waitFor(() => {
				expect(onOpenChange).toHaveBeenCalledWith(false);
			});
		});

		it("shows error message if onCreate fails", async () => {
			const errorMessage = "Network error";
			const onCreate = vi.fn().mockRejectedValue(new Error(errorMessage));
			const user = userEvent.setup();

			render(<FolderCreateDialog {...defaultProps} onCreate={onCreate} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "New Folder");

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(errorMessage)).toBeInTheDocument();
			});
		});

		it("shows generic error if onCreate fails without message", async () => {
			const onCreate = vi.fn().mockRejectedValue("unknown error");
			const user = userEvent.setup();

			render(<FolderCreateDialog {...defaultProps} onCreate={onCreate} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "New Folder");

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText("Failed to create folder")).toBeInTheDocument();
			});
		});

		it("does not close dialog if onCreate fails", async () => {
			const onOpenChange = vi.fn();
			const onCreate = vi.fn().mockRejectedValue(new Error("Failed"));
			const user = userEvent.setup();

			render(
				<FolderCreateDialog
					{...defaultProps}
					onOpenChange={onOpenChange}
					onCreate={onCreate}
				/>,
			);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "New Folder");

			const submitButton = screen.getByTestId("folder-create-submit");
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText("Failed")).toBeInTheDocument();
			});

			// onOpenChange should NOT have been called with false (for closing)
			expect(onOpenChange).not.toHaveBeenCalledWith(false);
		});
	});

	describe("Loading State", () => {
		it("disables name input when loading", () => {
			render(<FolderCreateDialog {...defaultProps} isLoading={true} />);

			const input = screen.getByTestId("folder-name-input");
			expect(input).toBeDisabled();
		});

		it("disables color inputs when loading", () => {
			render(<FolderCreateDialog {...defaultProps} isLoading={true} />);

			for (const color of FOLDER_COLORS) {
				const radio = screen.getByTestId(`folder-color-${color}`);
				expect(radio).toBeDisabled();
			}
		});

		it("disables cancel button when loading", () => {
			render(<FolderCreateDialog {...defaultProps} isLoading={true} />);

			const cancelButton = screen.getByTestId("folder-create-cancel");
			expect(cancelButton).toBeDisabled();
		});

		it("disables submit button when loading", () => {
			render(<FolderCreateDialog {...defaultProps} isLoading={true} />);

			const submitButton = screen.getByTestId("folder-create-submit");
			expect(submitButton).toBeDisabled();
		});

		it("shows 'Creating...' text on submit button when loading", () => {
			render(<FolderCreateDialog {...defaultProps} isLoading={true} />);

			const submitButton = screen.getByTestId("folder-create-submit");
			expect(submitButton).toHaveTextContent("Creating...");
		});

		it("shows 'Create Folder' text on submit button when not loading", () => {
			render(<FolderCreateDialog {...defaultProps} isLoading={false} />);

			const submitButton = screen.getByTestId("folder-create-submit");
			expect(submitButton).toHaveTextContent("Create Folder");
		});
	});

	describe("Cancel and Close Behavior", () => {
		it("calls onOpenChange with false when cancel button is clicked", async () => {
			const onOpenChange = vi.fn();
			const user = userEvent.setup();

			render(
				<FolderCreateDialog {...defaultProps} onOpenChange={onOpenChange} />,
			);

			const cancelButton = screen.getByTestId("folder-create-cancel");
			await user.click(cancelButton);

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("resets form when dialog is closed", async () => {
			const onOpenChange = vi.fn();
			const user = userEvent.setup();

			const { rerender } = render(
				<FolderCreateDialog {...defaultProps} onOpenChange={onOpenChange} />,
			);

			// Fill in form
			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "Test Folder");

			const blueRadio = screen.getByTestId("folder-color-blue");
			await user.click(blueRadio);

			// Close dialog
			const cancelButton = screen.getByTestId("folder-create-cancel");
			await user.click(cancelButton);

			// Reopen dialog
			rerender(
				<FolderCreateDialog
					{...defaultProps}
					open={true}
					onOpenChange={onOpenChange}
				/>,
			);

			// Form should be reset
			const newInput = screen.getByTestId("folder-name-input");
			expect(newInput).toHaveValue("");

			const slateRadio = screen.getByTestId("folder-color-slate");
			expect(slateRadio).toBeChecked();
		});
	});

	describe("Submit Button Disabled State", () => {
		it("submit button is disabled when name is empty", () => {
			render(<FolderCreateDialog {...defaultProps} />);

			const submitButton = screen.getByTestId("folder-create-submit");
			expect(submitButton).toBeDisabled();
		});

		it("submit button is enabled when name has content", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "My Folder");

			const submitButton = screen.getByTestId("folder-create-submit");
			expect(submitButton).not.toBeDisabled();
		});

		it("submit button is disabled when name is only whitespace", async () => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "   ");

			const submitButton = screen.getByTestId("folder-create-submit");
			expect(submitButton).toBeDisabled();
		});
	});

	describe("Form submission via Enter key", () => {
		it("submits form when Enter is pressed in name input", async () => {
			const onCreate = vi.fn().mockResolvedValue(undefined);
			const user = userEvent.setup();

			render(<FolderCreateDialog {...defaultProps} onCreate={onCreate} />);

			const input = screen.getByTestId("folder-name-input");
			await user.type(input, "My Folder{enter}");

			expect(onCreate).toHaveBeenCalledWith({
				name: "My Folder",
				color: "slate",
			});
		});
	});

	describe("All Colors Styling", () => {
		const colorTestCases = FOLDER_COLORS.map((color) => ({
			color,
			bgClass: `bg-${color}-500`,
			textClass: `text-${color}-500`,
		}));

		it.each(
			colorTestCases,
		)("$color color swatch has correct background class", ({
			color,
			bgClass,
		}) => {
			render(<FolderCreateDialog {...defaultProps} />);

			const radio = screen.getByTestId(`folder-color-${color}`);
			// The color swatch is the next sibling span element
			const colorSwatch = radio.nextElementSibling;
			expect(colorSwatch).toHaveClass(bgClass);
		});

		it.each(
			colorTestCases,
		)("selecting $color updates preview icon to correct text class", async ({
			color,
			textClass,
		}) => {
			const user = userEvent.setup();
			render(<FolderCreateDialog {...defaultProps} />);

			const colorRadio = screen.getByTestId(`folder-color-${color}`);
			await user.click(colorRadio);

			const preview = screen.getByTestId("folder-preview");
			const icon = preview.querySelector("svg");
			expect(icon).toHaveClass(textClass);
		});
	});
});
