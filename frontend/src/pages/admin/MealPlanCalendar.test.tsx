import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DayEditorPanel } from "./MealPlanCalendar";

const mockApiFetch = vi.fn();

vi.mock("../../context/auth", () => ({
  useAuth: () => ({ apiFetch: mockApiFetch }),
}));

const makeResponse = (payload: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  json: () => Promise.resolve(payload),
});

const templates = [
  {
    id: 10,
    category: "main_course" as const,
    name: "Hlavný chod 90/110/25",
    weight_label: "90g + 110g + 25g",
  },
  {
    id: 11,
    category: "main_course" as const,
    name: "Hlavný chod 120/80/30",
    weight_label: "120g + 80g + 30g",
  },
];

function renderEditor(items: unknown[] = []) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  mockApiFetch.mockImplementation((url: string, options?: RequestInit) => {
    if (url.includes("/admin/meal-plans/by-date/")) {
      return Promise.resolve(
        makeResponse({ exists: true, date: "2026-07-07", items }),
      );
    }
    if (url.endsWith("/admin/meal-plans/") && options?.method === "POST") {
      return Promise.resolve(makeResponse({ id: 1 }));
    }
    return Promise.resolve(makeResponse({}));
  });

  render(
    <DayEditorPanel
      date="2026-07-07"
      templates={templates}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
  return { onClose, onSaved };
}

function lastSavedItems() {
  const postCall = mockApiFetch.mock.calls.find(
    ([url, options]) =>
      String(url).endsWith("/admin/meal-plans/") &&
      (options as RequestInit | undefined)?.method === "POST",
  );
  expect(postCall).toBeTruthy();
  return JSON.parse((postCall?.[1] as RequestInit).body as string).items_write;
}

describe("DayEditorPanel menu variant weights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies the first Menu A selection into empty B/C/V slots once", async () => {
    const user = userEvent.setup();
    renderEditor();

    await screen.findByLabelText("Hlavný chod Menu A");

    await user.selectOptions(screen.getByLabelText("Hlavný chod Menu A"), "10");

    expect(screen.getByLabelText("Hlavný chod Menu A")).toHaveValue("10");
    expect(screen.getByLabelText("Hlavný chod Menu B")).toHaveValue("10");
    expect(screen.getByLabelText("Hlavný chod Menu C")).toHaveValue("10");
    expect(screen.getByLabelText("Hlavný chod Menu V")).toHaveValue("10");

    await user.selectOptions(screen.getByLabelText("Hlavný chod Menu B"), "11");
    expect(screen.getByLabelText("Hlavný chod Menu A")).toHaveValue("10");
    expect(screen.getByLabelText("Hlavný chod Menu B")).toHaveValue("11");
    expect(screen.getByLabelText("Hlavný chod Menu C")).toHaveValue("10");
    expect(screen.getByLabelText("Hlavný chod Menu V")).toHaveValue("10");

    await user.selectOptions(screen.getByLabelText("Hlavný chod Menu A"), "11");
    expect(screen.getByLabelText("Hlavný chod Menu B")).toHaveValue("11");
    expect(screen.getByLabelText("Hlavný chod Menu C")).toHaveValue("10");
    expect(screen.getByLabelText("Hlavný chod Menu V")).toHaveValue("10");

    await user.click(screen.getByText("Uložiť"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/meal-plans/"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(lastSavedItems()).toEqual([
      { template_id: 11, menu_variant: "A" },
      { template_id: 11, menu_variant: "B" },
      { template_id: 10, menu_variant: "C" },
      { template_id: 10, menu_variant: "V" },
    ]);
  });

  it("expands a legacy variant-less main course into equal A/B/C/V slots", async () => {
    const user = userEvent.setup();
    renderEditor([
      {
        id: 1,
        category: "main_course",
        menu_variant: "",
        template: 10,
        template_detail: templates[0],
      },
    ]);

    await screen.findByLabelText("Hlavný chod Menu A");

    expect(screen.getByLabelText("Hlavný chod Menu A")).toHaveValue("10");
    expect(screen.getByLabelText("Hlavný chod Menu B")).toHaveValue("10");
    expect(screen.getByLabelText("Hlavný chod Menu C")).toHaveValue("10");
    expect(screen.getByLabelText("Hlavný chod Menu V")).toHaveValue("10");

    await user.click(screen.getByText("Uložiť"));

    await waitFor(() => {
      expect(lastSavedItems()).toEqual([
        { template_id: 10, menu_variant: "A" },
        { template_id: 10, menu_variant: "B" },
        { template_id: 10, menu_variant: "C" },
        { template_id: 10, menu_variant: "V" },
      ]);
    });
  });
});
