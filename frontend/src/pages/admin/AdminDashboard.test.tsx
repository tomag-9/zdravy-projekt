import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "./AdminDashboard";

const mockApiFetch = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
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

const EMPTY_GRAMAGE = {
  date: "2026-07-03",
  meal_plan_id: null,
  col_groups: [],
  rows: [],
  totals: [],
  count_summary: [],
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
};

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows order counts when the selected date has orders but no meal plan", async () => {
    mockApiFetch
      .mockResolvedValueOnce(makeMockResponse(EMPTY_GRAMAGE))
      .mockResolvedValueOnce(makeMockResponse(ORDER_REPORT));

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
    mockApiFetch.mockResolvedValueOnce(makeMockResponse(GRAMAGE_WITH_PLAN));

    render(<AdminDashboard />);

    expect(await screen.findAllByText("Menu B")).not.toHaveLength(0);
    expect(screen.queryByText("Hlavný chod Menu B")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/admin/summary/daily-report/"),
    );
  });

  it("prefers category counts over top-level fallback counts", async () => {
    mockApiFetch
      .mockResolvedValueOnce(makeMockResponse(EMPTY_GRAMAGE))
      .mockResolvedValueOnce(makeMockResponse(ORDER_REPORT_WITH_BOTH_SHAPES));

    render(<AdminDashboard />);

    expect(await screen.findByText("Počty objednávok bez gramáže")).toBeInTheDocument();
    expect(screen.getByText("A: 12")).toBeInTheDocument();
    expect(screen.getByText("Bezlepkova: 2")).toBeInTheDocument();
    expect(screen.queryByText("A: 99")).not.toBeInTheDocument();
    expect(screen.queryByText("StaryTvar: 99")).not.toBeInTheDocument();
  });
});
