import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useOnboarding } from "../../../../context/OnboardingContext";
import TourTooltip from "./TourTooltip";
import {
  calcPosition,
  TOOLTIP_HEIGHT_ESTIMATE,
  TooltipPos,
} from "./tourPosition";

const TourOverlay: React.FC = () => {
  const { isTourActive, currentStep, steps } = useOnboarding();
  const location = useLocation();
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const highlightedEl = useRef<Element | null>(null);
  const targetRectRef = useRef<DOMRect | null>(null);
  const targetElRef = useRef<Element | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hasRemeasured = useRef(false);

  useEffect(() => {
    hasRemeasured.current = false;

    // Always clear the previous target first. The overlay stays mounted when
    // the tour is skipped, so unmount cleanup alone is not sufficient.
    if (highlightedEl.current) {
      highlightedEl.current.classList.remove("tour-highlight");
      highlightedEl.current = null;
    }

    if (!isTourActive) {
      setTooltipPos(null);
      return;
    }

    const step = steps[currentStep];
    if (!step) {
      setTooltipPos(null);
      return;
    }

    // Only render on the page this step belongs to
    if (!location.pathname.startsWith(step.page)) {
      setTooltipPos(null);
      return;
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

      // Scroll instantly, not smoothly: a smooth scroll is still animating when
      // we measure, so the rect we position against is where the target *was*.
      // That is how the mobile profile step ended up with the tooltip parked on
      // top of the gear it points at (issue #477).
      el.scrollIntoView({ behavior: "auto", block: "center" });

      const measure = () => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setTooltipPos(null);
          return;
        }
        targetElRef.current = el;
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
  }, [isTourActive, currentStep, steps, location.pathname]);

  // Once the tooltip has actually rendered, re-position using its real
  // height instead of the estimate (long step text otherwise overlaps
  // the highlighted element or gets clipped by the viewport edge).
  useLayoutEffect(() => {
    if (!tooltipPos || !tooltipRef.current || !targetRectRef.current) return;
    if (hasRemeasured.current) return;
    hasRemeasured.current = true;

    const actualHeight = tooltipRef.current.getBoundingClientRect().height;
    // Re-read the target too: anything that shifted the page since the first
    // measurement (late images, a reflow) would otherwise leave the tooltip
    // anchored to a position the target no longer occupies.
    const rect =
      targetElRef.current?.getBoundingClientRect() ?? targetRectRef.current;
    if (
      Math.abs(actualHeight - TOOLTIP_HEIGHT_ESTIMATE) < 1 &&
      rect.top === targetRectRef.current.top
    ) {
      return;
    }

    const pos = calcPosition(rect, tooltipPos.arrowPlacement, actualHeight);
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

  // Portalled to document.body: the mobile route wrapper (.zp-page-enter-*)
  // ends every enter animation with a non-"none" computed transform (the
  // identity matrix left behind by `animation-fill-mode: forwards`), which
  // makes it a containing block for `position: fixed` descendants. Without
  // the portal, top/left here would be resolved against that scrolled
  // ancestor instead of the real viewport, throwing the tooltip far
  // off-screen on steps whose target sits lower on the page.
  return createPortal(
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
    </>,
    document.body,
  );
};

export default TourOverlay;
