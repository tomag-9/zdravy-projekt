import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PrevadzkaOverview from "./PrevadzkaOverview";

const mockApiFetch = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));

describe("PrevadzkaOverview", () => {
  it("does not offer PDF or XLSX export", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ date: "2026-08-10", edupage: [], app: [] }),
    });

    render(<PrevadzkaOverview />);

    await screen.findByText("Dodanie podkladov");
    expect(screen.queryByRole("button", { name: /PDF/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /XLSX/i })).not.toBeInTheDocument();
    expect(mockApiFetch.mock.calls.every(([url]) => !String(url).includes("-xlsx") && !String(url).includes("-pdf"))).toBe(true);
  });

  it("defaults the date picker to a weekday, never a weekend", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ date: "2026-08-10", edupage: [], app: [] }),
    });

    render(<PrevadzkaOverview />);

    const input = await screen.findByDisplayValue(/^\d{4}-\d{2}-\d{2}$/);
    const [year, month, day] = (input as HTMLInputElement).value.split("-").map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    expect(weekday).not.toBe(0);
    expect(weekday).not.toBe(6);
  });
});
