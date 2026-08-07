import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  edupage_match: "",
  celok_zdroj_objednavok: "app",
  visible_menus: ["A", "B", "C", "V"],
  visible_meals: ["breakfast", "lunch", "olovrant"],
  visible_diets: [],
  visible_portion_types: [1, 2],
  admin_order_note: "",
  client_user_id: null,
  pack_separately_enabled: false,
};

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
