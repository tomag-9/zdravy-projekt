import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ClientDetail from "./ClientDetail";

const mockApiFetch = vi.fn();
const mockSuccess = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({
    success: mockSuccess,
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

const response = (payload: unknown) => ({
  ok: true,
  json: async () => payload,
});

const facility = {
  id: 7,
  celok: 3,
  celok_nazov: "Test celok",
  nazov: "Test prevádzka",
  adresa: "",
  edupage_connection: null,
  edupage_match: "",
  report_alias: "",
  delivery_note: "",
  sort_order: 0,
  is_active: true,
  celok_zdroj_objednavok: "app",
  visible_menus: ["A", "B", "C", "V"],
  visible_meals: ["breakfast", "lunch", "olovrant"],
  visible_diets: [],
  visible_portion_types: [1, 2],
  admin_order_note: "",
  client_user_id: null,
  pack_separately_enabled: false,
  orders_count: 0,
};

const celokWithLogins = {
  id: 3,
  nazov: "Test celok",
  logins: [
    { user_id: 501, email: "own@example.com", company_name: "Vlastný login", is_edupage: false, prevadzka_ids: [7], password_status: "success" },
    { user_id: 502, email: "other@example.com", company_name: "Login inej prevádzky", is_edupage: false, prevadzka_ids: [8], password_status: "success" },
  ],
};

type DeleteFacilityResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function buildFetchMock(overrides: { deleteFacility?: () => DeleteFacilityResponse } = {}) {
  return vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method;
    if (url.includes("/admin/portion-types/")) return Promise.resolve(response([]));
    if (url.includes("/diets/")) return Promise.resolve(response([]));
    if (url.includes("/orders/")) return Promise.resolve(response([]));
    if (url.includes("/admin/edupage-connections/")) return Promise.resolve(response([]));
    if (url.includes("/admin/celky/3/")) return Promise.resolve(response(celokWithLogins));
    if (url.includes("/admin/facility-prevadzky/7/") && method === "PATCH") {
      return Promise.resolve(response({ ...facility, ...JSON.parse(String(init?.body)) }));
    }
    if (url.includes("/admin/facility-prevadzky/7/") && method === "DELETE") {
      if (overrides.deleteFacility) return Promise.resolve(overrides.deleteFacility());
      return Promise.resolve({ ok: true, status: 204, json: async () => ({}) });
    }
    if (url.includes("/admin/facility-prevadzky/7/")) return Promise.resolve(response(facility));
    if (url.includes("/admin/users/") && method === "POST") return Promise.resolve({ ok: true, status: 201, json: async () => ({}) });
    if (url.includes("/admin/users/") && method === "PATCH") return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    if (url.includes("/admin/users/") && method === "DELETE") return Promise.resolve({ ok: true, status: 204, json: async () => ({}) });
    return Promise.resolve(response([]));
  });
}

function renderClientDetail() {
  return render(
    <MemoryRouter initialEntries={["/admin/facilities/7"]}>
      <Routes>
        <Route path="/admin/facilities/:id" element={<ClientDetail />} />
        <Route path="/admin/facilities" element={<div>Facilities</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ClientDetail portion type visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/admin/portion-types/")) {
        return Promise.resolve(response([
          { id: 1, name: "Jasle", is_active: true },
          { id: 2, name: "Škôlka", is_active: true },
        ]));
      }
      if (url.includes("/diets/")) return Promise.resolve(response([]));
      if (url.includes("/orders/")) return Promise.resolve(response([]));
      if (url.includes("/admin/celky/3/")) return Promise.resolve(response(celokWithLogins));
      if (url.includes("/admin/facility-prevadzky/7/") && init?.method === "PATCH") {
        return Promise.resolve(response({ ...facility, ...JSON.parse(String(init.body)) }));
      }
      if (url.includes("/admin/facility-prevadzky/7/")) {
        return Promise.resolve(response(facility));
      }
      return Promise.resolve(response([]));
    });
  });

  it("renders the portion-size card and saves selected ids", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin/facilities/7"]}>
        <Routes>
          <Route path="/admin/facilities/:id" element={<ClientDetail />} />
          <Route path="/admin/facilities" element={<div>Facilities</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: "Nastavenia" }));
    expect(screen.getByText("Viditeľné veľkosti porcií")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jasle" }));
    await user.click(screen.getByRole("button", { name: "Uložiť nastavenia" }));

    await waitFor(() => {
      const patchCall = mockApiFetch.mock.calls.find(
        ([url, init]) => String(url).includes("/admin/facility-prevadzky/7/")
          && init?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      expect(JSON.parse(String(patchCall?.[1]?.body)).visible_portion_types).toEqual([2]);
    });
  });
});

describe("ClientDetail facility & login management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders only logins scoped to this facility", async () => {
    mockApiFetch.mockImplementation(buildFetchMock());
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByRole("button", { name: "Loginy" }));

    expect(screen.getByText("own@example.com")).toBeInTheDocument();
    expect(screen.queryByText("other@example.com")).not.toBeInTheDocument();
  });

  it("adds a login scoped to this facility", async () => {
    mockApiFetch.mockImplementation(buildFetchMock());
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByRole("button", { name: "Loginy" }));
    await user.click(screen.getByRole("button", { name: "Pridať login" }));

    const editor = screen.getByText("Pridať login — Test prevádzka").closest<HTMLElement>(".zpa-modal")!;
    const nameInput = within(editor).getByLabelText("Názov loginu *");
    const emailInput = within(editor).getByLabelText("Email *");
    await user.clear(nameInput);
    await user.type(nameInput, "Nový login");
    await user.type(emailInput, "new@example.com");
    await user.click(within(editor).getByRole("button", { name: "Vytvoriť login" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/admin/users/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "new@example.com",
            company_name: "Nový login",
            is_staff: false,
            is_active: true,
            celok: 3,
            prevadzky: [7],
          }),
        }),
      );
    });
  });

  it("edits an existing login and preserves its facility scope", async () => {
    mockApiFetch.mockImplementation(buildFetchMock());
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByRole("button", { name: "Loginy" }));
    await user.click(screen.getByRole("button", { name: "Upraviť login own@example.com" }));

    const editor = screen.getByText("Upraviť login — own@example.com").closest<HTMLElement>(".zpa-modal")!;
    const nameInput = within(editor).getByLabelText("Názov loginu *");
    const emailInput = within(editor).getByLabelText("Email *");
    expect(nameInput).toHaveValue("Vlastný login");
    expect(emailInput).toHaveValue("own@example.com");

    await user.clear(nameInput);
    await user.type(nameInput, "Upravený login");
    await user.clear(emailInput);
    await user.type(emailInput, "updated@example.com");
    await user.click(within(editor).getByRole("button", { name: "Uložiť" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/admin/users/501/",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            email: "updated@example.com",
            company_name: "Upravený login",
            is_staff: false,
            is_active: true,
            celok: 3,
            prevadzky: [7],
          }),
        }),
      );
    });
  });

  it("deletes a login only after confirmation", async () => {
    mockApiFetch.mockImplementation(buildFetchMock());
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByRole("button", { name: "Loginy" }));
    await user.click(screen.getByRole("button", { name: "Odstrániť login own@example.com" }));

    const confirmation = screen.getByText("Odstrániť login", { selector: "h3" }).closest<HTMLElement>(".zpa-modal")!;
    await user.click(within(confirmation).getByRole("button", { name: /^Odstrániť$/ }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/admin/users/501/", { method: "DELETE" });
    });
  });

  it("prefills and saves the prevádzka core fields with existing settings", async () => {
    mockApiFetch.mockImplementation(buildFetchMock());
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByRole("button", { name: "Nastavenia" }));
    const nameInput = screen.getByLabelText("Názov prevádzky *");
    expect(nameInput).toHaveValue("Test prevádzka");

    await user.clear(nameInput);
    await user.type(nameInput, "Upravená prevádzka");
    await user.click(screen.getByRole("button", { name: "Uložiť nastavenia" }));

    await waitFor(() => {
      const patchCall = mockApiFetch.mock.calls.find(
        ([url, init]) => String(url).includes("/admin/facility-prevadzky/7/")
          && init?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(String(patchCall?.[1]?.body));
      expect(body.nazov).toBe("Upravená prevádzka");
      expect(body.visible_menus).toEqual(["A", "B", "C", "V"]);
    });
  });

  it("restricts a menu to a chosen weekday and saves it, without touching other menus", async () => {
    mockApiFetch.mockImplementation(buildFetchMock());
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByRole("button", { name: "Nastavenia" }));
    await user.click(screen.getByRole("button", { name: "Menu B - Pi" }));
    await user.click(screen.getByRole("button", { name: "Uložiť nastavenia" }));

    await waitFor(() => {
      const patchCall = mockApiFetch.mock.calls.find(
        ([url, init]) => String(url).includes("/admin/facility-prevadzky/7/")
          && init?.method === "PATCH",
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(String(patchCall?.[1]?.body));
      expect(body.menu_day_restrictions).toEqual({ B: [5] });
      // Ostatné menu (A, C, V) sú stále bez obmedzenia — každý deň.
      expect(body.visible_menus).toEqual(["A", "B", "C", "V"]);
    });
  });

  it("deletes the facility and navigates back to facilities", async () => {
    mockApiFetch.mockImplementation(buildFetchMock());
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByRole("button", { name: "Nastavenia" }));
    await user.click(screen.getByRole("button", { name: "Odstrániť prevádzku" }));

    const confirmation = screen.getByText("Odstrániť prevádzku", { selector: "h3" }).closest<HTMLElement>(".zpa-modal")!;
    await user.click(within(confirmation).getByRole("button", { name: /^Odstrániť$/ }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/admin/facility-prevadzky/7/",
        { method: "DELETE" },
      );
    });
    expect(await screen.findByText("Facilities")).toBeInTheDocument();
  });

  it("shows a protected-error message when facility deletion is blocked", async () => {
    mockApiFetch.mockImplementation(buildFetchMock({
      deleteFacility: () => ({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            code: "protected_error",
            message: "Túto položku nie je možné odstrániť, pretože sú na ňu naviazané ďalšie záznamy.",
            details: {},
          },
        }),
      }),
    }));
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByRole("button", { name: "Nastavenia" }));
    await user.click(screen.getByRole("button", { name: "Odstrániť prevádzku" }));

    const confirmation = screen.getByText("Odstrániť prevádzku", { selector: "h3" }).closest<HTMLElement>(".zpa-modal")!;
    await user.click(within(confirmation).getByRole("button", { name: /^Odstrániť$/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Túto položku nie je možné odstrániť, pretože sú na ňu naviazané ďalšie záznamy.",
    );
    expect(screen.queryByText("Facilities")).not.toBeInTheDocument();
  });
});

describe("ClientDetail order history diets", () => {
  const order = {
    id: 91,
    date: "2026-08-12",
    status: "submitted",
    data: {
      lunch: {
        "ZŠ 1.stupeň": {
          menuCounts: { A: 3, V: 2 },
          diets: { "Vegetariánske": 2, "Bez lepku": 1 },
        },
      },
    },
  };

  const diets = [
    { id: 1, name: "Bez lepku", color: "#F59E0B", base_colors: [] },
    { id: 2, name: "Vegetariánske", color: "#10B981", base_colors: [] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/admin/portion-types/")) return Promise.resolve(response([]));
      if (url.includes("/diets/")) return Promise.resolve(response(diets));
      if (url.includes("/orders/")) return Promise.resolve(response([order]));
      if (url.includes("/admin/edupage-connections/")) return Promise.resolve(response([]));
      if (url.includes("/admin/celky/3/")) return Promise.resolve(response(celokWithLogins));
      if (url.includes("/admin/facility-prevadzky/7/")) return Promise.resolve(response(facility));
      return Promise.resolve(response([]));
    });
  });

  it("rozpíše konkrétne diéty namiesto súhrnu", async () => {
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByText("2026-08-12"));

    expect(await screen.findByText(/2x Vegetariánske/)).toBeInTheDocument();
    expect(screen.getByText(/1x Bez lepku/)).toBeInTheDocument();
    // Starý súhrn „3x Diéta" už nikde nefiguruje.
    expect(screen.queryByText(/x Diéta/)).not.toBeInTheDocument();
  });

  it("dokreslí k diéte farbu z katalógu", async () => {
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByText("2026-08-12"));
    await screen.findByText(/2x Vegetariánske/);

    expect(screen.getAllByTestId("diet-color-swatch").length).toBeGreaterThanOrEqual(2);
  });

  it("rozpíše počty aj podľa menu písmena, keď je z čoho vyberať", async () => {
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByText("2026-08-12"));

    expect(await screen.findByText(/3x Menu A/)).toBeInTheDocument();
    expect(screen.getByText(/2x Menu V/)).toBeInTheDocument();
  });
});

describe("ClientDetail order history menu bez rozpisu", () => {
  const singleMenuOrder = {
    id: 92,
    date: "2026-08-13",
    status: "submitted",
    data: {
      lunch: {
        Dospelý: {
          menuCounts: { B: 4 },
          diets: {},
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/admin/portion-types/")) return Promise.resolve(response([]));
      if (url.includes("/diets/")) return Promise.resolve(response([]));
      if (url.includes("/orders/")) return Promise.resolve(response([singleMenuOrder]));
      if (url.includes("/admin/edupage-connections/")) return Promise.resolve(response([]));
      if (url.includes("/admin/celky/3/")) return Promise.resolve(response(celokWithLogins));
      if (url.includes("/admin/facility-prevadzky/7/")) return Promise.resolve(response(facility));
      return Promise.resolve(response([]));
    });
  });

  it("nezobrazí rozpis, keď je objednané len jedno menu písmeno", async () => {
    const user = userEvent.setup();
    renderClientDetail();

    await user.click(await screen.findByText("2026-08-13"));

    expect(await screen.findByText(/4x Dospelý/)).toBeInTheDocument();
    expect(screen.queryByText(/Menu B/)).not.toBeInTheDocument();
  });
});
