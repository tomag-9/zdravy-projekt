import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "./AdminDashboard";

const mockApiFetch = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({
    error: mockToastError,
    success: mockToastSuccess,
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

const makeMockResponse = (payload: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  json: () => Promise.resolve(payload),
  blob: () => Promise.resolve(new Blob()),
  text: () => Promise.resolve(JSON.stringify(payload)),
  clone() {
    return makeMockResponse(payload, ok);
  },
});

const mockDashboardRequests = (
  gramage: unknown,
  orderReport?: unknown,
  isClosed = false,
) => {
  mockApiFetch.mockImplementation((url: string) => {
    if (url.includes("/admin/closed-days/")) {
      return Promise.resolve(makeMockResponse({ date: "2026-07-03", is_closed: isClosed }));
    }
    if (url.includes("/admin/meal-plans/gramage-dashboard/")) {
      return Promise.resolve(makeMockResponse(gramage));
    }
    if (url.includes("/admin/summary/daily-report/") && orderReport) {
      return Promise.resolve(makeMockResponse(orderReport));
    }
    throw new Error(`Unexpected URL ${url}`);
  });
};

// Tabuľku renderuje hotový `spec` z backendu (gramage_table_spec.py) — fixture
// ho musí niesť tiež, inak testuje niečo, čo v aplikácii nikdy nenastane.
const emptySpec = (columns = 0) => ({
  total_columns: 1 + columns,
  sections: [],
  header: { corner: "Prevádzka / Riadok", groups: [], components: [] },
  rows: [],
  footer: [],
});

const EMPTY_GRAMAGE = {
  date: "2026-07-03",
  meal_plan_id: null,
  col_groups: [],
  rows: [],
  totals: [],
  count_summary: [],
  spec: emptySpec(),
};

const ORDER_REPORT = {
  date: "2026-07-03",
  rows: [
    {
      user_id: 1,
      name: "Skolka Krasnanko",
      email: "krasnanko@edupage.local",
      breakfast: {
        categories: [
          {
            name: "Škôlka",
            menus: { A: 12 },
            diets: { Bezlepkova: 2 },
            total: 12,
          },
        ],
        total: 14,
      },
      lunch: {
        categories: [
          {
            name: "Škôlka",
            menus: { A: 20, B: 5 },
            diets: {},
            total: 25,
          },
        ],
        total: 25,
      },
      olovrant: {
        categories: [],
        total: 0,
      },
      total: 39,
    },
  ],
  totals: {
    breakfast: { menus: { A: 12 }, diets: { Bezlepkova: 2 }, total: 14 },
    lunch: { menus: { A: 20, B: 5 }, diets: {}, total: 25 },
    olovrant: { menus: {}, diets: {}, total: 0 },
    grand: 39,
  },
};

const ORDER_REPORT_WITH_BOTH_SHAPES = {
  ...ORDER_REPORT,
  rows: [
    {
      ...ORDER_REPORT.rows[0],
      breakfast: {
        menus: { A: 99 },
        diets: { StaryTvar: 99 },
        categories: [
          {
            name: "Škôlka",
            menus: { A: 12 },
            diets: { Bezlepkova: 2 },
            total: 12,
          },
        ],
        total: 14,
      },
    },
  ],
};

const GRAMAGE_WITH_PLAN = {
  date: "2026-07-06",
  meal_plan_id: 7,
  col_groups: [
    {
      key: "main_course_B",
      label: "Hlavný chod Menu B",
      meal: "main_course",
      variant: "B",
      template_name: "Hlavny chod 1",
      components: [{ label: "jedlo", base_grams: "100", unit: "g" }],
    },
  ],
  rows: [],
  totals: [["0.00"]],
  count_summary: [],
  spec: {
    ...emptySpec(1),
    header: {
      corner: "Prevádzka / Riadok",
      groups: [{ text: "Menu B", sub: "Hlavny chod 1", css: "grp mh-menuB-1", colspan: 1 }],
      components: [{ text: "jedlo", sub: "100g", css: "comp mh-menuB-2" }],
    },
  },
};

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:report") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("shows order counts when the selected date has orders but no meal plan", async () => {
    mockDashboardRequests(EMPTY_GRAMAGE, ORDER_REPORT);

    render(<AdminDashboard />);

    expect(await screen.findByText("Počty objednávok bez gramáže")).toBeInTheDocument();
    expect(screen.getByText("Skolka Krasnanko")).toBeInTheDocument();
    expect(screen.getByText("A: 12")).toBeInTheDocument();
    expect(screen.getByText("Bezlepkova: 2")).toBeInTheDocument();
    expect(screen.getByText("A: 20, B: 5")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/summary/daily-report/"),
      );
    });
  });

  it("does not fetch the order-count fallback when gramaz data has a meal plan", async () => {
    mockDashboardRequests(GRAMAGE_WITH_PLAN);

    render(<AdminDashboard />);

    expect(await screen.findAllByText("Menu B")).not.toHaveLength(0);
    expect(screen.queryByText("Hlavný chod Menu B")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/admin/summary/daily-report/"),
    );
  });

  it("prefers category counts over top-level fallback counts", async () => {
    mockDashboardRequests(EMPTY_GRAMAGE, ORDER_REPORT_WITH_BOTH_SHAPES);

    render(<AdminDashboard />);

    expect(await screen.findByText("Počty objednávok bez gramáže")).toBeInTheDocument();
    expect(screen.getByText("A: 12")).toBeInTheDocument();
    expect(screen.getByText("Bezlepkova: 2")).toBeInTheDocument();
    expect(screen.queryByText("A: 99")).not.toBeInTheDocument();
    expect(screen.queryByText("StaryTvar: 99")).not.toBeInTheDocument();
  });

  it("shows Uzamknúť for an open date and closes it after confirmation", async () => {
    let closed = false;
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/admin/meal-plans/gramage-dashboard/")) {
        return Promise.resolve(makeMockResponse(EMPTY_GRAMAGE));
      }
      if (url.includes("/admin/summary/daily-report/")) {
        return Promise.resolve(makeMockResponse(ORDER_REPORT));
      }
      if (url.includes("/admin/closed-days/") && options?.method === "POST") {
        closed = true;
        return Promise.resolve(makeMockResponse({ date: "2026-07-03", is_closed: true }));
      }
      if (url.includes("/admin/closed-days/")) {
        return Promise.resolve(makeMockResponse({ date: "2026-07-03", is_closed: closed }));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(<AdminDashboard />);

    const lockButton = await screen.findByRole("button", { name: /uzamknúť/i });
    fireEvent.click(lockButton);
    const dialog = screen.getByRole("dialog", { name: /uzamknúť objednávky/i });
    fireEvent.click(within(dialog).getByRole("button", { name: "Uzamknúť" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/closed-days/"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"date"'),
        }),
      );
      expect(screen.getByRole("status")).toHaveTextContent("Deň je uzavretý");
    });
    expect(screen.getByRole("button", { name: /stiahnuť pdf/i })).toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith("Deň bol uzavretý.");
  });

  it("unlocks a closed date after explicit confirmation and returns to the open state", async () => {
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/admin/meal-plans/gramage-dashboard/")) {
        return Promise.resolve(makeMockResponse(GRAMAGE_WITH_PLAN));
      }
      if (url.includes("/admin/closed-days/unlock/") && options?.method === "DELETE") {
        return Promise.resolve(makeMockResponse({ date: "2026-07-03", is_closed: false }));
      }
      if (url.includes("/admin/closed-days/")) {
        return Promise.resolve(makeMockResponse({ date: "2026-07-03", is_closed: true }));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(<AdminDashboard />);

    const unlockButton = await screen.findByRole("button", { name: /odomknúť/i });
    fireEvent.click(unlockButton);
    const dialog = screen.getByRole("dialog", { name: /odomknúť objednávky/i });
    expect(within(dialog).getByText(/znova otvorí na úpravy objednávok, diét/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Odomknúť" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/closed-days/unlock/"),
        expect.objectContaining({
          method: "DELETE",
          body: expect.stringContaining('"date"'),
        }),
      );
      expect(screen.getByRole("button", { name: /uzamknúť/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith("Deň bol odomknutý.");
  });
});

// ── Tabuľka sa renderuje z hotového spec-u ───────────────────────────────────
// Rovnaký spec vykresľuje aj PDF (gramage_table_html.py), takže tieto testy
// zamykajú, že React zo spec-u nič nedomýšľa ani nevynecháva.

const cell = (text: string, css = "") => ({ text, css });

const GRAMAGE_WITH_ROWS = {
  ...EMPTY_GRAMAGE,
  spec: {
    total_columns: 2,
    sections: [
      { key: "soup", label: "Polievka", selected: true },
      { key: "main_course_A", label: "Menu A", selected: true },
      { key: "afternoon_snack", label: "Olovrant", selected: true },
    ],
    header: {
      corner: "Prevádzka / Riadok",
      groups: [{ text: "Menu A", sub: "Kuracie", css: "grp mh-menuA-1", colspan: 1 }],
      components: [{ text: "Mäso", sub: "300g", css: "comp mh-menuA-2" }],
    },
    rows: [
      {
        kind: "client",
        css: "client-row",
        group_id: "k1",
        cells: [
          {
            text: "MŠ Testovacia",
            meta: "štandard 8, diéty 2",
            meta_right: "spolu porcií 10",
            colspan: 2,
          },
        ],
      },
      {
        kind: "sub-row",
        css: "sub-row",
        group_id: "k1",
        collapsible: true,
        cells: [
          { text: "Škôlka - Obed Menu A", css: "lbl", count: "8" },
          cell("2400", "cell-num mh-menuA-cell"),
        ],
      },
      {
        kind: "summary-diet",
        css: "summ-diet",
        group_id: "k1",
        collapsible: true,
        color: "#966107",
        cells: [
          { text: "No Milk", css: "lbl", count: "2" },
          cell("600,5", "cell-num mh-menuA-cell"),
        ],
      },
    ],
    footer: [
      {
        kind: "total",
        css: "total",
        cells: [cell("CELKOM (g / ml)", "corner"), cell("3000,5")],
      },
    ],
  },
};

describe("GramageTable renders straight from the spec", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the header and footer but keeps client detail collapsed", async () => {
    mockDashboardRequests(GRAMAGE_WITH_ROWS);
    render(<AdminDashboard />);

    expect(await screen.findByText("MŠ Testovacia")).toBeInTheDocument();
    // "Menu A" je aj chip filtra, preto hľadaj hlavičku vnútri tabuľky.
    const table = document.querySelector("table.zpa-gram")!;
    expect(within(table as HTMLElement).getByText("Menu A")).toBeInTheDocument();
    expect(screen.getByText("300g")).toBeInTheDocument();
    // Desatiny musia byť vidno — kuchyňa ich potrebuje.
    expect(screen.getByText("3000,5")).toBeInTheDocument();

    // Podriadky sú zbalené, kým klienta nerozklikneš.
    expect(screen.queryByText("Škôlka - Obed Menu A")).not.toBeInTheDocument();
  });

  it("shows the prevádzka note in the note column even while collapsed (#513)", async () => {
    const withNote = {
      ...GRAMAGE_WITH_ROWS,
      spec: {
        ...GRAMAGE_WITH_ROWS.spec,
        rows: [
          {
            ...GRAMAGE_WITH_ROWS.spec.rows[0],
            cells: [
              { ...GRAMAGE_WITH_ROWS.spec.rows[0].cells[0], colspan: 1 },
              { text: "bez cibule", css: "cell-note client-note" },
            ],
          },
          ...GRAMAGE_WITH_ROWS.spec.rows.slice(1),
        ],
      },
    };
    mockDashboardRequests(withNote);
    render(<AdminDashboard />);

    // Vidno hneď, bez rozbalenia klienta.
    expect(await screen.findByText("bez cibule")).toBeInTheDocument();
  });

  it("reveals the sub-rows with their spec classes and colour on expand", async () => {
    mockDashboardRequests(GRAMAGE_WITH_ROWS);
    render(<AdminDashboard />);

    fireEvent.click(await screen.findByRole("button", { name: /MŠ Testovacia/ }));

    const subRow = screen.getByText("Škôlka - Obed Menu A").closest("tr");
    expect(subRow).toHaveClass("sub-row");
    expect(screen.getByText("2400")).toHaveClass("cell-num", "mh-menuA-cell");

    // Diéta sa odlišuje farbou písma, nie výplňou riadku.
    const dietRow = screen.getByText("No Milk").closest("tr");
    expect(dietRow).toHaveClass("summ-diet");
    expect(dietRow).toHaveStyle({ color: "#966107" });
  });

  it("renders the count as a badge, not as its own column", async () => {
    mockDashboardRequests(GRAMAGE_WITH_ROWS);
    render(<AdminDashboard />);

    fireEvent.click(await screen.findByRole("button", { name: /MŠ Testovacia/ }));

    const subRow = screen.getByText("Škôlka - Obed Menu A").closest("tr")!;
    expect(within(subRow).getByText("8")).toHaveClass("count-badge");
    expect(subRow.querySelectorAll("td")).toHaveLength(2);
  });
});


describe("Filter sekcií", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("re-fetches with the ticked sections and passes them to the export", async () => {
    mockDashboardRequests(GRAMAGE_WITH_ROWS);
    render(<AdminDashboard />);

    // Odklik jednej sekcie pošle zvyšné dve — nie prázdny (= všetko) filter.
    fireEvent.click(await screen.findByRole("button", { name: "Olovrant" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /gramage-dashboard\/\?date=[\d-]+&section=soup&section=main_course_A$/,
        ),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /stiahnuť pdf/i }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /gramage-dashboard-pdf\/\?date=[\d-]+&section=soup&section=main_course_A$/,
        ),
      );
    });
  });

  it("prints a single dispatch point when one is picked", async () => {
    // Kuchyňa vydáva z dvoch bodov naraz a chce tabuľku jedného z nich.
    mockDashboardRequests({
      ...GRAMAGE_WITH_ROWS,
      spec: {
        ...GRAMAGE_WITH_ROWS.spec,
        vydaje: [
          { key: "A", name: "Výdaj A", selected: true },
          { key: "B", name: "Výdaj B", selected: true },
        ],
      },
    });
    render(<AdminDashboard />);

    fireEvent.change(await screen.findByLabelText("Výdajný bod"), {
      target: { value: "B" },
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringMatching(/gramage-dashboard\/\?date=[\d-]+&vydaj=B$/),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /stiahnuť pdf/i }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringMatching(/gramage-dashboard-pdf\/\?date=[\d-]+&vydaj=B$/),
      );
    });
  });

  it("drops the filter entirely once everything is ticked again", async () => {
    mockDashboardRequests(GRAMAGE_WITH_ROWS);
    render(<AdminDashboard />);

    const olovrant = await screen.findByRole("button", { name: "Olovrant" });
    fireEvent.click(olovrant);
    await waitFor(() => expect(olovrant).toHaveAttribute("aria-pressed", "true"));

    // Fixture hlási všetky sekcie ako zapnuté, takže druhý klik ich má zapnúť
    // späť a filter úplne zahodiť — inak by v URL zostal zbytočný balast.
    fireEvent.click(olovrant);
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringMatching(/gramage-dashboard\/\?date=[\d-]+$/),
      );
    });
  });
});
