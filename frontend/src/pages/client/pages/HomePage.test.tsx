import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./HomePage";

const mockApiFetch = vi.fn();

vi.mock("../../../hooks/useIsPC", () => ({
  useIsPC: () => true,
}));

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    globalDeadlines: {
      breakfast: "10:00",
      breakfast_day_before: false,
      lunch: "10:00",
      lunch_day_before: false,
      olovrant: "10:00",
      olovrant_day_before: false,
    },
  }),
}));

vi.mock("../../../context/auth", () => ({
  useAuth: () => ({
    apiFetch: mockApiFetch,
    user: { email: "test@example.com" },
  }),
}));

vi.mock("../../../context/ToastContext", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock("../components/order/OrderSummaryModal", () => ({
  default: () => null,
}));

vi.mock("../components/onboarding/TourOverlay", () => ({
  default: () => null,
}));

describe("HomePage history", () => {
  it("renders concrete ordered diet names in history", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/orders/planned/monthly-summary/")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ total: 0, items: [] }) });
      }
      if (url.endsWith("/orders/planned/")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.endsWith("/orders/")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                date: "2026-07-22",
                status: "submitted",
                data: {
                  lunch: {
                    "Škôlka": {
                      menuCounts: { A: 2 },
                      diets: { "Bez lepku": 1, Vegánske: 0 },
                    },
                  },
                  olovrant: {
                    "Predškolák": {
                      menuCounts: { A: 1 },
                      diets: { "Bez laktózy": 2 },
                    },
                  },
                },
              },
            ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Škôlka · Bez lepku · 1x")).toBeInTheDocument();
      expect(screen.getByText("Predškolák · Bez laktózy · 2x")).toBeInTheDocument();
    });
  });
});
