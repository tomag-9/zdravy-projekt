import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("has no manual poradie input — new diets are placed automatically", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/diets/")) {
        return Promise.resolve(response([
          { id: 1, name: "Bezlepková", sort_order: 0, is_active: true, description: "" },
        ]));
      }
      return Promise.resolve(response([]));
    });

    render(
      <MemoryRouter>
        <DietManager />
      </MemoryRouter>,
    );

    await screen.findByText("Bezlepková");
    expect(screen.queryByLabelText("Poradie")).not.toBeInTheDocument();
    expect(screen.queryByText("Poradie")).not.toBeInTheDocument();
  });

  it("appends a new diet to the end of its own component-count block, not the whole list", async () => {
    mockApiFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/diets/") && init?.method === "POST") {
        const body = JSON.parse(init.body as string);
        return Promise.resolve(
          response({ id: 99, is_active: true, base_diets: [], ...body }),
        );
      }
      if (url.includes("/diets/")) {
        return Promise.resolve(response([
          { id: 1, name: "Bezlepková", sort_order: 0, is_active: true, description: "", base_diets: [] },
          { id: 2, name: "Bez laktózy", sort_order: 3, is_active: true, description: "", base_diets: [] },
          // Composite diet sitting after the single-component block in sort_order —
          // the new single-component diet must not be appended after this one.
          { id: 3, name: "Bezlepková – Bez laktózy", sort_order: 10, is_active: true, description: "", base_diets: [1, 2] },
        ]));
      }
      return Promise.resolve(response([]));
    });

    render(
      <MemoryRouter>
        <DietManager />
      </MemoryRouter>,
    );

    await screen.findByText("Bezlepková");
    fireEvent.change(screen.getByPlaceholderText("Názov novej diéty (napr. Bez lepku)"), {
      target: { value: "Vegán" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Pridať diétu/ }));

    await waitFor(() => {
      const postCall = mockApiFetch.mock.calls.find(
        ([, init]) => init?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(postCall![1].body as string);
      expect(body.sort_order).toBe(4);
    });
  });

  it("groups diets into 1-/2-zložkové sections by number of base diets", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/diets/")) {
        return Promise.resolve(response([
          { id: 1, name: "Bezlepková", sort_order: 0, is_active: true, description: "", base_diets: [] },
          { id: 2, name: "Bez laktózy", sort_order: 1, is_active: true, description: "", base_diets: [] },
          { id: 3, name: "Bezlepková – Bez laktózy", sort_order: 2, is_active: true, description: "", base_diets: [1, 2] },
        ]));
      }
      return Promise.resolve(response([]));
    });

    render(
      <MemoryRouter>
        <DietManager />
      </MemoryRouter>,
    );

    await screen.findByText("Bezlepková");
    expect(screen.getByText("1-zložkové", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("2-zložkové", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("3-zložkové", { exact: false })).not.toBeInTheDocument();
  });
});
