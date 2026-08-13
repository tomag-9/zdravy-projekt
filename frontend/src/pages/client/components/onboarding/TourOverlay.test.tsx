import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboarding } from "../../../../context/OnboardingContext";
import { getTourSteps } from "./tourSteps";
import TourOverlay from "./TourOverlay";

vi.mock("../../../../context/OnboardingContext", () => ({
  useOnboarding: vi.fn(),
}));

vi.mock("./TourTooltip", async () => {
  const { forwardRef } = await import("react");
  return {
    // Ref sa musí prepustiť ďalej — overlay cezeň meria skutočnú výšku
    // tooltipu a bez neho by testoval inú vetvu, než beží v aplikácii.
    default: forwardRef<HTMLDivElement, { hidden?: boolean }>(
      ({ hidden }, ref) => (
        <div
          ref={ref}
          data-testid="tour-tooltip"
          data-hidden={hidden ? "true" : "false"}
        />
      ),
    ),
  };
});

const mockUseOnboarding = vi.mocked(useOnboarding);

function tourState(isTourActive: boolean, currentStep = 0) {
  const steps = getTourSteps({ hasMultiplePrevadzky: false });
  return {
    isTourActive,
    currentStep,
    totalSteps: steps.length,
    steps,
    startTour: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    completeTour: vi.fn(async () => undefined),
    skipTour: vi.fn(async () => undefined),
    resetTour: vi.fn(async () => undefined),
  };
}

describe("TourOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      x: 20,
      y: 20,
      top: 20,
      left: 20,
      right: 140,
      bottom: 60,
      width: 120,
      height: 40,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("removes the target highlight immediately when the tour is skipped or cancelled", () => {
    mockUseOnboarding.mockReturnValue(tourState(true));
    const view = render(
      <MemoryRouter initialEntries={["/home"]}>
        <div data-tour-id="tour-new-order-btn">New order</div>
        <TourOverlay />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(350);
    });

    const target = view.container.querySelector('[data-tour-id="tour-new-order-btn"]')!;
    expect(target).toHaveClass("tour-highlight");

    mockUseOnboarding.mockReturnValue(tourState(false));
    view.rerender(
      <MemoryRouter initialEntries={["/home"]}>
        <div data-tour-id="tour-new-order-btn">New order</div>
        <TourOverlay />
      </MemoryRouter>,
    );

    expect(target).not.toHaveClass("tour-highlight");
  });

  it("portals the tooltip to document.body instead of the local render tree", () => {
    // The mobile route wrapper (.zp-page-enter-*) leaves a non-"none"
    // computed transform behind after its enter animation finishes
    // (animation-fill-mode: forwards resolves to an identity matrix, not
    // literal "none"), which makes it a containing block for `position:
    // fixed` descendants. Rendering inside that subtree would put the
    // tooltip's fixed top/left relative to the scrolled wrapper instead of
    // the viewport, throwing it off-screen. Portalling to document.body
    // sidesteps this regardless of what transforms exist further up the
    // tree.
    mockUseOnboarding.mockReturnValue(tourState(true));
    const view = render(
      <MemoryRouter initialEntries={["/home"]}>
        <div data-tour-id="tour-new-order-btn">New order</div>
        <TourOverlay />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(view.container.querySelector('[data-testid="tour-tooltip"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="tour-tooltip"]')).not.toBeNull();
  });

  it("nezobrazí nový krok na pozícii toho predošlého", () => {
    // Text tooltipu sa prepne hneď (číta `currentStep`), ale prepočet pozície
    // čaká na dohľadanie a nascrollovanie nového cieľa. Kým to nedobehne, musí
    // ostať skrytý — inak nový text prebleskne na starých súradniciach.
    mockUseOnboarding.mockReturnValue(tourState(true, 0));
    const view = render(
      <MemoryRouter initialEntries={["/home"]}>
        <div data-tour-id="tour-new-order-btn">New order</div>
        <div data-tour-id="tour-today-section">Today</div>
        <TourOverlay />
      </MemoryRouter>,
    );

    const tooltip = () => document.body.querySelector('[data-testid="tour-tooltip"]');

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(tooltip()).toHaveAttribute("data-hidden", "false");

    // Prepnutie na ďalší krok: tooltip ostáva v DOM (aby sa dal zmerať), ale
    // skrytý, kým nemá vlastnú pozíciu.
    mockUseOnboarding.mockReturnValue(tourState(true, 1));
    view.rerender(
      <MemoryRouter initialEntries={["/home"]}>
        <div data-tour-id="tour-new-order-btn">New order</div>
        <div data-tour-id="tour-today-section">Today</div>
        <TourOverlay />
      </MemoryRouter>,
    );
    expect(tooltip()).toHaveAttribute("data-hidden", "true");

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(tooltip()).toHaveAttribute("data-hidden", "false");
  });
});
