import { forwardRef } from "react";
import { useOnboarding } from "../../../../context/OnboardingContext";
import { TOUR_STEPS } from "./tourSteps";

interface Props {
  top: number;
  left: number;
  arrowPlacement: "top" | "bottom" | "left" | "right";
}

// The arrow sits on the edge of the tooltip facing the highlighted element,
// i.e. the opposite edge from where the tooltip was placed relative to it.
const arrowEdgeForPlacement: Record<string, string> = {
  top: "zp-tour-arrow--bottom",
  bottom: "zp-tour-arrow--top",
  left: "zp-tour-arrow--right",
  right: "zp-tour-arrow--left",
};

const TourTooltip = forwardRef<HTMLDivElement, Props>(
  ({ top, left, arrowPlacement }, ref) => {
    const { currentStep, totalSteps, nextStep, prevStep, completeTour, skipTour } =
      useOnboarding();
    const step = TOUR_STEPS[currentStep];
    const isLast = currentStep === totalSteps - 1;
    const isFirst = currentStep === 0;

    return (
      <div
        ref={ref}
        className="zp-tour-tooltip"
        style={{ top, left }}
      >
        <div className={`zp-tour-arrow ${arrowEdgeForPlacement[arrowPlacement]}`} />

        <p className="zp-tour-step-counter">
          Krok {currentStep + 1} z {totalSteps}
        </p>

        <p className="zp-tour-title">{step.title}</p>
        <p className="zp-tour-body">{step.body}</p>

        <div className="zp-tour-actions">
          <button onClick={() => skipTour()} className="zp-tour-skip">
            Preskočiť
          </button>
          <div className="zp-tour-nav">
            {!isFirst && (
              <button onClick={prevStep} className="zp-btn zp-btn--ghost zp-btn--sm">
                Späť
              </button>
            )}
            <button
              onClick={isLast ? () => completeTour() : nextStep}
              className="zp-btn zp-btn--primary zp-btn--sm"
            >
              {isLast ? "Dokončiť" : "Ďalej"}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

TourTooltip.displayName = "TourTooltip";

export default TourTooltip;
