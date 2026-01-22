import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "./page";

// Mock useSession hook
const mockUseSession = vi.fn();
vi.mock("@/lib/auth-client", () => ({
	useSession: () => mockUseSession(),
}));

// Mock AnalyticsDashboard component
vi.mock("@/components/analytics/analytics-dashboard", () => ({
	AnalyticsDashboard: () => (
		<div data-testid="analytics-dashboard">Analytics Dashboard</div>
	),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
	Cloud: () => <div data-testid="cloud-icon" />,
	HardDrive: () => <div data-testid="hard-drive-icon" />,
	Sparkles: () => <div data-testid="sparkles-icon" />,
}));

describe("AnalyticsPage", () => {
	describe("Guest User (Unauthenticated)", () => {
		beforeEach(() => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});
		});

		it("renders the page for guest users without redirecting", () => {
			render(<AnalyticsPage />);

			expect(screen.getByTestId("analytics-dashboard")).toBeInTheDocument();
		});

		it("shows the Local status badge for guest users", () => {
			render(<AnalyticsPage />);

			expect(screen.getByTestId("hard-drive-icon")).toBeInTheDocument();
			expect(screen.getByText("Local")).toBeInTheDocument();
		});

		it("displays sign-in prompt for guest users", () => {
			render(<AnalyticsPage />);

			expect(
				screen.getByText("Want to access your analytics anywhere?"),
			).toBeInTheDocument();
			expect(screen.getByText("Sign in")).toBeInTheDocument();
			expect(
				screen.getByText("to sync across all your devices."),
			).toBeInTheDocument();
		});

		it("sign-in link points to login page", () => {
			render(<AnalyticsPage />);

			const signInLink = screen.getByRole("link", { name: "Sign in" });
			expect(signInLink).toHaveAttribute("href", "/login");
		});

		it("renders the AnalyticsDashboard component", () => {
			render(<AnalyticsPage />);

			expect(screen.getByTestId("analytics-dashboard")).toBeInTheDocument();
		});
	});

	describe("Authenticated User", () => {
		beforeEach(() => {
			mockUseSession.mockReturnValue({
				data: { user: { id: "user-123", name: "Test User" } },
				isPending: false,
			});
		});

		it("renders the page for authenticated users", () => {
			render(<AnalyticsPage />);

			expect(screen.getByTestId("analytics-dashboard")).toBeInTheDocument();
		});

		it("shows the Synced status badge for authenticated users", () => {
			render(<AnalyticsPage />);

			expect(screen.getByTestId("cloud-icon")).toBeInTheDocument();
			expect(screen.getByText("Synced")).toBeInTheDocument();
		});

		it("does not display sign-in prompt for authenticated users", () => {
			render(<AnalyticsPage />);

			expect(
				screen.queryByText("Want to access your analytics anywhere?"),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("to sync across all your devices."),
			).not.toBeInTheDocument();
		});

		it("renders the AnalyticsDashboard component", () => {
			render(<AnalyticsPage />);

			expect(screen.getByTestId("analytics-dashboard")).toBeInTheDocument();
		});
	});

	describe("Page Structure", () => {
		beforeEach(() => {
			mockUseSession.mockReturnValue({
				data: null,
				isPending: false,
			});
		});

		it("has the correct container structure", () => {
			const { container } = render(<AnalyticsPage />);

			// Check for main container with positioning classes
			const mainContainer = container.firstChild;
			expect(mainContainer).toHaveClass("relative", "min-h-full");
		});

		it("renders background decoration element", () => {
			const { container } = render(<AnalyticsPage />);

			// Check for background decoration div
			const decorationContainer = container.querySelector(
				".pointer-events-none.absolute.inset-0",
			);
			expect(decorationContainer).toBeInTheDocument();
		});
	});
});
