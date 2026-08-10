import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DietManager from "./DietManager";

const mockApiFetch = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const response = (payload: unknown) => ({ ok: true, json: async () => payload });

describe("DietManager diet numbering", () => {
  it("shows the first diet as position 1, not 0, even when sort_order is 0-based", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/diets/")) {
        return Promise.resolve(response([
          { id: 1, name: "Bezlepková", sort_order: 0, is_active: true, description: "" },
          { id: 2, name: "Vegán", sort_order: 0, is_active: true, description: "" },
        ]));
      }
      return Promise.resolve(response([]));
    });

    render(
      <MemoryRouter>
        <DietManager />
      </MemoryRouter>,
    );

    const firstCard = (await screen.findByText("Bezlepková")).closest(".zpa-diet-card")!;
    const secondCard = screen.getByText("Vegán").closest(".zpa-diet-card")!;

    expect(firstCard).toHaveTextContent("Poradie: 1");
    expect(secondCard).toHaveTextContent("Poradie: 2");
    expect(firstCard).not.toHaveTextContent("Poradie: 0");
  });
});
