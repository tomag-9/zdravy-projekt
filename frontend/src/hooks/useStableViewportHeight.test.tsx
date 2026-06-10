import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useStableViewportHeight } from "./useStableViewportHeight";

describe("useStableViewportHeight", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--zp-app-height");
    vi.restoreAllMocks();
  });

  it("sets app height from visualViewport and updates on resize", () => {
    const visualViewport = new EventTarget() as VisualViewport;
    Object.defineProperty(visualViewport, "height", {
      configurable: true,
      value: 640,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: visualViewport,
    });

    renderHook(() => useStableViewportHeight());

    expect(document.documentElement).toHaveStyle("--zp-app-height: 640px");

    Object.defineProperty(visualViewport, "height", {
      configurable: true,
      value: 712,
    });

    act(() => {
      visualViewport.dispatchEvent(new Event("resize"));
    });

    expect(document.documentElement).toHaveStyle("--zp-app-height: 712px");
  });

  it("falls back to window innerHeight when visualViewport is unavailable", () => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 780,
    });

    renderHook(() => useStableViewportHeight());

    expect(document.documentElement).toHaveStyle("--zp-app-height: 780px");
  });

  it("keeps the smaller viewport height when visualViewport reports a larger value", () => {
    const visualViewport = new EventTarget() as VisualViewport;
    Object.defineProperty(visualViewport, "height", {
      configurable: true,
      value: 840,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: visualViewport,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 760,
    });

    renderHook(() => useStableViewportHeight());

    expect(document.documentElement).toHaveStyle("--zp-app-height: 760px");
  });
});
