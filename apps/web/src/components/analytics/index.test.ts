import { describe, expect, it } from "vitest";
import {
	AnalyticsDashboard,
	CalendarHeatmap,
	CompletionChart,
	CompletionHistoryList,
	StatsCards,
} from "./index";

describe("analytics barrel exports", () => {
	it("should export AnalyticsDashboard", () => {
		expect(AnalyticsDashboard).toBeDefined();
	});

	it("should export CalendarHeatmap", () => {
		expect(CalendarHeatmap).toBeDefined();
	});

	it("should export CompletionChart", () => {
		expect(CompletionChart).toBeDefined();
	});

	it("should export CompletionHistoryList", () => {
		expect(CompletionHistoryList).toBeDefined();
	});

	it("should export StatsCards", () => {
		expect(StatsCards).toBeDefined();
	});
});
