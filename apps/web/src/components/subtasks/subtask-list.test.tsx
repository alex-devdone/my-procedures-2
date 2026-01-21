"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Subtask, UseSubtaskStorageReturn } from "@/app/api/subtask";

// Mock the subtask hooks
const mockUseSubtaskStorage = vi.fn<() => UseSubtaskStorageReturn>();
vi.mock("@/app/api/subtask", async (importOriginal) => {
	const original = await importOriginal<typeof import("@/app/api/subtask")>();
	return {
		...original,
		useSubtaskStorage: () => mockUseSubtaskStorage(),
	};
});

// Import after mocks
import { StandaloneSubtaskList, SubtaskList } from "./subtask-list";

const createMockSubtask = (overrides: Partial<Subtask> = {}): Subtask => ({
	id: "subtask-1",
	text: "Test Subtask",
	completed: false,
	todoId: "todo-1",
	order: 0,
	...overrides,
});

const defaultMockReturn: UseSubtaskStorageReturn = {
	subtasks: [],
	create: vi.fn(),
	update: vi.fn(),
	toggle: vi.fn(),
	deleteSubtask: vi.fn(),
	reorder: vi.fn(),
	isLoading: false,
	isAuthenticated: false,
};

describe("SubtaskList", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSubtaskStorage.mockReturnValue(defaultMockReturn);
	});

	describe("Rendering", () => {
		it("renders empty state when no subtasks exist", () => {
			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks: [],
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-list-empty")).toBeInTheDocument();
			expect(screen.getByText("No subtasks yet")).toBeInTheDocument();
		});

		it("renders subtask list when subtasks exist", () => {
			const subtasks = [
				createMockSubtask({ id: "s1", text: "First subtask" }),
				createMockSubtask({ id: "s2", text: "Second subtask" }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-list")).toBeInTheDocument();
			expect(screen.getByTestId("subtask-item-s1")).toBeInTheDocument();
			expect(screen.getByTestId("subtask-item-s2")).toBeInTheDocument();
			expect(screen.getByText("First subtask")).toBeInTheDocument();
			expect(screen.getByText("Second subtask")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks: [],
			});

			render(<SubtaskList todoId="todo-1" className="custom-class" />);

			expect(screen.getByTestId("subtask-list-empty")).toHaveClass(
				"custom-class",
			);
		});
	});

	describe("Loading State", () => {
		it("shows loading skeleton when isLoading is true", () => {
			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				isLoading: true,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-list-loading")).toBeInTheDocument();
		});

		it("hides loading skeleton when isLoading is false", () => {
			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				isLoading: false,
				subtasks: [createMockSubtask()],
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(
				screen.queryByTestId("subtask-list-loading"),
			).not.toBeInTheDocument();
		});
	});

	describe("Checkbox Toggle", () => {
		it("renders checkbox for each subtask", () => {
			const subtasks = [
				createMockSubtask({ id: "s1", completed: false }),
				createMockSubtask({ id: "s2", completed: true }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-checkbox-s1")).toBeInTheDocument();
			expect(screen.getByTestId("subtask-checkbox-s2")).toBeInTheDocument();
		});

		it("shows checked state for completed subtasks", () => {
			const subtasks = [createMockSubtask({ id: "s1", completed: true })];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			const checkbox = screen.getByTestId("subtask-checkbox-s1");
			expect(checkbox).toHaveAttribute("data-checked");
		});

		it("calls toggle when checkbox is clicked", async () => {
			const toggle = vi.fn().mockResolvedValue({});
			const subtasks = [
				createMockSubtask({ id: "s1", text: "Test", completed: false }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
				toggle,
			});

			render(<SubtaskList todoId="todo-1" />);

			fireEvent.click(screen.getByTestId("subtask-checkbox-s1"));

			await waitFor(() => {
				expect(toggle).toHaveBeenCalledWith("s1", true);
			});
		});

		it("calls toggle with false when completed subtask is unchecked", async () => {
			const toggle = vi.fn().mockResolvedValue({});
			const subtasks = [
				createMockSubtask({ id: "s1", text: "Test", completed: true }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
				toggle,
			});

			render(<SubtaskList todoId="todo-1" />);

			fireEvent.click(screen.getByTestId("subtask-checkbox-s1"));

			await waitFor(() => {
				expect(toggle).toHaveBeenCalledWith("s1", false);
			});
		});
	});

	describe("Delete Subtask", () => {
		it("renders delete button for each subtask", () => {
			const subtasks = [
				createMockSubtask({ id: "s1", text: "Subtask 1" }),
				createMockSubtask({ id: "s2", text: "Subtask 2" }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-delete-s1")).toBeInTheDocument();
			expect(screen.getByTestId("subtask-delete-s2")).toBeInTheDocument();
		});

		it("calls deleteSubtask when delete button is clicked", async () => {
			const deleteSubtask = vi.fn().mockResolvedValue(undefined);
			const subtasks = [createMockSubtask({ id: "s1", text: "Test" })];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
				deleteSubtask,
			});

			render(<SubtaskList todoId="todo-1" />);

			fireEvent.click(screen.getByTestId("subtask-delete-s1"));

			await waitFor(() => {
				expect(deleteSubtask).toHaveBeenCalledWith("s1");
			});
		});

		it("delete button has accessible name", () => {
			const subtasks = [createMockSubtask({ id: "s1", text: "My Subtask" })];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-delete-s1")).toHaveAccessibleName(
				'Delete "My Subtask"',
			);
		});
	});

	describe("Completed Styling", () => {
		it("applies strikethrough to completed subtask text", () => {
			const subtasks = [
				createMockSubtask({ id: "s1", text: "Completed", completed: true }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-text-s1")).toHaveClass("line-through");
		});

		it("does not apply strikethrough to incomplete subtask text", () => {
			const subtasks = [
				createMockSubtask({ id: "s1", text: "Incomplete", completed: false }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-text-s1")).not.toHaveClass(
				"line-through",
			);
		});
	});

	describe("Read-Only Mode", () => {
		it("hides delete buttons in read-only mode", () => {
			const subtasks = [createMockSubtask({ id: "s1", text: "Test" })];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" readOnly />);

			expect(screen.queryByTestId("subtask-delete-s1")).not.toBeInTheDocument();
		});

		it("disables checkboxes in read-only mode", () => {
			const subtasks = [createMockSubtask({ id: "s1", text: "Test" })];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" readOnly />);

			// base-ui Checkbox uses aria-disabled instead of native disabled
			expect(screen.getByTestId("subtask-checkbox-s1")).toHaveAttribute(
				"aria-disabled",
				"true",
			);
		});
	});

	describe("Auto-Complete Callbacks", () => {
		it("calls onAllCompleted when last incomplete subtask is completed", async () => {
			const onAllCompleted = vi.fn();
			const toggle = vi.fn().mockResolvedValue({});
			const subtasks = [
				createMockSubtask({ id: "s1", completed: true }),
				createMockSubtask({ id: "s2", completed: false }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
				toggle,
			});

			render(<SubtaskList todoId="todo-1" onAllCompleted={onAllCompleted} />);

			fireEvent.click(screen.getByTestId("subtask-checkbox-s2"));

			await waitFor(() => {
				expect(onAllCompleted).toHaveBeenCalledOnce();
			});
		});

		it("does not call onAllCompleted when not all subtasks are completed", async () => {
			const onAllCompleted = vi.fn();
			const toggle = vi.fn().mockResolvedValue({});
			const subtasks = [
				createMockSubtask({ id: "s1", completed: false }),
				createMockSubtask({ id: "s2", completed: false }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
				toggle,
			});

			render(<SubtaskList todoId="todo-1" onAllCompleted={onAllCompleted} />);

			fireEvent.click(screen.getByTestId("subtask-checkbox-s1"));

			await waitFor(() => {
				expect(toggle).toHaveBeenCalled();
			});
			expect(onAllCompleted).not.toHaveBeenCalled();
		});

		it("calls onUncompleted when a completed subtask is unchecked and was all completed", async () => {
			const onUncompleted = vi.fn();
			const toggle = vi.fn().mockResolvedValue({});
			const subtasks = [
				createMockSubtask({ id: "s1", completed: true }),
				createMockSubtask({ id: "s2", completed: true }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
				toggle,
			});

			render(<SubtaskList todoId="todo-1" onUncompleted={onUncompleted} />);

			fireEvent.click(screen.getByTestId("subtask-checkbox-s1"));

			await waitFor(() => {
				expect(onUncompleted).toHaveBeenCalledOnce();
			});
		});
	});

	describe("Accessibility", () => {
		it("has accessible list landmark", () => {
			const subtasks = [createMockSubtask({ id: "s1" })];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByRole("list")).toHaveAccessibleName("Subtasks");
		});

		it("uses semantic list items", () => {
			const subtasks = [
				createMockSubtask({ id: "s1" }),
				createMockSubtask({ id: "s2" }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getAllByRole("listitem")).toHaveLength(2);
		});

		it("checkbox has accessible label", () => {
			const subtasks = [
				createMockSubtask({ id: "s1", text: "My Task", completed: false }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-checkbox-s1")).toHaveAccessibleName(
				'Mark "My Task" as complete',
			);
		});

		it("checkbox label changes for completed items", () => {
			const subtasks = [
				createMockSubtask({ id: "s1", text: "My Task", completed: true }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId="todo-1" />);

			expect(screen.getByTestId("subtask-checkbox-s1")).toHaveAccessibleName(
				'Mark "My Task" as incomplete',
			);
		});
	});

	describe("Numeric IDs", () => {
		it("handles numeric subtask IDs", () => {
			const subtasks = [
				createMockSubtask({ id: 123, text: "Numeric ID subtask" }),
			];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
			});

			render(<SubtaskList todoId={456} />);

			expect(screen.getByTestId("subtask-item-123")).toBeInTheDocument();
			expect(screen.getByText("Numeric ID subtask")).toBeInTheDocument();
		});

		it("calls toggle with numeric id", async () => {
			const toggle = vi.fn().mockResolvedValue({});
			const subtasks = [createMockSubtask({ id: 789, completed: false })];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
				toggle,
			});

			render(<SubtaskList todoId={456} />);

			fireEvent.click(screen.getByTestId("subtask-checkbox-789"));

			await waitFor(() => {
				expect(toggle).toHaveBeenCalledWith(789, true);
			});
		});

		it("calls deleteSubtask with numeric id", async () => {
			const deleteSubtask = vi.fn().mockResolvedValue(undefined);
			const subtasks = [createMockSubtask({ id: 321, text: "Test" })];

			mockUseSubtaskStorage.mockReturnValue({
				...defaultMockReturn,
				subtasks,
				deleteSubtask,
			});

			render(<SubtaskList todoId={456} />);

			fireEvent.click(screen.getByTestId("subtask-delete-321"));

			await waitFor(() => {
				expect(deleteSubtask).toHaveBeenCalledWith(321);
			});
		});
	});
});

describe("StandaloneSubtaskList", () => {
	describe("Rendering", () => {
		it("renders empty state when no subtasks provided", () => {
			render(
				<StandaloneSubtaskList
					subtasks={[]}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			expect(screen.getByTestId("subtask-list-empty")).toBeInTheDocument();
		});

		it("renders subtasks when provided", () => {
			const subtasks = [
				createMockSubtask({ id: "s1", text: "First" }),
				createMockSubtask({ id: "s2", text: "Second" }),
			];

			render(
				<StandaloneSubtaskList
					subtasks={subtasks}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			expect(screen.getByTestId("subtask-list")).toBeInTheDocument();
			expect(screen.getByText("First")).toBeInTheDocument();
			expect(screen.getByText("Second")).toBeInTheDocument();
		});
	});

	describe("Loading State", () => {
		it("shows loading skeleton when isLoading is true", () => {
			render(
				<StandaloneSubtaskList
					subtasks={[]}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
					isLoading
				/>,
			);

			expect(screen.getByTestId("subtask-list-loading")).toBeInTheDocument();
		});
	});

	describe("Interactions", () => {
		it("calls onToggle when checkbox is clicked", async () => {
			const onToggle = vi.fn().mockResolvedValue({});
			const subtasks = [
				createMockSubtask({ id: "s1", text: "Test", completed: false }),
			];

			render(
				<StandaloneSubtaskList
					subtasks={subtasks}
					onToggle={onToggle}
					onDelete={vi.fn()}
				/>,
			);

			fireEvent.click(screen.getByTestId("subtask-checkbox-s1"));

			await waitFor(() => {
				expect(onToggle).toHaveBeenCalledWith("s1", true);
			});
		});

		it("calls onDelete when delete button is clicked", async () => {
			const onDelete = vi.fn().mockResolvedValue(undefined);
			const subtasks = [createMockSubtask({ id: "s1", text: "Test" })];

			render(
				<StandaloneSubtaskList
					subtasks={subtasks}
					onToggle={vi.fn()}
					onDelete={onDelete}
				/>,
			);

			fireEvent.click(screen.getByTestId("subtask-delete-s1"));

			await waitFor(() => {
				expect(onDelete).toHaveBeenCalledWith("s1");
			});
		});
	});

	describe("Auto-Complete Callbacks", () => {
		it("calls onAllCompleted when all subtasks become completed", async () => {
			const onAllCompleted = vi.fn();
			const onToggle = vi.fn().mockResolvedValue({});
			const subtasks = [
				createMockSubtask({ id: "s1", completed: true }),
				createMockSubtask({ id: "s2", completed: false }),
			];

			render(
				<StandaloneSubtaskList
					subtasks={subtasks}
					onToggle={onToggle}
					onDelete={vi.fn()}
					onAllCompleted={onAllCompleted}
				/>,
			);

			fireEvent.click(screen.getByTestId("subtask-checkbox-s2"));

			await waitFor(() => {
				expect(onAllCompleted).toHaveBeenCalledOnce();
			});
		});

		it("calls onUncompleted when subtask is unchecked from all-completed state", async () => {
			const onUncompleted = vi.fn();
			const onToggle = vi.fn().mockResolvedValue({});
			const subtasks = [
				createMockSubtask({ id: "s1", completed: true }),
				createMockSubtask({ id: "s2", completed: true }),
			];

			render(
				<StandaloneSubtaskList
					subtasks={subtasks}
					onToggle={onToggle}
					onDelete={vi.fn()}
					onUncompleted={onUncompleted}
				/>,
			);

			fireEvent.click(screen.getByTestId("subtask-checkbox-s1"));

			await waitFor(() => {
				expect(onUncompleted).toHaveBeenCalledOnce();
			});
		});
	});

	describe("Read-Only Mode", () => {
		it("hides delete buttons in read-only mode", () => {
			const subtasks = [createMockSubtask({ id: "s1" })];

			render(
				<StandaloneSubtaskList
					subtasks={subtasks}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
					readOnly
				/>,
			);

			expect(screen.queryByTestId("subtask-delete-s1")).not.toBeInTheDocument();
		});

		it("disables checkboxes in read-only mode", () => {
			const subtasks = [createMockSubtask({ id: "s1" })];

			render(
				<StandaloneSubtaskList
					subtasks={subtasks}
					onToggle={vi.fn()}
					onDelete={vi.fn()}
					readOnly
				/>,
			);

			// base-ui Checkbox uses aria-disabled instead of native disabled
			expect(screen.getByTestId("subtask-checkbox-s1")).toHaveAttribute(
				"aria-disabled",
				"true",
			);
		});
	});
});
