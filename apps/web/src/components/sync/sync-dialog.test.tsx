import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncDialog } from "./sync-dialog";

describe("SyncDialog", () => {
	const defaultProps = {
		open: true,
		onOpenChange: vi.fn(),
		localTodosCount: 0,
		remoteTodosCount: 0,
		localFoldersCount: 0,
		remoteFoldersCount: 0,
		localSubtasksCount: 0,
		onSyncAction: vi.fn(),
		isSyncing: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders the dialog when open", () => {
			render(<SyncDialog {...defaultProps} />);

			expect(screen.getByTestId("sync-dialog")).toBeInTheDocument();
			expect(screen.getByText("Sync Local Data")).toBeInTheDocument();
		});

		it("does not render when closed", () => {
			render(<SyncDialog {...defaultProps} open={false} />);

			expect(screen.queryByTestId("sync-dialog")).not.toBeInTheDocument();
		});

		it("renders description text", () => {
			render(<SyncDialog {...defaultProps} />);

			expect(
				screen.getByText(
					"You have local data that can be synced to your account.",
				),
			).toBeInTheDocument();
		});

		it("renders sync button", () => {
			render(<SyncDialog {...defaultProps} localTodosCount={1} />);

			expect(screen.getByTestId("sync-upload-button")).toBeInTheDocument();
			expect(screen.getByText("Sync to Cloud")).toBeInTheDocument();
		});

		it("renders discard button", () => {
			render(<SyncDialog {...defaultProps} />);

			expect(screen.getByTestId("sync-discard-button")).toBeInTheDocument();
			expect(screen.getByText("Discard")).toBeInTheDocument();
		});
	});

	describe("Local Items Display", () => {
		it("displays local todos count", () => {
			render(<SyncDialog {...defaultProps} localTodosCount={5} />);

			const localSummary = screen.getByTestId("sync-local-summary");
			expect(localSummary).toBeInTheDocument();
			expect(screen.getByTestId("sync-local-todos-count")).toHaveTextContent(
				"5 todos",
			);
		});

		it("displays singular for single todo", () => {
			render(<SyncDialog {...defaultProps} localTodosCount={1} />);

			expect(screen.getByTestId("sync-local-todos-count")).toHaveTextContent(
				"1 todo",
			);
		});

		it("displays local folders count", () => {
			render(<SyncDialog {...defaultProps} localFoldersCount={3} />);

			expect(screen.getByTestId("sync-local-folders-count")).toHaveTextContent(
				"3 folders",
			);
		});

		it("displays singular for single folder", () => {
			render(<SyncDialog {...defaultProps} localFoldersCount={1} />);

			expect(screen.getByTestId("sync-local-folders-count")).toHaveTextContent(
				"1 folder",
			);
		});

		it("displays local subtasks count", () => {
			render(<SyncDialog {...defaultProps} localSubtasksCount={10} />);

			expect(screen.getByTestId("sync-local-subtasks-count")).toHaveTextContent(
				"10 subtasks",
			);
		});

		it("displays singular for single subtask", () => {
			render(<SyncDialog {...defaultProps} localSubtasksCount={1} />);

			expect(screen.getByTestId("sync-local-subtasks-count")).toHaveTextContent(
				"1 subtask",
			);
		});

		it("displays all local item types", () => {
			render(
				<SyncDialog
					{...defaultProps}
					localTodosCount={2}
					localFoldersCount={3}
					localSubtasksCount={5}
				/>,
			);

			expect(screen.getByTestId("sync-local-todos-count")).toBeInTheDocument();
			expect(
				screen.getByTestId("sync-local-folders-count"),
			).toBeInTheDocument();
			expect(
				screen.getByTestId("sync-local-subtasks-count"),
			).toBeInTheDocument();
		});

		it("hides todo count when zero", () => {
			render(
				<SyncDialog
					{...defaultProps}
					localTodosCount={0}
					localFoldersCount={2}
				/>,
			);

			expect(
				screen.queryByTestId("sync-local-todos-count"),
			).not.toBeInTheDocument();
		});

		it("hides folder count when zero", () => {
			render(
				<SyncDialog
					{...defaultProps}
					localFoldersCount={0}
					localTodosCount={2}
				/>,
			);

			expect(
				screen.queryByTestId("sync-local-folders-count"),
			).not.toBeInTheDocument();
		});

		it("hides subtask count when zero", () => {
			render(
				<SyncDialog
					{...defaultProps}
					localSubtasksCount={0}
					localTodosCount={2}
				/>,
			);

			expect(
				screen.queryByTestId("sync-local-subtasks-count"),
			).not.toBeInTheDocument();
		});

		it("shows 'No local data' message when all counts are zero", () => {
			render(<SyncDialog {...defaultProps} />);

			expect(screen.getByText("No local data")).toBeInTheDocument();
		});
	});

	describe("Remote Items Display", () => {
		it("displays remote todos count", () => {
			render(<SyncDialog {...defaultProps} remoteTodosCount={8} />);

			expect(screen.getByTestId("sync-remote-summary")).toBeInTheDocument();
			expect(screen.getByTestId("sync-remote-todos-count")).toHaveTextContent(
				"8 todos",
			);
		});

		it("displays singular for single remote todo", () => {
			render(<SyncDialog {...defaultProps} remoteTodosCount={1} />);

			expect(screen.getByTestId("sync-remote-todos-count")).toHaveTextContent(
				"1 todo",
			);
		});

		it("displays remote folders count", () => {
			render(<SyncDialog {...defaultProps} remoteFoldersCount={4} />);

			expect(screen.getByTestId("sync-remote-folders-count")).toHaveTextContent(
				"4 folders",
			);
		});

		it("displays singular for single remote folder", () => {
			render(<SyncDialog {...defaultProps} remoteFoldersCount={1} />);

			expect(screen.getByTestId("sync-remote-folders-count")).toHaveTextContent(
				"1 folder",
			);
		});

		it("hides remote summary when no remote items", () => {
			render(
				<SyncDialog
					{...defaultProps}
					remoteTodosCount={0}
					remoteFoldersCount={0}
				/>,
			);

			expect(
				screen.queryByTestId("sync-remote-summary"),
			).not.toBeInTheDocument();
		});

		it("hides remote todo count when zero", () => {
			render(
				<SyncDialog
					{...defaultProps}
					remoteTodosCount={0}
					remoteFoldersCount={2}
				/>,
			);

			expect(
				screen.queryByTestId("sync-remote-todos-count"),
			).not.toBeInTheDocument();
		});

		it("hides remote folder count when zero", () => {
			render(
				<SyncDialog
					{...defaultProps}
					remoteFoldersCount={0}
					remoteTodosCount={2}
				/>,
			);

			expect(
				screen.queryByTestId("sync-remote-folders-count"),
			).not.toBeInTheDocument();
		});
	});

	describe("Keep Both Button", () => {
		it("shows Keep Both button when there are remote items", () => {
			render(<SyncDialog {...defaultProps} remoteTodosCount={1} />);

			expect(screen.getByTestId("sync-keep-both-button")).toBeInTheDocument();
		});

		it("hides Keep Both button when no remote items", () => {
			render(
				<SyncDialog
					{...defaultProps}
					remoteTodosCount={0}
					remoteFoldersCount={0}
				/>,
			);

			expect(
				screen.queryByTestId("sync-keep-both-button"),
			).not.toBeInTheDocument();
		});
	});

	describe("Sync Actions", () => {
		it("calls onSyncAction with 'sync' when sync button clicked", async () => {
			const onSyncAction = vi.fn().mockResolvedValue(undefined);
			render(
				<SyncDialog
					{...defaultProps}
					localTodosCount={2}
					onSyncAction={onSyncAction}
				/>,
			);

			await userEvent.click(screen.getByTestId("sync-upload-button"));

			expect(onSyncAction).toHaveBeenCalledWith("sync");
		});

		it("calls onSyncAction with 'discard' when discard button clicked", async () => {
			const onSyncAction = vi.fn().mockResolvedValue(undefined);
			render(<SyncDialog {...defaultProps} onSyncAction={onSyncAction} />);

			await userEvent.click(screen.getByTestId("sync-discard-button"));

			expect(onSyncAction).toHaveBeenCalledWith("discard");
		});

		it("calls onSyncAction with 'keep_both' when keep both button clicked", async () => {
			const onSyncAction = vi.fn().mockResolvedValue(undefined);
			render(
				<SyncDialog
					{...defaultProps}
					remoteTodosCount={1}
					onSyncAction={onSyncAction}
				/>,
			);

			await userEvent.click(screen.getByTestId("sync-keep-both-button"));

			expect(onSyncAction).toHaveBeenCalledWith("keep_both");
		});

		it("closes dialog after sync action", async () => {
			const onOpenChange = vi.fn();
			const onSyncAction = vi.fn().mockResolvedValue(undefined);
			render(
				<SyncDialog
					{...defaultProps}
					localTodosCount={1}
					onOpenChange={onOpenChange}
					onSyncAction={onSyncAction}
				/>,
			);

			await userEvent.click(screen.getByTestId("sync-upload-button"));

			await waitFor(() => {
				expect(onOpenChange).toHaveBeenCalledWith(false);
			});
		});

		it("closes dialog after discard action", async () => {
			const onOpenChange = vi.fn();
			const onSyncAction = vi.fn().mockResolvedValue(undefined);
			render(
				<SyncDialog
					{...defaultProps}
					onOpenChange={onOpenChange}
					onSyncAction={onSyncAction}
				/>,
			);

			await userEvent.click(screen.getByTestId("sync-discard-button"));

			await waitFor(() => {
				expect(onOpenChange).toHaveBeenCalledWith(false);
			});
		});
	});

	describe("Disabled States", () => {
		it("disables sync button when no local items", () => {
			render(<SyncDialog {...defaultProps} />);

			expect(screen.getByTestId("sync-upload-button")).toBeDisabled();
		});

		it("enables sync button when local items exist", () => {
			render(<SyncDialog {...defaultProps} localTodosCount={1} />);

			expect(screen.getByTestId("sync-upload-button")).not.toBeDisabled();
		});

		it("disables all buttons when syncing", () => {
			render(
				<SyncDialog
					{...defaultProps}
					localTodosCount={1}
					remoteTodosCount={1}
					isSyncing={true}
				/>,
			);

			expect(screen.getByTestId("sync-upload-button")).toBeDisabled();
			expect(screen.getByTestId("sync-discard-button")).toBeDisabled();
			expect(screen.getByTestId("sync-keep-both-button")).toBeDisabled();
		});

		it("shows syncing text when syncing", () => {
			render(
				<SyncDialog {...defaultProps} localTodosCount={1} isSyncing={true} />,
			);

			expect(screen.getByText("Syncing...")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("has dialog role", () => {
			render(<SyncDialog {...defaultProps} />);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		it("has accessible title", () => {
			render(<SyncDialog {...defaultProps} />);

			expect(screen.getByText("Sync Local Data")).toBeInTheDocument();
		});

		it("has accessible description", () => {
			render(<SyncDialog {...defaultProps} />);

			expect(
				screen.getByText(
					"You have local data that can be synced to your account.",
				),
			).toBeInTheDocument();
		});
	});

	describe("Mixed Scenarios", () => {
		it("handles scenario with local and remote items", () => {
			render(
				<SyncDialog
					{...defaultProps}
					localTodosCount={3}
					localFoldersCount={2}
					localSubtasksCount={5}
					remoteTodosCount={10}
					remoteFoldersCount={4}
				/>,
			);

			// Local items
			expect(screen.getByTestId("sync-local-todos-count")).toHaveTextContent(
				"3 todos",
			);
			expect(screen.getByTestId("sync-local-folders-count")).toHaveTextContent(
				"2 folders",
			);
			expect(screen.getByTestId("sync-local-subtasks-count")).toHaveTextContent(
				"5 subtasks",
			);

			// Remote items
			expect(screen.getByTestId("sync-remote-todos-count")).toHaveTextContent(
				"10 todos",
			);
			expect(screen.getByTestId("sync-remote-folders-count")).toHaveTextContent(
				"4 folders",
			);

			// All buttons visible
			expect(screen.getByTestId("sync-upload-button")).toBeInTheDocument();
			expect(screen.getByTestId("sync-discard-button")).toBeInTheDocument();
			expect(screen.getByTestId("sync-keep-both-button")).toBeInTheDocument();
		});

		it("handles scenario with only local items (new user)", () => {
			render(
				<SyncDialog
					{...defaultProps}
					localTodosCount={5}
					localFoldersCount={2}
					remoteTodosCount={0}
					remoteFoldersCount={0}
				/>,
			);

			// Local items
			expect(screen.getByTestId("sync-local-todos-count")).toBeInTheDocument();
			expect(
				screen.getByTestId("sync-local-folders-count"),
			).toBeInTheDocument();

			// No remote section
			expect(
				screen.queryByTestId("sync-remote-summary"),
			).not.toBeInTheDocument();

			// No Keep Both button
			expect(
				screen.queryByTestId("sync-keep-both-button"),
			).not.toBeInTheDocument();
		});
	});
});
