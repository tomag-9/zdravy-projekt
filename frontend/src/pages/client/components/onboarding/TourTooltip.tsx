import React from "react";
import { useOnboarding } from "../../../../context/OnboardingContext";
import { TOUR_STEPS } from "./tourSteps";

interface Props {
  top: number;
  left: number;
  arrowPlacement: "top" | "bottom" | "left" | "right";
}

const TourTooltip: React.FC<Props> = ({ top, left, arrowPlacement }) => {
  const { currentStep, totalSteps, nextStep, prevStep, completeTour, skipTour } =
    useOnboarding();
  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;

  const arrowClass: Record<string, string> = {
    top: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-0 border-l-0",
    bottom:
      "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-b-0 border-r-0",
    left: "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-l-0 border-b-0",
    right:
      "right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-r-0 border-t-0",
  };

  return (
    <div
      className="fixed z-50 w-72 bg-white rounded-2xl shadow-2xl border border-indigo-100 p-4"
      style={{ top, left }}
    >
      {/* Arrow */}
      <div
        className={`absolute w-3 h-3 bg-white border border-indigo-100 rotate-45 ${arrowClass[arrowPlacement]}`}
      />

      {/* Step counter */}
      <p className="text-xs text-slate-400 text-right mb-1">
        Krok {currentStep + 1} z {totalSteps}
      </p>

      {/* Content */}
      <p className="text-base font-bold text-slate-900 mb-1">{step.title}</p>
      <p className="text-sm text-slate-600 mb-4">{step.body}</p>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => skipTour()}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Preskočiť
        </button>
        <div className="flex gap-2">
          {!isFirst && (
            <button
              onClick={prevStep}
              className="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Späť
            </button>
          )}
          <button
            onClick={isLast ? () => completeTour() : nextStep}
            className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            {isLast ? "Dokončiť" : "Ďalej"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourTooltip;
