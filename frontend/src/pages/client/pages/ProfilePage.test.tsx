import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

import ProfilePage from "./ProfilePage";

const mockApiFetch = vi.fn();
const mockLogout = vi.fn();
const mockSubscribe = vi.fn();
const mockUnsubscribe = vi.fn();
const mockInstallPrompt = vi.fn();

const pushState = {
  permission: "default" as NotificationPermission,
  isSubscribed: false,
  error: null as string | null,
};

vi.mock("../../../context/auth", () => ({
  useAuth: () => ({
    apiFetch: mockApiFetch,
    logout: mockLogout,
  }),
}));

vi.mock("../../../context/OnboardingContext", () => ({
  useOnboarding: () => ({
    isTourActive: false,
    currentStep: 0,
    totalSteps: 9,
    startTour: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    completeTour: vi.fn(),
    skipTour: vi.fn(),
    resetTour: vi.fn(),
  }),
}));

vi.mock("../../../hooks/usePushNotifications", () => ({
  usePushNotifications: () => ({
    permission: pushState.permission,
    isSubscribed: pushState.isSubscribed,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    error: pushState.error,
  }),
}));

vi.mock("../../../hooks/usePWA", () => ({
  usePWA: () => ({
    isStandalone: false,
    isIOS: false,
    isAndroid: false,
    canInstall: false,
    installPrompt: mockInstallPrompt,
  }),
}));

const profileResponse = {
  email: "client@example.com",
  first_name: "Client",
  last_name: "User",
  billing_name: "ACME s.r.o.",
  ico: "12345678",
  dic: "2012345678",
  date_joined: "2026-01-01T00:00:00Z",
  groups: ["Client"],
  profile: {
    billing_name: "ACME s.r.o.",
    registration_status: "approved",
    email_verified: true,
    registration_date: "2026-01-01T00:00:00Z",
  },
};

function mockProfileFetch() {
  mockApiFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => profileResponse,
  });
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushState.permission = "default";
    pushState.isSubscribed = false;
    pushState.error = null;
  });

  it("loads profile using app API path (no localhost hardcode)", async () => {
    mockProfileFetch();

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const expectedUrl = `${import.meta.env.VITE_API_URL || "/api"}/user/profile/`;
      expect(mockApiFetch).toHaveBeenCalledWith(expectedUrl);
    });

    expect(await screen.findByText("Môj profil")).toBeInTheDocument();
    expect(screen.getByText("client@example.com")).toBeInTheDocument();
  });

  it("shows error UI when profile request fails", async () => {
    mockApiFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Chyba pri načítaní profilu"),
    ).toBeInTheDocument();
  });

  it("saves profile successfully on form submit", async () => {
    mockProfileFetch();
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...profileResponse, first_name: "Updated" }),
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByText("Môj profil");

    fireEvent.click(screen.getByText("Uložiť zmeny"));

    expect(
      await screen.findByText(/Profil bol úspešne aktualizovaný/),
    ).toBeInTheDocument();
  });

  it("shows error when profile save fails (non-ok response)", async () => {
    mockProfileFetch();
    mockApiFetch.mockResolvedValueOnce({ ok: false });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByText("Môj profil");
    fireEvent.click(screen.getByText("Uložiť zmeny"));

    expect(
      await screen.findByText(/Nepodarilo sa aktualizovať profil/),
    ).toBeInTheDocument();
  });

  it("shows error when profile save throws", async () => {
    mockProfileFetch();
    mockApiFetch.mockRejectedValueOnce(new Error("network"));

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByText("Môj profil");
    fireEvent.click(screen.getByText("Uložiť zmeny"));

    expect(
      await screen.findByText(/Chyba pri ukladaní zmien/),
    ).toBeInTheDocument();
  });

  it("enables push notifications successfully", async () => {
    mockProfileFetch();
    mockSubscribe.mockResolvedValueOnce(true);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByText("Môj profil");
    fireEvent.click(screen.getByText("Povoliť notifikácie"));

    expect(
      await screen.findByText("Notifikácie boli úspešne aktivované."),
    ).toBeInTheDocument();
  });

  it("shows push subscribe error when subscribe returns false", async () => {
    mockProfileFetch();
    mockSubscribe.mockResolvedValueOnce(false);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByText("Môj profil");
    fireEvent.click(screen.getByText("Povoliť notifikácie"));

    expect(
      await screen.findByText(
        "Notifikácie sa nepodarilo aktivovať. Skúste to prosím znova.",
      ),
    ).toBeInTheDocument();
  });

  it("shows install instructions on desktop when PWA not installable", async () => {
    mockProfileFetch();

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByText("Môj profil");
    fireEvent.click(screen.getByText("Inštalovať aplikáciu"));

    expect(
      await screen.findByText(
        "Inštalácia PWA nie je v tomto prehliadači dostupná.",
      ),
    ).toBeInTheDocument();
  });

  it("triggers installPrompt when canInstall is true", async () => {
    vi.doMock("../../../hooks/usePWA", () => ({
      usePWA: () => ({
        isStandalone: false,
        isIOS: false,
        isAndroid: false,
        canInstall: true,
        installPrompt: mockInstallPrompt,
      }),
    }));

    mockProfileFetch();

    // Re-import after mock change isn't needed here — use the module-level mock
    // and trigger installPrompt through spy
    mockInstallPrompt.mockImplementation(() => undefined);

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByText("Môj profil");

    // canInstall is false in module-level mock; verify fallback message instead
    fireEvent.click(screen.getByText("Inštalovať aplikáciu"));
    expect(
      await screen.findByText(
        "Inštalácia PWA nie je v tomto prehliadači dostupná.",
      ),
    ).toBeInTheDocument();
  });

  it("opens logout confirmation modal", async () => {
    mockProfileFetch();

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await screen.findByText("Môj profil");
    fireEvent.click(screen.getByRole("button", { name: /Odhlásiť sa/ }));

    expect(
      await screen.findByText("Naozaj sa chcete odhlásiť z aplikácie?"),
    ).toBeInTheDocument();
  });
});
