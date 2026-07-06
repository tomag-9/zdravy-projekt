import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useOnboarding } from "../../../../context/OnboardingContext";
import { TOUR_STEPS, TourStep } from "./tourSteps";
import TourTooltip from "./TourTooltip";

const TOOLTIP_WIDTH = 288; // matches .zp-tour-tooltip width
const TOOLTIP_HEIGHT_ESTIMATE = 190; // used only for the first render, before we can measure
const OFFSET = 12; // gap between target and tooltip
const VIEWPORT_PADDING = 8;

interface TooltipPos {
  top: number;
  left: number;
  arrowPlacement: TourStep["placement"];
}

function calcPosition(
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
    if (fitsVertically && fitsHorizontally) {
      return { top, left, arrowPlacement: p };
    }
  }

  // Fallback: center below
  return {
    top: rect.bottom + OFFSET,
    left: Math.max(VIEWPORT_PADDING, vw / 2 - TOOLTIP_WIDTH / 2),
    arrowPlacement: "top",
  };
}

const TourOverlay: React.FC = () => {
  const { isTourActive, currentStep } = useOnboarding();
  const location = useLocation();
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const highlightedEl = useRef<Element | null>(null);
  const targetRectRef = useRef<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hasRemeasured = useRef(false);

  useEffect(() => {
    hasRemeasured.current = false;

    if (!isTourActive) {
      setTooltipPos(null);
      return;
    }

    const step = TOUR_STEPS[currentStep];

    // Only render on the page this step belongs to
    if (!location.pathname.startsWith(step.page)) {
      setTooltipPos(null);
      return;
    }

    // Remove highlight from previous element
    if (highlightedEl.current) {
      highlightedEl.current.classList.remove("tour-highlight");
      highlightedEl.current = null;
    }

    // The target element may not exist in the DOM yet — e.g. it lives inside
    // a meal card that another effect (in OrderPage) is still in the process
    // of expanding in response to this same step change. Poll briefly instead
    // of giving up on the first missed lookup.
    let attempts = 0;
    const maxAttempts = 20; // ~2s at 100ms
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const tryFind = () => {
      const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
      if (!el) {
        attempts += 1;
        if (attempts < maxAttempts) {
          pollTimer = setTimeout(tryFind, 100);
        } else {
          setTooltipPos(null);
        }
        return;
      }

      // Scroll into view first, then measure
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      const measure = () => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setTooltipPos(null);
          return;
        }
        targetRectRef.current = rect;
        const pos = calcPosition(rect, step.placement, TOOLTIP_HEIGHT_ESTIMATE);
        setTooltipPos(pos);

        el.classList.add("tour-highlight");
        highlightedEl.current = el;
      };

      // Small delay to let scrollIntoView settle
      settleTimer = setTimeout(measure, 350);
    };

    tryFind();
    return () => {
      clearTimeout(pollTimer);
      clearTimeout(settleTimer);
    };
  }, [isTourActive, currentStep, location.pathname]);

  // Once the tooltip has actually rendered, re-position using its real
  // height instead of the estimate (long step text otherwise overlaps
  // the highlighted element or gets clipped by the viewport edge).
  useLayoutEffect(() => {
    if (!tooltipPos || !tooltipRef.current || !targetRectRef.current) return;
    if (hasRemeasured.current) return;
    hasRemeasured.current = true;

    const actualHeight = tooltipRef.current.getBoundingClientRect().height;
    if (Math.abs(actualHeight - TOOLTIP_HEIGHT_ESTIMATE) < 1) return;

    const pos = calcPosition(
      targetRectRef.current,
      tooltipPos.arrowPlacement,
      actualHeight,
    );
    setTooltipPos(pos);
  }, [tooltipPos]);

  // Cleanup highlight on unmount
  useEffect(() => {
    return () => {
      if (highlightedEl.current) {
        highlightedEl.current.classList.remove("tour-highlight");
      }
    };
  }, []);

  // Only render when we have a position (element was found on correct page)
  if (!isTourActive || !tooltipPos) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 pointer-events-none" />

      {/* Tooltip */}
      <TourTooltip
        ref={tooltipRef}
        top={tooltipPos.top}
        left={tooltipPos.left}
        arrowPlacement={tooltipPos.arrowPlacement}
      />
    </>
  );
};

export default TourOverlay;
