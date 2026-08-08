import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PackSeparatelySelector from "./PackSeparatelySelector";
import { buildPackSeparatelyItems } from "./packSeparately";

describe("PackSeparatelySelector", () => {
  it("labels a merged row and synchronizes its menu and diet counters", () => {
    const onUpdate = vi.fn();
    render(
      <PackSeparatelySelector
        isOpen
        onClose={vi.fn()}
        sections={[{
          meal: "lunch",
          mealLabel: "Obed",
          items: [{
            category: "Škôlka",
            kind: "menus",
            keyName: "A",
            linkedDietKey: "Veggie/No Fish",
            linkedRow: "merged",
            orderedCount: 2,
            count: 0,
          }],
        }]}
        onUpdatePackSeparately={onUpdate}
      />,
    );

    expect(screen.getByText("Škôlka · Menu A (Veggie/No Fish)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+" }));

    expect(onUpdate).toHaveBeenNthCalledWith(1, "lunch", "Škôlka", "menus", "A", 1);
    expect(onUpdate).toHaveBeenNthCalledWith(2, "lunch", "Škôlka", "diets", "Veggie/No Fish", 1);
  });

  it("keeps merged and remainder counters independent while sharing the menu total", async () => {
    const category = "Škôlka";

    const Harness = () => {
      const [packSeparately, setPackSeparately] = useState({
        menus: { A: 0 },
        diets: { "Veggie/No Fish": 0 },
      });
      const items = buildPackSeparatelyItems({
        [category]: {
          menuCounts: { A: 5 },
          diets: { "Veggie/No Fish": 2 },
          packSeparately,
        },
      }, [category], { "Veggie/No Fish": "A" });

      return (
        <PackSeparatelySelector
          isOpen
          onClose={vi.fn()}
          sections={[{ meal: "lunch", mealLabel: "Obed", items }]}
          onUpdatePackSeparately={(_meal, _category, kind, key, count) => {
            setPackSeparately((current) => ({
              ...current,
              [kind]: { ...current[kind], [key]: count },
            }));
          }}
        />
      );
    };

    render(<Harness />);

    const getMergedRow = () => screen.getByText(
      `${category} · Menu A (Veggie/No Fish)`,
    ).closest(".zp-diet-row") as HTMLElement;
    const getRemainderRow = () => screen.getByText(
      `${category} · Menu A`,
    ).closest(".zp-diet-row") as HTMLElement;
    const getCount = (row: HTMLElement) => within(row).getByRole("textbox");

    fireEvent.click(within(getMergedRow()).getByRole("button", { name: "+" }));

    await waitFor(() => {
      expect(getCount(getMergedRow())).toHaveValue("1");
      expect(getCount(getRemainderRow())).toHaveValue("0");
    });

    fireEvent.click(within(getRemainderRow()).getByRole("button", { name: "+" }));

    await waitFor(() => {
      expect(getCount(getMergedRow())).toHaveValue("1");
      expect(getCount(getRemainderRow())).toHaveValue("1");
    });
  });

  it("keeps merged and diet remainder counters independent while sharing the diet total", async () => {
    const category = "Škôlka";

    const Harness = () => {
      const [packSeparately, setPackSeparately] = useState({
        menus: { A: 0 },
        diets: { "Veggie/No Fish": 0 },
      });
      const items = buildPackSeparatelyItems({
        [category]: {
          menuCounts: { A: 2 },
          diets: { "Veggie/No Fish": 5 },
          packSeparately,
        },
      }, [category], { "Veggie/No Fish": "A" });

      return (
        <PackSeparatelySelector
          isOpen
          onClose={vi.fn()}
          sections={[{ meal: "lunch", mealLabel: "Obed", items }]}
          onUpdatePackSeparately={(_meal, _category, kind, key, count) => {
            setPackSeparately((current) => ({
              ...current,
              [kind]: { ...current[kind], [key]: count },
            }));
          }}
        />
      );
    };

    render(<Harness />);

    const getMergedRow = () => screen.getByText(
      `${category} · Menu A (Veggie/No Fish)`,
    ).closest(".zp-diet-row") as HTMLElement;
    const getRemainderRow = () => screen.getByText(
      `${category} · Veggie/No Fish`,
      { exact: false },
    ).closest(".zp-diet-row") as HTMLElement;
    const getCount = (row: HTMLElement) => within(row).getByRole("textbox");

    fireEvent.click(within(getMergedRow()).getByRole("button", { name: "+" }));

    await waitFor(() => {
      expect(getCount(getMergedRow())).toHaveValue("1");
      expect(getCount(getRemainderRow())).toHaveValue("0");
    });

    fireEvent.click(within(getRemainderRow()).getByRole("button", { name: "+" }));

    await waitFor(() => {
      expect(getCount(getMergedRow())).toHaveValue("1");
      expect(getCount(getRemainderRow())).toHaveValue("1");
    });
  });
});
