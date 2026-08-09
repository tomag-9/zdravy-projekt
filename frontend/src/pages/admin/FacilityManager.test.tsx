import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FacilityManager from "./FacilityManager";

const mockApiFetch = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const celok = {
  id: 10,
  nazov: "Centrálny celok",
  billing_name: "",
  adresa: "",
  ico: "",
  dic: "",
  zdroj_objednavok: "app",
  prevadzky_count: 2,
  prevadzky: [
    {
      id: 101,
      celok: 10,
      celok_nazov: "Centrálny celok",
      nazov: "Prvá prevádzka",
      adresa: "Prvá 1",
      edupage_connection: null,
      edupage_connection_name: null,
      edupage_match: "",
      report_alias: "",
      delivery_note: "",
      sort_order: 0,
      is_active: true,
      billing_portion_coefficients: {},
      orders_count: 0,
      client_user_id: null,
    },
    {
      id: 102,
      celok: 10,
      celok_nazov: "Centrálny celok",
      nazov: "Druhá prevádzka",
      adresa: "Druhá 2",
      edupage_connection: null,
      edupage_connection_name: null,
      edupage_match: "",
      report_alias: "",
      delivery_note: "",
      sort_order: 1,
      is_active: true,
      billing_portion_coefficients: {},
      orders_count: 0,
      client_user_id: null,
    },
  ],
  logins: [
    {
      user_id: 501,
      email: "celok@example.com",
      company_name: "Celok login",
      is_edupage: false,
      prevadzka_ids: [],
    },
    {
      user_id: 502,
      email: "prevadzka@example.com",
      company_name: "Prevádzka login",
      is_edupage: false,
      prevadzka_ids: [101],
    },
  ],
};

function renderManager() {
  return render(
    <MemoryRouter>
      <FacilityManager />
    </MemoryRouter>,
  );
}

describe("FacilityManager login management", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "PATCH") return { ok: true, status: 200, json: async () => ({}) };
      if (options?.method === "DELETE") return { ok: true, status: 204, json: async () => ({}) };
      if (url.endsWith("/admin/edupage-connections/")) return { ok: true, json: async () => [] };
      return { ok: true, json: async () => [celok] };
    });
  });

  it("opens the complete login list from the celok badge", async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Zobraziť loginy celku Centrálny celok" }));

    expect(screen.getByText("Loginy — Centrálny celok")).toBeInTheDocument();
    expect(screen.getByText("celok@example.com")).toBeInTheDocument();
    expect(screen.getByText("prevadzka@example.com")).toBeInTheDocument();
  });

  it("links each prevádzka to its detail page", async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Centrálny celok 2 prevádzky" }));
    const firstFacilityRow = screen.getByText("Prvá prevádzka").closest("tr")!;
    expect(within(firstFacilityRow).getByRole("link", { name: "Otvoriť detail" }))
      .toHaveAttribute("href", "/admin/facilities/101");
  });

  it("prefills and saves an edited login with PATCH", async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Zobraziť loginy celku Centrálny celok" }));
    await user.click(screen.getByRole("button", { name: "Upraviť login prevadzka@example.com" }));

    const editor = screen.getByText("Upraviť login — prevadzka@example.com").closest<HTMLElement>(".zpa-modal")!;
    const nameInput = within(editor).getByLabelText("Názov loginu *");
    const emailInput = within(editor).getByLabelText("Email *");
    expect(nameInput).toHaveValue("Prevádzka login");
    expect(emailInput).toHaveValue("prevadzka@example.com");

    await user.clear(nameInput);
    await user.type(nameInput, "Upravený login");
    await user.clear(emailInput);
    await user.type(emailInput, "upraveny@example.com");
    await user.click(within(editor).getByRole("button", { name: "Uložiť" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/admin/users/502/",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            email: "upraveny@example.com",
            company_name: "Upravený login",
            is_staff: false,
            is_active: true,
            celok: 10,
            prevadzky: [101],
          }),
        }),
      );
    });
  });

  it("finds a celok despite case, diacritics, punctuation and whitespace differences", async () => {
    const user = userEvent.setup();
    renderManager();

    const search = await screen.findByPlaceholderText("Hľadať celok alebo prevádzku…");

    await user.type(search, "  CENTRALNY,  celok  ");
    expect(await screen.findByText("Centrálny celok")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "prva prevadzka");
    expect(await screen.findByText("Centrálny celok")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "nothing matches this");
    expect(screen.queryByText("Centrálny celok")).not.toBeInTheDocument();
  });

  it("deletes a login only after confirmation", async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Zobraziť loginy celku Centrálny celok" }));
    await user.click(screen.getByRole("button", { name: "Odstrániť login celok@example.com" }));

    expect(screen.getByText("Naozaj odstrániť login", { exact: false })).toHaveTextContent("celok@example.com");
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      "/api/admin/users/501/",
      expect.objectContaining({ method: "DELETE" }),
    );

    await user.click(screen.getByRole("button", { name: /^Odstrániť$/ }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/admin/users/501/", { method: "DELETE" });
    });
  });
});
