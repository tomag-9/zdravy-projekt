import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDashboardMaxDate, useTodayKey } from "./useDashboardMaxDate";

describe("useDashboardMaxDate", () => {
  afterEach(() => vi.useRealTimers());

  it("moves the dashboard limit forward after midnight without a page refresh", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T23:59:59"));

    const { result } = renderHook(() => useDashboardMaxDate());
    expect(result.current).toBe("2026-08-13");

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe("2026-08-14");
  });

  it("refreshes the limit when the user returns to the tab", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00"));
    const { result } = renderHook(() => useDashboardMaxDate());
    expect(result.current).toBe("2026-08-13");

    vi.setSystemTime(new Date("2026-08-11T12:00:00"));
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current).toBe("2026-08-14");
  });

  it("refreshes today's calendar colouring after midnight too", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T23:59:59"));
    const { result } = renderHook(() => useTodayKey());
    expect(result.current).toBe("2026-08-10");

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe("2026-08-11");
  });
});
