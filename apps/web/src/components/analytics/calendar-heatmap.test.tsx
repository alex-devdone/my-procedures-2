import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DailyStats } from "@/app/api/analytics/analytics.types";
import { CalendarHeatmap, getIntensityLevel } from "./calendar-heatmap";

const mockDailyBreakdown: DailyStats[] = [
	{
		date: "2024-01-01",
		regularCompleted: 2,
		recurringCompleted: 1,
		recurringMissed: 0,
	},
	{
		date: "2024-01-02",
		regularCompleted: 0,
		recurringCompleted: 0,
		recurringMissed: 1,
	},
	{
		date: "2024-01-03",
		regularCompleted: 5,
		recurringCompleted: 2,
		recurringMissed: 0,
	},
	{
		date: "2024-01-04",
		regularCompleted: 1,
		recurringCompleted: 0,
		recurringMissed: 0,
	},
	{
		date: "2024-01-05",
		regularCompleted: 3,
		recurringCompleted: 3,
		recurringMissed: 1,
	},
	{
		date: "2024-01-06",
		regularCompleted: 0,
		recurringCompleted: 0,
		recurringMissed: 0,
	},
	{
		date: "2024-01-07",
		regularCompleted: 10,
		recurringCompleted: 2,
		recurringMissed: 0,
	},
];

describe("getIntensityLevel", () => {
	it("returns 0 for count of 0", () => {
		expect(getIntensityLevel(0)).toBe(0);
	});

	it("returns 1 for counts 1-2", () => {
		expect(getIntensityLevel(1)).toBe(1);
		expect(getIntensityLevel(2)).toBe(1);
	});

	it("returns 2 for counts 3-5", () => {
		expect(getIntensityLevel(3)).toBe(2);
		expect(getIntensityLevel(4)).toBe(2);
		expect(getIntensityLevel(5)).toBe(2);
	});

	it("returns 3 for counts 6-8", () => {
		expect(getIntensityLevel(6)).toBe(3);
		expect(getIntensityLevel(7)).toBe(3);
		expect(getIntensityLevel(8)).toBe(3);
	});

	it("returns 4 for counts 9+", () => {
		expect(getIntensityLevel(9)).toBe(4);
		expect(getIntensityLevel(10)).toBe(4);
		expect(getIntensityLevel(100)).toBe(4);
	});
});

describe("CalendarHeatmap", () => {
	it("renders card with title", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={mockDailyBreakdown}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
			/>,
		);

		expect(screen.getByText("Activity")).toBeInTheDocument();
	});

	it("renders heatmap cells for each day in the range", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={mockDailyBreakdown}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
			/>,
		);

		const cells = screen.getAllByTestId("heatmap-cell");
		expect(cells.length).toBe(7);
	});

	it("displays correct completion counts on cells", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={mockDailyBreakdown}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
			/>,
		);

		const cells = screen.getAllByTestId("heatmap-cell");

		// Jan 1: 2 regular + 1 recurring = 3
		const jan1Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-01",
		);
		expect(jan1Cell).toHaveAttribute("data-count", "3");

		// Jan 2: 0 completions
		const jan2Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-02",
		);
		expect(jan2Cell).toHaveAttribute("data-count", "0");

		// Jan 3: 5 + 2 = 7
		const jan3Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-03",
		);
		expect(jan3Cell).toHaveAttribute("data-count", "7");
	});

	it("applies correct intensity levels based on completion counts", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={mockDailyBreakdown}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
			/>,
		);

		const cells = screen.getAllByTestId("heatmap-cell");

		// Jan 2: 0 completions -> level 0
		const jan2Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-02",
		);
		expect(jan2Cell).toHaveAttribute("data-level", "0");

		// Jan 4: 1 completion -> level 1
		const jan4Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-04",
		);
		expect(jan4Cell).toHaveAttribute("data-level", "1");

		// Jan 1: 3 completions -> level 2
		const jan1Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-01",
		);
		expect(jan1Cell).toHaveAttribute("data-level", "2");

		// Jan 3: 7 completions -> level 3
		const jan3Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-03",
		);
		expect(jan3Cell).toHaveAttribute("data-level", "3");

		// Jan 7: 12 completions -> level 4
		const jan7Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-07",
		);
		expect(jan7Cell).toHaveAttribute("data-level", "4");
	});

	it("displays total completions summary", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={mockDailyBreakdown}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
			/>,
		);

		// Total: 3 + 0 + 7 + 1 + 6 + 0 + 12 = 29
		expect(
			screen.getByText("29 completions in this period"),
		).toBeInTheDocument();
	});

	it("handles singular completion text", () => {
		const singleCompletion: DailyStats[] = [
			{
				date: "2024-01-01",
				regularCompleted: 1,
				recurringCompleted: 0,
				recurringMissed: 0,
			},
		];

		render(
			<CalendarHeatmap
				dailyBreakdown={singleCompletion}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-01T00:00:00.000Z"
			/>,
		);

		expect(screen.getByText("1 completion in this period")).toBeInTheDocument();
	});

	it("renders legend with all intensity levels", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={mockDailyBreakdown}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
			/>,
		);

		expect(screen.getByText("Less")).toBeInTheDocument();
		expect(screen.getByText("More")).toBeInTheDocument();

		const legendItems = screen.getAllByTestId("legend-item");
		expect(legendItems.length).toBe(5);
		expect(legendItems[0]).toHaveAttribute("data-level", "0");
		expect(legendItems[4]).toHaveAttribute("data-level", "4");
	});

	it("shows loading skeleton when isLoading is true", () => {
		const { container } = render(
			<CalendarHeatmap
				dailyBreakdown={undefined}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
				isLoading={true}
			/>,
		);

		const skeleton = container.querySelector('[data-slot="skeleton"]');
		expect(skeleton).toBeInTheDocument();
	});

	it("shows empty message when no data is available", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={undefined}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
			/>,
		);

		expect(screen.getByText("No activity data available")).toBeInTheDocument();
	});

	it("shows empty message when dailyBreakdown is empty array", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={[]}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
			/>,
		);

		expect(screen.getByText("No activity data available")).toBeInTheDocument();
	});

	it("handles dates with no corresponding dailyBreakdown data", () => {
		const sparseData: DailyStats[] = [
			{
				date: "2024-01-03",
				regularCompleted: 5,
				recurringCompleted: 0,
				recurringMissed: 0,
			},
		];

		render(
			<CalendarHeatmap
				dailyBreakdown={sparseData}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-05T00:00:00.000Z"
			/>,
		);

		const cells = screen.getAllByTestId("heatmap-cell");
		expect(cells.length).toBe(5);

		// Days without data should have count of 0
		const jan1Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-01",
		);
		expect(jan1Cell).toHaveAttribute("data-count", "0");
		expect(jan1Cell).toHaveAttribute("data-level", "0");

		// Jan 3 has data
		const jan3Cell = cells.find(
			(cell) => cell.getAttribute("data-date") === "2024-01-03",
		);
		expect(jan3Cell).toHaveAttribute("data-count", "5");
		expect(jan3Cell).toHaveAttribute("data-level", "2");
	});

	it("renders grid container with correct test id", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={mockDailyBreakdown}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-07T00:00:00.000Z"
			/>,
		);

		expect(screen.getByTestId("heatmap-grid")).toBeInTheDocument();
	});

	it("includes cell title with date and completion count for accessibility", () => {
		render(
			<CalendarHeatmap
				dailyBreakdown={mockDailyBreakdown}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-01T00:00:00.000Z"
			/>,
		);

		const cell = screen.getByTestId("heatmap-cell");
		expect(cell.getAttribute("title")).toContain("Mon, Jan 1, 2024");
		expect(cell.getAttribute("title")).toContain("3 completions");
	});

	it("handles long date ranges correctly", () => {
		const longRangeData: DailyStats[] = Array.from({ length: 30 }, (_, i) => {
			const date = new Date(2024, 0, i + 1);
			const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
			return {
				date: dateStr,
				regularCompleted: i % 5,
				recurringCompleted: i % 3,
				recurringMissed: 0,
			};
		});

		render(
			<CalendarHeatmap
				dailyBreakdown={longRangeData}
				startDate="2024-01-01T00:00:00.000Z"
				endDate="2024-01-30T00:00:00.000Z"
			/>,
		);

		const cells = screen.getAllByTestId("heatmap-cell");
		expect(cells.length).toBe(30);
	});
});
