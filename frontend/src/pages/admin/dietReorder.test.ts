import { describe, expect, it } from "vitest";
import { dietReorderPayload, moveDietBefore, moveDietBy } from "./dietReorder";

describe("diet reorder helpers", () => {
  it("moves the dragged diet before the drop target and renumbers the local order", () => {
    const reordered = moveDietBefore(
      [
        { id: 3, sort_order: 10 },
        { id: 7, sort_order: 20 },
        { id: 9, sort_order: 30 },
      ],
      9,
      3,
    );

    expect(reordered).toEqual([
      { id: 9, sort_order: 1 },
      { id: 3, sort_order: 2 },
      { id: 7, sort_order: 3 },
    ]);
  });

  it("swaps a diet with its neighbour and renumbers", () => {
    const diets = [
      { id: 3, sort_order: 1 },
      { id: 7, sort_order: 2 },
      { id: 9, sort_order: 3 },
    ];

    expect(moveDietBy(diets, 9, -1)).toEqual([
      { id: 3, sort_order: 1 },
      { id: 9, sort_order: 2 },
      { id: 7, sort_order: 3 },
    ]);
    expect(moveDietBy(diets, 3, 1)).toEqual([
      { id: 7, sort_order: 1 },
      { id: 3, sort_order: 2 },
      { id: 9, sort_order: 3 },
    ]);
  });

  it("keeps the list identical at the edges and for unknown diets", () => {
    const diets = [
      { id: 3, sort_order: 1 },
      { id: 7, sort_order: 2 },
    ];

    // Rovnaká referencia, nie len rovnaký obsah — DietManager na tom stojí,
    // keď sa rozhoduje, či vôbec posielať zápis na server.
    expect(moveDietBy(diets, 3, -1)).toBe(diets);
    expect(moveDietBy(diets, 7, 1)).toBe(diets);
    expect(moveDietBy(diets, 42, 1)).toBe(diets);
  });

  it("builds the reorder endpoint payload from the displayed order", () => {
    expect(
      dietReorderPayload([
        { id: 7, sort_order: 99 },
        { id: 3, sort_order: 42 },
      ]),
    ).toEqual({
      diets: [
        { id: 7, sort_order: 1 },
        { id: 3, sort_order: 2 },
      ],
    });
  });
});
