import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { ReminderProvider } from "./reminder-provider";

// ============================================================================
// Mocks
// ============================================================================

// Mock useTodoStorage hook
const mockUseTodoStorage = vi.fn();
vi.mock("@/app/api/todo", () => ({
	useTodoStorage: () => mockUseTodoStorage(),
}));

// Mock useReminderChecker hook
const mockUseReminderChecker = vi.fn();
vi.mock("@/hooks/use-reminder-checker", () => ({
	useReminderChecker: (
		todos: unknown[],
		options: { enabled?: boolean; checkInterval?: number },
	) => mockUseReminderChecker(todos, options),
}));

// Mock ReminderToastManager
const mockReminderToastManager = vi.fn();
vi.mock("./reminder-toast", () => ({
	ReminderToastManager: (props: {
		reminders: unknown[];
		onDismiss: () => void;
		enabled: boolean;
	}) => {
		mockReminderToastManager(props);
		return (
			<div data-testid="reminder-toast-manager">
				{props.reminders.length} reminders
			</div>
		);
	},
}));

// ============================================================================
// Test Helpers
// ============================================================================

function setupMocks({
	todos = [],
	isLoading = false,
	dueReminders = [],
	dismissReminder = vi.fn(),
	dismissAllReminders = vi.fn(),
}: {
	todos?: Array<{
		id: number | string;
		text: string;
		completed: boolean;
		reminderAt?: string | null;
		dueDate?: string | null;
	}>;
	isLoading?: boolean;
	dueReminders?: Array<{
		todoId: number | string;
		todoText: string;
		reminderAt: string;
		dueDate: string | null;
	}>;
	dismissReminder?: Mock;
	dismissAllReminders?: Mock;
} = {}) {
	mockUseTodoStorage.mockReturnValue({
		todos,
		isLoading,
	});

	mockUseReminderChecker.mockReturnValue({
		dueReminders,
		dismissReminder,
		dismissAllReminders,
		shownCount: dueReminders.length,
		isChecking: false,
	});
}

// ============================================================================
// Tests
// ============================================================================

describe("ReminderProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("rendering", () => {
		it("renders children", () => {
			setupMocks();

			render(
				<ReminderProvider>
					<div data-testid="child">Child content</div>
				</ReminderProvider>,
			);

			expect(screen.getByTestId("child")).toBeInTheDocument();
			expect(screen.getByText("Child content")).toBeInTheDocument();
		});

		it("renders ReminderToastManager", () => {
			setupMocks();

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(screen.getByTestId("reminder-toast-manager")).toBeInTheDocument();
		});

		it("renders multiple children", () => {
			setupMocks();

			render(
				<ReminderProvider>
					<div data-testid="child-1">First</div>
					<div data-testid="child-2">Second</div>
				</ReminderProvider>,
			);

			expect(screen.getByTestId("child-1")).toBeInTheDocument();
			expect(screen.getByTestId("child-2")).toBeInTheDocument();
		});
	});

	describe("useTodoStorage integration", () => {
		it("calls useTodoStorage", () => {
			setupMocks();

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseTodoStorage).toHaveBeenCalled();
		});

		it("passes todos to useReminderChecker", () => {
			const todos = [
				{
					id: 1,
					text: "Test todo",
					completed: false,
					reminderAt: "2026-01-21T10:00:00Z",
					dueDate: "2026-01-21T12:00:00Z",
				},
			];
			setupMocks({ todos });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				todos,
				expect.any(Object),
			);
		});
	});

	describe("useReminderChecker integration", () => {
		it("enables reminder checker when not loading", () => {
			setupMocks({ isLoading: false });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ enabled: true }),
			);
		});

		it("disables reminder checker when loading", () => {
			setupMocks({ isLoading: true });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ enabled: false }),
			);
		});

		it("disables reminder checker when enabled prop is false", () => {
			setupMocks({ isLoading: false });

			render(
				<ReminderProvider enabled={false}>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ enabled: false }),
			);
		});

		it("passes checkInterval to useReminderChecker", () => {
			setupMocks();

			render(
				<ReminderProvider checkInterval={60000}>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ checkInterval: 60000 }),
			);
		});
	});

	describe("ReminderToastManager integration", () => {
		it("passes dueReminders to ReminderToastManager", () => {
			const dueReminders = [
				{
					todoId: 1,
					todoText: "Test reminder",
					reminderAt: "2026-01-21T10:00:00Z",
					dueDate: "2026-01-21T12:00:00Z",
				},
			];
			setupMocks({ dueReminders });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockReminderToastManager).toHaveBeenCalledWith(
				expect.objectContaining({ reminders: dueReminders }),
			);
		});

		it("passes dismissReminder to ReminderToastManager", () => {
			const dismissReminder = vi.fn();
			setupMocks({ dismissReminder });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockReminderToastManager).toHaveBeenCalledWith(
				expect.objectContaining({ onDismiss: dismissReminder }),
			);
		});

		it("enables ReminderToastManager when not loading", () => {
			setupMocks({ isLoading: false });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockReminderToastManager).toHaveBeenCalledWith(
				expect.objectContaining({ enabled: true }),
			);
		});

		it("disables ReminderToastManager when loading", () => {
			setupMocks({ isLoading: true });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockReminderToastManager).toHaveBeenCalledWith(
				expect.objectContaining({ enabled: false }),
			);
		});

		it("disables ReminderToastManager when enabled prop is false", () => {
			setupMocks({ isLoading: false });

			render(
				<ReminderProvider enabled={false}>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockReminderToastManager).toHaveBeenCalledWith(
				expect.objectContaining({ enabled: false }),
			);
		});
	});

	describe("props", () => {
		it("defaults enabled to true", () => {
			setupMocks();

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ enabled: true }),
			);
		});

		it("accepts enabled=false", () => {
			setupMocks();

			render(
				<ReminderProvider enabled={false}>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ enabled: false }),
			);
		});

		it("accepts custom checkInterval", () => {
			setupMocks();

			render(
				<ReminderProvider checkInterval={15000}>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ checkInterval: 15000 }),
			);
		});

		it("uses undefined checkInterval when not provided", () => {
			setupMocks();

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({ checkInterval: undefined }),
			);
		});
	});

	describe("with multiple todos", () => {
		it("passes all todos to useReminderChecker", () => {
			const todos = [
				{
					id: 1,
					text: "Todo 1",
					completed: false,
					reminderAt: "2026-01-21T10:00:00Z",
					dueDate: null,
				},
				{
					id: 2,
					text: "Todo 2",
					completed: false,
					reminderAt: "2026-01-21T11:00:00Z",
					dueDate: "2026-01-21T15:00:00Z",
				},
				{
					id: "local-3",
					text: "Local Todo",
					completed: true,
					reminderAt: null,
					dueDate: null,
				},
			];
			setupMocks({ todos });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				todos,
				expect.any(Object),
			);
		});
	});

	describe("with due reminders", () => {
		it("displays reminder count in ReminderToastManager", async () => {
			const dueReminders = [
				{
					todoId: 1,
					todoText: "Reminder 1",
					reminderAt: "2026-01-21T10:00:00Z",
					dueDate: null,
				},
				{
					todoId: 2,
					todoText: "Reminder 2",
					reminderAt: "2026-01-21T10:30:00Z",
					dueDate: "2026-01-21T12:00:00Z",
				},
			];
			setupMocks({ dueReminders });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("reminder-toast-manager")).toHaveTextContent(
					"2 reminders",
				);
			});
		});
	});

	describe("edge cases", () => {
		it("handles empty todos array", () => {
			setupMocks({ todos: [] });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockUseReminderChecker).toHaveBeenCalledWith(
				[],
				expect.any(Object),
			);
		});

		it("handles empty dueReminders array", () => {
			setupMocks({ dueReminders: [] });

			render(
				<ReminderProvider>
					<div>Child</div>
				</ReminderProvider>,
			);

			expect(mockReminderToastManager).toHaveBeenCalledWith(
				expect.objectContaining({ reminders: [] }),
			);
		});

		it("renders without children", () => {
			setupMocks();

			// TypeScript would prevent this, but test the runtime behavior
			render(<ReminderProvider>{null}</ReminderProvider>);

			expect(screen.getByTestId("reminder-toast-manager")).toBeInTheDocument();
		});
	});
});
