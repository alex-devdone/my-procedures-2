import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module
const mockGetSession = vi.fn();
vi.mock("@my-procedures-2/auth", () => ({
	auth: {
		api: {
			getSession: mockGetSession,
		},
	},
}));

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
	redirect: mockRedirect,
}));

// Mock the AnalyticsDashboard component
vi.mock("@/components/analytics/analytics-dashboard", () => ({
	AnalyticsDashboard: () => (
		<div data-testid="analytics-dashboard">Analytics Dashboard</div>
	),
}));

// Mock headers
const mockHeaders = vi.fn();
vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

describe("AnalyticsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Note: This is a Next.js 15+ server component, so we test the resolved module
	// The actual component is a server component that handles authentication

	it("should redirect to login when user is not authenticated", async () => {
		mockGetSession.mockResolvedValue(null);
		mockHeaders.mockResolvedValue(new Headers());

		// Import the page module
		const { default: AnalyticsPage } = await import("./page");

		// Render the server component
		await AnalyticsPage();

		expect(mockRedirect).toHaveBeenCalledWith("/login");
	});

	it("should render AnalyticsDashboard when user is authenticated", async () => {
		const mockSession = {
			user: {
				id: "1",
				name: "Test User",
				email: "test@example.com",
			},
		};

		mockGetSession.mockResolvedValue(mockSession);
		mockHeaders.mockResolvedValue(new Headers());

		// Import the page module
		const { default: AnalyticsPage } = await import("./page");

		// Render the server component
		const result = await AnalyticsPage();

		// The component should return the AnalyticsDashboard
		expect(result).toBeDefined();
		expect(mockRedirect).not.toHaveBeenCalled();
	});
});
