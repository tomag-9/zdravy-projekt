import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import OrderPage from "./OrderPage";
import { AppProvider } from "../context/AppContext";
import { MemoryRouter } from "react-router-dom";
import OrderService from "../services/OrderService";
import { ReactNode } from "react";
import { ToastProvider } from "../../../context/ToastContext";

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

// Mock OrderService with implementation that allows actual data structure usage
vi.mock("../services/OrderService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/OrderService")>();

  // We need to fix context issues since "this" might be lost in spread
  const originalDefault = actual.default;

  return {
    default: {
      ...originalDefault,
      checkDeadline: vi.fn(),
      getAvailableDiets: vi.fn().mockReturnValue(["Bezlepková", "Diabetická"]),

      // Re-implement or wrapper to ensure 'this' isn't vital or is bound
      createEmptyMeal: () => {
        // Manually replicate logic or call original bound
        return originalDefault.createEmptyMeal.call(originalDefault);
      },

      updateMenuCount: originalDefault.updateMenuCount,
      updateDiet: originalDefault.updateDiet,
      enforceStructure: originalDefault.enforceStructure,
      calculatePrevDayLunches: originalDefault.calculatePrevDayLunches,
      isMealEmpty: originalDefault.isMealEmpty,
      findLastNonZeroDay: originalDefault.findLastNonZeroDay,
      mergeOrders: originalDefault.mergeOrders,
      fastCopy: originalDefault.fastCopy,
    },
  };
});

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

  it("Copy Olovrant: Copies data from Lunch when triggered", async () => {
    const date = new Date().toISOString().split("T")[0];
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
    const olovrantCard = olovrantTitle.closest(".transition-all");
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

  it("Copy Breakfast: Copies from Previous Day Lunch", async () => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

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
    const breakfastCard = breakfastTitle.closest(".transition-all");
    expect(breakfastCard).toBeInTheDocument();

    // 4. Find "Načítať z včera" button
    const copyBtn = await within(breakfastCard as HTMLElement).findByText(
      /Načítať z včerajšieho obeda/i,
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

  it('displays "Termín uplynul" badge when deadline passed', () => {
    (OrderService.checkDeadline as Mock).mockImplementation(
      (_date: string, meal: string) => {
        if (meal === "breakfast") return false;
        return true;
      },
    );

    renderPage();
    const badges = screen.getAllByText("Termín uplynul");
    expect(badges.length).toBeGreaterThan(0);
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

  it("Submit button is enabled with 0 portions (zero order = Manuálna nulová)", () => {
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
        "Objednavku uz nie je mozne odoslat, termin uplynul.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Technicky detail zo servera"),
    ).not.toBeInTheDocument();
  });
});
