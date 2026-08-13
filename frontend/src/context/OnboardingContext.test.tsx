import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./auth";
import { useApp } from "../pages/client/context/AppContext";
import { OnboardingProvider, useOnboarding } from "./OnboardingContext";

vi.mock("./auth", () => ({ useAuth: vi.fn() }));
vi.mock("../pages/client/context/AppContext", () => ({ useApp: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);
const mockUseApp = vi.mocked(useApp);

function setAuth({ onboardingCompleted = false } = {}) {
  mockUseAuth.mockReturnValue({
    user: { onboarding_completed: onboardingCompleted },
    isLoading: false,
    apiFetch: vi.fn(async () => new Response("{}")),
    updateProfile: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

function setPrevadzky({ count = 1, loading = false } = {}) {
  mockUseApp.mockReturnValue({
    prevadzky: Array.from({ length: count }, (_, i) => ({ id: i + 1 })),
    loading,
  } as unknown as ReturnType<typeof useApp>);
}

/** Vypíše stav tour, aby sa dal skontrolovať zvonku. */
const Probe = () => {
  const { isTourActive, totalSteps } = useOnboarding();
  return (
    <div>
      <span data-testid="active">{String(isTourActive)}</span>
      <span data-testid="total">{totalSteps}</span>
    </div>
  );
};

function renderProbe() {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>
    </MemoryRouter>,
  );
}

describe("OnboardingProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nespustí tour, kým sa nenačítajú prevádzky", () => {
    // Kým prevádzky nie sú známe, `getTourSteps` vidí nulu a poskladá krátku
    // (jednoprevádzkovú) verziu. Spustiť tour v tej chvíli znamená ukázať
    // „Krok 1 z 10“ a po dobehnutí requestu preskočiť na „z 11“.
    setAuth();
    setPrevadzky({ count: 0, loading: true });

    renderProbe();

    expect(screen.getByTestId("active")).toHaveTextContent("false");
  });

  it("spustí tour, až keď sú prevádzky načítané", () => {
    setAuth();
    setPrevadzky({ count: 3, loading: false });

    renderProbe();

    expect(screen.getByTestId("active")).toHaveTextContent("true");
  });

  it("počíta kroky podľa počtu prevádzok už pri prvom vykreslení", () => {
    setAuth();
    setPrevadzky({ count: 1, loading: false });
    const single = renderProbe();
    const singleTotal = single.getByTestId("total").textContent;
    single.unmount();

    setPrevadzky({ count: 3, loading: false });
    const multi = renderProbe();

    // Viac prevádzok = krok navyše o prepínači (#476), a to hneď — nie až po
    // doskočení počítadla.
    expect(Number(multi.getByTestId("total").textContent)).toBe(
      Number(singleTotal) + 1,
    );
  });

  it("nespustí tour znova, keď ju používateľ už dokončil", () => {
    setAuth({ onboardingCompleted: true });
    setPrevadzky({ count: 3, loading: false });

    renderProbe();

    expect(screen.getByTestId("active")).toHaveTextContent("false");
  });
});
