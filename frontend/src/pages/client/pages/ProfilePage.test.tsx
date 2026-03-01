import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

import ProfilePage from "./ProfilePage";

const mockApiFetch = vi.fn();

vi.mock("../../../context/auth", () => ({
  useAuth: () => ({
    apiFetch: mockApiFetch,
  }),
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads profile using app API path (no localhost hardcode)", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        email: "client@example.com",
        first_name: "Client",
        last_name: "User",
        company_name: "ACME",
        date_joined: "2026-01-01T00:00:00Z",
        groups: ["Client"],
        profile: {
          company_name: "ACME",
          registration_status: "approved",
          email_verified: true,
          registration_date: "2026-01-01T00:00:00Z",
        },
      }),
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/user/profile/");
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
});
