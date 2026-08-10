import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import InboxPage from "./InboxPage";

const mockApiFetch = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../../../context/auth", () => ({
  useAuth: () => ({
    apiFetch: mockApiFetch,
    user: { id: 1, email: "client@example.com" },
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const response = (payload: unknown) => ({ ok: true, json: async () => payload });

const messages = [
  {
    id: 1,
    title: "Pripomienka",
    body: "Nezabudnite objednať obed.",
    url: "/order",
    created_at: "2026-08-10T08:00:00Z",
    read_at: null,
    is_read: false,
  },
  {
    id: 2,
    title: "Vitajte",
    body: "Vitajte v aplikácii.",
    url: "/inbox",
    created_at: "2026-08-09T08:00:00Z",
    read_at: "2026-08-09T09:00:00Z",
    is_read: true,
  },
];

describe("InboxPage", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockNavigate.mockReset();
    mockApiFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url.includes("/read/")) {
        return Promise.resolve(response({}));
      }
      return Promise.resolve(response({ results: messages, next: null }));
    });
  });

  it("renders title, body, timestamp and read/unread state per message", async () => {
    render(
      <MemoryRouter>
        <InboxPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Pripomienka")).toBeInTheDocument();
    expect(screen.getByText("Nezabudnite objednať obed.")).toBeInTheDocument();
    expect(screen.getByText("Vitajte")).toBeInTheDocument();

    const unreadButton = screen.getByText("Pripomienka").closest("button")!;
    const readButton = screen.getByText("Vitajte").closest("button")!;
    expect(unreadButton.className).toContain("zp-inbox-msg--unread");
    expect(readButton.className).not.toContain("zp-inbox-msg--unread");
  });

  it("marks a message read and navigates to its target page on click", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InboxPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByText("Pripomienka"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/inbox/1/read/"),
        { method: "POST" },
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith("/order");
  });

  it("does not navigate away when the message's target is the Inbox itself", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InboxPage />
      </MemoryRouter>,
    );

    await user.click(await screen.findByText("Vitajte"));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
