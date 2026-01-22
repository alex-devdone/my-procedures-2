import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AnalyticsData } from "@/app/api/analytics/analytics.types";
import { StatsCards } from "./stats-cards";

const mockAnalyticsData: AnalyticsData = {
	totalRegularCompleted: 15,
	totalRecurringCompleted: 10,
	totalRecurringMissed: 3,
	completionRate: 89,
	currentStreak: 5,
	dailyBreakdown: [],
};

describe("StatsCards", () => {
	it("renders all four stat cards", () => {
		render(<StatsCards analytics={mockAnalyticsData} />);

		expect(screen.getByText("Total Completed")).toBeInTheDocument();
		expect(screen.getByText("Completion Rate")).toBeInTheDocument();
		expect(screen.getByText("Current Streak")).toBeInTheDocument();
		expect(screen.getByText("Missed Recurring")).toBeInTheDocument();
	});

	it("displays correct total completed (regular + recurring)", () => {
		render(<StatsCards analytics={mockAnalyticsData} />);

		// 15 regular + 10 recurring = 25
		expect(screen.getByText("25")).toBeInTheDocument();
	});

	it("displays completion rate with percentage sign", () => {
		render(<StatsCards analytics={mockAnalyticsData} />);

		expect(screen.getByText("89%")).toBeInTheDocument();
	});

	it("displays current streak with days label (plural)", () => {
		render(<StatsCards analytics={mockAnalyticsData} />);

		expect(screen.getByText("5 days")).toBeInTheDocument();
	});

	it("displays current streak with singular day for streak of 1", () => {
		const singleDayStreak: AnalyticsData = {
			...mockAnalyticsData,
			currentStreak: 1,
		};
		render(<StatsCards analytics={singleDayStreak} />);

		expect(screen.getByText("1 day")).toBeInTheDocument();
	});

	it("displays missed recurring count", () => {
		render(<StatsCards analytics={mockAnalyticsData} />);

		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("shows loading skeletons when isLoading is true", () => {
		const { container } = render(
			<StatsCards analytics={undefined} isLoading={true} />,
		);

		const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
		expect(skeletons.length).toBe(4);
	});

	it("displays zero values when analytics is undefined", () => {
		render(<StatsCards analytics={undefined} />);

		// Total completed and Missed Recurring should both be 0
		const zeroValues = screen.getAllByText("0");
		expect(zeroValues.length).toBe(2);
		// Completion rate should be 0%
		expect(screen.getByText("0%")).toBeInTheDocument();
		// Streak should be 0 days
		expect(screen.getByText("0 days")).toBeInTheDocument();
	});

	it("handles analytics with zero values", () => {
		const zeroAnalytics: AnalyticsData = {
			totalRegularCompleted: 0,
			totalRecurringCompleted: 0,
			totalRecurringMissed: 0,
			completionRate: 0,
			currentStreak: 0,
			dailyBreakdown: [],
		};
		render(<StatsCards analytics={zeroAnalytics} />);

		expect(screen.getByText("0%")).toBeInTheDocument();
		expect(screen.getByText("0 days")).toBeInTheDocument();
	});

	it("handles high completion rate of 100%", () => {
		const perfectAnalytics: AnalyticsData = {
			...mockAnalyticsData,
			completionRate: 100,
		};
		render(<StatsCards analytics={perfectAnalytics} />);

		expect(screen.getByText("100%")).toBeInTheDocument();
	});
});
