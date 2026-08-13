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

/**
 * Umiestnenie tooltipu aj s tým, ku ktorému kroku patrí.
 *
 * Krok si nesie so sebou, lebo text tooltipu sa prepne okamžite (číta
 * `currentStep`), ale pozícia až po dohľadaní a nascrollovaní nového cieľa.
 * Bez tejto väzby by sa nový text na chvíľu ukázal na súradniciach toho
 * predošlého. `settled` je druhá polovica toho istého problému: prvý prepočet
 * ide s odhadovanou výškou, skutočná sa dá zmerať až po vykreslení.
 */
interface Placement {
  step: number;
  pos: TooltipPos;
  settled: boolean;
}

const TourOverlay: React.FC = () => {
  const { isTourActive, currentStep, steps } = useOnboarding();
  const location = useLocation();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const highlightedEl = useRef<Element | null>(null);
  const targetRectRef = useRef<DOMRect | null>(null);
  const targetElRef = useRef<Element | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Always clear the previous target first. The overlay stays mounted when
    // the tour is skipped, so unmount cleanup alone is not sufficient.
    if (highlightedEl.current) {
      highlightedEl.current.classList.remove("tour-highlight");
      highlightedEl.current = null;
    }

    const step = isTourActive ? steps[currentStep] : undefined;
    // Only render on the page this step belongs to.
    if (!step || !location.pathname.startsWith(step.page)) {
      setPlacement(null);
      setMeasuring(false);
      return;
    }

    setMeasuring(true);

    // The target element may not exist in the DOM yet — e.g. it lives inside
    // a meal card that another effect (in OrderPage) is still in the process
    // of expanding in response to this same step change. Poll briefly instead
    // of giving up on the first missed lookup.
    let attempts = 0;
    const maxAttempts = 20; // ~2s at 100ms
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;

    const giveUp = () => {
      setPlacement(null);
      setMeasuring(false);
    };

    const tryFind = () => {
      const el = document.querySelector(`[data-tour-id="${step.targetId}"]`);
      if (!el) {
        attempts += 1;
        if (attempts < maxAttempts) {
          pollTimer = setTimeout(tryFind, 100);
        } else {
          giveUp();
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
          giveUp();
          return;
        }
        targetElRef.current = el;
        targetRectRef.current = rect;
        setPlacement({
          step: currentStep,
          pos: calcPosition(rect, step.placement, TOOLTIP_HEIGHT_ESTIMATE),
          settled: false,
        });
        setMeasuring(false);

        el.classList.add("tour-highlight");
        highlightedEl.current = el;
      };

      // One frame is enough for an instant scroll to be reflected in layout;
      // the second guarantees we read a post-layout rect.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(measure);
      });
    };

    tryFind();
    return () => {
      clearTimeout(pollTimer);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [isTourActive, currentStep, steps, location.pathname]);

  // Re-position using the tooltip's real height instead of the estimate (long
  // step text otherwise overlaps the highlighted element or gets clipped by the
  // viewport edge). Only after this pass is the tooltip revealed.
  useLayoutEffect(() => {
    if (!placement || placement.settled) return;

    if (!tooltipRef.current || !targetRectRef.current) {
      // Výšku sa nedá zmerať (napr. tooltip ešte nie je pripojený). Radšej ho
      // ukáž na odhadovanej pozícii, než nechať sprievodcu navždy neviditeľného.
      setPlacement({ ...placement, settled: true });
      return;
    }

    const actualHeight = tooltipRef.current.getBoundingClientRect().height;
    // Re-read the target too: anything that shifted the page since the first
    // measurement (late images, a reflow) would otherwise leave the tooltip
    // anchored to a position the target no longer occupies.
    const rect =
      targetElRef.current?.getBoundingClientRect() ?? targetRectRef.current;

    setPlacement({
      step: placement.step,
      pos: calcPosition(rect, placement.pos.arrowPlacement, actualHeight),
      settled: true,
    });
  }, [placement]);

  // Cleanup highlight on unmount
  useEffect(() => {
    return () => {
      if (highlightedEl.current) {
        highlightedEl.current.classList.remove("tour-highlight");
      }
    };
  }, []);

  if (!isTourActive) return null;
  // Nothing found on this page and nothing in flight — stay out of the way.
  if (!placement && !measuring) return null;

  // Kým nová pozícia nie je hotová, tooltip ostáva v DOM (inak sa nedá zmerať
  // jeho výška), ale neviditeľný — nech nepreblikne na mieste minulého kroku.
  const ready = placement !== null && placement.step === currentStep && placement.settled;

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
      {placement && (
        <TourTooltip
          ref={tooltipRef}
          top={placement.pos.top}
          left={placement.pos.left}
          arrowPlacement={placement.pos.arrowPlacement}
          hidden={!ready}
        />
      )}
    </>,
    document.body,
  );
};

export default TourOverlay;
