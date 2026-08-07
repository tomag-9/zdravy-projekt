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
    expect(screen.getByRole("button", { name: "PDF objednávok" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "XLSX objednávok" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stiahnuť pdf/i })).toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith("Deň bol uzavretý.");
  });

  it("loads a persisted closed state and uses the report-task flow for export", async () => {
    mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes("/admin/meal-plans/gramage-dashboard/")) {
        return Promise.resolve(makeMockResponse(GRAMAGE_WITH_PLAN));
      }
      if (url.includes("/admin/closed-days/")) {
        return Promise.resolve(makeMockResponse({ date: "2026-07-03", is_closed: true }));
      }
      if (url.endsWith("/admin/report-tasks/") && options?.method === "POST") {
        return Promise.resolve(makeMockResponse({ task_id: "pdf-task", status: "pending" }));
      }
      if (url.endsWith("/admin/report-tasks/pdf-task/")) {
        return Promise.resolve(makeMockResponse({ task_id: "pdf-task", status: "complete" }));
      }
      if (url.endsWith("/admin/report-tasks/pdf-task/download/")) {
        return Promise.resolve(makeMockResponse({}));
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(<AdminDashboard />);

    expect(await screen.findByText("Deň je uzavretý")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stiahnuť pdf/i })).toBeInTheDocument();
    const pdfButton = screen.getByRole("button", { name: "PDF objednávok" });
    expect(screen.getByRole("button", { name: "XLSX objednávok" })).toBeInTheDocument();
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/report-tasks/"),
        expect.objectContaining({ method: "POST", body: expect.stringContaining('"format":"pdf"') }),
      );
      expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining("/pdf-task/download/"));
    });
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
    expect(screen.queryByRole("button", { name: "PDF objednávok" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "XLSX objednávok" })).not.toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith("Deň bol odomknutý.");
  });
});
