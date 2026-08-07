import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminUserList from "./AdminUserList";

const mockApiFetch = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

describe("AdminUserList", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 1,
        results: [
          {
            id: 42,
            email: "admin@example.com",
            first_name: "Prod",
            last_name: "Admin",
            is_active: true,
            is_staff: true,
          },
        ],
      }),
    });
  });

  it("requests up to 100 admin users from the server", async () => {
    render(
      <MemoryRouter>
        <AdminUserList />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Prod Admin")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/admin/users/?is_staff=true&page_size=100",
      );
    });
  });
});
