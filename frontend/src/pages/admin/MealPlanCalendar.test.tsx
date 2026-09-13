import { render, screen, waitFor, within } from "@testing-library/react";
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

async function chooseTemplate(user: ReturnType<typeof userEvent.setup>, menu: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: menu }));
  await user.click(within(screen.getByRole("listbox", { name: menu })).getByRole("option", { name: option }));
}

function expectTemplate(menu: string, value: string) {
  expect(screen.getByRole("combobox", { name: menu })).toHaveTextContent(value);
}

describe("DayEditorPanel menu variant weights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("never pre-fills B/C/V from a Menu A selection", async () => {
    const user = userEvent.setup();
    renderEditor();

    await screen.findByLabelText("Menu A");

    await chooseTemplate(user, "Menu A", "Hlavný chod 90/110/25 (90g + 110g + 25g)");

    // Každé menu je samostatná gramáž — výber A nesmie nič predvyplniť.
    expectTemplate("Menu A", "Hlavný chod 90/110/25");
    expectTemplate("Menu B", "— nevybraté —");
    expectTemplate("Menu C", "— nevybraté —");
    expectTemplate("Menu V", "— nevybraté —");

    await chooseTemplate(user, "Menu B", "Hlavný chod 120/80/30 (120g + 80g + 30g)");
    expectTemplate("Menu A", "Hlavný chod 90/110/25");
    expectTemplate("Menu B", "Hlavný chod 120/80/30");
    expectTemplate("Menu C", "— nevybraté —");
    expectTemplate("Menu V", "— nevybraté —");

    await user.click(screen.getByText("Uložiť"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/meal-plans/"),
        expect.objectContaining({ method: "POST" }),
      );
    });
    // Nevybraté varianty sa neukladajú vôbec.
    expect(lastSavedItems()).toEqual([
      { template_id: 10, menu_variant: "A" },
      { template_id: 11, menu_variant: "B" },
    ]);
  });

  it("expands a legacy variant-less main course into equal A/B/C/D/V slots", async () => {
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

    await screen.findByLabelText("Menu A");

    expectTemplate("Menu A", "Hlavný chod 90/110/25");
    expectTemplate("Menu B", "Hlavný chod 90/110/25");
    expectTemplate("Menu C", "Hlavný chod 90/110/25");
    expectTemplate("Menu D", "Hlavný chod 90/110/25");
    expectTemplate("Menu V", "Hlavný chod 90/110/25");

    await user.click(screen.getByText("Uložiť"));

    await waitFor(() => {
      expect(lastSavedItems()).toEqual([
        { template_id: 10, menu_variant: "A" },
        { template_id: 10, menu_variant: "B" },
        { template_id: 10, menu_variant: "C" },
        { template_id: 10, menu_variant: "D" },
        { template_id: 10, menu_variant: "V" },
      ]);
    });
  });
});
