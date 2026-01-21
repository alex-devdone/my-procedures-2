import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	NotificationOptions,
	NotificationPermission,
} from "./use-notifications";
import {
	canShowNotification,
	deriveNotificationState,
	getNotificationPermission,
	isNotificationSupported,
	useNotifications,
} from "./use-notifications";

// ============================================================================
// Pure Function Tests
// ============================================================================

describe("Notification Pure Functions", () => {
	describe("isNotificationSupported", () => {
		it("returns true when Notification exists in window", () => {
			const mockWindow = { Notification: {} };
			expect(isNotificationSupported(mockWindow)).toBe(true);
		});

		it("returns false when Notification does not exist", () => {
			const mockWindow = {};
			expect(isNotificationSupported(mockWindow)).toBe(false);
		});

		it("returns false when window is undefined", () => {
			expect(isNotificationSupported(undefined)).toBe(false);
		});

		it("returns false when window is null", () => {
			expect(isNotificationSupported(null)).toBe(false);
		});
	});

	describe("getNotificationPermission", () => {
		it('returns "granted" when permission is granted', () => {
			const mockNotification = { permission: "granted" as const };
			expect(getNotificationPermission(mockNotification)).toBe("granted");
		});

		it('returns "denied" when permission is denied', () => {
			const mockNotification = { permission: "denied" as const };
			expect(getNotificationPermission(mockNotification)).toBe("denied");
		});

		it('returns "default" when permission is default', () => {
			const mockNotification = { permission: "default" as const };
			expect(getNotificationPermission(mockNotification)).toBe("default");
		});

		it('returns "default" when notification object is null', () => {
			expect(getNotificationPermission(null)).toBe("default");
		});

		it('returns "default" when notification object is undefined', () => {
			expect(getNotificationPermission(undefined)).toBe("default");
		});

		it('returns "default" when permission property is missing', () => {
			const mockNotification = {};
			expect(getNotificationPermission(mockNotification)).toBe("default");
		});
	});

	describe("deriveNotificationState", () => {
		it("returns correct state when supported and granted", () => {
			const state = deriveNotificationState(true, "granted", false);
			expect(state).toEqual({
				isSupported: true,
				permission: "granted",
				isRequesting: false,
			});
		});

		it("returns correct state when not supported", () => {
			const state = deriveNotificationState(false, "default", false);
			expect(state).toEqual({
				isSupported: false,
				permission: "default",
				isRequesting: false,
			});
		});

		it("returns correct state when requesting", () => {
			const state = deriveNotificationState(true, "default", true);
			expect(state).toEqual({
				isSupported: true,
				permission: "default",
				isRequesting: true,
			});
		});

		it("returns correct state when denied", () => {
			const state = deriveNotificationState(true, "denied", false);
			expect(state).toEqual({
				isSupported: true,
				permission: "denied",
				isRequesting: false,
			});
		});
	});

	describe("canShowNotification", () => {
		it("returns true when supported and granted", () => {
			expect(canShowNotification(true, "granted")).toBe(true);
		});

		it("returns false when not supported", () => {
			expect(canShowNotification(false, "granted")).toBe(false);
		});

		it("returns false when permission is denied", () => {
			expect(canShowNotification(true, "denied")).toBe(false);
		});

		it("returns false when permission is default", () => {
			expect(canShowNotification(true, "default")).toBe(false);
		});

		it("returns false when not supported and denied", () => {
			expect(canShowNotification(false, "denied")).toBe(false);
		});
	});
});

// ============================================================================
// Hook Tests
// ============================================================================

describe("useNotifications Hook", () => {
	const originalNotification = global.Notification;

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
		// Restore original Notification
		if (originalNotification) {
			global.Notification = originalNotification;
		} else {
			// @ts-expect-error - Cleaning up mock
			delete global.Notification;
		}
	});

	describe("Initial State", () => {
		it("returns isSupported false when Notification API is not available", () => {
			// @ts-expect-error - Removing Notification for test
			delete global.Notification;

			const { result } = renderHook(() => useNotifications());

			expect(result.current.isSupported).toBe(false);
			expect(result.current.permission).toBe("default");
			expect(result.current.isRequesting).toBe(false);
		});

		it("returns isSupported true when Notification API is available", () => {
			global.Notification = {
				permission: "default",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			expect(result.current.isSupported).toBe(true);
		});

		it('returns permission "granted" when already granted', () => {
			global.Notification = {
				permission: "granted",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			expect(result.current.permission).toBe("granted");
		});

		it('returns permission "denied" when already denied', () => {
			global.Notification = {
				permission: "denied",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			expect(result.current.permission).toBe("denied");
		});

		it("returns isRequesting false initially", () => {
			global.Notification = {
				permission: "default",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			expect(result.current.isRequesting).toBe(false);
		});
	});

	describe("requestPermission", () => {
		it('returns "denied" when notifications are not supported', async () => {
			// @ts-expect-error - Removing Notification for test
			delete global.Notification;

			const { result } = renderHook(() => useNotifications());

			let permission = "";
			await act(async () => {
				permission = await result.current.requestPermission();
			});

			expect(permission).toBe("denied");
		});

		it("returns current permission when already granted", async () => {
			global.Notification = {
				permission: "granted",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			let permission = "";
			await act(async () => {
				permission = await result.current.requestPermission();
			});

			expect(permission).toBe("granted");
			expect(Notification.requestPermission).not.toHaveBeenCalled();
		});

		it("returns current permission when already denied", async () => {
			global.Notification = {
				permission: "denied",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			let permission = "";
			await act(async () => {
				permission = await result.current.requestPermission();
			});

			expect(permission).toBe("denied");
			expect(Notification.requestPermission).not.toHaveBeenCalled();
		});

		it("calls Notification.requestPermission when permission is default", async () => {
			const mockRequestPermission = vi.fn().mockResolvedValue("granted");
			global.Notification = {
				permission: "default",
				requestPermission: mockRequestPermission,
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.requestPermission();
			});

			expect(mockRequestPermission).toHaveBeenCalled();
		});

		it('updates permission state to "granted" after successful request', async () => {
			const mockRequestPermission = vi.fn().mockResolvedValue("granted");
			global.Notification = {
				permission: "default",
				requestPermission: mockRequestPermission,
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.requestPermission();
			});

			expect(result.current.permission).toBe("granted");
		});

		it('updates permission state to "denied" after denied request', async () => {
			const mockRequestPermission = vi.fn().mockResolvedValue("denied");
			global.Notification = {
				permission: "default",
				requestPermission: mockRequestPermission,
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.requestPermission();
			});

			expect(result.current.permission).toBe("denied");
		});

		it("sets isRequesting to true while requesting", async () => {
			let resolvePermission: ((value: string) => void) | undefined;
			const mockRequestPermission = vi.fn().mockImplementation(
				() =>
					new Promise((resolve) => {
						resolvePermission = resolve;
					}),
			);
			global.Notification = {
				permission: "default",
				requestPermission: mockRequestPermission,
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			// Start the request
			let permissionPromise: Promise<string> | undefined;
			act(() => {
				permissionPromise = result.current.requestPermission();
			});

			// Check isRequesting is true while waiting
			expect(result.current.isRequesting).toBe(true);

			// Resolve the permission
			await act(async () => {
				resolvePermission?.("granted");
				await permissionPromise;
			});

			// Check isRequesting is false after
			expect(result.current.isRequesting).toBe(false);
		});

		it('returns "denied" when requestPermission throws', async () => {
			const mockRequestPermission = vi
				.fn()
				.mockRejectedValue(new Error("Blocked by policy"));
			global.Notification = {
				permission: "default",
				requestPermission: mockRequestPermission,
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			let permission = "";
			await act(async () => {
				permission = await result.current.requestPermission();
			});

			expect(permission).toBe("denied");
			expect(result.current.isRequesting).toBe(false);
		});
	});

	describe("showNotification", () => {
		it("returns null when notifications are not supported", () => {
			// @ts-expect-error - Removing Notification for test
			delete global.Notification;

			const { result } = renderHook(() => useNotifications());

			const notification = result.current.showNotification("Test");
			expect(notification).toBeNull();
		});

		it("returns null when permission is not granted", () => {
			global.Notification = {
				permission: "default",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			const notification = result.current.showNotification("Test");
			expect(notification).toBeNull();
		});

		it("returns null when permission is denied", () => {
			global.Notification = {
				permission: "denied",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			const notification = result.current.showNotification("Test");
			expect(notification).toBeNull();
		});

		it("creates a Notification when permission is granted", () => {
			const mockNotificationInstance = { close: vi.fn() };
			// Use a class-like function constructor for proper mocking
			function MockNotification(
				this: { close: typeof vi.fn },
				_title: string,
				_options?: NotificationOptions,
			) {
				Object.assign(this, mockNotificationInstance);
				return this;
			}
			MockNotification.permission = "granted";
			MockNotification.requestPermission = vi.fn();

			global.Notification = MockNotification as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			const notification = result.current.showNotification("Test Title");

			expect(notification).not.toBeNull();
			expect(notification).toHaveProperty("close");
		});

		it("passes options to Notification constructor", () => {
			const mockNotificationInstance = { close: vi.fn() };
			const constructorSpy = vi.fn();
			// Use a class-like function constructor for proper mocking
			function MockNotification(
				this: { close: typeof vi.fn },
				title: string,
				options?: NotificationOptions,
			) {
				constructorSpy(title, options);
				Object.assign(this, mockNotificationInstance);
				return this;
			}
			MockNotification.permission = "granted";
			MockNotification.requestPermission = vi.fn();

			global.Notification = MockNotification as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			const options = {
				body: "Test body",
				icon: "/icon.png",
				tag: "test-tag",
			};
			result.current.showNotification("Test Title", options);

			expect(constructorSpy).toHaveBeenCalledWith("Test Title", options);
		});

		it("returns null when Notification constructor throws", () => {
			// Use a class-like function constructor that throws
			function MockNotification() {
				throw new Error("Failed to create notification");
			}
			MockNotification.permission = "granted";
			MockNotification.requestPermission = vi.fn();

			global.Notification = MockNotification as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			const notification = result.current.showNotification("Test");
			expect(notification).toBeNull();
		});
	});

	describe("Permission Polling", () => {
		it("polls for permission changes", async () => {
			// Start with default permission
			let currentPermission: NotificationPermission = "default";
			const mockNotification = {
				get permission() {
					return currentPermission;
				},
				requestPermission: vi.fn(),
			};
			global.Notification = mockNotification as unknown as typeof Notification;

			const { result } = renderHook(() => useNotifications());

			expect(result.current.permission).toBe("default");

			// Simulate permission change in browser settings
			currentPermission = "granted";

			// Fast forward past the polling interval
			act(() => {
				vi.advanceTimersByTime(5000);
			});

			// Permission should be updated after polling
			expect(result.current.permission).toBe("granted");
		});

		it("cleans up polling interval on unmount", () => {
			const clearIntervalSpy = vi.spyOn(global, "clearInterval");

			global.Notification = {
				permission: "default",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { unmount } = renderHook(() => useNotifications());

			unmount();

			expect(clearIntervalSpy).toHaveBeenCalled();
		});

		it("does not poll when notifications are not supported", () => {
			const setIntervalSpy = vi.spyOn(global, "setInterval");
			// @ts-expect-error - Removing Notification for test
			delete global.Notification;

			renderHook(() => useNotifications());

			// setInterval is called once but the callback should not run
			// since isSupported is false
			const intervalCalls = setIntervalSpy.mock.calls.filter((call) => {
				// Check if it's our permission polling interval (5000ms)
				return call[1] === 5000;
			});

			expect(intervalCalls).toHaveLength(0);
		});
	});

	describe("Function Stability", () => {
		it("returns stable requestPermission function", () => {
			global.Notification = {
				permission: "default",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result, rerender } = renderHook(() => useNotifications());

			const firstRequestPermission = result.current.requestPermission;
			rerender();
			const secondRequestPermission = result.current.requestPermission;

			expect(firstRequestPermission).toBe(secondRequestPermission);
		});

		it("returns stable showNotification function when permission unchanged", () => {
			global.Notification = {
				permission: "granted",
				requestPermission: vi.fn(),
			} as unknown as typeof Notification;

			const { result, rerender } = renderHook(() => useNotifications());

			const firstShowNotification = result.current.showNotification;
			rerender();
			const secondShowNotification = result.current.showNotification;

			expect(firstShowNotification).toBe(secondShowNotification);
		});
	});
});
