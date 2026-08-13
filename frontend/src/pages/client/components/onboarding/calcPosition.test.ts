import { afterEach, describe, expect, it } from "vitest";
import { calcPosition } from "./tourPosition";

const TOOLTIP_WIDTH = 288;

function rect(top: number, left: number, width: number, height: number): DOMRect {
  return {
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
}

function overlaps(
  pos: { top: number; left: number },
  height: number,
  target: DOMRect,
) {
  const w = Math.min(pos.left + TOOLTIP_WIDTH, target.right) - Math.max(pos.left, target.left);
  const h = Math.min(pos.top + height, target.bottom) - Math.max(pos.top, target.top);
  return w > 0 && h > 0;
}

describe("calcPosition", () => {
  afterEach(() => {
    setViewport(1024, 768);
  });

  it("keeps the tooltip off the element it points at", () => {
    // The mobile profile gear: small target pinned to the top-right corner of a
    // narrow viewport, where the horizontal clamp drags the tooltip back across
    // it (issue #477).
    setViewport(390, 844);
    const target = rect(18, 330, 40, 40);

    const pos = calcPosition(target, "bottom", 196);

    expect(overlaps(pos, 196, target)).toBe(false);
  });

  it("stays inside the viewport", () => {
    setViewport(390, 844);
    const pos = calcPosition(rect(18, 330, 40, 40), "bottom", 196);

    expect(pos.left).toBeGreaterThanOrEqual(0);
    expect(pos.top).toBeGreaterThanOrEqual(0);
    expect(pos.left + TOOLTIP_WIDTH).toBeLessThanOrEqual(390);
    expect(pos.top + 196).toBeLessThanOrEqual(844);
  });

  it("honours the preferred placement when it already clears the target", () => {
    setViewport(1440, 900);
    const target = rect(300, 600, 200, 60);

    const pos = calcPosition(target, "bottom", 196);

    expect(pos.arrowPlacement).toBe("bottom");
    expect(pos.top).toBe(target.bottom + 12);
  });

  it("falls back to the least-covering placement when every option overlaps", () => {
    // Target filling the viewport: nothing can avoid it, but the result must
    // still be on-screen rather than the raw unclamped fallback.
    setViewport(390, 500);
    const target = rect(0, 0, 390, 500);

    const pos = calcPosition(target, "bottom", 196);

    expect(pos.left).toBeGreaterThanOrEqual(0);
    expect(pos.top).toBeGreaterThanOrEqual(0);
  });
});
