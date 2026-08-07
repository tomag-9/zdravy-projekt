import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientInstallPrompt } from "./App";
import { useAuth } from "./context/auth";

vi.mock("./context/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("./components/PWAInstallBanner", () => ({
  default: () => <div data-testid="pwa-install-banner" />,
}));

const mockUseAuth = vi.mocked(useAuth);

function authState(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: { id: 1, is_staff: false, onboarding_completed: true },
    isAuthenticated: true,
    isLoading: false,
    ...overrides,
  } as unknown as ReturnType<typeof useAuth>;
}

describe("ClientInstallPrompt", () => {
  it("defers the install banner while onboarding has not been completed", () => {
    mockUseAuth.mockReturnValue(
      authState({
        user: { id: 1, is_staff: false, onboarding_completed: false } as never,
      }),
    );

    const { queryByTestId } = render(<ClientInstallPrompt />);

    // The onboarding tour auto-starts under this same condition — showing
    // the install banner at the same time would block the tour's Next/Skip
    // buttons with its full-screen modal.
    expect(queryByTestId("pwa-install-banner")).toBeNull();
  });

  it("shows the install banner once onboarding is completed", () => {
    mockUseAuth.mockReturnValue(authState());

    const { queryByTestId } = render(<ClientInstallPrompt />);

    expect(queryByTestId("pwa-install-banner")).not.toBeNull();
  });

  it("does not render for staff users regardless of onboarding state", () => {
    mockUseAuth.mockReturnValue(
      authState({
        user: { id: 1, is_staff: true, onboarding_completed: false } as never,
      }),
    );

    const { queryByTestId } = render(<ClientInstallPrompt />);

    expect(queryByTestId("pwa-install-banner")).toBeNull();
  });
});
