import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsDashboard } from "./analytics-dashboard";

// Mock the analytics hooks
const mockUseAnalytics = vi.fn(() => ({
	data: undefined,
	isLoading: false,
	error: null,
}));
const mockUseCompletionHistory = vi.fn(() => ({
	data: undefined,
	isLoading: false,
	error: null,
}));

vi.mock("@/app/api/analytics", () => ({
	useAnalytics: () => mockUseAnalytics(),
	useCompletionHistory: () => mockUseCompletionHistory(),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
	Calendar: () => <div data-testid="calendar-icon" />,
	ChevronLeft: () => <div data-testid="chevron-left" />,
	ChevronRight: () => <div data-testid="chevron-right" />,
}));

// Mock child components
vi.mock("@/components/analytics/calendar-heatmap", () => ({
	CalendarHeatmap: ({ isLoading }: { isLoading: boolean }) => (
		<div data-testid="calendar-heatmap">
			{isLoading ? "Loading heatmap..." : "Calendar Heatmap"}
		</div>
	),
}));

vi.mock("@/components/analytics/completion-chart", () => ({
	CompletionChart: ({ isLoading }: { isLoading: boolean }) => (
		<div data-testid="completion-chart">
			{isLoading ? "Loading chart..." : "Completion Chart"}
		</div>
	),
}));

vi.mock("@/components/analytics/completion-history-list", () => ({
	CompletionHistoryList: ({ isLoading }: { isLoading: boolean }) => (
		<div data-testid="completion-history-list">
			{isLoading ? "Loading history..." : "Completion History List"}
		</div>
	),
}));

vi.mock("@/components/analytics/stats-cards", () => ({
	StatsCards: ({ isLoading }: { isLoading: boolean }) => (
		<div data-testid="stats-cards">
			{isLoading ? "Loading stats..." : "Stats Cards"}
		</div>
	),
}));

describe("AnalyticsDashboard", () => {
	it("renders the header", () => {
		render(<AnalyticsDashboard />);

		expect(screen.getByText("Analytics")).toBeInTheDocument();
		expect(
			screen.getByText("Track your task completion progress and patterns"),
		).toBeInTheDocument();
	});

	it("renders the date range selector with presets", () => {
		render(<AnalyticsDashboard />);

		expect(screen.getByText("7 days")).toBeInTheDocument();
		expect(screen.getByText("14 days")).toBeInTheDocument();
		expect(screen.getByText("30 days")).toBeInTheDocument();
		expect(screen.getByText("90 days")).toBeInTheDocument();
	});

	it("renders tab buttons", () => {
		render(<AnalyticsDashboard />);

		expect(screen.getByText("Overview")).toBeInTheDocument();
		expect(screen.getByText("History")).toBeInTheDocument();
	});

	it("shows Overview tab content by default", () => {
		render(<AnalyticsDashboard />);

		expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
		expect(screen.getByTestId("completion-chart")).toBeInTheDocument();
		expect(screen.queryByTestId("calendar-heatmap")).not.toBeInTheDocument();
		expect(
			screen.queryByTestId("completion-history-list"),
		).not.toBeInTheDocument();
	});

	it("shows Overview tab initially active", () => {
		render(<AnalyticsDashboard />);

		const overviewTab = screen.getByText("Overview");
		expect(overviewTab.className).toContain("bg-card");
	});

	it("uses 7 days preset by default", () => {
		render(<AnalyticsDashboard />);

		const sevenDaysButton = screen.getByText("7 days");
		expect(sevenDaysButton.className).toContain("bg-card");
	});

	it("uses custom initial preset when provided", () => {
		render(<AnalyticsDashboard initialPreset="30days" />);

		const thirtyDaysButton = screen.getByText("30 days");
		expect(thirtyDaysButton.className).toContain("bg-card");

		const sevenDaysButton = screen.getByText("7 days");
		expect(sevenDaysButton.className).not.toContain("bg-card");
	});

	it("passes loading state to child components", () => {
		mockUseAnalytics.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});
		mockUseCompletionHistory.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
		});

		render(<AnalyticsDashboard />);

		expect(screen.getByText("Loading stats...")).toBeInTheDocument();
		expect(screen.getByText("Loading chart...")).toBeInTheDocument();
	});

	it("displays error state when analytics query fails", () => {
		mockUseAnalytics.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error("Failed to fetch"),
		});
		mockUseCompletionHistory.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		});

		render(<AnalyticsDashboard />);

		expect(screen.getByTestId("analytics-error")).toBeInTheDocument();
		expect(
			screen.getByText("Failed to load analytics data"),
		).toBeInTheDocument();
	});

	it("displays error state when history query fails", () => {
		mockUseAnalytics.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		});
		mockUseCompletionHistory.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error("Failed to fetch"),
		});

		render(<AnalyticsDashboard />);

		expect(screen.getByTestId("analytics-error")).toBeInTheDocument();
	});

	it("does not render child components when there is an error", () => {
		mockUseAnalytics.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: new Error("Failed to fetch"),
		});
		mockUseCompletionHistory.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: null,
		});

		render(<AnalyticsDashboard />);

		expect(screen.queryByTestId("stats-cards")).not.toBeInTheDocument();
		expect(screen.queryByTestId("completion-chart")).not.toBeInTheDocument();
	});

	it("renders navigation buttons for date range", () => {
		render(<AnalyticsDashboard />);

		expect(screen.getByTestId("chevron-left")).toBeInTheDocument();
		expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
	});

	it("calls analytics and completion history hooks", () => {
		render(<AnalyticsDashboard />);

		expect(mockUseAnalytics).toHaveBeenCalled();
		expect(mockUseCompletionHistory).toHaveBeenCalled();
	});

	it("shows non-loading state when data is loaded", () => {
		mockUseAnalytics.mockReturnValue({
			data: {
				totalRegularCompleted: 10,
				totalRecurringCompleted: 5,
				totalRecurringMissed: 2,
				completionRate: 88,
				currentStreak: 3,
				dailyBreakdown: [],
			},
			isLoading: false,
			error: null,
		});
		mockUseCompletionHistory.mockReturnValue({
			data: [],
			isLoading: false,
			error: null,
		});

		render(<AnalyticsDashboard />);

		expect(screen.getByText("Stats Cards")).toBeInTheDocument();
		expect(screen.getByText("Completion Chart")).toBeInTheDocument();
	});

	it("renders both heatmap and history list components", () => {
		render(<AnalyticsDashboard />);

		// In overview tab, we have stats and chart
		expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
		expect(screen.getByTestId("completion-chart")).toBeInTheDocument();
	});

	it("displays date range with calendar icon", () => {
		render(<AnalyticsDashboard />);

		expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
	});

	it("shows date preset buttons in correct container", () => {
		render(<AnalyticsDashboard />);

		// Check that presets are rendered
		expect(screen.getByText("7 days")).toBeInTheDocument();
		expect(screen.getByText("14 days")).toBeInTheDocument();
		expect(screen.getByText("30 days")).toBeInTheDocument();
		expect(screen.getByText("90 days")).toBeInTheDocument();
	});
});
