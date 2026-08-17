import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useApp } from "../pages/client/context/AppContext";
import { stepBusinessDay, toDateKey } from "../lib/businessDay";
import {
  getTourSteps,
  TOUR_STEPS,
  TourStep,
} from "../pages/client/components/onboarding/tourSteps";

const API_URL = import.meta.env.VITE_API_URL || "/api";

/** Pages that are part of the tour — navigating to other pages ends it. */
const TOUR_PAGES = ["/home", "/order"];

interface OnboardingContextType {
  isTourActive: boolean;
  currentStep: number;
  totalSteps: number;
  /** Steps applicable to this login — may be shorter than the full catalogue. */
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  completeTour: () => Promise<void>;
  skipTour: () => Promise<void>;
  resetTour: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

/** Length of the base (single-prevádzka) tour. Logins with more get one extra. */
export const TOTAL_STEPS = TOUR_STEPS.length;

/** Returns the first workday strictly after today (Mon–Fri). */
function getFirstNextWorkday(): string {
  const today = new Date();
  return toDateKey(stepBusinessDay(today, 1) ?? today);
}

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading, apiFetch, updateProfile } = useAuth();
  // `loading` z AppContextu je stav načítania prevádzok (`usePrevadzky`).
  const { prevadzky, loading: prevadzkyLoading } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const hasAutoStarted = useRef(false);

  // The prevádzka-switcher step only exists for logins that actually have a
  // switcher on screen (issue #476).
  const steps = useMemo(
    () => getTourSteps({ hasMultiplePrevadzky: prevadzky.length > 1 }),
    [prevadzky.length],
  );
  const totalSteps = steps.length;

  // The step list can shrink while the tour runs (e.g. prevádzky load in late),
  // so never leave the index pointing past the end.
  useEffect(() => {
    setCurrentStep((step) => Math.min(step, Math.max(0, totalSteps - 1)));
  }, [totalSteps]);

  const markOnServer = useCallback(
    async (completed: boolean) => {
      try {
        await apiFetch(`${API_URL}/user/profile/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onboarding_completed: completed }),
        });
      } catch {
        // Silently ignore — UI already updated optimistically
      }
    },
    [apiFetch],
  );

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsTourActive(true);
  }, []);

  const goToStep = useCallback(
    (next: number) => {
      const prevPage = steps[currentStep]?.page;
      const nextPage = steps[next]?.page;
      setCurrentStep(next);
      if (next !== currentStep && nextPage !== prevPage) {
        if (nextPage === "/order") {
          navigate(`/order?date=${getFirstNextWorkday()}`);
        } else if (nextPage === "/home") {
          navigate("/home");
        }
      }
    },
    [currentStep, navigate, steps],
  );

  const nextStep = useCallback(() => {
    goToStep(Math.min(currentStep + 1, totalSteps - 1));
  }, [currentStep, goToStep, totalSteps]);

  const prevStep = useCallback(() => {
    goToStep(Math.max(currentStep - 1, 0));
  }, [currentStep, goToStep]);

  const completeTour = useCallback(async () => {
    setIsTourActive(false);
    setCurrentStep(0);
    updateProfile({ onboarding_completed: true });
    await markOnServer(true);
  }, [updateProfile, markOnServer]);

  const skipTour = useCallback(async () => {
    setIsTourActive(false);
    setCurrentStep(0);
    updateProfile({ onboarding_completed: true });
    await markOnServer(true);
  }, [updateProfile, markOnServer]);

  const resetTour = useCallback(async () => {
    updateProfile({ onboarding_completed: false });
    hasAutoStarted.current = false;
    setCurrentStep(0);
    setIsTourActive(false);
    await markOnServer(false);
  }, [updateProfile, markOnServer]);

  // Auto-start on /home when not yet completed.
  //
  // Čaká sa aj na načítanie prevádzok: kým nie sú známe, `steps` obsahuje
  // krátku (jednoprevádzkovú) verziu tour a počítadlo by preblo z „z 10“ na
  // „z 11“ hneď po dobehnutí requestu.
  useEffect(() => {
    if (isLoading || !user || prevadzkyLoading) return;
    if (
      user.onboarding_completed === false &&
      location.pathname === "/home" &&
      !hasAutoStarted.current
    ) {
      hasAutoStarted.current = true;
      startTour();
    }
  }, [user, isLoading, prevadzkyLoading, location.pathname, startTour]);

  // Complete tour silently when user navigates to a page outside the tour
  useEffect(() => {
    if (!isTourActive) return;
    const isOnTourPage = TOUR_PAGES.some((p) =>
      location.pathname.startsWith(p),
    );
    if (!isOnTourPage) {
      completeTour();
    }
  }, [location.pathname, isTourActive, completeTour]);

  return (
    <OnboardingContext.Provider
      value={{
        isTourActive,
        currentStep,
        totalSteps,
        steps,
        startTour,
        nextStep,
        prevStep,
        completeTour,
        skipTour,
        resetTour,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
};
