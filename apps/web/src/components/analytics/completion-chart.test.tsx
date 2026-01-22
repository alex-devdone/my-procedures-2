import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DailyStats } from "@/app/api/analytics/analytics.types";
import { CompletionChart } from "./completion-chart";

// Mock recharts to avoid rendering issues in tests
vi.mock("recharts", () => ({
	ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="responsive-container">{children}</div>
	),
	BarChart: ({
		children,
		data,
	}: {
		children: React.ReactNode;
		data: unknown[];
	}) => (
		<div data-testid="bar-chart" data-length={data.length}>
			{children}
		</div>
	),
	Bar: ({ dataKey, name }: { dataKey: string; name: string }) => (
		<div data-testid={`bar-${dataKey}`} data-name={name} />
	),
	XAxis: () => <div data-testid="x-axis" />,
	YAxis: () => <div data-testid="y-axis" />,
	CartesianGrid: () => <div data-testid="cartesian-grid" />,
	Tooltip: () => <div data-testid="tooltip" />,
	Legend: () => <div data-testid="legend" />,
}));

const mockDailyBreakdown: DailyStats[] = [
	{
		date: "2024-01-15",
		regularCompleted: 3,
		recurringCompleted: 2,
		recurringMissed: 1,
	},
	{
		date: "2024-01-16",
		regularCompleted: 5,
		recurringCompleted: 4,
		recurringMissed: 0,
	},
	{
		date: "2024-01-17",
		regularCompleted: 2,
		recurringCompleted: 3,
		recurringMissed: 2,
	},
];

describe("CompletionChart", () => {
	it("renders the chart title", () => {
		render(<CompletionChart dailyBreakdown={mockDailyBreakdown} />);

		expect(screen.getByText("Daily Completions")).toBeInTheDocument();
	});

	it("renders the bar chart with data", () => {
		render(<CompletionChart dailyBreakdown={mockDailyBreakdown} />);

		expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
		expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-length", "3");
	});

	it("renders all three bar types", () => {
		render(<CompletionChart dailyBreakdown={mockDailyBreakdown} />);

		expect(screen.getByTestId("bar-regularCompleted")).toBeInTheDocument();
		expect(screen.getByTestId("bar-regularCompleted")).toHaveAttribute(
			"data-name",
			"Regular",
		);

		expect(screen.getByTestId("bar-recurringCompleted")).toBeInTheDocument();
		expect(screen.getByTestId("bar-recurringCompleted")).toHaveAttribute(
			"data-name",
			"Recurring",
		);

		expect(screen.getByTestId("bar-recurringMissed")).toBeInTheDocument();
		expect(screen.getByTestId("bar-recurringMissed")).toHaveAttribute(
			"data-name",
			"Missed Recurring",
		);
	});

	it("renders chart components (axes, grid, legend, tooltip)", () => {
		render(<CompletionChart dailyBreakdown={mockDailyBreakdown} />);

		expect(screen.getByTestId("x-axis")).toBeInTheDocument();
		expect(screen.getByTestId("y-axis")).toBeInTheDocument();
		expect(screen.getByTestId("cartesian-grid")).toBeInTheDocument();
		expect(screen.getByTestId("legend")).toBeInTheDocument();
		expect(screen.getByTestId("tooltip")).toBeInTheDocument();
	});

	it("shows loading skeleton when isLoading is true", () => {
		const { container } = render(
			<CompletionChart dailyBreakdown={undefined} isLoading={true} />,
		);

		const skeleton = container.querySelector('[data-slot="skeleton"]');
		expect(skeleton).toBeInTheDocument();
		expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
	});

	it("shows empty state when dailyBreakdown is undefined", () => {
		render(<CompletionChart dailyBreakdown={undefined} />);

		expect(
			screen.getByText("No completion data available"),
		).toBeInTheDocument();
		expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
	});

	it("shows empty state when dailyBreakdown is empty array", () => {
		render(<CompletionChart dailyBreakdown={[]} />);

		expect(
			screen.getByText("No completion data available"),
		).toBeInTheDocument();
		expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
	});

	it("renders chart when dailyBreakdown has data", () => {
		render(<CompletionChart dailyBreakdown={mockDailyBreakdown} />);

		expect(
			screen.queryByText("No completion data available"),
		).not.toBeInTheDocument();
		expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
	});

	it("handles single day data", () => {
		const singleDayData: DailyStats[] = [
			{
				date: "2024-01-15",
				regularCompleted: 5,
				recurringCompleted: 3,
				recurringMissed: 1,
			},
		];

		render(<CompletionChart dailyBreakdown={singleDayData} />);

		expect(screen.getByTestId("bar-chart")).toHaveAttribute("data-length", "1");
	});

	it("handles data with all zeros", () => {
		const zeroData: DailyStats[] = [
			{
				date: "2024-01-15",
				regularCompleted: 0,
				recurringCompleted: 0,
				recurringMissed: 0,
			},
		];

		render(<CompletionChart dailyBreakdown={zeroData} />);

		expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
	});

	it("prioritizes loading state over empty data", () => {
		const { container } = render(
			<CompletionChart dailyBreakdown={[]} isLoading={true} />,
		);

		const skeleton = container.querySelector('[data-slot="skeleton"]');
		expect(skeleton).toBeInTheDocument();
		expect(
			screen.queryByText("No completion data available"),
		).not.toBeInTheDocument();
	});
});
