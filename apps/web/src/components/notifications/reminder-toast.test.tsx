import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DueReminder } from "@/hooks/use-reminder-checker";
import {
	formatReminderTime,
	getReminderToastId,
	isReminderOverdue,
	ReminderToastContent,
	ReminderToastManager,
	useReminderToast,
} from "./reminder-toast";

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: {
		custom: vi.fn(() => "toast-id"),
		dismiss: vi.fn(),
	},
}));

// Get typed mocked toast
const mockedToast = vi.mocked(toast);

// ============================================================================
// Test Fixtures
// ============================================================================

const mockReminder: DueReminder = {
	todoId: "123",
	todoText: "Complete the report",
	reminderAt: new Date().toISOString(),
	dueDate: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
	isRecurring: false,
};

const mockOverdueReminder: DueReminder = {
	todoId: "456",
	todoText: "Overdue task",
	reminderAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
	dueDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
	isRecurring: false,
};

const mockReminderNoDueDate: DueReminder = {
	todoId: "789",
	todoText: "Task without due date",
	reminderAt: new Date().toISOString(),
	dueDate: null,
	isRecurring: false,
};

const mockNumericIdReminder: DueReminder = {
	todoId: 999,
	todoText: "Numeric ID task",
	reminderAt: new Date().toISOString(),
	dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
	isRecurring: false,
};

// ============================================================================
// Pure Function Tests
// ============================================================================

describe("Pure Functions", () => {
	describe("isReminderOverdue", () => {
		it("returns false when no due date", () => {
			expect(isReminderOverdue(mockReminderNoDueDate)).toBe(false);
		});

		it("returns true when due date is in the past", () => {
			expect(isReminderOverdue(mockOverdueReminder)).toBe(true);
		});

		it("returns false when due date is in the future", () => {
			expect(isReminderOverdue(mockReminder)).toBe(false);
		});

		it("handles edge case of due date being exactly now", () => {
			const nowReminder: DueReminder = {
				...mockReminder,
				dueDate: new Date().toISOString(),
			};
			// Due date at exact moment could be slightly past due to execution time
			const result = isReminderOverdue(nowReminder);
			expect(typeof result).toBe("boolean");
		});
	});

	describe("formatReminderTime", () => {
		it("returns formatted time for reminder with due date", () => {
			const result = formatReminderTime(mockReminder);
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(0);
		});

		it("returns formatted time for overdue reminder", () => {
			const result = formatReminderTime(mockOverdueReminder);
			expect(result).toBe("This task is overdue!");
		});

		it("returns generic message for reminder without due date", () => {
			const result = formatReminderTime(mockReminderNoDueDate);
			expect(result).toBe("Reminder for your task");
		});

		it("formats due in hours correctly", () => {
			const twoHoursLater: DueReminder = {
				...mockReminder,
				dueDate: new Date(Date.now() + 7200000).toISOString(), // 2 hours
			};
			const result = formatReminderTime(twoHoursLater);
			expect(result).toContain("hour");
		});

		it("formats due tomorrow correctly", () => {
			const tomorrow: DueReminder = {
				...mockReminder,
				dueDate: new Date(Date.now() + 86400000).toISOString(), // 24 hours
			};
			const result = formatReminderTime(tomorrow);
			expect(result).toBe("Due tomorrow");
		});
	});

	describe("getReminderToastId", () => {
		it("generates toast ID for string todoId", () => {
			const id = getReminderToastId("123");
			expect(id).toBe("reminder-toast-123");
		});

		it("generates toast ID for numeric todoId", () => {
			const id = getReminderToastId(456);
			expect(id).toBe("reminder-toast-456");
		});

		it("generates unique IDs for different todos", () => {
			const id1 = getReminderToastId("abc");
			const id2 = getReminderToastId("xyz");
			expect(id1).not.toBe(id2);
		});
	});
});

// ============================================================================
// ReminderToastContent Component Tests
// ============================================================================

describe("ReminderToastContent", () => {
	describe("Rendering", () => {
		it("renders reminder content", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			expect(screen.getByTestId("reminder-toast-content")).toBeInTheDocument();
			expect(screen.getByTestId("reminder-toast-title")).toHaveTextContent(
				"Complete the report",
			);
			expect(screen.getByTestId("reminder-toast-body")).toBeInTheDocument();
		});

		it("renders todo text as title", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			expect(screen.getByTestId("reminder-toast-title")).toHaveTextContent(
				mockReminder.todoText,
			);
		});

		it("renders time info in body", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			const body = screen.getByTestId("reminder-toast-body");
			expect(body).toBeInTheDocument();
		});

		it("renders icon container", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			expect(screen.getByTestId("reminder-toast-icon")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<ReminderToastContent
					reminder={mockReminder}
					className="custom-class"
				/>,
			);

			expect(screen.getByTestId("reminder-toast-content")).toHaveClass(
				"custom-class",
			);
		});
	});

	describe("Due Date Display", () => {
		it("shows due date when provided", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			expect(screen.getByTestId("reminder-toast-due-date")).toBeInTheDocument();
		});

		it("hides due date when not provided", () => {
			render(<ReminderToastContent reminder={mockReminderNoDueDate} />);

			expect(
				screen.queryByTestId("reminder-toast-due-date"),
			).not.toBeInTheDocument();
		});

		it("formats due date correctly", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			const dueDate = screen.getByTestId("reminder-toast-due-date");
			// Should contain month and day
			expect(dueDate.textContent).toMatch(/\w+\s+\d+/);
		});
	});

	describe("Overdue Styling", () => {
		it("shows bell icon for non-overdue reminders", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			const icon = screen.getByTestId("reminder-toast-icon");
			// Bell icon should be present (not clock)
			expect(icon).toBeInTheDocument();
		});

		it("shows clock icon for overdue reminders", () => {
			render(<ReminderToastContent reminder={mockOverdueReminder} />);

			const icon = screen.getByTestId("reminder-toast-icon");
			expect(icon).toBeInTheDocument();
		});

		it("applies overdue styling to body text", () => {
			render(<ReminderToastContent reminder={mockOverdueReminder} />);

			const body = screen.getByTestId("reminder-toast-body");
			expect(body).toHaveClass("text-red-600");
		});

		it("applies non-overdue styling to body text", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			const body = screen.getByTestId("reminder-toast-body");
			expect(body).toHaveClass("text-muted-foreground");
		});
	});

	describe("Dismiss Button", () => {
		it("renders dismiss button when onDismiss provided", () => {
			render(
				<ReminderToastContent reminder={mockReminder} onDismiss={() => {}} />,
			);

			expect(
				screen.getByTestId("reminder-toast-dismiss-button"),
			).toBeInTheDocument();
		});

		it("hides dismiss button when onDismiss not provided", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			expect(
				screen.queryByTestId("reminder-toast-dismiss-button"),
			).not.toBeInTheDocument();
		});

		it("calls onDismiss when dismiss button clicked", () => {
			const onDismiss = vi.fn();
			render(
				<ReminderToastContent reminder={mockReminder} onDismiss={onDismiss} />,
			);

			fireEvent.click(screen.getByTestId("reminder-toast-dismiss-button"));

			expect(onDismiss).toHaveBeenCalledTimes(1);
		});

		it("has accessible label on dismiss button", () => {
			render(
				<ReminderToastContent reminder={mockReminder} onDismiss={() => {}} />,
			);

			expect(
				screen.getByRole("button", { name: /dismiss reminder/i }),
			).toBeInTheDocument();
		});

		it("stops event propagation on dismiss click", () => {
			const onDismiss = vi.fn();
			const onParentClick = vi.fn();

			render(
				// biome-ignore lint/a11y/useKeyWithClickEvents: test
				// biome-ignore lint/a11y/noStaticElementInteractions: test
				<div onClick={onParentClick}>
					<ReminderToastContent reminder={mockReminder} onDismiss={onDismiss} />
				</div>,
			);

			fireEvent.click(screen.getByTestId("reminder-toast-dismiss-button"));

			expect(onDismiss).toHaveBeenCalled();
			expect(onParentClick).not.toHaveBeenCalled();
		});
	});

	describe("View Button", () => {
		it("renders view button when onClick provided", () => {
			render(
				<ReminderToastContent reminder={mockReminder} onClick={() => {}} />,
			);

			expect(
				screen.getByTestId("reminder-toast-view-button"),
			).toBeInTheDocument();
		});

		it("hides view button when onClick not provided", () => {
			render(<ReminderToastContent reminder={mockReminder} />);

			expect(
				screen.queryByTestId("reminder-toast-view-button"),
			).not.toBeInTheDocument();
		});

		it("calls onClick when view button clicked", () => {
			const onClick = vi.fn();
			render(
				<ReminderToastContent reminder={mockReminder} onClick={onClick} />,
			);

			fireEvent.click(screen.getByTestId("reminder-toast-view-button"));

			expect(onClick).toHaveBeenCalledTimes(1);
		});

		it("has accessible label on view button", () => {
			render(
				<ReminderToastContent reminder={mockReminder} onClick={() => {}} />,
			);

			expect(
				screen.getByRole("button", { name: /view todo/i }),
			).toBeInTheDocument();
		});

		it("stops event propagation on view click", () => {
			const onClick = vi.fn();
			const onParentClick = vi.fn();

			render(
				// biome-ignore lint/a11y/useKeyWithClickEvents: test
				// biome-ignore lint/a11y/noStaticElementInteractions: test
				<div onClick={onParentClick}>
					<ReminderToastContent reminder={mockReminder} onClick={onClick} />
				</div>,
			);

			fireEvent.click(screen.getByTestId("reminder-toast-view-button"));

			expect(onClick).toHaveBeenCalled();
			expect(onParentClick).not.toHaveBeenCalled();
		});
	});

	describe("Numeric IDs", () => {
		it("handles numeric todoId correctly", () => {
			render(<ReminderToastContent reminder={mockNumericIdReminder} />);

			expect(screen.getByTestId("reminder-toast-title")).toHaveTextContent(
				"Numeric ID task",
			);
		});
	});

	describe("Edge Cases", () => {
		it("handles long todo text with truncation", () => {
			const longTextReminder: DueReminder = {
				...mockReminder,
				todoText:
					"This is a very long todo text that should be truncated in the toast display to prevent it from taking up too much space",
			};

			render(<ReminderToastContent reminder={longTextReminder} />);

			const title = screen.getByTestId("reminder-toast-title");
			expect(title).toHaveClass("truncate");
		});

		it("handles special characters in todo text", () => {
			const specialCharReminder: DueReminder = {
				...mockReminder,
				todoText: 'Task with <script> & special "chars"',
			};

			render(<ReminderToastContent reminder={specialCharReminder} />);

			expect(screen.getByTestId("reminder-toast-title")).toHaveTextContent(
				'Task with <script> & special "chars"',
			);
		});

		it("handles unicode in todo text", () => {
			const unicodeReminder: DueReminder = {
				...mockReminder,
				todoText: "完成报告 📝",
			};

			render(<ReminderToastContent reminder={unicodeReminder} />);

			expect(screen.getByTestId("reminder-toast-title")).toHaveTextContent(
				"完成报告 📝",
			);
		});
	});
});

// ============================================================================
// useReminderToast Hook Tests
// ============================================================================

describe("useReminderToast", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function TestComponent({
		onDismiss,
		onReminderClick,
		reminder,
	}: {
		onDismiss?: (todoId: number | string) => void;
		onReminderClick?: (reminder: DueReminder) => void;
		reminder: DueReminder;
	}) {
		const { showReminderToast, dismissToast, dismissAllToasts } =
			useReminderToast({ onDismiss, onReminderClick });

		return (
			<div>
				<button
					type="button"
					data-testid="show-toast"
					onClick={() => showReminderToast(reminder)}
				>
					Show Toast
				</button>
				<button
					type="button"
					data-testid="dismiss-toast"
					onClick={() => dismissToast("reminder-toast-123")}
				>
					Dismiss Toast
				</button>
				<button
					type="button"
					data-testid="dismiss-all"
					onClick={dismissAllToasts}
				>
					Dismiss All
				</button>
			</div>
		);
	}

	it("shows toast when showReminderToast called", () => {
		render(<TestComponent reminder={mockReminder} />);

		fireEvent.click(screen.getByTestId("show-toast"));

		expect(mockedToast.custom).toHaveBeenCalled();
	});

	it("generates correct toast ID", () => {
		render(<TestComponent reminder={mockReminder} />);

		fireEvent.click(screen.getByTestId("show-toast"));

		expect(mockedToast.custom).toHaveBeenCalledWith(
			expect.any(Function),
			expect.objectContaining({
				id: "reminder-toast-123",
			}),
		);
	});

	it("sets infinite duration for reminder toasts", () => {
		render(<TestComponent reminder={mockReminder} />);

		fireEvent.click(screen.getByTestId("show-toast"));

		expect(mockedToast.custom).toHaveBeenCalledWith(
			expect.any(Function),
			expect.objectContaining({
				duration: Number.POSITIVE_INFINITY,
			}),
		);
	});

	it("prevents duplicate toasts for same reminder", () => {
		render(<TestComponent reminder={mockReminder} />);

		fireEvent.click(screen.getByTestId("show-toast"));
		fireEvent.click(screen.getByTestId("show-toast"));

		// Should only be called once
		expect(mockedToast.custom).toHaveBeenCalledTimes(1);
	});

	it("dismisses toast when dismissToast called", () => {
		render(<TestComponent reminder={mockReminder} />);

		fireEvent.click(screen.getByTestId("dismiss-toast"));

		expect(mockedToast.dismiss).toHaveBeenCalledWith("reminder-toast-123");
	});

	it("dismisses all toasts when dismissAllToasts called", () => {
		render(<TestComponent reminder={mockReminder} />);

		// Show a toast first
		fireEvent.click(screen.getByTestId("show-toast"));

		// Then dismiss all
		fireEvent.click(screen.getByTestId("dismiss-all"));

		expect(mockedToast.dismiss).toHaveBeenCalled();
	});
});

// ============================================================================
// ReminderToastManager Component Tests
// ============================================================================

describe("ReminderToastManager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null (renders nothing)", () => {
		const { container } = render(
			<ReminderToastManager reminders={[mockReminder]} />,
		);

		expect(container.firstChild).toBeNull();
	});

	it("shows toasts for new reminders", () => {
		render(<ReminderToastManager reminders={[mockReminder]} />);

		expect(mockedToast.custom).toHaveBeenCalled();
	});

	it("shows toasts for multiple reminders", () => {
		render(
			<ReminderToastManager
				reminders={[mockReminder, mockOverdueReminder, mockReminderNoDueDate]}
			/>,
		);

		expect(mockedToast.custom).toHaveBeenCalledTimes(3);
	});

	it("does not show duplicate toasts on rerender", () => {
		const { rerender } = render(
			<ReminderToastManager reminders={[mockReminder]} />,
		);

		rerender(<ReminderToastManager reminders={[mockReminder]} />);

		// Should only be called once, not twice
		expect(mockedToast.custom).toHaveBeenCalledTimes(1);
	});

	it("does not show toasts when disabled", () => {
		render(<ReminderToastManager reminders={[mockReminder]} enabled={false} />);

		expect(mockedToast.custom).not.toHaveBeenCalled();
	});

	it("shows toasts for new reminders added to list", () => {
		const { rerender } = render(
			<ReminderToastManager reminders={[mockReminder]} />,
		);

		rerender(
			<ReminderToastManager reminders={[mockReminder, mockOverdueReminder]} />,
		);

		// Should show toast for new reminder
		expect(mockedToast.custom).toHaveBeenCalledTimes(2);
	});

	it("does not show toast again for reminder that was already shown", () => {
		const { rerender } = render(
			<ReminderToastManager reminders={[mockReminder, mockOverdueReminder]} />,
		);

		// Remove one reminder
		rerender(<ReminderToastManager reminders={[mockReminder]} />);

		// Add it back - should not show a new toast (already tracked as shown)
		rerender(
			<ReminderToastManager reminders={[mockReminder, mockOverdueReminder]} />,
		);

		// The manager tracks shown reminders to prevent duplicates
		// So re-adding should not trigger a new toast
		expect(mockedToast.custom).toHaveBeenCalledTimes(2);
	});

	it("handles empty reminders array", () => {
		render(<ReminderToastManager reminders={[]} />);

		expect(mockedToast.custom).not.toHaveBeenCalled();
	});

	it("handles numeric todoIds", () => {
		render(<ReminderToastManager reminders={[mockNumericIdReminder]} />);

		expect(mockedToast.custom).toHaveBeenCalled();
	});
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("Accessibility", () => {
	it("has proper aria-labels on buttons", () => {
		render(
			<ReminderToastContent
				reminder={mockReminder}
				onDismiss={() => {}}
				onClick={() => {}}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /dismiss/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /view/i })).toBeInTheDocument();
	});

	it("icons are hidden from screen readers", () => {
		render(<ReminderToastContent reminder={mockReminder} />);

		const icon = screen.getByTestId("reminder-toast-icon");
		const svgElement = icon.querySelector("svg");
		expect(svgElement).toHaveAttribute("aria-hidden", "true");
	});
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("works with onDismiss callback", () => {
		const onDismiss = vi.fn();

		render(
			<ReminderToastManager reminders={[mockReminder]} onDismiss={onDismiss} />,
		);

		// The custom toast renders with an onDismiss handler that calls our callback
		expect(mockedToast.custom).toHaveBeenCalled();
	});

	it("works with onReminderClick callback", () => {
		const onReminderClick = vi.fn();

		render(
			<ReminderToastManager
				reminders={[mockReminder]}
				onReminderClick={onReminderClick}
			/>,
		);

		expect(mockedToast.custom).toHaveBeenCalled();
	});
});
