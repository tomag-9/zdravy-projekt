import { TourStep } from "./tourSteps";

const TOOLTIP_WIDTH = 288; // matches .zp-tour-tooltip width
export const TOOLTIP_HEIGHT_ESTIMATE = 190; // used only for the first render, before we can measure
const OFFSET = 12; // gap between target and tooltip
const VIEWPORT_PADDING = 8;

export interface TooltipPos {
  top: number;
  left: number;
  arrowPlacement: TourStep["placement"];
}

/** Area shared by the tooltip box and the highlighted element, in px². */
function overlapArea(
  top: number,
  left: number,
  tooltipHeight: number,
  rect: DOMRect,
): number {
  const w =
    Math.min(left + TOOLTIP_WIDTH, rect.right) - Math.max(left, rect.left);
  const h =
    Math.min(top + tooltipHeight, rect.bottom) - Math.max(top, rect.top);
  return w > 0 && h > 0 ? w * h : 0;
}

export function calcPosition(
  rect: DOMRect,
  preferredPlacement: TourStep["placement"],
  tooltipHeight: number,
): TooltipPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const placements: TourStep["placement"][] = [
    preferredPlacement,
    "bottom",
    "top",
    "right",
    "left",
  ];

  // Best candidate so far by how little of the target it hides. A placement
  // that fits the viewport can still land *on* the target once clamped — that
  // happened to the profile button in the mobile header, where "bottom" was
  // pushed back up over the button it was supposed to point at (issue #477).
  let best: { pos: TooltipPos; covered: number } | null = null;

  for (const p of placements) {
    let top = 0;
    let left = 0;

    if (p === "bottom") {
      top = rect.bottom + OFFSET;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    } else if (p === "top") {
      top = rect.top - tooltipHeight - OFFSET;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    } else if (p === "right") {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + OFFSET;
    } else {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - TOOLTIP_WIDTH - OFFSET;
    }

    // Clamp to viewport
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, vw - TOOLTIP_WIDTH - VIEWPORT_PADDING),
    );
    top = Math.max(
      VIEWPORT_PADDING,
      Math.min(top, vh - tooltipHeight - VIEWPORT_PADDING),
    );

    const fitsVertically =
      top >= VIEWPORT_PADDING && top + tooltipHeight <= vh - VIEWPORT_PADDING;
    const fitsHorizontally =
      left >= VIEWPORT_PADDING &&
      left + TOOLTIP_WIDTH <= vw - VIEWPORT_PADDING;
    if (!fitsVertically || !fitsHorizontally) continue;

    const covered = overlapArea(top, left, tooltipHeight, rect);
    if (covered === 0) {
      return { top, left, arrowPlacement: p };
    }
    if (!best || covered < best.covered) {
      best = { pos: { top, left, arrowPlacement: p }, covered };
    }
  }

  if (best) return best.pos;

  // Fallback: center below
  return {
    top: rect.bottom + OFFSET,
    left: Math.max(VIEWPORT_PADDING, vw / 2 - TOOLTIP_WIDTH / 2),
    arrowPlacement: "top",
  };
}
