import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PushNotifications from "./PushNotifications";

const mockApiFetch = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const response = (payload: unknown) => ({ ok: true, json: async () => payload });

describe("PushNotifications target page", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/admin/users/")) return Promise.resolve(response([]));
      return Promise.resolve(response({ sent: 1, failed: 0 }));
    });
  });

  it("defaults the target page dropdown to Inbox", async () => {
    render(<PushNotifications />);
    expect(await screen.findByRole("option", { name: "Inbox" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Cieľová stránka/)).toHaveValue("/inbox");
  });

  it("sends the chosen target page", async () => {
    const user = userEvent.setup();
    render(<PushNotifications />);

    await user.type(screen.getByLabelText("Nadpis *"), "Ahoj");
    await user.type(screen.getByLabelText("Správa *"), "Text správy");
    await user.selectOptions(screen.getByLabelText(/^Cieľová stránka/), "/order");
    await user.click(screen.getByRole("button", { name: /Odoslať notifikáciu/ }));

    await waitFor(() => {
      const call = mockApiFetch.mock.calls.find(([url]) => String(url).includes("/admin/push/send/"));
      expect(call).toBeDefined();
      const body = JSON.parse(String(call?.[1]?.body));
      expect(body.url).toBe("/order");
    });
  });
});
