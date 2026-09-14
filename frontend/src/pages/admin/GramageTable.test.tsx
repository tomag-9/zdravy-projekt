/**
 * Raňajky/olovrant majú málo stĺpcov — nútené na celú šírku obrazovky sa
 * neprirodzene naťahovali (užívateľ 11.9.2026). Obed si šírku vypĺňa
 * prirodzene a zostáva bez zmeny. Wrapper preto nesie `meal-<meal_type>`
 * triedu, o ktorú sa v `gramage-table.css` opiera `min-width: 0` override.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GramageTable, { TableSpec } from "./GramageTable";

afterEach(cleanup);

const baseSpec: TableSpec = {
  total_columns: 1,
  sections: [],
  vydaje: [],
  header: { corner: "Prevádzka / Riadok", groups: [], components: [] },
  rows: [],
  footer: [],
};

describe("GramageTable meal-type wrapper class", () => {
  it("adds meal-breakfast to the wrapper for the breakfast table", () => {
    render(<GramageTable spec={{ ...baseSpec, meal_type: "breakfast" }} />);
    expect(screen.getByTestId("gramage-table-wrap")).toHaveClass("meal-breakfast");
  });

  it("adds meal-olovrant to the wrapper for the olovrant table", () => {
    render(<GramageTable spec={{ ...baseSpec, meal_type: "olovrant" }} />);
    expect(screen.getByTestId("gramage-table-wrap")).toHaveClass("meal-olovrant");
  });

  it("does not add a meal-* class for the lunch table", () => {
    render(<GramageTable spec={{ ...baseSpec, meal_type: "lunch" }} />);
    const wrap = screen.getByTestId("gramage-table-wrap");
    expect(wrap.className).not.toMatch(/\bmeal-/);
  });

  it("does not add a meal-* class when meal_type is absent (legacy callers)", () => {
    render(<GramageTable spec={baseSpec} />);
    const wrap = screen.getByTestId("gramage-table-wrap");
    expect(wrap.className).not.toMatch(/\bmeal-/);
  });
});

describe("GramageTable component packing badge", () => {
  it("renders S/Z in the left side of its own component cell", () => {
    render(
      <GramageTable
        spec={{
          ...baseSpec,
          total_columns: 2,
          rows: [
            {
              kind: "sub-row",
              css: "sub-row diet",
              cells: [
                { text: "↳ No Milk", css: "lbl" },
                {
                  text: "200",
                  css: "cell-num has-component-pack-badge",
                  component_pack_badge: "Z",
                },
              ],
            },
          ],
        }}
      />
    );

    const badge = screen.getByText("Z");
    expect(badge).toHaveClass("component-pack-badge", "component-pack-badge--z");
    expect(badge.closest("td")).toHaveClass("has-component-pack-badge");
  });
});
