import { describe, expect, it } from "vitest";
import { dietReorderPayload, moveDietBefore } from "./dietReorder";

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
