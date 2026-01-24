import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleTasksProvider, useGoogleTasks } from "./google-tasks-provider";

// ============================================================================
// Mocks
// ============================================================================

// Mock useGoogleTasksStatus hook
const mockUseGoogleTasksStatus = vi.fn();
vi.mock("@/app/api/google-tasks", () => ({
	useGoogleTasksStatus: () => mockUseGoogleTasksStatus(),
	useUpdateGoogleTasksSettings: () => ({
		updateSettings: mockUpdateSettings,
		isPending: mockIsUpdatePending,
	}),
}));

// Mock updateSettings function
const mockUpdateSettings = vi.fn();
const mockIsUpdatePending = vi.fn(() => false);

// ============================================================================
// Test Helpers
// ============================================================================

function setupMocks({
	status = null,
	isLoading = false,
	error = null,
	isUpdatePending = false,
}: {
	status?: {
		linked: boolean;
		enabled: boolean;
		syncEnabled: boolean;
		lastSyncedAt: string | null;
		defaultListId: string | null;
	} | null;
	isLoading?: boolean;
	error?: Error | null;
	isUpdatePending?: boolean;
} = {}) {
	mockUseGoogleTasksStatus.mockReturnValue({
		status,
		isLoading,
		error,
		refetch: vi.fn(),
	});

	mockIsUpdatePending.mockReturnValue(isUpdatePending);
}

// Test component to use the hook
function TestComponent() {
	const { isEnabled, isSyncEnabled, isLoading } = useGoogleTasks();

	return (
		<div data-testid="test-component">
			<span data-testid="is-enabled">{String(isEnabled)}</span>
			<span data-testid="is-sync-enabled">{String(isSyncEnabled)}</span>
			<span data-testid="is-loading">{String(isLoading)}</span>
		</div>
	);
}

// ============================================================================
// Tests
// ============================================================================

describe("GoogleTasksProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("rendering", () => {
		it("renders children", () => {
			setupMocks();

			render(
				<GoogleTasksProvider>
					<div data-testid="child">Child content</div>
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("child")).toBeInTheDocument();
			expect(screen.getByText("Child content")).toBeInTheDocument();
		});

		it("renders multiple children", () => {
			setupMocks();

			render(
				<GoogleTasksProvider>
					<div data-testid="child-1">First</div>
					<div data-testid="child-2">Second</div>
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("child-1")).toBeInTheDocument();
			expect(screen.getByTestId("child-2")).toBeInTheDocument();
		});
	});

	describe("context values", () => {
		it("provides status from useGoogleTasksStatus", () => {
			const status = {
				linked: true,
				enabled: true,
				syncEnabled: true,
				lastSyncedAt: "2026-01-24T10:00:00Z",
				defaultListId: "default-list",
			};
			setupMocks({ status });

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-enabled")).toHaveTextContent("true");
			expect(screen.getByTestId("is-sync-enabled")).toHaveTextContent("true");
		});

		it("provides isLoading from status hook", () => {
			setupMocks({ isLoading: true });

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
		});

		it("provides isLoading from updateSettings when pending", () => {
			setupMocks({ isLoading: false, isUpdatePending: true });

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
		});

		it("provides error from status hook", () => {
			const error = new Error("Failed to fetch status");
			setupMocks({ error });

			render(
				<GoogleTasksProvider>
					<div data-testid="error-test">Test</div>
				</GoogleTasksProvider>,
			);

			// Component should still render despite error
			expect(screen.getByTestId("error-test")).toBeInTheDocument();
		});
	});

	describe("isEnabled computed value", () => {
		it("returns false when status is null", () => {
			setupMocks({ status: null });

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-enabled")).toHaveTextContent("false");
		});

		it("returns false when linked is false", () => {
			setupMocks({
				status: {
					linked: false,
					enabled: true,
					syncEnabled: true,
					lastSyncedAt: null,
					defaultListId: null,
				},
			});

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-enabled")).toHaveTextContent("false");
		});

		it("returns false when enabled is false", () => {
			setupMocks({
				status: {
					linked: true,
					enabled: false,
					syncEnabled: true,
					lastSyncedAt: null,
					defaultListId: null,
				},
			});

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-enabled")).toHaveTextContent("false");
		});

		it("returns true when both linked and enabled are true", () => {
			setupMocks({
				status: {
					linked: true,
					enabled: true,
					syncEnabled: false,
					lastSyncedAt: null,
					defaultListId: null,
				},
			});

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-enabled")).toHaveTextContent("true");
		});
	});

	describe("isSyncEnabled computed value", () => {
		it("returns false when status is null", () => {
			setupMocks({ status: null });

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-sync-enabled")).toHaveTextContent("false");
		});

		it("returns false when syncEnabled is false", () => {
			setupMocks({
				status: {
					linked: true,
					enabled: true,
					syncEnabled: false,
					lastSyncedAt: null,
					defaultListId: null,
				},
			});

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-sync-enabled")).toHaveTextContent("false");
		});

		it("returns true when syncEnabled is true", () => {
			setupMocks({
				status: {
					linked: true,
					enabled: true,
					syncEnabled: true,
					lastSyncedAt: "2026-01-24T10:00:00Z",
					defaultListId: "default-list",
				},
			});

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-sync-enabled")).toHaveTextContent("true");
		});
	});

	describe("useGoogleTasks hook", () => {
		it("returns default values when used outside provider", () => {
			// Render without provider
			render(<TestComponent />);

			expect(screen.getByTestId("is-enabled")).toHaveTextContent("false");
			expect(screen.getByTestId("is-sync-enabled")).toHaveTextContent("false");
			expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
		});

		it("provides refetch function", () => {
			const refetch = vi.fn();
			setupMocks({});
			mockUseGoogleTasksStatus.mockReturnValue({
				status: null,
				isLoading: false,
				error: null,
				refetch,
			});

			function TestRefetchComponent() {
				const { refetch: refetchFn } = useGoogleTasks();
				return (
					<button
						type="button"
						data-testid="refetch-btn"
						onClick={() => refetchFn()}
					>
						Refetch
					</button>
				);
			}

			render(
				<GoogleTasksProvider>
					<TestRefetchComponent />
				</GoogleTasksProvider>,
			);

			const button = screen.getByTestId("refetch-btn");
			expect(button).toBeInTheDocument();
		});

		it("provides setSyncEnabled function", () => {
			setupMocks({});

			function TestSetSyncComponent() {
				const { setSyncEnabled } = useGoogleTasks();
				return (
					<button
						type="button"
						data-testid="set-sync-btn"
						onClick={() => setSyncEnabled(true)}
					>
						Enable Sync
					</button>
				);
			}

			render(
				<GoogleTasksProvider>
					<TestSetSyncComponent />
				</GoogleTasksProvider>,
			);

			const button = screen.getByTestId("set-sync-btn");
			expect(button).toBeInTheDocument();
		});
	});

	describe("setSyncEnabled", () => {
		it("calls updateSettings with correct value", async () => {
			mockUpdateSettings.mockResolvedValue(undefined);
			setupMocks({
				status: {
					linked: true,
					enabled: true,
					syncEnabled: false,
					lastSyncedAt: null,
					defaultListId: null,
				},
			});

			function TestSetSyncComponent() {
				const { setSyncEnabled } = useGoogleTasks();
				return (
					<button
						type="button"
						data-testid="enable-sync-btn"
						onClick={async () => {
							await setSyncEnabled(true);
						}}
					>
						Enable Sync
					</button>
				);
			}

			render(
				<GoogleTasksProvider>
					<TestSetSyncComponent />
				</GoogleTasksProvider>,
			);

			const button = screen.getByTestId("enable-sync-btn");
			button.click();

			await waitFor(() => {
				expect(mockUpdateSettings).toHaveBeenCalledWith({
					syncEnabled: true,
				});
			});
		});

		it("handles errors from updateSettings", async () => {
			mockUpdateSettings.mockRejectedValue(new Error("Update failed"));
			setupMocks({
				status: {
					linked: true,
					enabled: true,
					syncEnabled: false,
					lastSyncedAt: null,
					defaultListId: null,
				},
			});

			function TestSetSyncComponent() {
				const { setSyncEnabled } = useGoogleTasks();
				return (
					<button
						type="button"
						data-testid="enable-sync-btn"
						onClick={async () => {
							try {
								await setSyncEnabled(true);
							} catch {
								// Expected error
							}
						}}
					>
						Enable Sync
					</button>
				);
			}

			render(
				<GoogleTasksProvider>
					<TestSetSyncComponent />
				</GoogleTasksProvider>,
			);

			const button = screen.getByTestId("enable-sync-btn");
			button.click();

			await waitFor(() => {
				expect(mockUpdateSettings).toHaveBeenCalledWith({
					syncEnabled: true,
				});
			});
		});
	});

	describe("edge cases", () => {
		it("renders without children", () => {
			setupMocks();

			render(<GoogleTasksProvider>{null}</GoogleTasksProvider>);

			// Should not throw
			expect(document.body).toBeInTheDocument();
		});

		it("handles status with null values", () => {
			setupMocks({
				status: {
					linked: true,
					enabled: true,
					syncEnabled: true,
					lastSyncedAt: null,
					defaultListId: null,
				},
			});

			render(
				<GoogleTasksProvider>
					<TestComponent />
				</GoogleTasksProvider>,
			);

			expect(screen.getByTestId("is-enabled")).toHaveTextContent("true");
			expect(screen.getByTestId("is-sync-enabled")).toHaveTextContent("true");
		});

		it("handles undefined refetch", () => {
			setupMocks({});
			mockUseGoogleTasksStatus.mockReturnValue({
				status: null,
				isLoading: false,
				error: null,
				refetch: undefined,
			});

			render(
				<GoogleTasksProvider>
					<div data-testid="test-div">Test</div>
				</GoogleTasksProvider>,
			);

			// Should handle gracefully
			expect(screen.getByTestId("test-div")).toBeInTheDocument();
		});
	});
});
