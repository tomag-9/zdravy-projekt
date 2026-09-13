import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClusterSummaries from "./ClusterSummaries";

const mockApiFetch = vi.fn();
const mockToastError = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

vi.mock("../../context/ToastContext", () => ({
  useToast: () => ({ error: mockToastError }),
}));

const spec = {
  total_columns: 2,
  meal_type: "lunch",
  header: {
    corner: "Prevádzka",
    groups: [{ text: "Obed", sub: "", css: "", colspan: 1 }],
    components: [{ text: "Polievka", sub: "", css: "" }],
  },
  rows: [{ kind: "block-band", css: "", cells: [{ text: "Cluster A", colspan: 2 }] }],
  footer: [{ kind: "total-ms-porcie", css: "", cells: [{ label: "SUM TOTAL OBED MŠ", text: "14", colspan: 2 }] }],
};

const response = (payload: unknown, ok = true) => ({
  ok,
  json: () => Promise.resolve(payload),
  blob: () => Promise.resolve(new Blob(["pdf"])),
});

describe("ClusterSummaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:summary") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    mockApiFetch.mockImplementation((url: string) => {
      // Poradie zámerne: "cluster-summary-chart" aj "cluster-summary-pdf"
      // obsahujú podreťazec "cluster-summary" — musia sa zachytiť skôr,
      // inak by chart request dostal spec payload bez points/clusters a
      // ClusterSummaryChart by padol na chart.clusters.map (regresia
      // #656: pridaný chart request bez zmeny tohto mocku).
      if (url.includes("cluster-summary-chart")) return Promise.resolve(response({ points: [], clusters: [], metric: "heads" }));
      if (url.includes("cluster-summary-pdf")) return Promise.resolve(response(null));
      if (url.includes("cluster-summary")) return Promise.resolve(response({ date: "2026-09-14", meals: ["breakfast", "lunch", "olovrant"], spec }));
      throw new Error(`Unexpected URL ${url}`);
    });
  });

  it("loads the all-meal preview by default and displays the shared table spec", async () => {
    render(<MemoryRouter><ClusterSummaries /></MemoryRouter>);

    expect(await screen.findByText("Cluster A")).toBeInTheDocument();
    expect(screen.getByText("SUM TOTAL OBED MŠ")).toBeInTheDocument();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/cluster-summary\/\?date=.*meal=breakfast.*meal=lunch.*meal=olovrant/)));
  });

  it("reloads the preview and exports PDF with precisely the selected meal parameters", async () => {
    render(<MemoryRouter><ClusterSummaries /></MemoryRouter>);
    await screen.findByText("Cluster A");

    fireEvent.click(screen.getByRole("checkbox", { name: "Raňajky" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Olovrant" }));

    await waitFor(() => expect(mockApiFetch).toHaveBeenLastCalledWith(expect.stringMatching(/cluster-summary\/\?date=.*meal=lunch$/)));
    fireEvent.click(screen.getByRole("button", { name: /stiahnuť pdf/i }));

    await waitFor(() => expect(mockApiFetch).toHaveBeenLastCalledWith(expect.stringMatching(/cluster-summary-pdf\/\?date=.*meal=lunch$/)));
  });

  it("does not allow an empty meal selection", async () => {
    render(<MemoryRouter><ClusterSummaries /></MemoryRouter>);
    await screen.findByText("Cluster A");

    fireEvent.click(screen.getByRole("checkbox", { name: "Raňajky" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Obed" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Olovrant" }));

    expect(screen.getByRole("checkbox", { name: "Olovrant" })).toBeChecked();
  });
});
