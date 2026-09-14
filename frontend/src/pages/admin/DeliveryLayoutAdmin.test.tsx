import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeliveryLayoutAdmin from "./DeliveryLayoutAdmin";

const mockApiFetch = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

const route = (id: number, name: string) => ({
  id,
  block: 1,
  vydaj: "A",
  name,
  driver: "",
  departure_time: null,
  note: "",
  sort_order: 1,
  is_active: true,
  prevadzky: [],
});

const layout = (
  name: string,
  mealType: "breakfast" | "lunch" | "olovrant",
  routes: ReturnType<typeof route>[] = [],
) => ({
  blocks: [{
    id: 1,
    meal_type: mealType,
    name,
    sort_order: 1,
    include_in_main_summary: true,
    include_in_extra_summary: false,
    is_active: true,
    routes,
  }],
  unassigned_prevadzky: [],
});

const response = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(payload),
});

describe("DeliveryLayoutAdmin", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it("does not let an older meal-tab request overwrite the current layout", async () => {
    let resolveLunch!: (value: ReturnType<typeof response>) => void;
    let resolveBreakfast!: (value: ReturnType<typeof response>) => void;
    const lunch = new Promise<ReturnType<typeof response>>((resolve) => { resolveLunch = resolve; });
    const breakfast = new Promise<ReturnType<typeof response>>((resolve) => { resolveBreakfast = resolve; });

    mockApiFetch.mockImplementation((url: string) =>
      url.includes("meal_type=breakfast") ? breakfast : lunch,
    );

    render(<DeliveryLayoutAdmin />);
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Raňajky" }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));

    resolveBreakfast(response(layout("Raňajkové trasy", "breakfast")));
    expect(await screen.findByText("Raňajkové trasy")).toBeInTheDocument();

    resolveLunch(response(layout("Obedové trasy", "lunch")));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("Obedové trasy")).not.toBeInTheDocument();
    expect(screen.getByText("Raňajkové trasy")).toBeInTheDocument();
  });

  it("does not let a delayed save from another meal overwrite the active tab", async () => {
    let resolveSave!: (value: ReturnType<typeof response>) => void;
    const delayedSave = new Promise<ReturnType<typeof response>>((resolve) => { resolveSave = resolve; });
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/reorder/")) return delayedSave;
      if (url.includes("meal_type=breakfast")) return response(layout("Raňajkové trasy", "breakfast"));
      return response(layout("Obedové trasy", "lunch", [route(1, "Trasa 1"), route(2, "Trasa 2")]));
    });

    render(<DeliveryLayoutAdmin />);
    const firstRoute = (await screen.findByText("Trasa 1")).closest("[draggable='true']");
    const secondRoute = screen.getByText("Trasa 2").closest("[draggable='true']");
    const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn() };
    fireEvent.dragStart(secondRoute!, { dataTransfer });
    fireEvent.dragOver(firstRoute!, { dataTransfer });
    fireEvent.drop(firstRoute!, { dataTransfer });
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining("/reorder/"), expect.anything()));

    fireEvent.click(screen.getByRole("button", { name: "Raňajky" }));
    expect(await screen.findByText("Raňajkové trasy")).toBeInTheDocument();

    resolveSave(response(layout("Obedové trasy", "lunch")));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByText("Raňajkové trasy")).toBeInTheDocument();
    expect(screen.queryByText("Obedové trasy")).not.toBeInTheDocument();
  });

  // Raňajky/olovrant nemajú Cluster (#dashboard-per-meal-routes,
  // 11.9.2026 backfill-bug follow-up) — kuchyňa ich vydáva z jedného
  // miesta, takže výber/filter clustra pre tieto dve jedlá v UI nedáva
  // zmysel a mátol by (vyzeralo by to, že sa dá znova rozdeliť).
  it("hides the Cluster filter and per-route picker outside of the lunch tab", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("meal_type=breakfast")) {
        return response(layout("Raňajkové trasy", "breakfast", [route(1, "Trasa 1")]));
      }
      return response(layout("Obedové trasy", "lunch", [route(2, "Trasa L")]));
    });

    render(<DeliveryLayoutAdmin />);
    await screen.findByText("Obedové trasy");
    expect(screen.getByLabelText("Cluster")).toBeInTheDocument();
    expect(screen.getByLabelText("Cluster — Trasa L")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Raňajky" }));
    await screen.findByText("Raňajkové trasy");
    expect(screen.queryByLabelText("Cluster")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cluster — Trasa 1")).not.toBeInTheDocument();
  });

  it("reorders routes by dragging one route onto another and saves the new order", async () => {
    mockApiFetch
      .mockResolvedValueOnce(response(layout("Obedové trasy", "lunch", [route(1, "Trasa 1"), route(2, "Trasa 2")])))
      .mockResolvedValueOnce(response(layout("Obedové trasy", "lunch", [route(2, "Trasa 2"), route(1, "Trasa 1")])))

    render(<DeliveryLayoutAdmin />);

    const firstRoute = (await screen.findByText("Trasa 1")).closest("[draggable='true']");
    const secondRoute = screen.getByText("Trasa 2").closest("[draggable='true']");
    const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn() };
    fireEvent.dragStart(secondRoute!, { dataTransfer });
    fireEvent.dragOver(firstRoute!, { dataTransfer });
    fireEvent.drop(firstRoute!, { dataTransfer });

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
    const [, options] = mockApiFetch.mock.calls[1];
    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.blocks[0].routes.map((item: { id: number }) => item.id)).toEqual([2, 1]);
  });
});
