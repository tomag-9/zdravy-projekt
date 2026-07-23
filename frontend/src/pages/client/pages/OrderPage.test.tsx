import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import OrderPage from "./OrderPage";
import { AppProvider } from "../context/AppContext";
import { MemoryRouter } from "react-router-dom";
import OrderService from "../services/OrderService";
import { ReactNode } from "react";
import { ToastProvider } from "../../../context/ToastContext";
import { useAuth } from "../../../context/auth";

const mockApiFetch = vi.fn();

const makeMockResponse = (payload: unknown, ok = true) => ({
  ok,
  json: () => Promise.resolve(payload),
  text: () => Promise.resolve(typeof payload === "string" ? payload : JSON.stringify(payload)),
  clone() {
    return makeMockResponse(payload, ok);
  },
});

// Mock Auth Context
vi.mock("../../../context/auth", () => ({
  useAuth: vi.fn(() => ({
    logout: vi.fn(),
    apiFetch: mockApiFetch,
  })),
  AuthProvider: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock OnboardingContext
vi.mock("../../../context/OnboardingContext", () => ({
  useOnboarding: vi.fn(() => ({
    isTourActive: false,
    currentStep: 0,
    totalSteps: 9,
    startTour: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    completeTour: vi.fn(),
    skipTour: vi.fn(),
    resetTour: vi.fn(),
  })),
  OnboardingProvider: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock OrderService with implementation that allows actual data structure usage
vi.mock("../services/OrderService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/OrderService")>();
  const originalDefault = actual.default;

  // Statické metódy triedy sú non-enumerable, takže spread by ich nepreniesol,
  // a ručný zoznam sa rozbije vždy, keď v OrderService pribudne interná metóda
  // volaná cez `this` (napr. withClampedPackSeparately). Preto ich prenesieme
  // všetky a naviažeme na originál — mockujeme len to, čo naozaj treba.
  const bound: Record<string, unknown> = {};
  let proto: unknown = originalDefault;
  while (proto && proto !== Function.prototype && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key in bound) continue;
      const value = (originalDefault as unknown as Record<string, unknown>)[key];
      bound[key] = typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(originalDefault)
        : value;
    }
    proto = Object.getPrototypeOf(proto);
  }

  return {
    default: {
      ...bound,
      checkDeadline: vi.fn(),
      getAvailableDiets: vi.fn().mockReturnValue(["Bezlepková", "Diabetická"]),
    },
  };
});

// Use local date (not UTC) to match what useOrder's selectedDate key uses.
const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("OrderPage Logic & Triggers", () => {
  // Helper to interact with real localStorage in tests
  const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
  })();

  Object.defineProperty(window, "localStorage", { value: localStorageMock });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    (OrderService.checkDeadline as Mock).mockReturnValue(true);
    mockApiFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/admin/global-settings/")) {
        return Promise.resolve(
          makeMockResponse({
            deadline_breakfast: "10:00",
            deadline_breakfast_is_day_before: false,
            deadline_lunch: "10:00",
            deadline_lunch_is_day_before: false,
            deadline_olovrant: "10:00",
            deadline_olovrant_is_day_before: false,
          }),
        );
      }

      if (url.includes("/orders/by-date/")) {
        return Promise.resolve(
          makeMockResponse({ id: 1, status: "draft", data: {} }),
        );
      }

      if (url.includes("/orders/") && init?.method === "POST") {
        return Promise.resolve(makeMockResponse({}));
      }

      return Promise.resolve(makeMockResponse([]));
    });

    // Setup default settings to avoid auto-trigger interference unless tested
    localStorageMock.setItem(
      "appSettings",
      JSON.stringify({
        copyBreakfastFromPrevLunch: false,
        copyOlovrantFromLunch: false,
        applyDefaultLunch: false,
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <AppProvider>
            <OrderPage />
          </AppProvider>
        </ToastProvider>
      </MemoryRouter>,
    );
  };

  const getOrderData = (date: string) => {
    const data = localStorageMock.getItem(`order_${date}`);
    return data ? JSON.parse(data) : null;
  };

  const getMealCard = (title: string) => {
    // Text „Raňajky“ sa vyskytuje aj mimo karty, takže sa nedá brať prvý zásah —
    // hľadáme kartu, ktorej vlastný .zp-meal-title sedí.
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".zp-meal"));
    const card = cards.find(
      (c) => c.querySelector(".zp-meal-title")?.textContent?.trim() === title,
    );
    if (!card) throw new Error(`Meal card "${title}" not found`);
    return card;
  };

  const getCategoryRow = (card: HTMLElement, category: string) => {
    const rows = Array.from(card.querySelectorAll<HTMLElement>(".zp-cat"));
    const row = rows.find(
      (r) => r.querySelector(".zp-cat-head")?.textContent?.trim() === category,
    );
    if (!row) throw new Error(`Category "${category}" not found in card`);
    return row;
  };

  /**
   * Prevádzku vracia len test, ktorý ju naozaj potrebuje. Keby ju vracal
   * zdieľaný mock, `scopedKey` by localStorage kľúče začal scopovať podľa
   * prevádzky a všetky ostatné testy by si prestali nájsť nasadené dáta.
   */
  const mockPrevadzkaWithPerMealMenus = () => {
    const original = mockApiFetch.getMockImplementation()!;
    mockApiFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/prevadzky/")) {
        return Promise.resolve(
          makeMockResponse([
            {
              id: 11,
              nazov: "Test prevádzka",
              adresa: "",
              celok: "Test celok",
              visible_menus: ["A", "B", "C", "V"],
              visible_menus_per_meal: { breakfast: ["A"], olovrant: ["A"] },
              visible_meals: ["breakfast", "lunch", "olovrant"],
              pack_separately_enabled: false,
            },
          ]),
        );
      }
      return original(url, init);
    });
  };

  it("Copy Olovrant: Copies data from Lunch when triggered", async () => {
    const date = localDateStr();
    // 1. Seed existing order with Lunch data using VALID category keys (e.g. Škôlka)
    const mockOrder = {
      status: "draft",
      breakfast: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
      lunch: { Škôlka: { menuCounts: { A: 10 }, diets: {} } },
      olovrant: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
    };
    localStorageMock.setItem(`order_${date}`, JSON.stringify(mockOrder));
    localStorageMock.setItem(
      `activeMeals_${date}`,
      JSON.stringify({ breakfast: false, lunch: true, olovrant: true }),
    );

    renderPage();

    // 2. Locate Olovrant Card
    const olovrantTitle = screen.getAllByText("Olovrant")[0];
    const olovrantCard = olovrantTitle.closest(".zp-meal");
    expect(olovrantCard).toBeInTheDocument();

    // 3. Find the "Kopírovať z obeda" button in Olovrant card
    const copyBtn = await within(olovrantCard as HTMLElement).findByText(
      /Kopírovať z obeda/i,
    );
    expect(copyBtn).toBeInTheDocument();

    // 4. Click the button
    fireEvent.click(copyBtn);

    // 5. Wait for sync
    await waitFor(() => {
      const updated = getOrderData(date);
      expect(updated.olovrant["Škôlka"].menuCounts["A"]).toBe(10);
    });
  });

  it("Copy Lunch: Copies data from Breakfast when triggered", async () => {
    const date = localDateStr();
    const mockOrder = {
      status: "draft",
      breakfast: { Škôlka: { menuCounts: { A: 8 }, diets: {} } },
      lunch: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
      olovrant: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
    };
    localStorageMock.setItem(`order_${date}`, JSON.stringify(mockOrder));
    localStorageMock.setItem(
      `activeMeals_${date}`,
      JSON.stringify({ breakfast: true, lunch: true, olovrant: false }),
    );

    renderPage();

    const lunchTitle = screen.getAllByText("Obed")[0];
    const lunchCard = lunchTitle.closest(".zp-meal");
    expect(lunchCard).toBeInTheDocument();

    const copyBtn = await within(lunchCard as HTMLElement).findByText(
      /Načítať z raňajok/i,
    );
    fireEvent.click(copyBtn);

    await waitFor(() => {
      const updated = getOrderData(date);
      expect(updated.lunch["Škôlka"].menuCounts["A"]).toBe(8);
    });
  });

  it("typed menu input selects value and empty blur commits 0", async () => {
    const date = localDateStr();
    localStorageMock.setItem(
      `order_${date}`,
      JSON.stringify({
        status: "draft",
        breakfast: { Škôlka: { menuCounts: { A: 2 }, diets: {} } },
        lunch: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
        olovrant: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
      }),
    );
    localStorageMock.setItem(
      `activeMeals_${date}`,
      JSON.stringify({ breakfast: true, lunch: false, olovrant: false }),
    );

    renderPage();

    const breakfastCard = getMealCard("Raňajky");
    // Menu A má každá kategória, tak sa zúžime na tú, ktorú test nasadil.
    const skolkaRow = getCategoryRow(breakfastCard, "Škôlka");
    const input = await within(skolkaRow).findByLabelText("Počet porcií pre menu A");

    fireEvent.focus(input);
    expect((input as HTMLInputElement).selectionStart).toBe(0);
    expect((input as HTMLInputElement).selectionEnd).toBe(String((input as HTMLInputElement).value).length);

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(getOrderData(date).breakfast["Škôlka"].menuCounts.A).toBe(0);
    });
  });

  it("typed diet input uses the same cap as the +/- path", async () => {
    const date = localDateStr();
    localStorageMock.setItem(
      `order_${date}`,
      JSON.stringify({
        status: "draft",
        breakfast: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
        lunch: { Škôlka: { menuCounts: { A: 2 }, diets: { "Bez lepku": 1 } } },
        olovrant: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
      }),
    );
    localStorageMock.setItem(
      `activeMeals_${date}`,
      JSON.stringify({ breakfast: false, lunch: true, olovrant: false }),
    );

    // Názov diéty musí byť z konštanty DIETS — inak ho `enforceStructure`
    // pri načítaní objednávky zahodí a počet diét vyjde 0.
    (OrderService.getAvailableDiets as Mock).mockReturnValue(["Bez lepku"]);

    renderPage();

    const lunchCard = getMealCard("Obed");
    const skolkaRow = getCategoryRow(lunchCard, "Škôlka");
    fireEvent.click(await within(skolkaRow).findByText("1 diét"));

    const dietInput = await screen.findByLabelText("Počet diéty Bez lepku");
    // Cap je menuCounts.A = 2, takže napísaná 5 sa nesmie uložiť — rovnako ako
    // by ju neprepustilo klikanie na +.
    fireEvent.change(dietInput, { target: { value: "5" } });
    fireEvent.blur(dietInput);

    await waitFor(() => {
      expect(getOrderData(date).lunch["Škôlka"].diets["Bez lepku"]).toBe(1);
    });
  });

  it("hides breakfast and olovrant menu choices configured to only menu A", async () => {
    mockPrevadzkaWithPerMealMenus();
    const date = localDateStr();
    localStorageMock.setItem(
      `activeMeals_${date}`,
      JSON.stringify({ breakfast: true, lunch: true, olovrant: true }),
    );

    renderPage();

    // „Škôlka“ má v GROUP_CONFIG len menu A, takže rozdiel medzi chodmi vidno
    // len na kategórii, ktorá menu B vôbec ponúka.
    const row = (meal: string) => getCategoryRow(getMealCard(meal), "ZŠ 1.stupeň");

    await waitFor(() => {
      expect(within(row("Obed")).getByText("Menu B")).toBeInTheDocument();
    });
    expect(within(row("Raňajky")).queryByText("Menu B")).not.toBeInTheDocument();
    expect(within(row("Olovrant")).queryByText("Menu B")).not.toBeInTheDocument();
  });

  it("Copy Breakfast: Copies from Previous Day Lunch", async () => {
    const today = localDateStr();
    const prevDay = new Date();
    prevDay.setDate(prevDay.getDate() - 1);
    const yesterdayStr = localDateStr(prevDay);

    // 1. Seed YESTERDAY's order
    const prevOrder = {
      status: "submitted",
      breakfast: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
      lunch: { Škôlka: { menuCounts: { A: 5 }, diets: {} } },
      olovrant: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
    };
    localStorageMock.setItem(
      `order_${yesterdayStr}`,
      JSON.stringify(prevOrder),
    );

    // 2. Seed TODAY's order
    const todayOrder = {
      status: "draft",
      breakfast: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
      lunch: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
      olovrant: { Škôlka: { menuCounts: { A: 0 }, diets: {} } },
    };
    localStorageMock.setItem(`order_${today}`, JSON.stringify(todayOrder));
    localStorageMock.setItem(
      `activeMeals_${today}`,
      JSON.stringify({ breakfast: true, lunch: true, olovrant: false }),
    );

    renderPage();

    // 3. Locate Breakfast Card
    const breakfastTitle = screen.getAllByText("Raňajky")[0];
    const breakfastCard = breakfastTitle.closest(".zp-meal");
    expect(breakfastCard).toBeInTheDocument();

    // 4. Find "Načítať z včera" button
    const copyBtn = await within(breakfastCard as HTMLElement).findByText(
      /Načítať z včerajška/i,
    );
    expect(copyBtn).toBeInTheDocument();

    // 5. Activate
    fireEvent.click(copyBtn);

    // 6. Verify Data Transfer
    await waitFor(() => {
      const updated = getOrderData(today);
      expect(updated.breakfast["Škôlka"].menuCounts["A"]).toBe(5);
    });
  });
  it("renders the order page with meals", () => {
    renderPage();
    expect(screen.getAllByText("Raňajky")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Obed")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Olovrant")[0]).toBeInTheDocument();
  });

  it("blocks ordering a main_course menu variant the jedálniček didn't publish for that day", async () => {
    // The meal-plan-availability fetch only runs when `user` is set; the
    // default mock omits it, so give this test a real user.
    (useAuth as Mock).mockReturnValue({
      logout: vi.fn(),
      apiFetch: mockApiFetch,
      user: { id: 1, email: "client@example.com" },
    });

    // Only Menu A was published for main_course that day (legacy-style
    // per-variant selection). The jedálniček category (main_course) must
    // correctly map onto the order form's "lunch" meal so Menu B/C/V get
    // marked as unavailable/occupied.
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/admin/global-settings/")) {
        return Promise.resolve(
          makeMockResponse({
            deadline_breakfast: "10:00",
            deadline_breakfast_is_day_before: false,
            deadline_lunch: "10:00",
            deadline_lunch_is_day_before: false,
            deadline_olovrant: "10:00",
            deadline_olovrant_is_day_before: false,
          }),
        );
      }
      if (url.includes("/orders/by-date/")) {
        return Promise.resolve(
          makeMockResponse({ id: 1, status: "draft", data: {} }),
        );
      }
      if (url.includes("/meal-plans/by-date/")) {
        return Promise.resolve(
          makeMockResponse({
            exists: true,
            items: [
              { category: "main_course", menu_variant: "A", template_detail: {} },
            ],
          }),
        );
      }
      return Promise.resolve(makeMockResponse([]));
    });

    renderPage();

    // mealPlanAvailability starts as null (= unoccupied by default), so wait
    // for the request and flush the resulting setState/re-render before
    // asserting, rather than asserting on the pre-fetch render.
    await waitFor(() => {
      expect(
        mockApiFetch.mock.calls.some((call: unknown[]) =>
          (call[0] as string).includes("/meal-plans/by-date/"),
        ),
      ).toBe(true);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getAllByText("zasednutá").length).toBeGreaterThan(0);
  });

  it("does not mark any menu as occupied when the jedálniček uses variant-less catalog selections", async () => {
    (useAuth as Mock).mockReturnValue({
      logout: vi.fn(),
      apiFetch: mockApiFetch,
      user: { id: 1, email: "client@example.com" },
    });

    // A variant-less plan item is a single uniform selection for the whole day.
    // This must NOT be treated as "no menu variants available" (which would
    // grey out every 'Menu A/B/...' option on the order form).
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/admin/global-settings/")) {
        return Promise.resolve(
          makeMockResponse({
            deadline_breakfast: "10:00",
            deadline_breakfast_is_day_before: false,
            deadline_lunch: "10:00",
            deadline_lunch_is_day_before: false,
            deadline_olovrant: "10:00",
            deadline_olovrant_is_day_before: false,
          }),
        );
      }
      if (url.includes("/orders/by-date/")) {
        return Promise.resolve(
          makeMockResponse({ id: 1, status: "draft", data: {} }),
        );
      }
      if (url.includes("/meal-plans/by-date/")) {
        return Promise.resolve(
          makeMockResponse({
            exists: true,
            items: [
              { category: "breakfast_snack", menu_variant: "", template_detail: {} },
              { category: "soup", menu_variant: "", template_detail: {} },
              { category: "main_course", menu_variant: "", template_detail: {} },
              { category: "afternoon_snack", menu_variant: "", template_detail: {} },
            ],
          }),
        );
      }
      return Promise.resolve(makeMockResponse([]));
    });

    renderPage();

    await waitFor(() => {
      expect(
        mockApiFetch.mock.calls.some((call: unknown[]) =>
          (call[0] as string).includes("/meal-plans/by-date/"),
        ),
      ).toBe(true);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByText("zasednutá")).not.toBeInTheDocument();
  });

  it('displays "Termín uplynul" badge when deadline passed', () => {
    (OrderService.checkDeadline as Mock).mockImplementation(
      (_date: string, meal: string) => {
        if (meal === "breakfast") return false;
        return true;
      },
    );

    renderPage();
    const badges = screen.getAllByText(/Termín uplynul/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("Celodenná: is closed when the first visible meal deadline has passed", () => {
    (OrderService.checkDeadline as Mock).mockImplementation(
      (_date: string, meal: string) => meal !== "breakfast",
    );

    renderPage();

    expect(
      screen.getByText("Termín prvého jedla uplynul · Celodenná objednávka je uzavretá"),
    ).toBeVisible();

    const fullDaySwitch = screen.getByRole("switch", {
      name: /Celodenná objednávka/i,
    });
    fireEvent.click(fullDaySwitch);

    expect(
      screen.queryByText("Celodenná objednávka je aktívna"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Odoslať objednávku").closest("button")).not.toBeDisabled();
  });

  it("Submit button is disabled when ALL deadlines passed", () => {
    (OrderService.checkDeadline as Mock).mockReturnValue(false);
    renderPage();
    const submitBtn = screen.getByText("Odoslať objednávku").closest("button");
    expect(submitBtn).toBeDisabled();
    expect(
      screen.getByText(
        "Na tento deň už nie je možné vytvoriť objednávku (termín uplynul).",
      ),
    ).toBeVisible();
  });

  it("Submit button is enabled with 0 portions (zero order = Bez objednávky)", () => {
    // Deadline not passed, but 0 portions → still enabled (intentional empty/null order)
    (OrderService.checkDeadline as Mock).mockReturnValue(true);
    renderPage();
    const submitBtn = screen.getByText("Odoslať objednávku").closest("button");
    expect(submitBtn).not.toBeDisabled();
    // Deadline msg not present
    expect(
      screen.queryByText(
        "Na tento deň už nie je možné vytvoriť objednávku (termín uplynul).",
      ),
    ).not.toBeInTheDocument();
  });

  it("shows a friendly message when submit fails after deadline", async () => {
    mockApiFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/admin/global-settings/")) {
        return Promise.resolve(
          makeMockResponse({
            deadline_breakfast: "10:00",
            deadline_breakfast_is_day_before: false,
            deadline_lunch: "10:00",
            deadline_lunch_is_day_before: false,
            deadline_olovrant: "10:00",
            deadline_olovrant_is_day_before: false,
          }),
        );
      }

      if (url.includes("/orders/by-date/")) {
        return Promise.resolve(
          makeMockResponse({ id: 1, status: "draft", data: {} }),
        );
      }

      if (url.includes("/orders/") && init?.method === "POST") {
        return Promise.resolve(
          makeMockResponse(
            {
              error: {
                code: "order_deadline_passed",
                message: "Technicky detail zo servera",
                details: {
                  deadline: "13.03.2026 10:00",
                  current_time: "13.03.2026 10:01",
                },
              },
            },
            false,
          ),
        );
      }

      return Promise.resolve(makeMockResponse([]));
    });

    renderPage();

    fireEvent.click(screen.getByText("Odoslať objednávku"));

    expect(
      await screen.findByText(
        "Objednávku už nie je možné odoslať, termín uplynul.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Technicky detail zo servera"),
    ).not.toBeInTheDocument();
  });

  // ── Celodenná objednávka (Full-day order) ───────────────────────────────────

  it("Celodenná: renders the full-day card alongside individual meal cards", () => {
    renderPage();
    expect(screen.getAllByText("Celodenná objednávka")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Raňajky")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Obed")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Olovrant")[0]).toBeInTheDocument();
  });

  it("Celodenná: toggling ON locks all individual meal cards with status message", async () => {
    renderPage();

    const fullDaySwitch = screen.getByRole("switch", {
      name: /Celodenná objednávka/i,
    });
    fireEvent.click(fullDaySwitch);

    await waitFor(() => {
      const lockBanners = screen.getAllByText("Celodenná objednávka je aktívna");
      // One banner per individual meal card (Raňajky, Obed, Olovrant) = 3
      expect(lockBanners.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("Celodenná: submitting sends the same full-day data for all three meals", async () => {
    const date = localDateStr();

    // Seed full-day portion data. fullDayOrder itself cannot be pre-seeded via
    // localStorage because safeParse/enforceStructure returns the fallback for
    // primitive (boolean) values. We enable it through the UI toggle instead.
    localStorageMock.setItem(
      `fullDayData_${date}`,
      JSON.stringify({
        Škôlka: { menuCounts: { A: 7 }, diets: {} },
      }),
    );

    renderPage();

    // Enable full-day order via the toggle switch
    const fullDaySwitch = screen.getByRole("switch", {
      name: /Celodenná objednávka/i,
    });
    fireEvent.click(fullDaySwitch);

    // Wait until individual cards show the lock banner (confirms fullDayOrder is ON)
    await waitFor(() => {
      expect(
        screen.getAllByText("Celodenná objednávka je aktívna").length,
      ).toBeGreaterThanOrEqual(1);
    });

    fireEvent.click(screen.getByText("Odoslať objednávku"));

    // Verify the POST request has all 3 meals with full-day data
    await waitFor(() => {
      const postCall = mockApiFetch.mock.calls.find(
        (call) => call[0]?.includes("/orders/") && call[1]?.method === "POST",
      );
      expect(postCall).toBeDefined();

      const body = JSON.parse(postCall![1].body as string);

      // All three meals must carry the identical full-day portion data
      expect(body.data.breakfast["Škôlka"].menuCounts["A"]).toBe(7);
      expect(body.data.lunch["Škôlka"].menuCounts["A"]).toBe(7);
      expect(body.data.olovrant["Škôlka"].menuCounts["A"]).toBe(7);
    });
  });

  it("Celodenná: submitting with fullDayOrder OFF sends per-meal data independently", async () => {
    const date = localDateStr();

    // Full-day order is NOT active; each meal has its own data
    localStorageMock.setItem(
      `order_${date}`,
      JSON.stringify({
        status: "draft",
        breakfast: { Škôlka: { menuCounts: { A: 2 }, diets: {} } },
        lunch: { Škôlka: { menuCounts: { A: 5 }, diets: {} } },
        olovrant: { Škôlka: { menuCounts: { A: 1 }, diets: {} } },
      }),
    );
    localStorageMock.setItem(
      `activeMeals_${date}`,
      JSON.stringify({ breakfast: true, lunch: true, olovrant: true }),
    );

    renderPage();

    fireEvent.click(screen.getByText("Odoslať objednávku"));

    await waitFor(() => {
      const postCall = mockApiFetch.mock.calls.find(
        (call) => call[0]?.includes("/orders/") && call[1]?.method === "POST",
      );
      expect(postCall).toBeDefined();

      const body = JSON.parse(postCall![1].body as string);

      // Each meal must have its own distinct count — NOT the same value
      expect(body.data.breakfast["Škôlka"].menuCounts["A"]).toBe(2);
      expect(body.data.lunch["Škôlka"].menuCounts["A"]).toBe(5);
      expect(body.data.olovrant["Škôlka"].menuCounts["A"]).toBe(1);
    });
  });
});
