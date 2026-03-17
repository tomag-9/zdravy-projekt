import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useOnboarding } from "../../../../context/OnboardingContext";
import { TOUR_STEPS, TourStep } from "./tourSteps";
import TourTooltip from "./TourTooltip";

const TOOLTIP_WIDTH = 288; // w-72
const TOOLTIP_HEIGHT = 190; // approximate
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
      top = rect.top - TOOLTIP_HEIGHT - OFFSET;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    } else if (p === "right") {
      top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
      left = rect.right + OFFSET;
    } else {
      top = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
      left = rect.left - TOOLTIP_WIDTH - OFFSET;
    }

    // Clamp to viewport
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, vw - TOOLTIP_WIDTH - VIEWPORT_PADDING),
    );
    top = Math.max(
      VIEWPORT_PADDING,
      Math.min(top, vh - TOOLTIP_HEIGHT - VIEWPORT_PADDING),
    );

    const fitsVertically =
      top >= VIEWPORT_PADDING && top + TOOLTIP_HEIGHT <= vh - VIEWPORT_PADDING;
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

  useEffect(() => {
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

    const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
    if (!el) {
      setTooltipPos(null);
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
      const pos = calcPosition(rect, step.placement);
      setTooltipPos(pos);

      el.classList.add("tour-highlight");
      highlightedEl.current = el;
    };

    // Small delay to let scrollIntoView settle
    const timer = setTimeout(measure, 350);
    return () => {
      clearTimeout(timer);
    };
  }, [isTourActive, currentStep, location.pathname]);

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
        top={tooltipPos.top}
        left={tooltipPos.left}
        arrowPlacement={tooltipPos.arrowPlacement}
      />
    </>
  );
};

export default TourOverlay;
