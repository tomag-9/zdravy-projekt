import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientList from "./ClientList";

const mockApiFetch = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const operation = {
  id: 1,
  email: "palysady@example.com",
  profile: {
    company_name: "Palisády",
    billing_name: "Palisády s.r.o.",
  },
  is_active: true,
  is_staff: false,
};

const operationDetail = {
  ...operation,
  profile: {
    ...operation.profile,
    ico: "12345678",
    dic: "2020123456",
    is_edupage: false,
    api_identifier: "",
    mealsguest_url: "",
  },
};

const response = (payload: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  json: () => Promise.resolve(payload),
});

describe("ClientList", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((url: string) => {
      if (url.endsWith("/admin/users/1/")) {
        return Promise.resolve(response(operationDetail));
      }
      if (url.endsWith("/admin/users/")) {
        return Promise.resolve(response([operation]));
      }
      return Promise.resolve(response({}));
    });
  });

  it("keeps focus in the edit operation input while typing", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ClientList />
      </MemoryRouter>,
    );

    await screen.findByText("Palisády");
    await user.click(screen.getByRole("button", { name: "Upraviť" }));

    const operationNameInput = screen.getByLabelText(/názov prevádzky/i) as HTMLInputElement;

    await waitFor(() => {
      expect(operationNameInput).toHaveValue("Palisády");
    });

    await user.clear(operationNameInput);
    await user.type(operationNameInput, "Krásňanko");

    expect(operationNameInput).toHaveValue("Krásňanko");
    expect(operationNameInput).toHaveFocus();
    expect(operationNameInput).toBe(document.activeElement);
  });
});
