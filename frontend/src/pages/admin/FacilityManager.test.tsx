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
      password_status: "success",
    },
    {
      user_id: 502,
      email: "prevadzka@example.com",
      company_name: "Prevádzka login",
      is_edupage: false,
      prevadzka_ids: [101],
      password_status: "success",
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

describe("FacilityManager celok delete", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("deletes a celok without prevádzky after confirmation", async () => {
    const emptyCelok = { ...celok, id: 20, nazov: "Prázdny celok", prevadzky_count: 0, prevadzky: [], logins: [] };
    mockApiFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "DELETE") return { ok: true, status: 204, json: async () => ({}) };
      if (url.endsWith("/admin/edupage-connections/")) return { ok: true, json: async () => [] };
      return { ok: true, json: async () => [emptyCelok] };
    });

    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Vymazať celok Prázdny celok" }));
    expect(screen.getByText("Naozaj odstrániť celok", { exact: false })).toHaveTextContent("Prázdny celok");

    await user.click(screen.getByRole("button", { name: /^Odstrániť$/ }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/admin/celky/20/", { method: "DELETE" });
    });
    await waitFor(() => {
      expect(screen.queryByText("Naozaj odstrániť celok", { exact: false })).not.toBeInTheDocument();
    });
  });

  it("shows the backend's friendly error when a celok delete is blocked by existing prevádzky", async () => {
    mockApiFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "DELETE") {
        return {
          ok: false,
          status: 409,
          json: async () => ({
            error: {
              code: "protected_error",
              message: "Túto položku nie je možné odstrániť, pretože sú na ňu naviazané ďalšie záznamy.",
              details: {},
            },
          }),
        };
      }
      if (url.endsWith("/admin/edupage-connections/")) return { ok: true, json: async () => [] };
      return { ok: true, json: async () => [celok] };
    });

    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Vymazať celok Centrálny celok" }));
    await user.click(screen.getByRole("button", { name: /^Odstrániť$/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Túto položku nie je možné odstrániť, pretože sú na ňu naviazané ďalšie záznamy.",
    );
    expect(screen.getByText("Naozaj odstrániť celok", { exact: false })).toBeInTheDocument();
  });

  it("warns about cascade impact (prevádzky/objednávky/loginy) before deleting a non-empty celok", async () => {
    const withOrders = {
      ...celok,
      prevadzky: celok.prevadzky.map((p) => (p.id === 101 ? { ...p, orders_count: 5 } : p)),
    };
    mockApiFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === "DELETE") return { ok: true, status: 204, json: async () => ({}) };
      if (url.endsWith("/admin/edupage-connections/")) return { ok: true, json: async () => [] };
      return { ok: true, json: async () => [withOrders] };
    });

    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Vymazať celok Centrálny celok" }));

    expect(screen.getByText("Zmažú sa aj:", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("2 prevádzok")).toBeInTheDocument();
    expect(screen.getByText("5 objednávok")).toBeInTheDocument();
    expect(screen.getByText(/prístup pre 2/)).toBeInTheDocument();
  });
});

describe("FacilityManager celok create (onboarding)", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("creates a celok, then chains straight into add-prevádzka and add-login", async () => {
    const newCelok = {
      id: 30,
      nazov: "Nová škôlka",
      billing_name: "",
      adresa: "",
      ico: "",
      dic: "",
      zdroj_objednavok: "app",
      prevadzky_count: 0,
      prevadzky: [],
      logins: [],
    };
    const newPrevadzka = { id: 301, celok: 30, nazov: "Hlavná budova" };
    let celkyState = [celok];

    mockApiFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith("/admin/edupage-connections/")) return { ok: true, json: async () => [] };
      if (url === "/api/admin/celky/" && options?.method === "POST") {
        celkyState = [...celkyState, newCelok];
        return { ok: true, status: 201, json: async () => newCelok };
      }
      if (url === "/api/admin/facility-prevadzky/" && options?.method === "POST") {
        return { ok: true, status: 201, json: async () => newPrevadzka };
      }
      if (url === "/api/admin/users/" && options?.method === "POST") {
        return { ok: true, status: 201, json: async () => ({ id: 601 }) };
      }
      return { ok: true, json: async () => celkyState };
    });

    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Nový celok" }));
    expect(screen.getByRole("heading", { name: "Nový celok" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Názov celku *"), "Nová škôlka");
    await user.click(screen.getByRole("button", { name: "Vytvoriť celok" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/admin/celky/",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // Chained straight into "add prevádzka" for the freshly created celok.
    expect(await screen.findByText("Pridať prevádzku — Nová škôlka")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Názov prevádzky *"), "Hlavná budova");
    await user.click(screen.getByRole("button", { name: "Pridať" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/admin/facility-prevadzky/",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // Chained straight into "add login" for the same celok.
    expect(await screen.findByText("Pridať login — Nová škôlka")).toBeInTheDocument();
  });

  it("does not resume onboarding after cancelling the add-prevádzka step", async () => {
    const newCelok = {
      id: 31,
      nazov: "Zrušená škôlka",
      billing_name: "",
      adresa: "",
      ico: "",
      dic: "",
      zdroj_objednavok: "app",
      prevadzky_count: 0,
      prevadzky: [],
      logins: [],
    };
    let celkyState = [celok];

    mockApiFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.endsWith("/admin/edupage-connections/")) return { ok: true, json: async () => [] };
      if (url === "/api/admin/celky/" && options?.method === "POST") {
        celkyState = [...celkyState, newCelok];
        return { ok: true, status: 201, json: async () => newCelok };
      }
      if (url === "/api/admin/facility-prevadzky/" && options?.method === "POST") {
        return { ok: true, status: 201, json: async () => ({ id: 311, celok: 31, nazov: "Neskorá budova" }) };
      }
      return { ok: true, json: async () => celkyState };
    });

    const user = userEvent.setup();
    renderManager();

    await user.click(await screen.findByRole("button", { name: "Nový celok" }));
    await user.type(screen.getByLabelText("Názov celku *"), "Zrušená škôlka");
    await user.click(screen.getByRole("button", { name: "Vytvoriť celok" }));

    expect(await screen.findByText("Pridať prevádzku — Zrušená škôlka")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Zrušiť" }));

    await waitFor(() => {
      expect(screen.queryByText("Pridať prevádzku — Zrušená škôlka")).not.toBeInTheDocument();
    });

    // Manually adding a prevádzka to that celok afterwards must NOT chain into add-login.
    const row = (await screen.findByText("Zrušená škôlka")).closest<HTMLElement>(".zpa-celok")!;
    await user.click(within(row).getAllByRole("button", { name: "Pridať prevádzku" })[0]);
    expect(screen.getByText("Pridať prevádzku — Zrušená škôlka")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Názov prevádzky *"), "Neskorá budova");
    await user.click(screen.getByRole("button", { name: "Pridať" }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/admin/facility-prevadzky/",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(screen.queryByText("Pridať login — Zrušená škôlka")).not.toBeInTheDocument();
  });
});
