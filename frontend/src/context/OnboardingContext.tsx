import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { TOUR_STEPS } from "../pages/client/components/onboarding/tourSteps";

const API_URL = import.meta.env.VITE_API_URL || "/api";

/** Pages that are part of the tour — navigating to other pages ends it. */
const TOUR_PAGES = ["/home", "/order"];

interface OnboardingContextType {
  isTourActive: boolean;
  currentStep: number;
  totalSteps: number;
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

export const TOTAL_STEPS = TOUR_STEPS.length;

/** Returns the first workday strictly after today (Mon–Fri). */
function getFirstNextWorkday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading, apiFetch, updateProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const hasAutoStarted = useRef(false);

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

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, TOTAL_STEPS - 1);
      // Navigate if crossing page boundary
      const prevPage = TOUR_STEPS[prev].page;
      const nextPage = TOUR_STEPS[next].page;
      if (next !== prev && nextPage !== prevPage) {
        if (nextPage === "/order") {
          navigate(`/order?date=${getFirstNextWorkday()}`);
        } else if (nextPage === "/home") {
          navigate("/home");
        }
      }
      return next;
    });
  }, [navigate]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, 0);
      const prevPage = TOUR_STEPS[prev].page;
      const nextPage = TOUR_STEPS[next].page;
      if (next !== prev && nextPage !== prevPage) {
        if (nextPage === "/order") {
          navigate(`/order?date=${getFirstNextWorkday()}`);
        } else if (nextPage === "/home") {
          navigate("/home");
        }
      }
      return next;
    });
  }, [navigate]);

  const completeTour = useCallback(async () => {
    setIsTourActive(false);
    updateProfile({ onboarding_completed: true });
    await markOnServer(true);
  }, [updateProfile, markOnServer]);

  const skipTour = useCallback(async () => {
    setIsTourActive(false);
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

  // Auto-start on /home when not yet completed
  useEffect(() => {
    if (isLoading || !user) return;
    if (
      user.onboarding_completed === false &&
      location.pathname === "/home" &&
      !hasAutoStarted.current
    ) {
      hasAutoStarted.current = true;
      startTour();
    }
  }, [user, isLoading, location.pathname, startTour]);

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
        totalSteps: TOTAL_STEPS,
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
