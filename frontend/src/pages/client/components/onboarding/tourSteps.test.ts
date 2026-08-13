import { describe, expect, it } from "vitest";
import { getTourSteps } from "./tourSteps";

describe("getTourSteps", () => {
  it("leaves out the prevádzka switcher for single-prevádzka logins", () => {
    const steps = getTourSteps({ hasMultiplePrevadzky: false });
    expect(steps.map((s) => s.targetId)).not.toContain("tour-prevadzka-switch");
  });

  it("includes the switcher step when the login has more than one prevádzka", () => {
    const steps = getTourSteps({ hasMultiplePrevadzky: true });
    expect(steps.map((s) => s.targetId)).toContain("tour-prevadzka-switch");
  });

  it("puts the switcher first among the order-page steps", () => {
    // It explains which prevádzka the counts below will be booked against, so
    // it has to come before anything that enters counts.
    const steps = getTourSteps({ hasMultiplePrevadzky: true });
    const orderSteps = steps.filter((s) => s.page === "/order");
    expect(orderSteps[0].targetId).toBe("tour-prevadzka-switch");
  });

  it("adds exactly one step over the single-prevádzka tour", () => {
    expect(getTourSteps({ hasMultiplePrevadzky: true })).toHaveLength(
      getTourSteps({ hasMultiplePrevadzky: false }).length + 1,
    );
  });

  it("describes diets as their own item, not a slice of Menu A", () => {
    // Since #468 diets are a separate row under Menu A that adds to it; the
    // old copy still claimed they came out of the Menu A count.
    const step = getTourSteps({ hasMultiplePrevadzky: false }).find(
      (s) => s.targetId === "tour-category-row",
    )!;
    expect(step.body).toContain("samostatná položka");
    expect(step.body).not.toContain("len v rámci porcií Menu A");
  });
});
